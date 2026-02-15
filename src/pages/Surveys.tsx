import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ExternalLink, Eye, ClipboardList, Loader2, Plus, Star, Flame, Sparkles, Calendar, Users, Zap, Pencil, Trash2, Clock, CheckCircle, XCircle, AlertTriangle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { useQuestProgress } from "@/hooks/useQuestProgress";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { th, enUS } from "date-fns/locale";

interface Survey {
  id: string;
  title_th: string;
  title_en: string;
  description_th: string | null;
  description_en: string | null;
  url: string;
  xp_reward: number;
  is_hot: boolean;
  is_new: boolean;
  view_count: number;
  completion_count: number;
  created_at: string;
  is_active: boolean;
  is_native: boolean;
  status: string;
  rejection_feedback: string | null;
  created_by: string | null;
}

export default function Surveys() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  
  const { trackSurveyComplete } = useQuestProgress();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [mySurveys, setMySurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  
  // Edit state
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Delete state
  const [deletingSurvey, setDeletingSurvey] = useState<Survey | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Builder form state
  const [formData, setFormData] = useState({
    title_th: '',
    title_en: '',
    description_th: '',
    description_en: '',
    url: '',
    xp_reward: 10,
    is_hot: false,
    is_new: true,
  });

  useEffect(() => {
    fetchSurveys();
    fetchMySurveys();
    checkAdminRole();
  }, [user]);

  const checkAdminRole = async () => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  const fetchSurveys = async () => {
    try {
      // Fetch published surveys only
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('status', 'published')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSurveys(data || []);
    } catch (err) {
      console.error('Error fetching surveys:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMySurveys = async () => {
    if (!user) return;
    
    try {
      // Fetch user's own surveys (all statuses)
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setMySurveys(data || []);
    } catch (err) {
      console.error('Error fetching my surveys:', err);
    }
  };

  const handleOpenSurvey = async (survey: Survey) => {
    // For native surveys, navigate to the survey page
    if (survey.is_native) {
      navigate(`/surveys/${survey.id}`);
      return;
    }
    
    // For external surveys, open in new tab
    // Optimistically update UI
    setSurveys(prev => prev.map(s => 
      s.id === survey.id ? { ...s, completion_count: s.completion_count + 1, view_count: s.view_count + 1 } : s
    ));
    
    // Track completion and award XP
    try {
      const { data, error } = await supabase.rpc('complete_survey', {
        p_survey_id: survey.id,
        p_session_id: null
      });
      
      if (error) throw error;
      
      if (data && data > 0 && user) {
        toast.success(
          language === 'th' 
            ? `ได้รับ ${data} XP! 🎉` 
            : `Earned ${data} XP! 🎉`
        );
        // Track survey quest
        trackSurveyComplete(language);
      }
    } catch (err) {
      console.error('Error completing survey:', err);
    }
    
    // Open survey
    window.open(survey.url, '_blank', 'noopener,noreferrer');
  };

  const handleCreateNativeSurvey = async () => {
    if (!user) {
      toast.error(language === 'th' ? 'กรุณาเข้าสู่ระบบก่อน' : 'Please login first');
      navigate('/auth');
      return;
    }

    try {
      // Create a new survey as pending_review (XP = 0, admin will set it)
      const { data, error } = await supabase
        .from('surveys')
        .insert({
          title_th: language === 'th' ? 'แบบสำรวจใหม่' : 'New Survey',
          title_en: 'New Survey',
          url: '', // Empty for native surveys
          is_native: true,
          xp_reward: 0, // Admin will set XP reward
          is_new: false, // Admin will set tags
          is_hot: false,
          status: 'draft',
          created_by: user.id,
          submitted_at: null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(language === 'th' ? 'สร้างแบบสำรวจสำเร็จ!' : 'Survey created!');
      navigate(`/surveys/${data.id}/builder`);
    } catch (err) {
      console.error('Error creating survey:', err);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong');
    }
  };

  const handleCreateSurvey = async () => {
    if (!formData.title_th || !formData.title_en || !formData.url) {
      toast.error(language === 'th' ? 'กรุณากรอกข้อมูลให้ครบ' : 'Please fill in all required fields');
      return;
    }
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('surveys')
        .insert({
          title_th: formData.title_th,
          title_en: formData.title_en,
          description_th: formData.description_th || null,
          description_en: formData.description_en || null,
          url: formData.url,
          created_by: user?.id,
          is_native: false,
          xp_reward: isAdmin ? formData.xp_reward : 0,
          is_hot: isAdmin ? formData.is_hot : false,
          is_new: isAdmin ? formData.is_new : false,
          status: isAdmin ? 'published' : 'pending_review',
          submitted_at: isAdmin ? null : new Date().toISOString(),
        });
      
      if (error) throw error;
      
      if (isAdmin) {
        toast.success(language === 'th' ? 'สร้างแบบประเมินสำเร็จ!' : 'Survey created successfully!');
      } else {
        toast.success(language === 'th' ? 'ส่งลิงก์ตรวจสอบสำเร็จ! รอ Admin อนุมัติ' : 'Link submitted for review! Waiting for admin approval');
      }
      setShowBuilder(false);
      resetFormData();
      fetchSurveys();
      fetchMySurveys();
    } catch (err) {
      console.error('Error creating survey:', err);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (e: React.MouseEvent, survey: Survey) => {
    e.stopPropagation();
    setEditingSurvey(survey);
    setFormData({
      title_th: survey.title_th,
      title_en: survey.title_en,
      description_th: survey.description_th || '',
      description_en: survey.description_en || '',
      url: survey.url,
      xp_reward: survey.xp_reward,
      is_hot: survey.is_hot,
      is_new: survey.is_new,
    });
    setShowEditDialog(true);
  };

  const handleUpdateSurvey = async () => {
    if (!editingSurvey) return;
    if (!formData.title_th || !formData.title_en || !formData.url) {
      toast.error(language === 'th' ? 'กรุณากรอกข้อมูลให้ครบ' : 'Please fill in all required fields');
      return;
    }
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('surveys')
        .update({
          title_th: formData.title_th,
          title_en: formData.title_en,
          description_th: formData.description_th || null,
          description_en: formData.description_en || null,
          url: formData.url,
          xp_reward: formData.xp_reward,
          is_hot: formData.is_hot,
          is_new: formData.is_new,
        })
        .eq('id', editingSurvey.id);
      
      if (error) throw error;
      
      toast.success(language === 'th' ? 'บันทึกสำเร็จ!' : 'Survey updated successfully!');
      setShowEditDialog(false);
      setEditingSurvey(null);
      resetFormData();
      fetchSurveys();
    } catch (err) {
      console.error('Error updating survey:', err);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, survey: Survey) => {
    e.stopPropagation();
    setDeletingSurvey(survey);
  };

  const handleDeleteSurvey = async () => {
    if (!deletingSurvey) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('surveys')
        .delete()
        .eq('id', deletingSurvey.id);
      
      if (error) throw error;
      
      toast.success(language === 'th' ? 'ลบสำเร็จ!' : 'Survey deleted successfully!');
      setDeletingSurvey(null);
      fetchSurveys();
      fetchMySurveys();
    } catch (err) {
      console.error('Error deleting survey:', err);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong');
    } finally {
      setDeleting(false);
    }
  };

  const resetFormData = () => {
    setFormData({
      title_th: '',
      title_en: '',
      description_th: '',
      description_en: '',
      url: '',
      xp_reward: 10,
      is_hot: false,
      is_new: true,
    });
  };

  const totalCompletions = surveys.reduce((sum, s) => sum + s.completion_count, 0);
  const dateLocale = language === 'th' ? th : enUS;

  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return { icon: Clock, text: language === 'th' ? 'ร่าง' : 'Draft', className: 'bg-muted text-muted-foreground' };
      case 'pending_review':
        return { icon: Send, text: language === 'th' ? 'รอตรวจสอบ' : 'Pending', className: 'bg-yellow-500/20 text-yellow-600' };
      case 'published':
        return { icon: CheckCircle, text: language === 'th' ? 'เผยแพร่แล้ว' : 'Published', className: 'bg-success/20 text-success' };
      case 'rejected':
        return { icon: XCircle, text: language === 'th' ? 'ถูกปฏิเสธ' : 'Rejected', className: 'bg-destructive/20 text-destructive' };
      default:
        return { icon: AlertTriangle, text: status, className: 'bg-muted' };
    }
  };

  return (
    <>
      <PageContainer>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {language === 'th' ? 'แบบประเมิน' : 'Surveys'}
              </h1>
              <p className="text-muted-foreground text-sm">
                {language === 'th' ? 'ทำแบบประเมินรับ XP' : 'Complete surveys to earn XP'}
              </p>
            </div>
          </div>
          
          {/* Create Survey Buttons - Available for all logged in users */}
          {user && (
            <div className="flex items-center gap-2">
              <Button size="sm" className="gap-1.5" onClick={handleCreateNativeSurvey}>
                <Plus className="h-4 w-4" />
                {language === 'th' ? 'สร้าง' : 'Create'}
              </Button>
              <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <ExternalLink className="h-4 w-4" />
                    {language === 'th' ? 'ลิงก์' : 'Link'}
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {language === 'th' ? '🔗 เพิ่มลิงก์แบบประเมินภายนอก' : '🔗 Submit External Survey Link'}
                  </DialogTitle>
                  {!isAdmin && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {language === 'th' 
                        ? 'ลิงก์จะถูกส่งไปตรวจสอบก่อนเผยแพร่' 
                        : 'Your link will be submitted for review before publishing'}
                    </p>
                  )}
                </DialogHeader>
                
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>{language === 'th' ? 'ชื่อ (ไทย) *' : 'Title (TH) *'}</Label>
                      <Input 
                        value={formData.title_th}
                        onChange={(e) => setFormData(prev => ({ ...prev, title_th: e.target.value }))}
                        placeholder="แบบสอบถาม..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{language === 'th' ? 'ชื่อ (EN) *' : 'Title (EN) *'}</Label>
                      <Input 
                        value={formData.title_en}
                        onChange={(e) => setFormData(prev => ({ ...prev, title_en: e.target.value }))}
                        placeholder="Survey..."
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>{language === 'th' ? 'คำอธิบาย (ไทย)' : 'Description (TH)'}</Label>
                      <Textarea 
                        value={formData.description_th}
                        onChange={(e) => setFormData(prev => ({ ...prev, description_th: e.target.value }))}
                        placeholder="รายละเอียด..."
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{language === 'th' ? 'คำอธิบาย (EN)' : 'Description (EN)'}</Label>
                      <Textarea 
                        value={formData.description_en}
                        onChange={(e) => setFormData(prev => ({ ...prev, description_en: e.target.value }))}
                        placeholder="Details..."
                        rows={2}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{language === 'th' ? 'ลิงก์แบบประเมิน *' : 'Survey URL *'}</Label>
                    <Input 
                      value={formData.url}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://..."
                      type="url"
                    />
                  </div>
                  
                  {/* XP & Tags - Admin only */}
                  {isAdmin && (
                    <>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-xp" />
                          {language === 'th' ? 'รางวัล XP' : 'XP Reward'}
                        </Label>
                        <div className="flex items-center gap-3">
                          <Input 
                            type="number"
                            min={0}
                            max={100}
                            value={formData.xp_reward}
                            onChange={(e) => setFormData(prev => ({ ...prev, xp_reward: parseInt(e.target.value) || 0 }))}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">XP</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Flame className="h-4 w-4 text-destructive" />
                          <span className="text-sm font-medium">
                            {language === 'th' ? 'แท็ก Hot' : 'Hot Tag'}
                          </span>
                        </div>
                        <Switch 
                          checked={formData.is_hot}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_hot: checked }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">
                            {language === 'th' ? 'แท็ก New' : 'New Tag'}
                          </span>
                        </div>
                        <Switch 
                          checked={formData.is_new}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_new: checked }))}
                        />
                      </div>
                    </>
                  )}
                  
                  <Button 
                    className="w-full" 
                    onClick={handleCreateSurvey}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {language === 'th' ? 'กำลังส่ง...' : 'Submitting...'}
                      </>
                    ) : (
                      <>
                        {isAdmin ? <Plus className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                        {isAdmin 
                          ? (language === 'th' ? 'สร้างและเผยแพร่' : 'Create & Publish')
                          : (language === 'th' ? 'ส่งตรวจสอบ' : 'Submit for Review')
                        }
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          )}
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {language === 'th' ? 'แบบประเมินทั้งหมด' : 'Total Surveys'}
                </p>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <p className="text-xl font-bold text-primary">{surveys.length}</p>
                )}
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {language === 'th' ? 'ผู้ทำทั้งหมด' : 'Completions'}
                </p>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-accent" />
                ) : (
                  <p className="text-xl font-bold text-accent">{totalCompletions.toLocaleString()}</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs for survey lists */}
        <Tabs defaultValue="all" className="w-full" onValueChange={(v) => setActiveTab(v as 'all' | 'mine')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="all">
              {language === 'th' ? '📋 แบบสำรวจทั้งหมด' : '📋 All Surveys'}
            </TabsTrigger>
            <TabsTrigger value="mine">
              {language === 'th' ? '✏️ ของฉัน' : '✏️ My Surveys'}
              {mySurveys.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                  {mySurveys.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* All Published Surveys Tab */}
          <TabsContent value="all" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : surveys.length === 0 ? (
              <Card className="p-8 text-center">
                <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {language === 'th' ? 'ยังไม่มีแบบประเมิน' : 'No surveys available'}
                </p>
              </Card>
            ) : (
            surveys.map((survey) => (
              <Card 
                key={survey.id} 
                className="p-4 hover:shadow-lg transition-all cursor-pointer hover:scale-[1.01]"
                onClick={() => handleOpenSurvey(survey)}
              >
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0 relative">
                    <ClipboardList className="h-7 w-7 text-primary" />
                    {survey.xp_reward > 0 && (
                      <div className="absolute -bottom-1 -right-1 bg-xp text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Star className="h-2.5 w-2.5" />
                        {survey.xp_reward}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-foreground">
                        {language === 'th' ? survey.title_th : survey.title_en}
                      </h3>
                      {survey.is_hot && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-500/20 text-orange-600 text-[10px] font-bold rounded-full">
                          <Flame className="h-2.5 w-2.5" />
                          HOT
                        </span>
                      )}
                      {survey.is_new && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500/20 text-blue-600 text-[10px] font-bold rounded-full">
                          <Sparkles className="h-2.5 w-2.5" />
                          NEW
                        </span>
                      )}
                    </div>
                    
                    {(survey.description_th || survey.description_en) && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {language === 'th' ? survey.description_th : survey.description_en}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(survey.created_at), { 
                            addSuffix: true, 
                            locale: dateLocale 
                          })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>
                          {survey.completion_count.toLocaleString()} {language === 'th' ? 'คน' : 'completed'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-primary font-medium">
                        {survey.is_native ? (
                          <>
                            <Eye className="h-3 w-3" />
                            <span>{language === 'th' ? 'เปิด' : 'Open'}</span>
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-3 w-3" />
                            <span>{language === 'th' ? 'ลิงก์ภายนอก' : 'External'}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Admin actions */}
                  {isAdmin && (
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {survey.is_native && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/surveys/${survey.id}/builder`);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {!survey.is_native && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={(e) => handleEditClick(e, survey)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDeleteClick(e, survey)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
          </TabsContent>

          {/* My Surveys Tab */}
          <TabsContent value="mine" className="space-y-4">
            {!user ? (
              <Card className="p-8 text-center">
                <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">
                  {language === 'th' ? 'กรุณาเข้าสู่ระบบเพื่อสร้างแบบสำรวจ' : 'Please login to create surveys'}
                </p>
                <Button onClick={() => navigate('/auth')}>
                  {language === 'th' ? 'เข้าสู่ระบบ' : 'Login'}
                </Button>
              </Card>
            ) : mySurveys.length === 0 ? (
              <Card className="p-8 text-center">
                <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">
                  {language === 'th' ? 'คุณยังไม่มีแบบสำรวจ' : 'You have no surveys yet'}
                </p>
                <Button onClick={handleCreateNativeSurvey}>
                  <Plus className="h-4 w-4 mr-2" />
                  {language === 'th' ? 'สร้างแบบสำรวจแรก' : 'Create Your First Survey'}
                </Button>
              </Card>
            ) : (
              mySurveys.map((survey) => {
                const statusBadge = getStatusBadge(survey.status);
                const StatusIcon = statusBadge.icon;
                return (
                  <Card 
                    key={survey.id} 
                    className="p-4 hover:shadow-lg transition-all cursor-pointer hover:scale-[1.01]"
                    onClick={() => navigate(`/surveys/${survey.id}/builder`)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0 relative">
                        <ClipboardList className="h-7 w-7 text-primary" />
                        {survey.xp_reward > 0 && (
                          <div className="absolute -bottom-1 -right-1 bg-xp text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Star className="h-2.5 w-2.5" />
                            {survey.xp_reward}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-bold text-foreground">
                            {language === 'th' ? survey.title_th : survey.title_en}
                          </h3>
                          {/* Status Badge */}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full ${statusBadge.className}`}>
                            <StatusIcon className="h-2.5 w-2.5" />
                            {statusBadge.text}
                          </span>
                        </div>
                        
                        {survey.status === 'rejected' && survey.rejection_feedback && (
                          <p className="text-xs text-destructive mb-1">
                            ⚠️ {survey.rejection_feedback}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {formatDistanceToNow(new Date(survey.created_at), { 
                                addSuffix: true, 
                                locale: dateLocale 
                              })}
                            </span>
                          </div>
                          
                          {survey.status === 'published' && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              <span>
                                {survey.completion_count.toLocaleString()} {language === 'th' ? 'คน' : 'completed'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/surveys/${survey.id}/builder`);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {survey.status !== 'published' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleDeleteClick(e, survey)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>

        {/* Info text */}
        <p className="text-xs text-center text-muted-foreground mt-6">
          {language === 'th' 
            ? '💡 ทำแบบประเมินเพื่อรับ XP และช่วยพัฒนาบริการ' 
            : '💡 Complete surveys to earn XP and help improve our services'}
        </p>
      </PageContainer>
      
      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {language === 'th' ? '✏️ แก้ไขแบบประเมิน' : '✏️ Edit Survey'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{language === 'th' ? 'ชื่อ (ไทย) *' : 'Title (TH) *'}</Label>
                <Input 
                  value={formData.title_th}
                  onChange={(e) => setFormData(prev => ({ ...prev, title_th: e.target.value }))}
                  placeholder="แบบสอบถาม..."
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'th' ? 'ชื่อ (EN) *' : 'Title (EN) *'}</Label>
                <Input 
                  value={formData.title_en}
                  onChange={(e) => setFormData(prev => ({ ...prev, title_en: e.target.value }))}
                  placeholder="Survey..."
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{language === 'th' ? 'คำอธิบาย (ไทย)' : 'Description (TH)'}</Label>
                <Textarea 
                  value={formData.description_th}
                  onChange={(e) => setFormData(prev => ({ ...prev, description_th: e.target.value }))}
                  placeholder="รายละเอียด..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'th' ? 'คำอธิบาย (EN)' : 'Description (EN)'}</Label>
                <Textarea 
                  value={formData.description_en}
                  onChange={(e) => setFormData(prev => ({ ...prev, description_en: e.target.value }))}
                  placeholder="Details..."
                  rows={2}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>{language === 'th' ? 'ลิงก์แบบประเมิน *' : 'Survey URL *'}</Label>
              <Input 
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://..."
                type="url"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-xp" />
                {language === 'th' ? 'รางวัล XP' : 'XP Reward'}
              </Label>
              <div className="flex items-center gap-3">
                <Input 
                  type="number"
                  min={0}
                  max={100}
                  value={formData.xp_reward}
                  onChange={(e) => setFormData(prev => ({ ...prev, xp_reward: parseInt(e.target.value) || 0 }))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">XP</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">
                  {language === 'th' ? 'แท็ก Hot' : 'Hot Tag'}
                </span>
              </div>
              <Switch 
                checked={formData.is_hot}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_hot: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">
                  {language === 'th' ? 'แท็ก New' : 'New Tag'}
                </span>
              </div>
              <Switch 
                checked={formData.is_new}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_new: checked }))}
              />
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleUpdateSurvey}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {language === 'th' ? 'กำลังบันทึก...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4 mr-2" />
                  {language === 'th' ? 'บันทึกการแก้ไข' : 'Save Changes'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingSurvey} onOpenChange={(open) => !open && setDeletingSurvey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'th' ? 'ยืนยันการลบ?' : 'Confirm Delete?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'th' 
                ? `คุณต้องการลบแบบประเมิน "${deletingSurvey?.title_th}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้` 
                : `Are you sure you want to delete "${deletingSurvey?.title_en}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSurvey}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {language === 'th' ? 'กำลังลบ...' : 'Deleting...'}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {language === 'th' ? 'ลบ' : 'Delete'}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <BottomNav />
    </>
  );
}
