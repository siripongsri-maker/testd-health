import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Eye, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Survey {
  id: string;
  titleTh: string;
  titleEn: string;
  descriptionTh: string;
  descriptionEn: string;
  url: string;
  viewCount: number;
}

// Hardcoded surveys for now - can be moved to database later
const SURVEYS: Survey[] = [
  {
    id: 'testd-health-survey',
    titleTh: 'แบบสอบถาม testD Health',
    titleEn: 'testD Health Survey',
    descriptionTh: 'แบบประเมินสุขภาพและความเสี่ยง',
    descriptionEn: 'Health and risk assessment survey',
    url: 'https://www.testd-health.com/survey/',
    viewCount: 0,
  },
];

export default function Surveys() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [surveys, setSurveys] = useState<Survey[]>(SURVEYS);
  const [totalViews, setTotalViews] = useState(0);

  useEffect(() => {
    // Try to fetch view counts from localStorage for now
    const savedViews = localStorage.getItem('survey_views');
    if (savedViews) {
      const viewData = JSON.parse(savedViews) as Record<string, number>;
      const updatedSurveys = SURVEYS.map(s => ({
        ...s,
        viewCount: viewData[s.id] || 0
      }));
      setSurveys(updatedSurveys);
      setTotalViews(Object.values(viewData).reduce((a, b) => a + b, 0));
    }
  }, []);

  const handleOpenSurvey = (survey: Survey) => {
    // Increment view count
    const savedViews = JSON.parse(localStorage.getItem('survey_views') || '{}') as Record<string, number>;
    savedViews[survey.id] = (savedViews[survey.id] || 0) + 1;
    localStorage.setItem('survey_views', JSON.stringify(savedViews));
    
    // Update state
    const updatedSurveys = surveys.map(s => 
      s.id === survey.id ? { ...s, viewCount: savedViews[s.id] } : s
    );
    setSurveys(updatedSurveys);
    setTotalViews(Object.values(savedViews).reduce((a, b) => a + b, 0));
    
    // Open survey
    window.open(survey.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <PageContainer>
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {language === 'th' ? 'แบบประเมิน' : 'Surveys'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'th' ? 'รวบรวมแบบประเมินความคิดเห็นต่างๆ' : 'Collection of feedback surveys'}
            </p>
          </div>
        </div>

        {/* Total views summary */}
        <Card className="p-4 mb-6 bg-primary/10 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Eye className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {language === 'th' ? 'จำนวนผู้เข้าชมทั้งหมด' : 'Total Viewers'}
              </p>
              <p className="text-2xl font-bold text-primary">{totalViews.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        {/* Survey list */}
        <div className="space-y-4">
          {surveys.map((survey) => (
            <Card 
              key={survey.id} 
              className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleOpenSurvey(survey)}
            >
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground">
                    {language === 'th' ? survey.titleTh : survey.titleEn}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {language === 'th' ? survey.descriptionTh : survey.descriptionEn}
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Eye className="h-3.5 w-3.5" />
                      <span>{survey.viewCount.toLocaleString()} {language === 'th' ? 'คน' : 'views'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-primary">
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>{language === 'th' ? 'เปิดแบบประเมิน' : 'Open Survey'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Info text */}
        <p className="text-xs text-center text-muted-foreground mt-6">
          {language === 'th' 
            ? '💡 ข้อมูลของคุณจะถูกเก็บเป็นความลับ' 
            : '💡 Your information will be kept confidential'}
        </p>
      </PageContainer>
      <BottomNav />
    </>
  );
}
