import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { PixelWorld } from "@/components/virtual/PixelWorld";
import { VirtualGuide } from "@/components/virtual/VirtualGuide";
import { VirtualIntroOverlay } from "@/components/virtual/VirtualIntroOverlay";

export default function VirtualMode() {
  const { language } = useLanguage();
  const { user } = useAuth();

  const displayName =
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    (language === "th" ? "ฉัน" : "Me");

  return (
    <>
      <VirtualIntroOverlay />
      <div style={{ height: "calc(100dvh - 7rem)" }}>
        <PixelWorld displayName={displayName} />
      </div>
      <VirtualGuide />
    </>
  );
}
