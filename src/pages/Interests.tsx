import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const INTEREST_TAGS = [
  { id: 'prep', labelEn: 'PrEP', labelTh: 'PrEP' },
  { id: 'pep', labelEn: 'PEP', labelTh: 'PEP' },
  { id: 'testing', labelEn: 'HIV Testing', labelTh: 'ตรวจ HIV' },
  { id: 'dating', labelEn: 'Dating', labelTh: 'การเดต' },
  { id: 'relationships', labelEn: 'Relationships', labelTh: 'ความสัมพันธ์' },
  { id: 'harm-reduction', labelEn: 'Harm Reduction', labelTh: 'การลดอันตราย' },
  { id: 'sti', labelEn: 'STI Prevention', labelTh: 'ป้องกัน STI' },
  { id: 'mental-health', labelEn: 'Mental Health', labelTh: 'สุขภาพจิต' },
  { id: 'community', labelEn: 'Community', labelTh: 'ชุมชน' },
  { id: 'self-care', labelEn: 'Self-Care', labelTh: 'ดูแลตัวเอง' },
];

export default function Interests() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchInterests = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('user_interests')
        .select('tag')
        .eq('user_id', user.id);

      if (data) {
        setSelectedTags(data.map((d) => d.tag));
      }
      setLoading(false);
    };

    fetchInterests();
  }, [user]);

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((t) => t !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSave = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setSaving(true);
    try {
      // Delete existing interests
      await supabase
        .from('user_interests')
        .delete()
        .eq('user_id', user.id);

      // Insert new interests
      if (selectedTags.length > 0) {
        await supabase.from('user_interests').insert(
          selectedTags.map((tag) => ({
            user_id: user.id,
            tag,
          }))
        );
      }

      toast.success(t('interests.saved'));
      navigate('/community');
    } catch (error) {
      console.error('Error saving interests:', error);
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageContainer>
    );
  }

  return (
    <>
      <PageContainer>
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('interests.title')}</h1>
            <p className="text-muted-foreground">{t('interests.subtitle')}</p>
          </div>
        </div>

        <Card className="p-4 mb-6 bg-muted/50">
          <p className="text-sm text-muted-foreground">{t('interests.description')}</p>
        </Card>

        <div className="flex flex-wrap gap-2 mb-8">
          {INTEREST_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:border-primary/50'
                }`}
              >
                {isSelected && <Check className="h-4 w-4" />}
                <span className="font-medium">
                  {language === 'th' ? tag.labelTh : tag.labelEn}
                </span>
              </button>
            );
          })}
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-14"
        >
          {saving ? t('common.saving') : t('common.save')}
        </Button>
      </PageContainer>
      <BottomNav />
    </>
  );
}
