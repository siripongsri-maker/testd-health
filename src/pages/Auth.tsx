import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/lib/i18n';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Shield, Lock, User, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Hardcoded admin credentials
const ADMIN_USERNAME = 'admin2024';
const ADMIN_PASSWORD = '2004swingth';

export default function Auth() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setErrors({});
    
    // Simulate a brief delay for UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // Store login state in localStorage
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('currentUser', ADMIN_USERNAME);
      toast.success(language === 'th' ? 'เข้าสู่ระบบสำเร็จ' : 'Login successful');
      navigate('/');
    } else {
      setErrors({
        username: language === 'th' ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : 'Invalid username or password',
      });
      toast.error(language === 'th' ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : 'Invalid username or password');
    }
    
    setIsSubmitting(false);
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
            <Shield className="h-10 w-10 text-primary-foreground" />
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          {language === 'th' ? 'เข้าสู่ระบบ' : 'Login'}
        </h1>
        <p className="mb-6 text-muted-foreground text-center">
          {language === 'th' ? 'กรอกชื่อผู้ใช้และรหัสผ่าน' : 'Enter your username and password'}
        </p>

        {/* Username/Password Form */}
        <div className="w-full max-w-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
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
                />
              </div>
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username}</p>
              )}
            </div>

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
                  placeholder={language === 'th' ? 'กรอกรหัสผ่าน' : 'Enter password'}
                  className={`pl-10 pr-10 ${errors.password ? 'border-destructive' : ''}`}
                  required
                  autoComplete="current-password"
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

            <Button 
              type="submit" 
              variant="hero" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                language === 'th' ? 'เข้าสู่ระบบ' : 'Login'
              )}
            </Button>
          </form>
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
