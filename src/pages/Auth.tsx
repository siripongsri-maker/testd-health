import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';
import { LanguageToggle } from '@/components/LanguageToggle';
import { PersonalInfoForm } from '@/components/PersonalInfoForm';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Mail, Lock, User, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
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
  
  // First-time user personal info collection
  const [showPersonalInfoForm, setShowPersonalInfoForm] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);
  
  const { signIn, signUp, user, loading } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  // Check if user needs to complete personal info
  useEffect(() => {
    const checkPersonalInfo = async () => {
      if (user && !loading) {
        const { data: personalInfo } = await supabase
          .from('user_personal_info')
          .select('profile_completed')
          .eq('user_id', user.id)
          .single();
        
        if (!personalInfo || !personalInfo.profile_completed) {
          setNewUserId(user.id);
          setShowPersonalInfoForm(true);
        } else {
          navigate('/dashboard');
        }
      }
    };
    
    checkPersonalInfo();
  }, [user, loading, navigate]);

  const validateEmailForm = () => {
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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmailForm()) return;
    
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
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });
      
      if (error) {
        toast.error(error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePersonalInfoComplete = () => {
    setShowPersonalInfoForm(false);
    navigate('/dashboard');
  };

  const handleSkipPersonalInfo = async () => {
    // Create an empty record to mark as checked
    if (newUserId) {
      await supabase
        .from('user_personal_info')
        .upsert({
          user_id: newUserId,
          profile_completed: false,
        }, { onConflict: 'user_id' });
    }
    setShowPersonalInfoForm(false);
    navigate('/dashboard');
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

  // Show personal info form for new users
  if (showPersonalInfoForm && newUserId) {
    return (
      <PersonalInfoForm 
        userId={newUserId} 
        onComplete={handlePersonalInfoComplete}
        onSkip={handleSkipPersonalInfo}
      />
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
        <div className="mb-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full gradient-primary shadow-soft">
            <Shield className="h-10 w-10 text-primary-foreground" />
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          {isLogin ? t('auth.login') : t('auth.signup')}
        </h1>
        <p className="mb-6 text-muted-foreground text-center">
          {isLogin ? t('auth.loginSubtitle') : t('auth.signupSubtitle')}
        </p>

        {/* Email Auth Form */}
        <div className="w-full max-w-sm">
          <form onSubmit={handleEmailSubmit} className="space-y-4">
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
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                isLogin ? t('auth.loginButton') : t('auth.signupButton')
              )}
            </Button>
          </form>
        </div>

        {/* Social Login Divider */}
        <div className="w-full max-w-sm mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {language === 'th' ? 'หรือ' : 'or'}
              </span>
            </div>
          </div>
        </div>

        {/* Google Sign In */}
        <div className="w-full max-w-sm mt-4 space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center gap-3"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {language === 'th' ? 'เข้าสู่ระบบด้วย Google' : 'Continue with Google'}
          </Button>

          {/* Guest mode */}
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