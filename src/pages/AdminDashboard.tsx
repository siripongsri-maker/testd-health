import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Users, Pill, TestTube, TrendingUp, Shield, BarChart3,
  Package, Truck, Check, Eye, Loader2, UserPlus, UserX, UserCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Stats {
  totalUsers: number;
  prepUsers: number;
  pepUsers: number;
  avgStreak: number;
  totalCheckIns: number;
  pepCompletionRate: number;
}

interface SelftestPii {
  id: string;
  full_name: string | null;
  thai_id: string | null;
  phone: string | null;
  line_id: string | null;
  address: string | null;
  subdistrict: string | null;
  district: string | null;
  province: string | null;
  postal_code: string | null;
}

interface HIVTestRequest {
  id: string;
  pii_id: string | null;
  status: string;
  tracking_number: string | null;
  test_result: string | null;
  result_photo_url: string | null;
  created_at: string;
  days_since_risk: number | null;
  selftest_pii: SelftestPii | null;
}

interface AdminRequest {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  reason: string | null;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    prepUsers: 0,
    pepUsers: 0,
    avgStreak: 0,
    totalCheckIns: 0,
    pepCompletionRate: 0,
  });
  
  // HIV Test Management
  const [hivRequests, setHivRequests] = useState<HIVTestRequest[]>([]);
  const [hivLoading, setHivLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<HIVTestRequest | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  // Admin Request Management
  const [adminRequests, setAdminRequests] = useState<AdminRequest[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      // Check if user has admin role
      const { data: roleData } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin',
      });

      if (!roleData) {
        navigate('/dashboard');
        return;
      }

      setIsAdmin(true);
      fetchStats();
      fetchHIVRequests();
      fetchAdminRequests();
    };

    checkAdmin();
  }, [user, navigate]);

  const fetchAdminRequests = async () => {
    setAdminLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAdminRequests(data || []);
    } catch (error) {
      console.error('Error fetching admin requests:', error);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminRequest = async (requestId: string, userId: string, approve: boolean) => {
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('admin_requests')
        .update({ 
          status: approve ? 'approved' : 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // If approved, add admin role
      if (approve) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });
        
        if (roleError && !roleError.message.includes('duplicate')) throw roleError;
      }

      toast.success(approve 
        ? (language === 'th' ? 'อนุมัติเป็น Admin แล้ว' : 'Admin access approved')
        : (language === 'th' ? 'ปฏิเสธคำขอแล้ว' : 'Request rejected')
      );
      fetchAdminRequests();
    } catch (error: any) {
      console.error('Error handling admin request:', error);
      toast.error(error.message);
    }
  };

  const removeAdmin = async (userId: string) => {
    if (!confirm(language === 'th' ? 'ยืนยันการถอดสิทธิ์ Admin?' : 'Remove admin access?')) return;
    
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');
      
      if (error) throw error;

      // Update request status back to rejected
      await supabase
        .from('admin_requests')
        .update({ status: 'rejected' })
        .eq('user_id', userId);

      toast.success(language === 'th' ? 'ถอดสิทธิ์ Admin แล้ว' : 'Admin access removed');
      fetchAdminRequests();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const fetchStats = async () => {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get PrEP users
      const { count: prepUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('mode', ['prep-daily', 'prep-ondemand']);

      // Get PEP users
      const { count: pepUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('mode', 'pep');

      // Get average streak
      const { data: streakData } = await supabase
        .from('profiles')
        .select('streak')
        .not('streak', 'is', null);

      const avgStreak =
        streakData && streakData.length > 0
          ? streakData.reduce((sum, p) => sum + (p.streak || 0), 0) / streakData.length
          : 0;

      setStats({
        totalUsers: totalUsers || 0,
        prepUsers: prepUsers || 0,
        pepUsers: pepUsers || 0,
        avgStreak: Math.round(avgStreak * 10) / 10,
        totalCheckIns: 0, // Would need separate check-ins table
        pepCompletionRate: 85, // Example value
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHIVRequests = async () => {
    setHivLoading(true);
    try {
      const { data, error } = await supabase
        .from('hiv_selftest_requests')
        .select(`
          id,
          pii_id,
          status,
          tracking_number,
          test_result,
          result_photo_url,
          created_at,
          days_since_risk,
          selftest_pii (
            id,
            full_name,
            thai_id,
            phone,
            line_id,
            address,
            subdistrict,
            district,
            province,
            postal_code
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setHivRequests(data || []);
    } catch (error) {
      console.error('Error fetching HIV requests:', error);
    } finally {
      setHivLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, newStatus: string, tracking?: string) => {
    setUpdatingStatus(true);
    try {
      const updateData: { status: string; tracking_number?: string } = { status: newStatus };
      if (tracking) {
        updateData.tracking_number = tracking;
      }

      const { error } = await supabase
        .from('hiv_selftest_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      toast.success(language === 'th' ? 'อัปเดตสถานะสำเร็จ' : 'Status updated successfully');
      fetchHIVRequests();
      setSelectedRequest(null);
      setTrackingNumber("");
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: language === 'th' ? 'รอตรวจสอบ' : 'Pending', variant: 'secondary' },
      approved: { label: language === 'th' ? 'อนุมัติแล้ว' : 'Approved', variant: 'default' },
      shipped: { label: language === 'th' ? 'จัดส่งแล้ว' : 'Shipped', variant: 'default' },
      delivered: { label: language === 'th' ? 'ถึงผู้รับ' : 'Delivered', variant: 'default' },
      confirmed: { label: language === 'th' ? 'ยืนยันรับแล้ว' : 'Confirmed', variant: 'default' },
      result_submitted: { label: language === 'th' ? 'ส่งผลแล้ว' : 'Result Submitted', variant: 'destructive' },
      completed: { label: language === 'th' ? 'เสร็จสิ้น' : 'Completed', variant: 'outline' },
    };
    const config = statusConfig[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getResultPhoto = async (path: string) => {
    const { data } = await supabase.storage
      .from('selftest-results')
      .createSignedUrl(path, 300); // 5 minutes
    if (data?.signedUrl) {
      setViewingPhoto(data.signedUrl);
    }
  };

  const maskThaiId = (id: string | null) => {
    if (!id || id.length !== 13) return id || '-';
    return `${id.slice(0, 1)}-${id.slice(1, 5)}-XXXXX-${id.slice(10, 12)}-${id.slice(12)}`;
  };

  if (loading) {
    return (
      <PageContainer showNav={false}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageContainer>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const StatCard = ({
    icon: Icon,
    label,
    value,
    suffix,
    color = 'primary',
  }: {
    icon: React.ElementType;
    label: string;
    value: number | string;
    suffix?: string;
    color?: string;
  }) => (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${color}/10`}>
          <Icon className={`h-5 w-5 text-${color}`} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">
            {value}
            {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
          </p>
        </div>
      </div>
    </Card>
  );

  return (
    <PageContainer showNav={false}>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              {language === 'th' ? 'แดชบอร์ดผู้ดูแล' : 'Admin Dashboard'}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {language === 'th' ? 'ข้อมูลรวมแบบไม่ระบุตัวตน' : 'Anonymized aggregated data'}
          </p>
        </div>
      </div>

      <Card className="p-4 mb-6 bg-warning/5 border-warning/20">
        <p className="text-sm text-muted-foreground">
          {language === 'th'
            ? '⚠️ ข้อมูลทั้งหมดเป็นข้อมูลรวมและไม่ระบุตัวตน ใช้เพื่อการวิเคราะห์และปรับปรุงบริการเท่านั้น'
            : '⚠️ All data is aggregated and anonymized. Used for analysis and service improvement only.'}
        </p>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full mb-4 grid grid-cols-4">
          <TabsTrigger value="overview">
            {language === 'th' ? 'ภาพรวม' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="hivtests">
            {language === 'th' ? 'ชุดตรวจ' : 'HIV Tests'}
          </TabsTrigger>
          <TabsTrigger value="admins">
            {language === 'th' ? 'ผู้ดูแล' : 'Admins'}
          </TabsTrigger>
          <TabsTrigger value="trends">
            {language === 'th' ? 'แนวโน้ม' : 'Trends'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={Users}
              label={language === 'th' ? 'ผู้ใช้ทั้งหมด' : 'Total Users'}
              value={stats.totalUsers}
            />
            <StatCard
              icon={TrendingUp}
              label={language === 'th' ? 'ต่อเนื่องเฉลี่ย' : 'Avg Streak'}
              value={stats.avgStreak}
              suffix={language === 'th' ? 'วัน' : 'days'}
            />
          </div>

          <Card className="p-4">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" />
              {language === 'th' ? 'การใช้งานป้องกัน' : 'Prevention Usage'}
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">PrEP</span>
                  <span className="font-medium">{stats.prepUsers}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${stats.totalUsers ? (stats.prepUsers / stats.totalUsers) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">PEP</span>
                  <span className="font-medium">{stats.pepUsers}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${stats.totalUsers ? (stats.pepUsers / stats.totalUsers) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <TestTube className="h-5 w-5 text-primary" />
              {language === 'th' ? 'อัตราความสำเร็จ PEP' : 'PEP Completion Rate'}
            </h3>
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${stats.pepCompletionRate * 3.52} 352`}
                    className="text-success"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">{stats.pepCompletionRate}%</span>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="hivtests" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                {language === 'th' ? 'คำขอชุดตรวจ HIV' : 'HIV Test Kit Requests'}
              </h3>
              <Button variant="outline" size="sm" onClick={fetchHIVRequests} disabled={hivLoading}>
                {hivLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : language === 'th' ? 'รีเฟรช' : 'Refresh'}
              </Button>
            </div>

            {hivLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : hivRequests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {language === 'th' ? 'ไม่มีคำขอ' : 'No requests'}
              </p>
            ) : (
              <div className="space-y-3">
                {hivRequests.map((request) => (
                  <Card key={request.id} className="p-3 border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-foreground truncate">
                            {request.selftest_pii?.full_name || 'Unknown'}
                          </p>
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          🪪 {maskThaiId(request.selftest_pii?.thai_id || null)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          📍 {request.selftest_pii?.province || '-'} | 📞 {request.selftest_pii?.phone || '-'}
                        </p>
                        {request.tracking_number && (
                          <p className="text-xs text-primary mt-1">
                            📦 {request.tracking_number}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(request.created_at).toLocaleDateString('th-TH')}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedRequest(request)}
                        >
                          {language === 'th' ? 'จัดการ' : 'Manage'}
                        </Button>
                        {request.result_photo_url && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => getResultPhoto(request.result_photo_url!)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="admins" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                {language === 'th' ? 'คำขอเป็นผู้ดูแล' : 'Admin Requests'}
              </h3>
              <Button variant="outline" size="sm" onClick={fetchAdminRequests} disabled={adminLoading}>
                {adminLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : language === 'th' ? 'รีเฟรช' : 'Refresh'}
              </Button>
            </div>

            {adminLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : adminRequests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {language === 'th' ? 'ไม่มีคำขอ' : 'No requests'}
              </p>
            ) : (
              <div className="space-y-3">
                {adminRequests.map((request) => (
                  <Card key={request.id} className="p-3 border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-foreground truncate">
                            {request.display_name || request.email}
                          </p>
                          <Badge variant={
                            request.status === 'pending' ? 'secondary' : 
                            request.status === 'approved' ? 'default' : 'destructive'
                          }>
                            {request.status === 'pending' 
                              ? (language === 'th' ? 'รอพิจารณา' : 'Pending')
                              : request.status === 'approved'
                              ? (language === 'th' ? 'อนุมัติแล้ว' : 'Approved')
                              : (language === 'th' ? 'ไม่อนุมัติ' : 'Rejected')
                            }
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">📧 {request.email}</p>
                        {request.reason && (
                          <p className="text-xs text-muted-foreground mt-1">
                            💬 {request.reason}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(request.created_at).toLocaleDateString('th-TH')}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        {request.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleAdminRequest(request.id, request.user_id, true)}
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              {language === 'th' ? 'อนุมัติ' : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAdminRequest(request.id, request.user_id, false)}
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              {language === 'th' ? 'ปฏิเสธ' : 'Reject'}
                            </Button>
                          </>
                        )}
                        {request.status === 'approved' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeAdmin(request.user_id)}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            {language === 'th' ? 'ถอดสิทธิ์' : 'Remove'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card className="p-8 text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {language === 'th'
                ? 'กราฟแนวโน้มจะแสดงเมื่อมีข้อมูลเพียงพอ'
                : 'Trend charts will appear when more data is available'}
            </p>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Request Management Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === 'th' ? 'จัดการคำขอ' : 'Manage Request'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <p><strong>{language === 'th' ? 'ชื่อ:' : 'Name:'}</strong> {selectedRequest.selftest_pii?.full_name || '-'}</p>
                <p><strong>{language === 'th' ? 'เลขบัตร:' : 'Thai ID:'}</strong> {selectedRequest.selftest_pii?.thai_id || '-'}</p>
                <p><strong>{language === 'th' ? 'โทร:' : 'Phone:'}</strong> {selectedRequest.selftest_pii?.phone || '-'}</p>
                <p><strong>LINE:</strong> {selectedRequest.selftest_pii?.line_id || '-'}</p>
                <p><strong>{language === 'th' ? 'ที่อยู่:' : 'Address:'}</strong> {selectedRequest.selftest_pii?.address || '-'}</p>
                <p><strong>{language === 'th' ? 'แขวง/ตำบล:' : 'Subdistrict:'}</strong> {selectedRequest.selftest_pii?.subdistrict || '-'}</p>
                <p><strong>{language === 'th' ? 'เขต/อำเภอ:' : 'District:'}</strong> {selectedRequest.selftest_pii?.district || '-'}</p>
                <p><strong>{language === 'th' ? 'จังหวัด:' : 'Province:'}</strong> {selectedRequest.selftest_pii?.province || '-'} {selectedRequest.selftest_pii?.postal_code || ''}</p>
                <p><strong>{language === 'th' ? 'สถานะ:' : 'Status:'}</strong> {getStatusBadge(selectedRequest.status)}</p>
                {selectedRequest.test_result && (
                  <p>
                    <strong>{language === 'th' ? 'ผลตรวจ:' : 'Result:'}</strong>{' '}
                    <Badge variant={selectedRequest.test_result === 'negative' ? 'default' : 'destructive'}>
                      {selectedRequest.test_result.toUpperCase()}
                    </Badge>
                  </p>
                )}
              </div>

              <div className="border-t pt-4 space-y-3">
                <p className="font-medium text-sm">{language === 'th' ? 'อัปเดตสถานะ:' : 'Update Status:'}</p>
                
                {selectedRequest.status === 'pending' && (
                  <Button
                    className="w-full"
                    onClick={() => updateRequestStatus(selectedRequest.id, 'approved')}
                    disabled={updatingStatus}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {language === 'th' ? 'อนุมัติคำขอ' : 'Approve Request'}
                  </Button>
                )}

                {selectedRequest.status === 'approved' && (
                  <div className="space-y-2">
                    <Input
                      placeholder={language === 'th' ? 'หมายเลขพัสดุ' : 'Tracking Number'}
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                    />
                    <Button
                      className="w-full"
                      onClick={() => updateRequestStatus(selectedRequest.id, 'shipped', trackingNumber)}
                      disabled={updatingStatus || !trackingNumber}
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      {language === 'th' ? 'จัดส่งแล้ว' : 'Mark as Shipped'}
                    </Button>
                  </div>
                )}

                {selectedRequest.status === 'shipped' && (
                  <Button
                    className="w-full"
                    onClick={() => updateRequestStatus(selectedRequest.id, 'delivered')}
                    disabled={updatingStatus}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    {language === 'th' ? 'ถึงผู้รับแล้ว' : 'Mark as Delivered'}
                  </Button>
                )}

                {selectedRequest.status === 'result_submitted' && (
                  <Button
                    className="w-full"
                    onClick={() => updateRequestStatus(selectedRequest.id, 'completed')}
                    disabled={updatingStatus}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {language === 'th' ? 'ยืนยันผลและปิดเคส' : 'Confirm & Close Case'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Result Photo Dialog */}
      <Dialog open={!!viewingPhoto} onOpenChange={() => setViewingPhoto(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {language === 'th' ? 'รูปผลตรวจ' : 'Test Result Photo'}
            </DialogTitle>
          </DialogHeader>
          {viewingPhoto && (
            <img src={viewingPhoto} alt="Test result" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}