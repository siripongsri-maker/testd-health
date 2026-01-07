import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FileText, AlertTriangle, Calendar, Pill, TestTube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { getUserData } from "@/lib/store";

interface HistoryEntry {
  date: string;
  type: string;
  notes?: string;
}

export default function HealthProfile() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [sideEffects, setSideEffects] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const userData = getUserData();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('health_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setSideEffects(
          Array.isArray(data.side_effects)
            ? data.side_effects.map((se: { text?: string }) => se?.text || '').join('\n')
            : ''
        );
        setNotes(data.notes || '');
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setSaving(true);
    try {
      const sideEffectsArray = sideEffects
        .split('\n')
        .filter((s) => s.trim())
        .map((text) => ({ text, date: new Date().toISOString() }));

      const { data: existing } = await supabase
        .from('health_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        await supabase
          .from('health_profiles')
          .update({
            side_effects: sideEffectsArray,
            notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('health_profiles').insert({
          user_id: user.id,
          side_effects: sideEffectsArray,
          notes,
        });
      }

      toast.success(t('healthProfile.saved'));
    } catch (error) {
      console.error('Error saving health profile:', error);
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const TimelineItem = ({ icon: Icon, title, date }: { icon: React.ElementType; title: string; date: string }) => (
    <div className="flex items-center gap-3 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{date}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <>
        <PageContainer>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </PageContainer>
        <BottomNav />
      </>
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
            <h1 className="text-2xl font-bold text-foreground">{t('healthProfile.title')}</h1>
            <p className="text-muted-foreground">{t('healthProfile.subtitle')}</p>
          </div>
        </div>

        <Card className="p-4 mb-6 bg-warning/5 border-warning/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">{t('healthProfile.disclaimer')}</p>
          </div>
        </Card>

        {/* Timeline */}
        <Card className="p-4 mb-6">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {t('healthProfile.timeline')}
          </h3>
          <div className="divide-y divide-border">
            {userData.prepStartDate && (
              <TimelineItem
                icon={Pill}
                title={language === 'th' ? 'เริ่ม PrEP' : 'Started PrEP'}
                date={format(new Date(userData.prepStartDate), 'dd MMM yyyy')}
              />
            )}
            {userData.pepStartDate && (
              <TimelineItem
                icon={Pill}
                title={language === 'th' ? 'เริ่ม PEP' : 'Started PEP'}
                date={format(new Date(userData.pepStartDate), 'dd MMM yyyy')}
              />
            )}
            {Object.keys(userData.checkIns).length > 0 && (
              <TimelineItem
                icon={TestTube}
                title={language === 'th' ? 'เช็คอินล่าสุด' : 'Last Check-in'}
                date={format(
                  new Date(Object.keys(userData.checkIns).sort().reverse()[0]),
                  'dd MMM yyyy'
                )}
              />
            )}
            {!userData.prepStartDate && !userData.pepStartDate && Object.keys(userData.checkIns).length === 0 && (
              <p className="py-4 text-center text-muted-foreground text-sm">
                {t('healthProfile.noHistory')}
              </p>
            )}
          </div>
        </Card>

        {/* Side Effects */}
        <Card className="p-4 mb-6">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t('healthProfile.sideEffects')}
          </h3>
          <p className="text-sm text-muted-foreground mb-3">{t('healthProfile.sideEffectsDesc')}</p>
          <Textarea
            placeholder={t('healthProfile.sideEffectsPlaceholder')}
            value={sideEffects}
            onChange={(e) => setSideEffects(e.target.value)}
            rows={4}
          />
        </Card>

        {/* Notes */}
        <Card className="p-4 mb-6">
          <h3 className="font-bold text-foreground mb-3">{t('healthProfile.notes')}</h3>
          <Textarea
            placeholder={t('healthProfile.notesPlaceholder')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => navigate('/consultation')}>
            {t('healthProfile.preConsultation')}
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
