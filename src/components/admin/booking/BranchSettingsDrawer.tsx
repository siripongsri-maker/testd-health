import { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Star, X, RefreshCcw, ImageIcon, Copy } from 'lucide-react';

interface BranchSettingsDrawerProps {
  branchId: string | null;
  onClose: () => void;
  onRefresh: () => void;
}

interface BranchData {
  id: string;
  name_th: string;
  name_en: string;
  hero_image_url: string | null;
  google_place_id: string | null;
  google_maps_url: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  google_photo_url: string | null;
}

export function BranchSettingsDrawer({ branchId, onClose, onRefresh }: BranchSettingsDrawerProps) {
  const { language } = useLanguage();
  const [branch, setBranch] = useState<BranchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [heroUrl, setHeroUrl] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [totalPhotos, setTotalPhotos] = useState(0);

  useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    supabase
      .from('booking_branches')
      .select('id, name_th, name_en, hero_image_url, google_place_id, google_maps_url, google_rating, google_review_count, google_photo_url')
      .eq('id', branchId)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          setBranch(data as BranchData);
          setHeroUrl(data.hero_image_url || '');
          setPlaceId(data.google_place_id || '');
          setMapsUrl(data.google_maps_url || '');
        }
        setLoading(false);
      });
  }, [branchId]);

  const handleSave = async () => {
    if (!branchId) return;
    setSaving(true);
    const { error } = await supabase
      .from('booking_branches')
      .update({
        hero_image_url: heroUrl.trim() || null,
        google_place_id: placeId.trim() || null,
        google_maps_url: mapsUrl.trim() || null,
      } as any)
      .eq('id', branchId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(language === 'th' ? 'บันทึกแล้ว' : 'Saved');
      onRefresh();
    }
    setSaving(false);
  };

  const handleSync = async () => {
    if (!branchId) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-branch-google-data', {
        body: { branch_id: branchId, photo_index: photoIndex },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(language === 'th' ? 'ซิงค์ Google สำเร็จ' : 'Google sync complete');
        if (data?.total_google_photos) {
          setTotalPhotos(data.total_google_photos);
        }
        // Refresh branch data
        const { data: updated } = await supabase
          .from('booking_branches')
          .select('id, name_th, name_en, hero_image_url, google_place_id, google_maps_url, google_rating, google_review_count, google_photo_url')
          .eq('id', branchId)
          .single();
        if (updated) {
          setBranch(updated as BranchData);
        }
        onRefresh();
      }
    } catch (err: any) {
      toast.error(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleUseGoogleAsHero = () => {
    if (branch?.google_photo_url) {
      setHeroUrl(branch.google_photo_url);
      toast.info(language === 'th' ? 'คัดลอก URL แล้ว — กด "บันทึก" เพื่อยืนยัน' : 'URL copied — press "Save" to confirm');
    }
  };

  return (
    <Drawer open={!!branchId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle className="text-sm">
            {language === 'th' ? '⚙️ ตั้งค่าสาขา' : '⚙️ Branch Settings'}
            {branch && ` — ${language === 'th' ? branch.name_th : branch.name_en}`}
          </DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Hero Image */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  <ImageIcon className="h-3 w-3 inline mr-1" />
                  {language === 'th' ? 'รูปภาพหลัก (URL)' : 'Hero Image URL'}
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  {language === 'th' ? 'รูปหลักที่แสดงบนการ์ดสาขา (แนะนำ: อัปโหลดรูปเอง)' : 'Primary image shown on branch card (recommended: upload your own)'}
                </p>
                <Input
                  value={heroUrl}
                  onChange={(e) => setHeroUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-8 text-xs"
                />
                {heroUrl && (
                  <img
                    src={heroUrl}
                    alt="Hero preview"
                    className="h-24 w-full object-cover rounded-lg border"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
              </div>

              {/* Google Place ID */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Google Place ID</Label>
                <Input
                  value={placeId}
                  onChange={(e) => setPlaceId(e.target.value)}
                  placeholder="ChIJ..."
                  className="h-8 text-xs"
                />
              </div>

              {/* Google Maps URL */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Google Maps URL</Label>
                <Input
                  value={mapsUrl}
                  onChange={(e) => setMapsUrl(e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="h-8 text-xs"
                />
              </div>

              {/* Save button */}
              <Button onClick={handleSave} disabled={saving} size="sm" className="w-full gap-1">
                {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                {language === 'th' ? 'บันทึก' : 'Save'}
              </Button>

              {/* Google Sync Section */}
              <div className="border-t pt-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">
                  {language === 'th' ? 'ข้อมูล Google' : 'Google Data'}
                </p>

                {branch?.google_rating != null && (
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-bold">{branch.google_rating}</span>
                    <span className="text-muted-foreground text-xs">
                      ({branch.google_review_count?.toLocaleString() || 0} {language === 'th' ? 'รีวิว' : 'reviews'})
                    </span>
                  </div>
                )}

                {/* Google photo preview */}
                {branch?.google_photo_url && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground font-medium">
                      {language === 'th' ? 'รูปจาก Google (แคชใน Storage)' : 'Google Photo (cached in Storage)'}
                    </p>
                    <img
                      src={branch.google_photo_url}
                      alt="Google photo"
                      className="h-20 w-full object-cover rounded-lg border"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px] h-6 gap-1 px-2"
                      onClick={handleUseGoogleAsHero}
                    >
                      <Copy className="h-2.5 w-2.5" />
                      {language === 'th' ? 'ใช้เป็นรูปหลัก' : 'Use as hero image'}
                    </Button>
                  </div>
                )}

                {/* Photo index selector */}
                <div className="space-y-1">
                  <Label className="text-[10px] font-medium text-muted-foreground">
                    {language === 'th' ? 'เลือกรูป Google (ลำดับ)' : 'Google Photo Index'}
                  </Label>
                  <Select value={String(photoIndex)} onValueChange={(v) => setPhotoIndex(Number(v))}>
                    <SelectTrigger className="h-7 text-xs w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                        <SelectItem key={i} value={String(i)}>
                          {language === 'th' ? `รูปที่ ${i + 1}` : `Photo ${i + 1}`}
                          {totalPhotos > 0 && i >= totalPhotos && ` (${language === 'th' ? 'ไม่มี' : 'N/A'})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {totalPhotos > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      {language === 'th' ? `Google มี ${totalPhotos} รูป` : `${totalPhotos} photos available`}
                    </p>
                  )}
                </div>

                {/* Sync button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1 text-xs"
                  onClick={handleSync}
                  disabled={syncing || !placeId.trim()}
                >
                  {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
                  {language === 'th' ? 'ซิงค์ข้อมูล Google' : 'Sync Google Info'}
                </Button>
                {!placeId.trim() && (
                  <p className="text-[10px] text-muted-foreground">
                    {language === 'th' ? 'กรอก Google Place ID ก่อนซิงค์' : 'Enter Google Place ID first'}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
