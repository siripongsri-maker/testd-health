import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, Loader2, AlertTriangle, ScanLine } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ScannedData {
  thaiId?: string;
  fullNameTh?: string;
  fullNameEn?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
}

interface ThaiIdScannerProps {
  onScanComplete: (data: ScannedData) => void;
}

export function ThaiIdScanner({ onScanComplete }: ThaiIdScannerProps) {
  const { language } = useLanguage();
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);

    try {
      // Convert to base64 — image is NOT stored anywhere
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('scan-thai-id', {
        body: { imageBase64: base64 },
      });

      if (error) throw error;

      if (data?.data) {
        onScanComplete(data.data);
        toast.success(language === 'th' ? 'สแกนสำเร็จ!' : 'Scan complete!');
      } else if (data?.error) {
        toast.error(language === 'th' ? 'ไม่สามารถอ่านข้อมูลได้ กรุณาลองใหม่' : 'Could not read data. Please try again.');
      }
    } catch (err) {
      console.error('OCR error:', err);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด กรุณากรอกข้อมูลด้วยตนเอง' : 'Error occurred. Please enter data manually.');
    } finally {
      setScanning(false);
      // Reset file input
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Card className="p-3 border-primary/20 bg-primary/5">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        className="hidden"
      />

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20">
          <ScanLine className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {language === 'th' ? 'สแกนบัตรประชาชน' : 'Scan Thai ID Card'}
          </p>
          <p className="text-xs text-muted-foreground">
            {language === 'th' ? 'ถ่ายรูปเพื่อกรอกข้อมูลอัตโนมัติ' : 'Take photo to auto-fill'}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={scanning}
          className="shrink-0"
        >
          {scanning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Privacy notice */}
      <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
        <AlertTriangle className="h-3 w-3 shrink-0" />
        {language === 'th'
          ? 'ระบบไม่เก็บรูปบัตร เก็บเฉพาะข้อมูลตัวอักษร'
          : 'System does NOT store the card image. Only text data is saved.'}
      </p>
    </Card>
  );
}
