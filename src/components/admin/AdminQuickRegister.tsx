import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Loader2, UserPlus, ScanLine } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { GENDER_OPTIONS, validateThaiId } from '@/components/hiv-selftest/types';
import { ThaiIdScanner } from '@/components/hiv-selftest/ThaiIdScanner';

interface Props {
  userBranch: string | null;
}

export default function AdminQuickRegister({ userBranch }: Props) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [thaiId, setThaiId] = useState('');
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [thaiIdError, setThaiIdError] = useState<string | null>(null);

  const branch = userBranch || 'silom';

  const handleThaiIdChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 13);
    setThaiId(clean);
    if (clean.length === 13) {
      setThaiIdError(validateThaiId(clean) ? null : (language === 'th' ? 'เลขไม่ถูกต้อง' : 'Invalid ID'));
    } else {
      setThaiIdError(null);
    }
  };

  const handleScan = (data: Record<string, string | undefined>) => {
    if (data.thaiId) handleThaiIdChange(data.thaiId);
    if (data.fullNameTh) setFullName(data.fullNameTh);
    if (data.fullNameEn && !data.fullNameTh) setFullName(data.fullNameEn);
    if (data.dateOfBirth) setDateOfBirth(data.dateOfBirth);
    if (data.gender) setGender(data.gender);
  };

  // Generate a cryptographically secure random password
  const generateSecurePassword = (): string => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => charset[byte % charset.length]).join('');
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (thaiId.length !== 13 || thaiIdError) {
      toast.error(language === 'th' ? 'กรุณากรอกเลขบัตรประชาชนให้ถูกต้อง' : 'Please enter valid Thai ID');
      return;
    }

    setLoading(true);
    try {
      // Create account for client
      const suffix = thaiId.slice(-6);
      const randomPart = Math.random().toString(36).slice(-4);
      const username = `user_${suffix}_${randomPart}`;
      const email = `${username}@swingth.local`;
      const password = generateSecurePassword();

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: fullName || username },
        },
      });

      // If already registered, we still create the request record
      let userId = signUpData?.user?.id;

      if (signUpError && !signUpError.message.includes('already')) {
        throw signUpError;
      }

      // If signup returned no user (auto-confirm off), use service role via edge function
      // For now, create PII and request with the staff's auth context using a special approach
      // We'll create the PII record and request as the staff user, then the RLS allows admin/moderator

      // Since staff can't create records as another user via RLS, we insert directly
      // The staff user has admin/moderator role, so they can manage requests

      // Create PII record
      const { data: piiData, error: piiError } = await supabase.from('selftest_pii').insert({
        user_id: userId || user.id, // Use staff's ID if no user created
        full_name: fullName,
        thai_id: thaiId,
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
        phone: phone || null,
      }).select().single();

      if (piiError) throw piiError;

      // Create request as "received" (venue pickup, already confirmed)
      const { error: reqError } = await supabase.from('hiv_selftest_requests').insert({
        user_id: userId || user.id,
        pii_id: piiData.id,
        status: 'confirmed',
        assigned_branch: branch,
      });

      if (reqError) throw reqError;

      setSuccess(true);
      toast.success(language === 'th' ? '✅ ลงทะเบียนสำเร็จ' : '✅ Registration complete');
    } catch (err) {
      console.error('Quick register error:', err);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setThaiId('');
    setFullName('');
    setDateOfBirth('');
    setGender('');
    setPhone('');
    setThaiIdError(null);
    setSuccess(false);
  };

  if (success) {
    return (
      <Card className="p-6 text-center space-y-4 max-w-md mx-auto">
        <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
        <h3 className="text-xl font-bold text-success">
          {language === 'th' ? 'ลงทะเบียนสำเร็จ!' : 'Registration Complete!'}
        </h3>
        <p className="text-muted-foreground">
          {language === 'th'
            ? 'บันทึกการรับชุดตรวจที่หน้างานเรียบร้อยแล้ว'
            : 'Venue pickup has been recorded.'}
        </p>
        <Button onClick={handleReset} className="w-full">
          <UserPlus className="h-4 w-4 mr-2" />
          {language === 'th' ? 'ลงทะเบียนคนถัดไป' : 'Register Next Client'}
        </Button>
      </Card>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-3">
          <UserPlus className="h-6 w-6 text-primary" />
          <div>
            <h3 className="font-bold text-foreground">
              {language === 'th' ? 'ลงทะเบียนรับชุดตรวจหน้างาน' : 'Quick Venue Registration'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {language === 'th'
                ? 'สำหรับลูกค้าที่ไม่มีโทรศัพท์หรืออินเทอร์เน็ต'
                : 'For clients without phone or internet'}
            </p>
          </div>
        </div>
      </Card>

      {/* OCR Scanner */}
      <ThaiIdScanner onScanComplete={handleScan} />

      <Card className="p-4 space-y-3">
        <div className="space-y-2">
          <Label>{language === 'th' ? 'เลขบัตรประชาชน' : 'Thai ID'} *</Label>
          <Input
            inputMode="numeric"
            value={thaiId}
            onChange={(e) => handleThaiIdChange(e.target.value)}
            maxLength={13}
            className={thaiIdError ? 'border-destructive' : ''}
          />
          {thaiIdError && <p className="text-xs text-destructive">{thaiIdError}</p>}
        </div>

        <div className="space-y-2">
          <Label>{language === 'th' ? 'ชื่อ-นามสกุล' : 'Full Name'}</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>{language === 'th' ? 'วันเกิด' : 'DOB'}</Label>
            <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} max={new Date().toISOString().split('T')[0]} />
          </div>
          <div className="space-y-2">
            <Label>{language === 'th' ? 'เพศ' : 'Gender'}</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger><SelectValue placeholder={language === 'th' ? 'เลือก' : 'Select'} /></SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{language === 'th' ? o.labelTh : o.labelEn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{language === 'th' ? 'เบอร์โทร' : 'Phone'} ({language === 'th' ? 'ไม่บังคับ' : 'optional'})</Label>
          <Input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </Card>

      <Button onClick={handleSubmit} disabled={loading || thaiId.length !== 13 || !!thaiIdError} className="w-full gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {language === 'th' ? 'บันทึกและยืนยันรับชุดตรวจ' : 'Save & Confirm Pickup'}
      </Button>
    </div>
  );
}
