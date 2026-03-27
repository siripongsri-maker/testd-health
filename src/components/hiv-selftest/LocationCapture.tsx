import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Loader2, Check, AlertTriangle, RotateCw } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: number;
  status: 'captured' | 'denied' | 'error' | 'timeout';
}

interface LocationCaptureProps {
  location: LocationData | null;
  onLocationCaptured: (data: LocationData) => void;
}

export function LocationCapture({ location, onLocationCaptured }: LocationCaptureProps) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError(language === 'th' ? 'อุปกรณ์ไม่รองรับการระบุตำแหน่ง' : 'Geolocation not supported');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationCaptured({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timestamp: Date.now(),
          status: 'captured',
        });
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        const status = err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'error';
        onLocationCaptured({ latitude: 0, longitude: 0, timestamp: Date.now(), status });
        if (err.code === 1) {
          setError(language === 'th'
            ? 'ไม่ได้รับอนุญาตเข้าถึงตำแหน่ง กรุณาเปิดสิทธิ์ในการตั้งค่าเบราว์เซอร์'
            : 'Location permission denied. Please enable it in browser settings.');
        } else if (err.code === 3) {
          setError(language === 'th' ? 'หมดเวลาการระบุตำแหน่ง กรุณาลองใหม่' : 'Location request timed out. Please retry.');
        } else {
          setError(language === 'th' ? 'ไม่สามารถระบุตำแหน่งได้ กรุณาลองใหม่' : 'Could not get location. Please retry.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [language, onLocationCaptured]);

  const isCaptured = location?.status === 'captured';

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          {language === 'th' ? 'ตำแหน่งรับชุดตรวจ' : 'Pickup Location'}
        </h3>
      </div>

      <p className="text-xs text-muted-foreground">
        {language === 'th'
          ? 'กดปุ่มด้านล่างเพื่อบันทึกตำแหน่งปัจจุบันของคุณ'
          : 'Tap the button below to record your current location.'}
      </p>

      {!isCaptured ? (
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={requestLocation}
          disabled={loading}
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" />{language === 'th' ? 'กำลังระบุตำแหน่ง...' : 'Getting location...'}</>
          ) : (
            <><MapPin className="h-4 w-4" />{language === 'th' ? 'กดพิกัด / ระบุตำแหน่ง' : 'Use Current Location'}</>
          )}
        </Button>
      ) : (
        <div className="flex items-center gap-2 p-3 rounded-md bg-success/10 border border-success/30">
          <Check className="h-4 w-4 text-success shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-success">
              {language === 'th' ? 'บันทึกตำแหน่งสำเร็จ' : 'Location captured'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="shrink-0 h-7 w-7 p-0" onClick={requestLocation}>
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-destructive">{error}</p>
            <Button type="button" variant="link" size="sm" className="p-0 h-auto text-xs mt-1" onClick={requestLocation}>
              {language === 'th' ? 'ลองใหม่' : 'Retry'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
