import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { PixelWorld } from "@/components/virtual/PixelWorld";
import { VirtualGuide } from "@/components/virtual/VirtualGuide";
import { VirtualIntroOverlay } from "@/components/virtual/VirtualIntroOverlay";
import { DateStoryExperience } from "@/components/virtual/DateStoryExperience";
import { Episode2Player } from "@/components/virtual/Episode2Player";
import { VirtualStoryHub } from "@/components/virtual/VirtualStoryHub";

interface Props {
  forceClinic?: boolean;
  forceEp2?: boolean;
}

export default function VirtualMode({ forceClinic, forceEp2 }: Props) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [showClinic, setShowClinic] = useState(!!forceClinic);
  const [view, setView] = useState<'hub' | 'ep1' | 'ep2'>(forceEp2 ? 'ep2' : 'hub');

  const displayName =
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    (language === "th" ? "ฉัน" : "Me");

  if (showClinic) {
    return (
      <>
        <VirtualIntroOverlay />
        <div style={{
          height: "calc(100dvh - 3.5rem)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}>
          <PixelWorld displayName={displayName} />
        </div>
        <VirtualGuide />
      </>
    );
  }

  return (
    <div style={{
      height: "calc(100dvh - 3.5rem)",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {view === 'hub' && (
        <VirtualStoryHub
          onSelectEp1={() => setView('ep1')}
          onSelectEp2={() => setView('ep2')}
        />
      )}
      {view === 'ep1' && (
        <DateStoryExperience onBack={() => setView('hub')} />
      )}
      {view === 'ep2' && (
        <Episode2Player onBack={() => setView('hub')} />
      )}
    </div>
  );
}
