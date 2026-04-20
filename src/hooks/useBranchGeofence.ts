import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { distanceMeters, GEOFENCE_RADIUS_M, type GeoStatus } from '@/lib/geofence';

interface UseBranchGeofenceArgs {
  branchId: string | null;
  /** Only run when an active appointment is present + eligible for check-in. */
  enabled: boolean;
}

interface BranchCoords {
  latitude: number;
  longitude: number;
}

/**
 * Resolves the user's distance to the appointment branch.
 *
 * Privacy guarantees:
 *  - We only ever read the position once per session (one-shot, not watch).
 *  - We compute distance in memory and discard the raw coordinates.
 *  - Nothing is sent to the server about the user's location.
 */
export function useBranchGeofence({ branchId, enabled }: UseBranchGeofenceArgs) {
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [distance, setDistance] = useState<number | null>(null);
  const [branchCoords, setBranchCoords] = useState<BranchCoords | null>(null);
  const requestedRef = useRef(false);

  // Load branch coordinates
  useEffect(() => {
    if (!branchId || !enabled) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('booking_branches')
        .select('latitude, longitude')
        .eq('id', branchId)
        .maybeSingle();
      if (cancelled) return;
      const lat = (data as any)?.latitude;
      const lng = (data as any)?.longitude;
      if (typeof lat === 'number' && typeof lng === 'number') {
        setBranchCoords({ latitude: lat, longitude: lng });
      } else if (lat != null && lng != null) {
        // numeric() comes back as string from PostgREST sometimes
        setBranchCoords({ latitude: parseFloat(lat), longitude: parseFloat(lng) });
      } else {
        setStatus('unavailable');
      }
    })();
    return () => { cancelled = true; };
  }, [branchId, enabled]);

  const requestLocation = useCallback(() => {
    if (!branchCoords || !enabled) return;
    if (requestedRef.current) return;
    requestedRef.current = true;

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      return;
    }

    setStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Compute distance, then immediately drop the raw coordinates.
        const d = distanceMeters(
          pos.coords.latitude, pos.coords.longitude,
          branchCoords.latitude, branchCoords.longitude,
        );
        setDistance(Math.round(d));
        setStatus(d <= GEOFENCE_RADIUS_M ? 'inside' : 'outside');
      },
      (err) => {
        if (err.code === 1) setStatus('denied');
        else setStatus('error');
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }, [branchCoords, enabled]);

  // Auto-trigger location request once branch coords resolve.
  useEffect(() => {
    if (enabled && branchCoords && status === 'idle') {
      requestLocation();
    }
  }, [enabled, branchCoords, status, requestLocation]);

  // Reset when disabled (e.g. status becomes arrived → no longer eligible).
  useEffect(() => {
    if (!enabled) {
      requestedRef.current = false;
      setStatus('idle');
      setDistance(null);
    }
  }, [enabled]);

  return {
    status,
    distance,
    radiusM: GEOFENCE_RADIUS_M,
    retry: () => {
      requestedRef.current = false;
      setStatus('idle');
    },
  };
}
