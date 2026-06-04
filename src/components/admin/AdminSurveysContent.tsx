import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { 
  ClipboardList, Clock, CheckCircle, XCircle, FileText,
  Loader2, Eye, Check, X, Sparkles, Flame, Gift, Download
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type SurveyStatus = 'draft' | 'pending_review' | 'published' | 'rejected';

interface Survey {
  id: string;
  title_th: string;
  title_en: string;
  description_th: string | null;
  description_en: string | null;
  xp_reward: number;
  is_hot: boolean;
  is_new: boolean;
  status: SurveyStatus;
  rejection_feedback: string | null;
  created_by: string | null;
  submitted_at: string | null;
  created_at: string;
  is_native: boolean;
  completion_count: number;
  view_count: number;
}

const STATUS_CONFIG: Record<SurveyStatus, { label: string; labelTh: string; icon: typeof FileText; color: string }> = {
  draft: { label: 'Draft', labelTh: 'ฉบับร่าง', icon: FileText, color: 'bg-muted text-muted-foreground' },
  pending_review: { label: 'Pending Review', labelTh: 'รอตรวจสอบ', icon: Clock, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  published: { label: 'Published', labelTh: 'เผยแพร่แล้ว', icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  rejected: { label: 'Rejected', labelTh: 'ถูกปฏิเสธ', icon: XCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export default function AdminSurveysContent() {
  const { user } = useAuth();
  const { language } = useLanguage();
  
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<SurveyStatus | 'all'>('all');
  
  // Review dialog state
  const [reviewingSurvey, setReviewingSurvey] = useState<Survey | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [xpReward, setXpReward] = useState(10);
  const [isHot, setIsHot] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .order('submitted_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setSurveys(data as Survey[]);
    } catch (error) {
      console.error('Error loading surveys:', error);
    } finally {
      setLoading(false);
    }
  };

  const openReviewDialog = (survey: Survey, action: 'approve' | 'reject') => {
    setReviewingSurvey(survey);
    setReviewAction(action);
    setRejectionFeedback('');
    setXpReward(survey.xp_reward || 10);
    setIsHot(survey.is_hot || false);
    setIsNew(survey.is_new || true);
    setIsReviewDialogOpen(true);
  };

  const handleReview = async () => {
    if (!reviewingSurvey || !user) return;
    
    if (reviewAction === 'reject' && !rejectionFeedback.trim()) {
      toast.error(language === 'th' ? 'กรุณาระบุเหตุผลในการปฏิเสธ' : 'Please provide rejection feedback');
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData: Record<string, unknown> = {
        status: reviewAction === 'approve' ? 'published' : 'rejected',
        is_active: reviewAction === 'approve',
      };

      if (reviewAction === 'approve') {
        updateData.xp_reward = xpReward;
        updateData.is_hot = isHot;
        updateData.is_new = isNew;
      } else {
        updateData.rejection_feedback = rejectionFeedback;
      }

      const { error } = await supabase
        .from('surveys')
        .update(updateData)
        .eq('id', reviewingSurvey.id);

      if (error) throw error;

      toast.success(
        reviewAction === 'approve' 
          ? (language === 'th' ? 'อนุมัติแบบสำรวจแล้ว' : 'Survey approved')
          : (language === 'th' ? 'ปฏิเสธแบบสำรวจแล้ว' : 'Survey rejected')
      );

      setIsReviewDialogOpen(false);
      loadSurveys();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSurveys = filterStatus === 'all' 
    ? surveys 
    : surveys.filter(s => s.status === filterStatus);

  const pendingCount = surveys.filter(s => s.status === 'pending_review').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          {language === 'th' ? 'ตรวจสอบแบบสำรวจ' : 'Survey Review'}
          {pendingCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {pendingCount} {language === 'th' ? 'รอตรวจ' : 'pending'}
            </Badge>
          )}
        </h2>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <Button
          variant={filterStatus === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('all')}
          className="rounded-full"
        >
          {language === 'th' ? 'ทั้งหมด' : 'All'} ({surveys.length})
        </Button>
        {(['pending_review', 'published', 'rejected'] as SurveyStatus[]).map((status) => {
          const config = STATUS_CONFIG[status];
          const count = surveys.filter(s => s.status === status).length;
          return (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status)}
              className="rounded-full gap-1"
            >
              <config.icon className="h-3 w-3" />
              {language === 'th' ? config.labelTh : config.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Surveys List */}
      <div className="space-y-3">
        {filteredSurveys.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {filterStatus === 'pending_review' 
                ? (language === 'th' ? 'ไม่มีแบบสำรวจที่รอตรวจสอบ' : 'No pending surveys')
                : (language === 'th' ? 'ไม่มีแบบสำรวจ' : 'No surveys')
              }
            </p>
          </div>
        ) : (
          filteredSurveys.map((survey) => {
            const statusConfig = STATUS_CONFIG[survey.status];
            return (
              <div
                key={survey.id}
                className="rounded-xl bg-card border border-border/50 p-4 hover:bg-muted/30 transition-all"
              >
                <div className="flex gap-4">
                  <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="h-6 w-6 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-foreground line-clamp-1 flex items-center gap-2">
                          {language === 'th' ? survey.title_th : survey.title_en}
                          {survey.is_native && (
                            <Badge variant="outline" className="text-xs">Native</Badge>
                          )}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                          {language === 'th' ? survey.description_th : survey.description_en}
                        </p>
                      </div>
                      <Badge className={cn("text-xs shrink-0", statusConfig.color)}>
                        {language === 'th' ? statusConfig.labelTh : statusConfig.label}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {survey.view_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {survey.completion_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Gift className="h-3 w-3" />
                        {survey.xp_reward} XP
                      </span>
                      {survey.submitted_at && (
                        <span>{format(new Date(survey.submitted_at), 'MMM d, yyyy')}</span>
                      )}
                    </div>

                    {survey.status === 'rejected' && survey.rejection_feedback && (
                      <div className="mt-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-400">
                        <span className="font-medium">{language === 'th' ? 'เหตุผล: ' : 'Reason: '}</span>
                        {survey.rejection_feedback}
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                      {survey.is_native && (
                        <Button
                          size="sm"
                          onClick={() => window.open(`/surveys/${survey.id}/builder?tab=analytics`, '_blank')}
                          className="h-8 gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          {language === 'th' ? 'ไปที่ Analytics' : 'Go to Analytics'}
                        </Button>
                      )}
                      {survey.status === 'pending_review' && (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => openReviewDialog(survey, 'approve')}
                            className="h-8 gap-1"
                          >
                            <Check className="h-3 w-3" />
                            {language === 'th' ? 'อนุมัติ' : 'Approve'}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openReviewDialog(survey, 'reject')}
                            className="h-8 gap-1 text-destructive hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                            {language === 'th' ? 'ปฏิเสธ' : 'Reject'}
                          </Button>
                        </>
                      )}
                      {survey.status === 'published' && survey.is_native && survey.id === '6e5918db-d70a-4d7d-b978-e6711f2a4779' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open('/surveys/pre-post-results', '_blank')}
                          className="h-8 gap-1"
                        >
                          <ClipboardList className="h-3 w-3" />
                          {language === 'th' ? 'ผลก่อน-หลัง / ส่งออก' : 'Pre/Post Results & Export'}
                        </Button>
                      )}
                      {survey.status === 'rejected' && (
                        <Button 
                          size="sm" 
                          onClick={() => openReviewDialog(survey, 'approve')}
                          className="h-8 gap-1"
                        >
                          <Check className="h-3 w-3" />
                          {language === 'th' ? 'อนุมัติใหม่' : 'Re-approve'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' 
                ? (language === 'th' ? 'อนุมัติแบบสำรวจ' : 'Approve Survey')
                : (language === 'th' ? 'ปฏิเสธแบบสำรวจ' : 'Reject Survey')
              }
            </DialogTitle>
          </DialogHeader>

          {reviewingSurvey && (
            <div className="space-y-4 py-4">
              <div className="p-3 rounded-lg bg-muted">
                <h4 className="font-medium">
                  {language === 'th' ? reviewingSurvey.title_th : reviewingSurvey.title_en}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {language === 'th' ? reviewingSurvey.description_th : reviewingSurvey.description_en}
                </p>
              </div>

              {reviewAction === 'approve' ? (
                <>
                  <div>
                    <Label className="mb-2 block">
                      {language === 'th' ? 'รางวัล XP' : 'XP Reward'}
                    </Label>
                    <Input
                      type="number"
                      value={xpReward}
                      onChange={(e) => setXpReward(parseInt(e.target.value) || 0)}
                      min={0}
                      max={500}
                    />
                  </div>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isHot}
                        onChange={(e) => setIsHot(e.target.checked)}
                        className="rounded"
                      />
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">{language === 'th' ? 'Hot' : 'Hot'}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isNew}
                        onChange={(e) => setIsNew(e.target.checked)}
                        className="rounded"
                      />
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">{language === 'th' ? 'New' : 'New'}</span>
                    </label>
                  </div>
                </>
              ) : (
                <div>
                  <Label className="mb-2 block">
                    {language === 'th' ? 'เหตุผลในการปฏิเสธ *' : 'Rejection Reason *'}
                  </Label>
                  <Textarea
                    value={rejectionFeedback}
                    onChange={(e) => setRejectionFeedback(e.target.value)}
                    placeholder={language === 'th' ? 'ระบุเหตุผลเพื่อให้ผู้สร้างแบบสำรวจปรับปรุง...' : 'Provide feedback for the survey creator...'}
                    rows={4}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleReview}
              disabled={isSubmitting}
              variant={reviewAction === 'approve' ? 'default' : 'destructive'}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {reviewAction === 'approve' 
                ? (language === 'th' ? 'อนุมัติ' : 'Approve')
                : (language === 'th' ? 'ปฏิเสธ' : 'Reject')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
