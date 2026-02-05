import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/lib/i18n';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Shield, Lock, User, ArrowLeft, Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// Helper to convert username to internal email format
// Accepts either plain username (e.g. staff_silom) OR full internal email (e.g. staff_silom@swingth.local)
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
    
    // Username validation
    if (!username.trim()) {
      newErrors.username = language === 'th' ? 'กรุณากรอกชื่อผู้ใช้' : 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = language === 'th' ? 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร' : 'Username must be at least 3 characters';
    } else if (username.length > 30) {
      newErrors.username = language === 'th' ? 'ชื่อผู้ใช้ต้องไม่เกิน 30 ตัวอักษร' : 'Username must be less than 30 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = language === 'th' ? 'ชื่อผู้ใช้ใช้ได้เฉพาะตัวอักษร ตัวเลข และ _' : 'Username can only contain letters, numbers, and _';
    }
    
    // Password validation
    if (!password) {
      newErrors.password = language === 'th' ? 'กรุณากรอกรหัสผ่าน' : 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = language === 'th' ? 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' : 'Password must be at least 6 characters';
    }
    
    // Registration-specific validations
    if (isRegisterMode) {
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
    
    const internalEmail = usernameToEmail(username);
    
    try {
      if (isRegisterMode) {
        // Registration - use username as display name
        const { data, error } = await signUp(internalEmail, password, username.trim());
        
        if (error) {
          if (error.message.includes('already registered')) {
            setErrors({ username: language === 'th' ? 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' : 'This username is already taken' });
          } else {
            setErrors({ username: error.message });
          }
          toast.error(language === 'th' ? 'การลงทะเบียนล้มเหลว' : 'Registration failed');
        } else if (data.user) {
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('currentUser', username.trim());
          toast.success(language === 'th' ? 'ลงทะเบียนสำเร็จ! ยินดีต้อนรับ' : 'Registration successful! Welcome');
          navigate('/onboarding');
        }
      } else {
        // Login
        const { data, error } = await signIn(internalEmail, password);
        
        if (error) {
          setErrors({ username: language === 'th' ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : 'Invalid username or password' });
          toast.error(language === 'th' ? 'เข้าสู่ระบบล้มเหลว' : 'Login failed');
        } else if (data.user) {
          const displayName = data.user.user_metadata?.display_name || username.trim();
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('currentUser', displayName);
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
            : (language === 'th' ? 'กรอกชื่อผู้ใช้และรหัสผ่านเพื่อเข้าสู่ระบบ' : 'Enter your username and password')
          }
        </p>

        {/* Form */}
        <div className="w-full max-w-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground">
                {language === 'th' ? 'ชื่อผู้ใช้' : 'Username'}
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrors(prev => ({ ...prev, username: undefined }));
                  }}
                  placeholder={language === 'th' ? 'กรอกชื่อผู้ใช้' : 'Enter username'}
                  className={`pl-10 ${errors.username ? 'border-destructive' : ''}`}
                  required
                  autoComplete="username"
                  maxLength={30}
                />
              </div>
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username}</p>
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