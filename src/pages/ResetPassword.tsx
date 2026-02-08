import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Lock, Loader2, CheckCircle2, Eye, EyeOff, Heart, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n';
import swingLogo from '@/assets/swing-logo.webp';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const { language } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has a valid session from the reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsValidSession(!!session);
    };
    checkSession();

    // Listen for auth state changes (when user clicks reset link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast.error(language === 'th' ? 'กรุณากรอกรหัสผ่านใหม่' : 'Please enter a new password');
      return;
    }

    if (password.length < 6) {
      toast.error(language === 'th' ? 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' : 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error(language === 'th' ? 'รหัสผ่านไม่ตรงกัน' : 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.error('Password update error:', error);
        toast.error(error.message);
      } else {
        setSuccess(true);
        toast.success(
          language === 'th' 
            ? 'เปลี่ยนรหัสผ่านสำเร็จ!' 
            : 'Password updated successfully!'
        );
        // Redirect to home after 2 seconds
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 2000);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด กรุณาลองใหม่' : 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show error if no valid session
  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-destructive/20 rounded-full blur-3xl animate-pulse" />
        </div>

        <Card className="w-full max-w-md border-0 shadow-2xl backdrop-blur-xl bg-card/80">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              {language === 'th' ? 'ลิงก์ไม่ถูกต้องหรือหมดอายุ' : 'Invalid or Expired Link'}
            </CardTitle>
            <CardDescription className="text-base">
              {language === 'th' 
                ? 'ลิงก์รีเซ็ตรหัสผ่านนี้ไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอลิงก์ใหม่'
                : 'This password reset link is invalid or has expired. Please request a new one.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => navigate('/forgot-password')}
            >
              {language === 'th' ? 'ขอลิงก์ใหม่' : 'Request New Link'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <Card className="border-0 shadow-2xl backdrop-blur-xl bg-card/80">
          <CardHeader className="text-center space-y-4 pb-2">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shadow-lg">
                <img 
                  src={swingLogo} 
                  alt="Swing Logo" 
                  className="w-14 h-14 object-contain"
                />
              </div>
            </div>

            {success ? (
              <>
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-success" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold">
                  {language === 'th' ? 'เปลี่ยนรหัสผ่านสำเร็จ!' : 'Password Updated!'}
                </CardTitle>
                <CardDescription className="text-base">
                  {language === 'th' 
                    ? 'รหัสผ่านของคุณถูกเปลี่ยนเรียบร้อยแล้ว กำลังพาคุณไปหน้าหลัก...'
                    : 'Your password has been updated. Redirecting you to home...'}
                </CardDescription>
              </>
            ) : (
              <>
                <CardTitle className="text-2xl font-bold">
                  {language === 'th' ? 'ตั้งรหัสผ่านใหม่' : 'Set New Password'}
                </CardTitle>
                <CardDescription className="text-base">
                  {language === 'th' 
                    ? 'กรอกรหัสผ่านใหม่ของคุณด้านล่าง'
                    : 'Enter your new password below.'}
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="pt-4">
            {success ? (
              <div className="flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">
                    {language === 'th' ? 'รหัสผ่านใหม่' : 'New Password'}
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={language === 'th' ? 'อย่างน้อย 6 ตัวอักษร' : 'At least 6 characters'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 border-2 focus:border-primary transition-all"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    {language === 'th' ? 'ยืนยันรหัสผ่านใหม่' : 'Confirm New Password'}
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder={language === 'th' ? 'กรอกรหัสผ่านอีกครั้ง' : 'Enter password again'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 border-2 focus:border-primary transition-all"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      {language === 'th' ? 'กำลังบันทึก...' : 'Saving...'}
                    </>
                  ) : (
                    language === 'th' ? 'บันทึกรหัสผ่านใหม่' : 'Save New Password'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Privacy footer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Heart className="w-3 h-3 text-primary" />
          <span>
            {language === 'th' 
              ? 'ข้อมูลของคุณปลอดภัยและเป็นความลับ'
              : 'Your data is safe and confidential'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
