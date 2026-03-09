import { useState, useRef } from 'react';
import { Camera, X, SkipForward, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/hooks/useAnalytics';

interface Props {
  onComplete: (photoUrl: string | null) => void;
  onBack: () => void;
}

export function PreventionPhotoUpload({ onComplete, onBack }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return; // 5MB max
    const url = URL.createObjectURL(file);
    setPreview(url);
    trackEvent('prevention_match_photo_uploaded');
  };

  const handleRemove = () => {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md animate-fade-in space-y-6">
        <div className="glass rounded-3xl p-6 text-center space-y-6 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-primary/15 via-pink-500/10 to-purple-500/15 rounded-full blur-3xl" />

          <div className="relative z-10 space-y-5">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/80 to-pink-500/80 flex items-center justify-center">
              <Camera className="text-white h-8 w-8" strokeWidth={1.5} />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">เพิ่มรูปของคุณ</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                เพิ่มรูปเพื่อทำการ์ดผลลัพธ์ให้สนุกขึ้น
                <br />
                <span className="text-xs">ไม่บังคับ — ข้ามได้เลย</span>
              </p>
            </div>

            {preview ? (
              <div className="relative inline-block">
                <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-primary/30 mx-auto">
                  <img src={preview} alt="preview" className="w-full h-full object-cover" />
                </div>
                <button
                  onClick={handleRemove}
                  className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => inputRef.current?.click()}
                className="mx-auto w-32 h-32 rounded-full border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1.5 hover:border-primary/50 transition-colors"
              >
                <ImagePlus className="h-8 w-8 text-muted-foreground/50" />
                <span className="text-[10px] text-muted-foreground/60">แตะเพื่อเลือกรูป</span>
              </button>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />

            <div className="space-y-2.5 pt-2">
              <Button
                className="w-full rounded-xl h-11"
                onClick={() => onComplete(preview)}
              >
                {preview ? 'ดำเนินการต่อ' : 'ข้ามขั้นตอนนี้'}
                {!preview && <SkipForward className="h-4 w-4 ml-1.5" />}
              </Button>
              <Button variant="ghost" className="w-full rounded-xl h-10 text-sm" onClick={onBack}>
                ย้อนกลับ
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground/50">
              รูปจะใช้ตกแต่งการ์ดเท่านั้น ไม่มีการวิเคราะห์ใบหน้า
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
