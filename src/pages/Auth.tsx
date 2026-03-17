import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/lib/i18n';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Shield, Lock, User, ArrowLeft, Eye, EyeOff, Loader2, UserPlus, Sparkles, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { SocialLoginButtons } from '@/components/SocialLoginButtons';
import { supabase } from '@/integrations/supabase/client';

// Helper to convert username to internal email format
const usernameToEmail = (value: string) => {
  const v = value.toLowerCase().trim();
  if (!v) return v;
  return v.includes('@') ? v : `${v}@swingth.local`;
};

export default function Auth() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string; confirmPassword?: string }>({});
  
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    const trimmed = username.trim();

    // In register mode we require a real email so users can receive verification/reset emails.
    if (!trimmed) {
      newErrors.username = language === 'th'
        ? (isRegisterMode ? 'กรุณากรอกอีเมล' : 'กรุณากรอกชื่อผู้ใช้')
        : (isRegisterMode ? 'Email is required' : 'Username is required');
    } else if (isRegisterMode) {
      // Basic email validation (keep it simple here; backend will validate too)
      const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
      if (!emailLike) {
        newErrors.username = language === 'th'
          ? 'สมัครสมาชิกต้องใช้อีเมลจริง (เช่น name@gmail.com)'
          : 'Registration requires a real email address (e.g. name@gmail.com)';
      }
    } else {
      // Login mode supports username shorthand which maps to internal email.
      if (trimmed.length < 3) {
        newErrors.username = language === 'th' ? 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร' : 'Username must be at least 3 characters';
      } else if (trimmed.length > 30) {
        newErrors.username = language === 'th' ? 'ชื่อผู้ใช้ต้องไม่เกิน 30 ตัวอักษร' : 'Username must be less than 30 characters';
      } else if (!/^[a-zA-Z0-9_]+$/.test(trimmed) && !trimmed.includes('@')) {
        newErrors.username = language === 'th' ? 'ชื่อผู้ใช้ใช้ได้เฉพาะตัวอักษร ตัวเลข และ _' : 'Username can only contain letters, numbers, and _';
      }
    }

    if (!password) {
      newErrors.password = language === 'th' ? 'กรุณากรอกรหัสผ่าน' : 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = language === 'th' ? 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' : 'Password must be at least 6 characters';
    }

    if (isRegisterMode) {
      if (password !== confirmPassword) {
        newErrors.confirmPassword = language === 'th' ? 'รหัสผ่านไม่ตรงกัน' : 'Passwords do not match';
      }
    }

    setErrors(newErrors);

    // Make failures obvious on mobile (avoids feeling "stuck")
    if (Object.keys(newErrors).length > 0) {
      toast.error(language === 'th' ? 'กรุณาตรวจสอบข้อมูลที่กรอก' : 'Please check the form');
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setErrors({});
    
    const internalEmail = isRegisterMode ? username.trim().toLowerCase() : usernameToEmail(username);
    
    try {
      if (isRegisterMode) {
        const { data, error } = await signUp(internalEmail, password, username.trim());
        
        if (error) {
          if (error.message.includes('already registered')) {
            setErrors({ username: language === 'th' ? 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' : 'This username is already taken' });
          } else {
            setErrors({ username: error.message });
          }
          toast.error(language === 'th' ? 'การลงทะเบียนล้มเหลว' : 'Registration failed');
        } else if (data.user) {
          // If email confirmation is enabled, Supabase returns user but no session.
          if (!data.session) {
            toast.success(
              language === 'th'
                ? 'ส่งลิงก์ยืนยันไปที่อีเมลแล้ว กรุณายืนยันก่อนเข้าสู่ระบบ'
                : 'We sent a confirmation email. Please verify it before signing in.'
            );
            setIsRegisterMode(false);
            setPassword('');
            setConfirmPassword('');
          } else {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('currentUser', username.trim());
            toast.success(language === 'th' ? 'ลงทะเบียนสำเร็จ! ยินดีต้อนรับ' : 'Registration successful! Welcome');
            navigate('/onboarding', { replace: true });
          }
        }
      } else {
        const { data, error } = await signIn(internalEmail, password);
        
        if (error) {
          setErrors({ username: language === 'th' ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : 'Invalid username or password' });
          toast.error(language === 'th' ? 'เข้าสู่ระบบล้มเหลว' : 'Login failed');
        } else if (data.user) {
          const displayName = data.user.user_metadata?.display_name || username.trim();
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('currentUser', displayName);
          toast.success(language === 'th' ? 'เข้าสู่ระบบสำเร็จ' : 'Login successful');
          // Always redirect to home page, never to admin
          navigate('/', { replace: true });
        }
      }
    } catch (err) {
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด กรุณาลองใหม่' : 'An error occurred. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setErrors({});
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>
      
      {/* Header */}
      <div className="relative flex items-center justify-between p-4 safe-top">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/')}
          className="text-muted-foreground hover:text-foreground hover:bg-background/50 backdrop-blur-sm rounded-xl transition-all duration-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <LanguageToggle />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Logo with Animation */}
        <div className="mb-8 animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-xl animate-pulse" />
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary via-primary to-accent shadow-2xl shadow-primary/30 transition-transform duration-300 hover:scale-105">
              {isRegisterMode ? (
                <UserPlus className="h-12 w-12 text-primary-foreground drop-shadow-lg" />
              ) : (
                <Shield className="h-12 w-12 text-primary-foreground drop-shadow-lg" />
              )}
            </div>
            <div className="absolute -top-1 -right-1 h-6 w-6 bg-accent rounded-full flex items-center justify-center shadow-lg">
              <Sparkles className="h-3.5 w-3.5 text-accent-foreground" />
            </div>
          </div>
        </div>

        {/* Title with Animation */}
        <div className="text-center mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">
            {isRegisterMode 
              ? (language === 'th' ? 'สร้างบัญชีใหม่' : 'Create Account')
              : (language === 'th' ? 'ยินดีต้อนรับกลับ' : 'Welcome Back')
            }
          </h1>
          <p className="text-muted-foreground">
            {isRegisterMode
              ? (language === 'th' ? 'เริ่มต้นดูแลสุขภาพของคุณวันนี้' : 'Start your health journey today')
              : (language === 'th' ? 'เข้าสู่ระบบเพื่อดำเนินการต่อ' : 'Sign in to continue')
            }
          </p>
        </div>

        {/* Card Container */}
        <div className="w-full max-w-sm animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="backdrop-blur-xl bg-card/80 border border-border/50 rounded-3xl p-6 shadow-2xl shadow-primary/5">
            {/* Social Login First */}
            <div className="mb-6">
              <SocialLoginButtons mode="login" onSuccess={() => navigate('/')} />
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card/80 px-4 text-muted-foreground font-medium">
                  {language === 'th' ? 'หรือใช้ชื่อผู้ใช้' : 'or use username'}
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground font-medium text-sm">
                  {isRegisterMode
                    ? (language === 'th' ? 'อีเมล' : 'Email')
                    : (language === 'th' ? 'ชื่อผู้ใช้' : 'Username')}
                </Label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/5 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity -m-0.5 pointer-events-none" />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setErrors(prev => ({ ...prev, username: undefined }));
                    }}
                    placeholder={isRegisterMode
                      ? (language === 'th' ? 'name@gmail.com' : 'name@gmail.com')
                      : (language === 'th' ? 'กรอกชื่อผู้ใช้' : 'Enter username')}

                    className={`pl-10 h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-all ${errors.username ? 'border-destructive focus:ring-destructive' : 'focus:border-primary focus:ring-primary/20'}`}
                    required
                    autoComplete={isRegisterMode ? 'email' : 'username'}
                    maxLength={isRegisterMode ? 255 : 30}
                    autoFocus
                  />
                </div>
                {errors.username && (
                  <p className="text-sm text-destructive flex items-center gap-1.5">
                    <span className="inline-block w-1 h-1 bg-destructive rounded-full" />
                    {errors.username}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium text-sm">
                  {language === 'th' ? 'รหัสผ่าน' : 'Password'}
                </Label>
                <div className="relative group">
                   <div className="absolute inset-0 bg-primary/5 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity -m-0.5 pointer-events-none" />
                   <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                     id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    placeholder={language === 'th' ? 'อย่างน้อย 6 ตัวอักษร' : 'Min 6 characters'}
                    className={`pl-10 pr-10 h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-all ${errors.password ? 'border-destructive focus:ring-destructive' : 'focus:border-primary focus:ring-primary/20'}`}
                    required
                    autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive flex items-center gap-1.5">
                    <span className="inline-block w-1 h-1 bg-destructive rounded-full" />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password (Register only) */}
              {isRegisterMode && (
                <div className="space-y-2 animate-fade-in">
                  <Label htmlFor="confirmPassword" className="text-foreground font-medium text-sm">
                    {language === 'th' ? 'ยืนยันรหัสผ่าน' : 'Confirm Password'}
                  </Label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-primary/5 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity -m-0.5 pointer-events-none" />
                     <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                     <Input
                       id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                      }}
                      placeholder={language === 'th' ? 'กรอกรหัสผ่านอีกครั้ง' : 'Confirm your password'}
                      className={`pl-10 h-12 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-all ${errors.confirmPassword ? 'border-destructive focus:ring-destructive' : 'focus:border-primary focus:ring-primary/20'}`}
                      autoComplete="new-password"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive flex items-center gap-1.5">
                      <span className="inline-block w-1 h-1 bg-destructive rounded-full" />
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {isRegisterMode 
                      ? (language === 'th' ? 'สร้างบัญชี' : 'Create Account')
                      : (language === 'th' ? 'เข้าสู่ระบบ' : 'Sign In')
                    }
                  </>
                )}
              </Button>
            </form>

            {/* Forgot Password Link (Login mode only) */}
            {!isRegisterMode && (
              <div className="mt-4 text-center">
                <Link
                  to="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {language === 'th' ? 'ลืมรหัสผ่าน?' : 'Forgot password?'}
                </Link>
              </div>
            )}

            {/* Toggle between Login/Register */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isRegisterMode
                  ? (language === 'th' ? 'มีบัญชีแล้ว? ' : 'Already have an account? ')
                  : (language === 'th' ? 'ยังไม่มีบัญชี? ' : "Don't have an account? ")
                }
                <span className="font-semibold text-primary">
                  {isRegisterMode
                    ? (language === 'th' ? 'เข้าสู่ระบบ' : 'Sign In')
                    : (language === 'th' ? 'ลงทะเบียน' : 'Sign Up')
                  }
                </span>
              </button>
            </div>
          </div>

          {/* Guest mode */}
          <div className="mt-6 text-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <button
              type="button"
              onClick={() => {
                toast.success(language === 'th' ? 'เข้าใช้งานแบบผู้เยี่ยมชม' : 'Continuing as guest');
                navigate('/');
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              {language === 'th' ? 'ข้ามไปก่อน ' : 'Skip for now '}
              <span className="text-primary group-hover:underline">
                {language === 'th' ? 'เข้าใช้งานแบบผู้เยี่ยมชม' : 'Continue as guest'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative px-6 pb-8 text-center safe-bottom animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 backdrop-blur-sm">
          <Heart className="h-3.5 w-3.5 text-primary" />
          <p className="text-xs text-muted-foreground">
            {language === 'th' ? 'ข้อมูลของคุณปลอดภัยและเป็นความลับ' : 'Your data is secure and confidential'}
          </p>
        </div>
      </div>
    </div>
  );
}
