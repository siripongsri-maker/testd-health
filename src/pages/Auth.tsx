import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Shield, Mail, Lock, User, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().email();
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const { signIn, signUp, user, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = t('auth.invalidEmail');
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = t('auth.passwordTooShort');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error(t('auth.invalidCredentials'));
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success(t('auth.loginSuccess'));
          navigate('/dashboard');
        }
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          if (error.message.includes('User already registered')) {
            toast.error(t('auth.userExists'));
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success(t('auth.signupSuccess'));
          navigate('/onboarding');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="animate-pulse text-primary">
          <Shield className="h-12 w-12" />
        </div>
      </div>
    );
  }

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
        <div className="mb-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full gradient-primary shadow-soft">
            <Shield className="h-10 w-10 text-primary-foreground" />
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          {isLogin ? t('auth.login') : t('auth.signup')}
        </h1>
        <p className="mb-8 text-muted-foreground text-center">
          {isLogin ? t('auth.loginSubtitle') : t('auth.signupSubtitle')}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-foreground">
                {t('auth.displayName')}
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t('auth.displayNamePlaceholder')}
                  className="pl-10"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
              {t('auth.email')}
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
                placeholder={t('auth.emailPlaceholder')}
                className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                required
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">
              {t('auth.password')}
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
                placeholder={t('auth.passwordPlaceholder')}
                className={`pl-10 pr-10 ${errors.password ? 'border-destructive' : ''}`}
                required
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
            className="w-full mt-6"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="animate-spin h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
            ) : (
              isLogin ? t('auth.loginButton') : t('auth.signupButton')
            )}
          </Button>
        </form>

        {/* Toggle login/signup */}
        <div className="mt-6 text-center">
          <p className="text-muted-foreground">
            {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
          </p>
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrors({});
            }}
            className="text-primary font-semibold hover:underline"
          >
            {isLogin ? t('auth.signupLink') : t('auth.loginLink')}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-8 text-center safe-bottom">
        <p className="text-xs text-muted-foreground">{t('auth.privacyNote')}</p>
      </div>
    </div>
  );
}
