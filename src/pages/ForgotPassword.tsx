import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, Loader2, CheckCircle2, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n';
import swingLogo from '@/assets/swing-logo.webp';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { language } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error(language === 'th' ? 'กรุณากรอกอีเมล' : 'Please enter your email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error(language === 'th' ? 'รูปแบบอีเมลไม่ถูกต้อง' : 'Invalid email format');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('Password reset error:', error);
        toast.error(error.message);
      } else {
        setEmailSent(true);
        toast.success(
          language === 'th' 
            ? 'ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว' 
            : 'Password reset link sent to your email'
        );
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด กรุณาลองใหม่' : 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Back to login link */}
        <Link 
          to="/auth" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          {language === 'th' ? 'กลับไปหน้าเข้าสู่ระบบ' : 'Back to login'}
        </Link>

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

            {emailSent ? (
              <>
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-success" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold">
                  {language === 'th' ? 'ส่งอีเมลแล้ว!' : 'Email Sent!'}
                </CardTitle>
                <CardDescription className="text-base">
                  {language === 'th' 
                    ? 'เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว กรุณาตรวจสอบกล่องจดหมายของคุณ'
                    : 'We\'ve sent a password reset link to your email. Please check your inbox.'}
                </CardDescription>
              </>
            ) : (
              <>
                <CardTitle className="text-2xl font-bold">
                  {language === 'th' ? 'ลืมรหัสผ่าน?' : 'Forgot Password?'}
                </CardTitle>
                <CardDescription className="text-base">
                  {language === 'th' 
                    ? 'กรอกอีเมลที่ลงทะเบียนไว้ เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้คุณ'
                    : 'Enter your registered email and we\'ll send you a reset link.'}
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="pt-4">
            {emailSent ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  {language === 'th' 
                    ? 'ไม่ได้รับอีเมล? ตรวจสอบโฟลเดอร์สแปมของคุณหรือ'
                    : 'Didn\'t receive the email? Check your spam folder or'}
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setEmailSent(false);
                    setEmail('');
                  }}
                >
                  {language === 'th' ? 'ลองอีกครั้ง' : 'Try again'}
                </Button>
                <Link to="/auth">
                  <Button className="w-full">
                    {language === 'th' ? 'กลับไปหน้าเข้าสู่ระบบ' : 'Back to login'}
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    {language === 'th' ? 'อีเมล' : 'Email'}
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={language === 'th' ? 'กรอกอีเมลของคุณ' : 'Enter your email'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 border-2 focus:border-primary transition-all"
                      disabled={loading}
                    />
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
                      {language === 'th' ? 'กำลังส่ง...' : 'Sending...'}
                    </>
                  ) : (
                    language === 'th' ? 'ส่งลิงก์รีเซ็ตรหัสผ่าน' : 'Send Reset Link'
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

export default ForgotPassword;
