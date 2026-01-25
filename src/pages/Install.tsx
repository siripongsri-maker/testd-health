import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download, 
  Smartphone, 
  Monitor, 
  Apple, 
  Share, 
  Plus, 
  MoreVertical,
  ArrowLeft,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { usePWA } from "@/hooks/usePWA";
import { cn } from "@/lib/utils";

type DeviceType = 'ios' | 'android' | 'desktop';

interface StepProps {
  number: number;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

const InstallStep = ({ number, title, description, icon }: StepProps) => (
  <div className="flex gap-4 items-start">
    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
      {number}
    </div>
    <div className="flex-1 space-y-1">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {icon}
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

export default function Install() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWA();
  const [activeTab, setActiveTab] = useState<DeviceType>('android');

  // Auto-detect device type
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setActiveTab('ios');
    } else if (/android/.test(userAgent)) {
      setActiveTab('android');
    } else {
      setActiveTab('desktop');
    }
  }, []);

  const handleInstallClick = async () => {
    if (isInstallable) {
      await promptInstall();
    }
  };

  const t = {
    th: {
      title: "ติดตั้งแอป SWING",
      subtitle: "เพิ่มแอปไปที่หน้าจอหลักเพื่อเข้าถึงได้ง่ายขึ้น",
      installed: "ติดตั้งแล้ว!",
      installedDesc: "แอป SWING ถูกติดตั้งบนอุปกรณ์ของคุณแล้ว",
      openApp: "เปิดแอป",
      back: "กลับ",
      ios: "iPhone/iPad",
      android: "Android",
      desktop: "คอมพิวเตอร์",
      installNow: "ติดตั้งเลย",
      iosSteps: [
        { title: "แตะปุ่มแชร์", description: "แตะไอคอนแชร์ที่ด้านล่างของ Safari (สี่เหลี่ยมมีลูกศรชี้ขึ้น)" },
        { title: "เลื่อนลงและแตะ 'เพิ่มไปที่หน้าจอหลัก'", description: "หาตัวเลือกนี้ในเมนูแชร์" },
        { title: "แตะ 'เพิ่ม'", description: "ยืนยันการเพิ่มแอปไปที่หน้าจอหลักของคุณ" },
        { title: "เสร็จสิ้น!", description: "ตอนนี้คุณสามารถเปิด SWING จากหน้าจอหลักได้แล้ว" }
      ],
      androidSteps: [
        { title: "แตะเมนูเบราว์เซอร์", description: "แตะไอคอนจุดสามจุดที่มุมขวาบนของ Chrome" },
        { title: "แตะ 'ติดตั้งแอป' หรือ 'เพิ่มไปที่หน้าจอหลัก'", description: "เลือกตัวเลือกนี้จากเมนู" },
        { title: "ยืนยันการติดตั้ง", description: "แตะ 'ติดตั้ง' เพื่อเพิ่มแอปไปที่อุปกรณ์ของคุณ" },
        { title: "เสร็จสิ้น!", description: "SWING จะปรากฏในลิ้นชักแอปของคุณ" }
      ],
      desktopSteps: [
        { title: "มองหาไอคอนติดตั้ง", description: "ในแถบที่อยู่ของเบราว์เซอร์ จะมีไอคอนติดตั้ง (+ หรือคอมพิวเตอร์)" },
        { title: "คลิกไอคอนติดตั้ง", description: "หรือคลิกปุ่ม 'ติดตั้งเลย' ด้านล่าง" },
        { title: "ยืนยันการติดตั้ง", description: "คลิก 'ติดตั้ง' ในป๊อปอัพที่ปรากฏ" },
        { title: "เสร็จสิ้น!", description: "SWING จะเปิดเป็นแอปแยกต่างหากและเพิ่มไปที่เดสก์ท็อป" }
      ],
      benefits: "ทำไมต้องติดตั้ง?",
      benefitsList: [
        "เข้าถึงได้เร็วขึ้นจากหน้าจอหลัก",
        "ใช้งานได้แม้ไม่มีอินเทอร์เน็ต",
        "ประสบการณ์เหมือนแอปจริง",
        "ไม่ต้องดาวน์โหลดจาก App Store"
      ]
    },
    en: {
      title: "Install SWING App",
      subtitle: "Add the app to your home screen for quick access",
      installed: "Already Installed!",
      installedDesc: "SWING app is already installed on your device",
      openApp: "Open App",
      back: "Back",
      ios: "iPhone/iPad",
      android: "Android",
      desktop: "Desktop",
      installNow: "Install Now",
      iosSteps: [
        { title: "Tap the Share button", description: "Tap the share icon at the bottom of Safari (square with an arrow pointing up)" },
        { title: "Scroll down and tap 'Add to Home Screen'", description: "Find this option in the share menu" },
        { title: "Tap 'Add'", description: "Confirm adding the app to your home screen" },
        { title: "Done!", description: "You can now open SWING from your home screen" }
      ],
      androidSteps: [
        { title: "Tap the browser menu", description: "Tap the three-dot icon in the top-right corner of Chrome" },
        { title: "Tap 'Install app' or 'Add to Home screen'", description: "Select this option from the menu" },
        { title: "Confirm installation", description: "Tap 'Install' to add the app to your device" },
        { title: "Done!", description: "SWING will appear in your app drawer" }
      ],
      desktopSteps: [
        { title: "Look for the install icon", description: "In your browser's address bar, you'll see an install icon (+ or computer)" },
        { title: "Click the install icon", description: "Or click the 'Install Now' button below" },
        { title: "Confirm installation", description: "Click 'Install' in the popup that appears" },
        { title: "Done!", description: "SWING will open as a standalone app and be added to your desktop" }
      ],
      benefits: "Why Install?",
      benefitsList: [
        "Faster access from home screen",
        "Works offline",
        "Native app-like experience",
        "No App Store download needed"
      ]
    }
  };

  const text = t[language] || t.en;
  const steps = activeTab === 'ios' ? text.iosSteps : activeTab === 'android' ? text.androidSteps : text.desktopSteps;

  const getStepIcon = (index: number, device: DeviceType) => {
    if (device === 'ios') {
      if (index === 0) return <Share className="h-4 w-4 text-muted-foreground" />;
      if (index === 1) return <Plus className="h-4 w-4 text-muted-foreground" />;
    }
    if (device === 'android') {
      if (index === 0) return <MoreVertical className="h-4 w-4 text-muted-foreground" />;
      if (index === 1) return <Download className="h-4 w-4 text-muted-foreground" />;
    }
    if (device === 'desktop') {
      if (index === 0) return <Plus className="h-4 w-4 text-muted-foreground" />;
      if (index === 1) return <Download className="h-4 w-4 text-muted-foreground" />;
    }
    if (index === steps.length - 1) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    return null;
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background p-4 safe-top safe-bottom">
        <div className="max-w-md mx-auto pt-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {text.back}
          </Button>

          <Card className="text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">{text.installed}</h1>
              <p className="text-muted-foreground">{text.installedDesc}</p>
              <Button onClick={() => navigate('/')} className="mt-4">
                {text.openApp}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 safe-top safe-bottom">
      <div className="max-w-lg mx-auto pt-4 pb-24 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {text.back}
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <Download className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{text.title}</h1>
              <p className="text-muted-foreground">{text.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Device Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DeviceType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ios" className="gap-2">
              <Apple className="h-4 w-4" />
              <span className="hidden sm:inline">{text.ios}</span>
              <span className="sm:hidden">iOS</span>
            </TabsTrigger>
            <TabsTrigger value="android" className="gap-2">
              <Smartphone className="h-4 w-4" />
              <span className="hidden sm:inline">{text.android}</span>
              <span className="sm:hidden">Android</span>
            </TabsTrigger>
            <TabsTrigger value="desktop" className="gap-2">
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">{text.desktop}</span>
              <span className="sm:hidden">PC</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ios" className="mt-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Apple className="h-5 w-5" />
                  Safari Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {text.iosSteps.map((step, index) => (
                  <InstallStep
                    key={index}
                    number={index + 1}
                    title={step.title}
                    description={step.description}
                    icon={getStepIcon(index, 'ios')}
                  />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="android" className="mt-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Chrome Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {text.androidSteps.map((step, index) => (
                  <InstallStep
                    key={index}
                    number={index + 1}
                    title={step.title}
                    description={step.description}
                    icon={getStepIcon(index, 'android')}
                  />
                ))}
                
                {isInstallable && (
                  <Button 
                    onClick={handleInstallClick} 
                    className="w-full mt-4"
                    size="lg"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    {text.installNow}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="desktop" className="mt-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Browser Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {text.desktopSteps.map((step, index) => (
                  <InstallStep
                    key={index}
                    number={index + 1}
                    title={step.title}
                    description={step.description}
                    icon={getStepIcon(index, 'desktop')}
                  />
                ))}
                
                {isInstallable && (
                  <Button 
                    onClick={handleInstallClick} 
                    className="w-full mt-4"
                    size="lg"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    {text.installNow}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Benefits */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{text.benefits}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {text.benefitsList.map((benefit, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
