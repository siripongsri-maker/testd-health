import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/lib/i18n';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Shield, Lock, User, ArrowLeft, Eye, EyeOff, Loader2, Mail, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export default function Auth() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; displayName?: string }>({});
  
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    
    // Email validation
    if (!email) {
      newErrors.email = language === 'th' ? 'กรุณากรอกอีเมล' : 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = language === 'th' ? 'รูปแบบอีเมลไม่ถูกต้อง' : 'Invalid email format';
    }
    
    // Password validation
    if (!password) {
      newErrors.password = language === 'th' ? 'กรุณากรอกรหัสผ่าน' : 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = language === 'th' ? 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' : 'Password must be at least 6 characters';
    }
    
    // Registration-specific validations
    if (isRegisterMode) {
      if (!displayName.trim()) {
        newErrors.displayName = language === 'th' ? 'กรุณากรอกชื่อที่แสดง' : 'Display name is required';
      } else if (displayName.length > 50) {
        newErrors.displayName = language === 'th' ? 'ชื่อต้องไม่เกิน 50 ตัวอักษร' : 'Display name must be less than 50 characters';
      }
      
      if (password !== confirmPassword) {
        newErrors.confirmPassword = language === 'th' ? 'รหัสผ่านไม่ตรงกัน' : 'Passwords do not match';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setErrors({});
    
    try {
      if (isRegisterMode) {
        // Registration
        const { data, error } = await signUp(email, password, displayName.trim());
        
        if (error) {
          if (error.message.includes('already registered')) {
            setErrors({ email: language === 'th' ? 'อีเมลนี้ถูกใช้งานแล้ว' : 'This email is already registered' });
          } else {
            setErrors({ email: error.message });
          }
          toast.error(language === 'th' ? 'การลงทะเบียนล้มเหลว' : 'Registration failed');
        } else if (data.user) {
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('currentUser', displayName.trim());
          toast.success(language === 'th' ? 'ลงทะเบียนสำเร็จ! ยินดีต้อนรับ' : 'Registration successful! Welcome');
          navigate('/onboarding');
        }
      } else {
        // Login
        const { data, error } = await signIn(email, password);
        
        if (error) {
          setErrors({ email: language === 'th' ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : 'Invalid email or password' });
          toast.error(language === 'th' ? 'เข้าสู่ระบบล้มเหลว' : 'Login failed');
        } else if (data.user) {
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('currentUser', data.user.user_metadata?.display_name || email.split('@')[0]);
          toast.success(language === 'th' ? 'เข้าสู่ระบบสำเร็จ' : 'Login successful');
          navigate('/');
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
    <div className="min-h-screen gradient-hero flex flex-col relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 safe-top">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/')}
          className="text-muted-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <LanguageToggle />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Logo */}
        <div className="mb-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full gradient-primary shadow-soft">
            {isRegisterMode ? (
              <UserPlus className="h-10 w-10 text-primary-foreground" />
            ) : (
              <Shield className="h-10 w-10 text-primary-foreground" />
            )}
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          {isRegisterMode 
            ? (language === 'th' ? 'ลงทะเบียน' : 'Create Account')
            : (language === 'th' ? 'เข้าสู่ระบบ' : 'Login')
          }
        </h1>
        <p className="mb-6 text-muted-foreground text-center">
          {isRegisterMode
            ? (language === 'th' ? 'สร้างบัญชีใหม่เพื่อเริ่มต้นใช้งาน' : 'Create a new account to get started')
            : (language === 'th' ? 'กรอกอีเมลและรหัสผ่านเพื่อเข้าสู่ระบบ' : 'Enter your email and password to login')
          }
        </p>

        {/* Form */}
        <div className="w-full max-w-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name (Register only) */}
            {isRegisterMode && (
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-foreground">
                  {language === 'th' ? 'ชื่อที่แสดง' : 'Display Name'}
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setErrors(prev => ({ ...prev, displayName: undefined }));
                    }}
                    placeholder={language === 'th' ? 'กรอกชื่อที่ต้องการแสดง' : 'Enter your display name'}
                    className={`pl-10 ${errors.displayName ? 'border-destructive' : ''}`}
                    maxLength={50}
                  />
                </div>
                {errors.displayName && (
                  <p className="text-sm text-destructive">{errors.displayName}</p>
                )}
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                {language === 'th' ? 'อีเมล' : 'Email'}
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  placeholder={language === 'th' ? 'กรอกอีเมล' : 'Enter your email'}
                  className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                  required
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                {language === 'th' ? 'รหัสผ่าน' : 'Password'}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors(prev => ({ ...prev, password: undefined }));
                  }}
                  placeholder={language === 'th' ? 'กรอกรหัสผ่าน (อย่างน้อย 6 ตัว)' : 'Enter password (min 6 chars)'}
                  className={`pl-10 pr-10 ${errors.password ? 'border-destructive' : ''}`}
                  required
                  autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password (Register only) */}
            {isRegisterMode && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">
                  {language === 'th' ? 'ยืนยันรหัสผ่าน' : 'Confirm Password'}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                    }}
                    placeholder={language === 'th' ? 'กรอกรหัสผ่านอีกครั้ง' : 'Confirm your password'}
                    className={`pl-10 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                    autoComplete="new-password"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            <Button 
              type="submit" 
              variant="hero" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                isRegisterMode 
                  ? (language === 'th' ? 'ลงทะเบียน' : 'Create Account')
                  : (language === 'th' ? 'เข้าสู่ระบบ' : 'Login')
              )}
            </Button>
          </form>

          {/* Toggle between Login/Register */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm text-primary hover:underline"
            >
              {isRegisterMode
                ? (language === 'th' ? 'มีบัญชีแล้ว? เข้าสู่ระบบ' : 'Already have an account? Login')
                : (language === 'th' ? 'ยังไม่มีบัญชี? ลงทะเบียน' : "Don't have an account? Register")
              }
            </button>
          </div>
        </div>

        {/* Guest mode */}
        <div className="w-full max-w-sm mt-6">
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              toast.success(language === 'th' ? 'เข้าใช้งานแบบผู้เยี่ยมชม (ข้อมูลจะเก็บในเครื่อง)' : 'Continuing as guest (saved on this device)');
              navigate('/');
            }}
          >
            {language === 'th' ? 'เข้าใช้งานแบบผู้เยี่ยมชม' : 'Continue as guest'}
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-8 text-center safe-bottom">
        <p className="text-xs text-muted-foreground">
          {language === 'th' ? 'ข้อมูลของคุณจะถูกเก็บเป็นความลับ' : 'Your data is kept confidential'}
        </p>
      </div>
    </div>
  );
}