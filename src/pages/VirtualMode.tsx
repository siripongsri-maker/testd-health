import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { PixelWorld } from "@/components/virtual/PixelWorld";
import { VirtualGuide } from "@/components/virtual/VirtualGuide";
import { VirtualIntroOverlay } from "@/components/virtual/VirtualIntroOverlay";
import { DateStoryExperience } from "@/components/virtual/DateStoryExperience";

interface Props {
  forceClinic?: boolean;
}

export default function VirtualMode({ forceClinic }: Props) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [showClinic, setShowClinic] = useState(!!forceClinic);

  const displayName =
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    (language === "th" ? "ฉัน" : "Me");

  if (!showClinic) {
    return (
      <div style={{
        height: "calc(100dvh - 3.5rem)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}>
        <DateStoryExperience />
      </div>
    );
  }

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
