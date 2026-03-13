import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface HrProfile {
  id?: string;
  age_range?: string;
  gender_identity?: string;
  sexual_behavior_category?: string;
  is_msm: boolean;
  is_msw: boolean;
  consent_profile_use: boolean;
}

const ANON_TOKEN_KEY = "hr_anon_profile_token";

function getAnonToken(): string {
  let token = localStorage.getItem(ANON_TOKEN_KEY);
  if (!token) {
    token = `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(ANON_TOKEN_KEY, token);
  }
  return token;
}

export function useHrProfile(userId?: string) {
  const [profile, setProfile] = useState<HrProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      if (userId) {
        const { data } = await supabase
          .from("hr_user_profile")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          setProfile(data as any);
          setHasProfile(true);
        }
      } else {
        // Check localStorage for anonymous profile
        const cached = localStorage.getItem("hr_profile_cache");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setProfile(parsed);
            setHasProfile(true);
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const saveProfile = useCallback(async (data: Partial<HrProfile>) => {
    const merged: HrProfile = {
      ...profile,
      ...data,
      is_msm: data.sexual_behavior_category === "msm" || data.is_msm || false,
      is_msw: data.sexual_behavior_category === "msw" || data.is_msw || false,
      consent_profile_use: data.consent_profile_use ?? true,
    };

    try {
      if (userId) {
        if (profile?.id) {
          await supabase
            .from("hr_user_profile")
            .update({
              age_range: merged.age_range,
              gender_identity: merged.gender_identity,
              sexual_behavior_category: merged.sexual_behavior_category,
              is_msm: merged.is_msm,
              is_msw: merged.is_msw,
              consent_profile_use: merged.consent_profile_use,
              updated_at: new Date().toISOString(),
            })
            .eq("id", profile.id);
        } else {
          await supabase.from("hr_user_profile").insert({
            user_id: userId,
            age_range: merged.age_range,
            gender_identity: merged.gender_identity,
            sexual_behavior_category: merged.sexual_behavior_category,
            is_msm: merged.is_msm,
            is_msw: merged.is_msw,
            consent_profile_use: merged.consent_profile_use,
          });
        }
      } else {
        // Anonymous: store locally + attempt DB insert
        const anonToken = getAnonToken();
        try {
          await supabase.from("hr_user_profile").insert({
            anonymous_token: anonToken,
            age_range: merged.age_range,
            gender_identity: merged.gender_identity,
            sexual_behavior_category: merged.sexual_behavior_category,
            is_msm: merged.is_msm,
            is_msw: merged.is_msw,
            consent_profile_use: merged.consent_profile_use,
          });
        } catch { /* anon insert may fail, that's ok */ }
      }

      // Always cache locally
      localStorage.setItem("hr_profile_cache", JSON.stringify(merged));
      setProfile(merged);
      setHasProfile(true);
    } catch { /* ignore */ }
  }, [userId, profile]);

  // Personalization helpers
  const isMSM = profile?.is_msm || profile?.sexual_behavior_category === "msm";
  const isMSW = profile?.is_msw || profile?.sexual_behavior_category === "msw";
  const isYouth = profile?.age_range === "<18";
  const ageRange = profile?.age_range;

  return {
    profile,
    loading,
    hasProfile,
    saveProfile,
    isMSM,
    isMSW,
    isYouth,
    ageRange,
  };
}
