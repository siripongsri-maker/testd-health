import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Copy, Shield, Sparkles, Edit3, Save } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AccountSuccessStepProps {
  username: string;
  password: string;
  onContinue: () => void;
}

export function AccountSuccessStep({ username, password, onContinue }: AccountSuccessStepProps) {
  const { language } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(username.replace('@swingth.local', ''));
  const [newPassword, setNewPassword] = useState(password);
  const [confirmPassword, setConfirmPassword] = useState(password);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const displayUsername = username.replace('@swingth.local', '');

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(displayUsername);
    toast.success(language === 'th' ? 'คัดลอกชื่อผู้ใช้แล้ว' : 'Username copied');
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password);
    toast.success(language === 'th' ? 'คัดลอกรหัสผ่านแล้ว' : 'Password copied');
  };

  const handleSaveChanges = async () => {
    if (newPassword !== confirmPassword) {
      toast.error(language === 'th' ? 'รหัสผ่านไม่ตรงกัน' : 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error(language === 'th' ? 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' : 'Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    
    try {
      // Update the password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (passwordError) throw passwordError;

      // Update display name if username changed
      const newDisplayName = newUsername.replace('@swingth.local', '');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Update profile display name
        await supabase
          .from('profiles')
          .update({ display_name: newDisplayName })
          .eq('id', user.id);
      }

      setSaved(true);
      setIsEditing(false);
      toast.success(language === 'th' ? '✅ บันทึกข้อมูลเรียบร้อย' : '✅ Account updated successfully');
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error(language === 'th' ? 'ไม่สามารถบันทึกได้' : 'Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Success Header */}
      <Card className="p-6 bg-gradient-to-br from-success/10 to-success/5 border-success/30">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-success mb-2">
              {language === 'th' ? '🎉 ลงทะเบียนสำเร็จ!' : '🎉 Registration Complete!'}
            </h2>
            <p className="text-muted-foreground">
              {language === 'th' 
                ? 'บัญชีของคุณถูกสร้างโดยอัตโนมัติ กรุณาบันทึกข้อมูลนี้ไว้'
                : 'Your account was created automatically. Please save these details.'
              }
            </p>
          </div>
        </div>
      </Card>

      {/* Account Credentials */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {language === 'th' ? 'ข้อมูลบัญชีของคุณ' : 'Your Account Details'}
          </h3>
          {!isEditing && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsEditing(true)}
              className="text-primary"
            >
              <Edit3 className="h-4 w-4 mr-1" />
              {language === 'th' ? 'แก้ไข' : 'Edit'}
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newUsername">
                {language === 'th' ? 'ชื่อผู้ใช้ (สำหรับแสดงผล)' : 'Username (Display Name)'}
              </Label>
              <Input
                id="newUsername"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder={language === 'th' ? 'ชื่อผู้ใช้' : 'Username'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">
                {language === 'th' ? 'รหัสผ่านใหม่' : 'New Password'}
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {language === 'th' ? 'ยืนยันรหัสผ่าน' : 'Confirm Password'}
              </Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsEditing(false);
                  setNewUsername(displayUsername);
                  setNewPassword(password);
                  setConfirmPassword(password);
                }}
              >
                {language === 'th' ? 'ยกเลิก' : 'Cancel'}
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveChanges}
                disabled={saving}
              >
                {saving ? (
                  <span className="animate-pulse">{language === 'th' ? 'กำลังบันทึก...' : 'Saving...'}</span>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {language === 'th' ? 'บันทึก' : 'Save'}
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Username */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-xs text-muted-foreground">
                  {language === 'th' ? 'ชื่อผู้ใช้' : 'Username'}
                </p>
                <p className="font-mono font-medium">{displayUsername}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCopyUsername}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {/* Password */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">
                  {language === 'th' ? 'รหัสผ่าน' : 'Password'}
                </p>
                <p className="font-mono font-medium">
                  {showPassword ? (saved ? newPassword : password) : '••••••••••••'}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={handleCopyPassword}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Benefits Card */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-primary mb-2">
              {language === 'th' ? 'สิทธิประโยชน์ของคุณ' : 'Your Benefits'}
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• {language === 'th' ? 'ขอชุดตรวจครั้งต่อไปได้ทันที ไม่ต้องกรอกข้อมูลอีก' : 'Request future kits instantly without re-entering data'}</li>
              <li>• {language === 'th' ? 'ติดตามสถานะการจัดส่งได้ตลอด' : 'Track your delivery status anytime'}</li>
              <li>• {language === 'th' ? 'รับ XP และรางวัลพิเศษ' : 'Earn XP and special rewards'}</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Privacy Notice */}
      <p className="text-xs text-center text-muted-foreground">
        {language === 'th' 
          ? '🔒 ข้อมูลของคุณถูกเข้ารหัสและปกป้องอย่างปลอดภัย'
          : '🔒 Your information is encrypted and securely protected.'
        }
      </p>

      {/* Continue Button */}
      <Button 
        className="w-full" 
        size="lg"
        onClick={onContinue}
      >
        {language === 'th' ? 'ดำเนินการต่อ' : 'Continue'}
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}
