import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LinkGenerator } from './attribution/LinkGenerator';
import { AttributionDashboard } from './attribution/AttributionDashboard';
import { JourneyFunnel } from './attribution/JourneyFunnel';
import { useLanguage } from '@/lib/i18n';
import { Link2, BarChart3, TrendingUp } from 'lucide-react';

export default function AdminAttributionContent() {
  const { language } = useLanguage();
  const [tab, setTab] = useState('links');

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold">
          {language === 'th' ? '🔗 Attribution & Journey Analytics' : '🔗 Attribution & Journey Analytics'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {language === 'th'
            ? 'สร้างลิงก์แคมเปญ ติดตามช่องทางที่มา และวิเคราะห์เส้นทางผู้ใช้'
            : 'Create campaign links, track acquisition channels, and analyze user journeys'}
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="links" className="flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{language === 'th' ? 'ลิงก์' : 'Links'}</span>
          </TabsTrigger>
          <TabsTrigger value="attribution" className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{language === 'th' ? 'ช่องทาง' : 'Attribution'}</span>
          </TabsTrigger>
          <TabsTrigger value="journey" className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{language === 'th' ? 'เส้นทาง' : 'Journey'}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="links" className="mt-4">
          <LinkGenerator />
        </TabsContent>
        <TabsContent value="attribution" className="mt-4">
          <AttributionDashboard />
        </TabsContent>
        <TabsContent value="journey" className="mt-4">
          <JourneyFunnel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
