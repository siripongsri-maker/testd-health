import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { toast } from "sonner";
import { Plus, Trash2, Building2, Users, Loader2, Eye, EyeOff, ShieldCheck, ShieldOff } from "lucide-react";

interface BranchStaff {
  id: string;
  displayName: string;
  email: string;
  branch: string;
  createdAt: string;
  jobRole: string;
  staffRole: string;
  isActive: boolean;
  staffProfileId: string | null;
  /** true = has auth account (staff_branch_assignments), false = profile-only */
  hasAuthAccount: boolean;
}

const BRANCH_INFO: Record<string, { nameEn: string; nameTh: string; icon: string }> = {
  silom: { nameEn: "SWING Silom (Bangkok)", nameTh: "SWING สีลม (กรุงเทพฯ)", icon: "🏢" },
  pattaya: { nameEn: "SWING Pattaya", nameTh: "SWING พัทยา", icon: "🏖️" },
  saphankwai: { nameEn: "SWING Saphan Kwai", nameTh: "SWING สะพานควาย", icon: "🏬" },
  petchakasem: { nameEn: "SWING Phetkasem", nameTh: "SWING เพชรเกษม", icon: "🏥" },
};

const JOB_ROLES: { value: string; labelEn: string; labelTh: string }[] = [
  { value: "counselor", labelEn: "Counselor", labelTh: "ที่ปรึกษา" },
  { value: "medical_registration", labelEn: "Medical Registration Officer", labelTh: "เจ้าหน้าที่ลงทะเบียนการแพทย์" },
  { value: "medical_reg", labelEn: "Medical Staff", labelTh: "เจ้าหน้าที่แพทย์" },
  { value: "admin_staff", labelEn: "Admin Staff", labelTh: "เจ้าหน้าที่ธุรการ" },
];

export function AdminBranchStaffContent() {
  const { language } = useLanguage();
  const [staff, setStaff] = useState<BranchStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [branch, setBranch] = useState<string>("");
  const [jobRole, setJobRole] = useState<string>("medical_registration");

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const staffList: BranchStaff[] = [];

      // 1) Auth-linked staff from staff_branch_assignments
      const { data: assignments, error } = await supabase
        .from("staff_branch_assignments")
        .select("user_id, branch, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const linkedUserIds = new Set<string>();
      for (const assignment of assignments || []) {
        linkedUserIds.add(assignment.user_id);
        const [profileRes, staffProfileRes] = await Promise.all([
          supabase.from("profiles").select("display_name").eq("id", assignment.user_id).single(),
          supabase.from("staff_profiles").select("id, role, staff_role, is_active").eq("user_id", assignment.user_id).maybeSingle(),
        ]);

        staffList.push({
          id: assignment.user_id,
          displayName: profileRes.data?.display_name || "Unknown",
          email: `${profileRes.data?.display_name?.toLowerCase().replace(/\s+/g, "_") || "staff"}@swingth.local`,
          branch: assignment.branch,
          createdAt: assignment.created_at,
          jobRole: staffProfileRes.data?.role || "counselor",
          staffRole: staffProfileRes.data?.staff_role || "branch_staff",
          isActive: staffProfileRes.data?.is_active ?? true,
          staffProfileId: staffProfileRes.data?.id || null,
          hasAuthAccount: true,
        });
      }

      // 2) Profile-only staff (counselors without auth accounts)
      const { data: profileOnly } = await supabase
        .from("staff_profiles")
        .select("id, name_th, name_en, role, staff_role, is_active, branch_id, created_at")
        .is("user_id", null)
        .eq("is_active", true);

      // Map branch_id to slug
      const { data: branches } = await supabase
        .from("booking_branches")
        .select("id, slug");
      const branchIdToSlug = new Map((branches || []).map(b => [b.id, b.slug]));

      for (const sp of profileOnly || []) {
        const branchSlug = sp.branch_id ? branchIdToSlug.get(sp.branch_id) : null;
        if (!branchSlug) continue;

        staffList.push({
          id: sp.id,
          displayName: language === "th" ? (sp.name_th || sp.name_en) : (sp.name_en || sp.name_th),
          email: "",
          branch: branchSlug,
          createdAt: sp.created_at,
          jobRole: sp.role || "counselor",
          staffRole: sp.staff_role || "branch_staff",
          isActive: sp.is_active ?? true,
          staffProfileId: sp.id,
          hasAuthAccount: false,
        });
      }

      setStaff(staffList);
    } catch (error) {
      console.error("Error fetching staff:", error);
      toast.error(language === "th" ? "ไม่สามารถโหลดข้อมูลได้" : "Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async () => {
    if (!username || !password || !branch) {
      toast.error(language === "th" ? "กรุณากรอกข้อมูลให้ครบ" : "Please fill all required fields");
      return;
    }

    if (password.length < 8) {
      toast.error(language === "th" ? "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" : "Password must be at least 8 characters");
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-branch-staff", {
        body: {
          username,
          password,
          branch,
          displayName: displayName || username,
          jobRole,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(
        language === "th"
          ? `สร้างบัญชี ${data.user.displayName} สำเร็จ`
          : `Created account ${data.user.displayName} successfully`
      );

      // Reset form
      setUsername("");
      setPassword("");
      setDisplayName("");
      setBranch("");
      setJobRole("medical_registration");
      setDialogOpen(false);
      fetchStaff();
    } catch (error: any) {
      console.error("Error creating staff:", error);
      toast.error(error.message || (language === "th" ? "ไม่สามารถสร้างบัญชีได้" : "Failed to create account"));
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (staffItem: BranchStaff) => {
    if (!staffItem.staffProfileId) {
      toast.error(language === "th" ? "ไม่พบ staff profile" : "Staff profile not found");
      return;
    }
    try {
      const { error } = await supabase
        .from("staff_profiles")
        .update({ is_active: !staffItem.isActive })
        .eq("id", staffItem.staffProfileId);

      if (error) throw error;
      toast.success(
        language === "th"
          ? `${staffItem.isActive ? "ปิด" : "เปิด"}ใช้งาน ${staffItem.displayName} สำเร็จ`
          : `${staffItem.isActive ? "Deactivated" : "Activated"} ${staffItem.displayName}`
      );
      fetchStaff();
    } catch (error) {
      console.error("Error toggling active:", error);
      toast.error(language === "th" ? "เกิดข้อผิดพลาด" : "Failed to update");
    }
  };

  const handleDeleteStaff = async (staffId: string, staffName: string) => {
    try {
      const { error } = await supabase
        .from("staff_branch_assignments")
        .delete()
        .eq("user_id", staffId);

      if (error) throw error;

      toast.success(
        language === "th"
          ? `ลบสิทธิ์ ${staffName} สำเร็จ`
          : `Removed ${staffName} from branch staff`
      );
      fetchStaff();
    } catch (error) {
      console.error("Error deleting staff:", error);
      toast.error(language === "th" ? "ไม่สามารถลบได้" : "Failed to remove staff");
    }
  };

  const getJobRoleLabel = (role: string) => {
    const found = JOB_ROLES.find(r => r.value === role);
    return found ? (language === "th" ? found.labelTh : found.labelEn) : role;
  };

  // Count staff per branch
  const branchCounts = staff.reduce((acc, s) => {
    acc[s.branch] = (acc[s.branch] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            {language === "th" ? "จัดการ Staff ประจำสาขา" : "Branch Staff Management"}
          </h2>
          <p className="text-muted-foreground">
            {language === "th"
              ? "สร้างและจัดการบัญชี staff สำหรับแต่ละสาขา (เช่น เจ้าหน้าที่ลงทะเบียนการแพทย์)"
              : "Create and manage staff accounts per branch (e.g. Medical Registration Officers)"}
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {language === "th" ? "เพิ่ม Staff" : "Add Staff"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {language === "th" ? "สร้างบัญชี Branch Staff" : "Create Branch Staff Account"}
              </DialogTitle>
              <DialogDescription>
                {language === "th"
                  ? "Staff จะสามารถเข้าถึงเฉพาะข้อมูลนัดหมายของสาขาที่กำหนดเท่านั้น (RLS enforced)"
                  : "Staff will only see appointments from their assigned branch (RLS enforced)"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">
                  {language === "th" ? "ชื่อผู้ใช้ *" : "Username *"}
                </Label>
                <Input
                  id="username"
                  placeholder="e.g. medreg_silom"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                />
                <p className="text-xs text-muted-foreground">
                  {language === "th" ? "จะใช้เป็น" : "Will be used as"}: {username || "username"}@swingth.local
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  {language === "th" ? "รหัสผ่าน * (อย่างน้อย 8 ตัว)" : "Password * (min 8 chars)"}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">
                  {language === "th" ? "ชื่อที่แสดง" : "Display Name"}
                </Label>
                <Input
                  id="displayName"
                  placeholder="e.g. พี่แอน (Silom)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{language === "th" ? "สาขา *" : "Branch *"}</Label>
                <Select value={branch} onValueChange={setBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === "th" ? "เลือกสาขา..." : "Select branch..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BRANCH_INFO).map(([key, info]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <span>{info.icon}</span>
                          <span>{language === "th" ? info.nameTh : info.nameEn}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{language === "th" ? "ตำแหน่ง *" : "Job Role *"}</Label>
                <Select value={jobRole} onValueChange={setJobRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value}>
                        {language === "th" ? r.labelTh : r.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {language === "th" ? "ยกเลิก" : "Cancel"}
              </Button>
              <Button onClick={handleCreateStaff} disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {language === "th" ? "สร้างบัญชี" : "Create Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Branch Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(BRANCH_INFO).map(([key, info]) => (
          <Card key={key}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                {info.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{language === "th" ? info.nameTh : info.nameEn}</p>
                <p className="text-xs text-muted-foreground">
                  {branchCounts[key] || 0} staff
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {language === "th" ? "รายชื่อ Staff ประจำสาขา" : "Branch Staff List"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Users className="h-10 w-10 mb-2 opacity-50" />
              <p>{language === "th" ? "ยังไม่มี Staff" : "No staff yet"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "th" ? "ชื่อ" : "Name"}</TableHead>
                    <TableHead>{language === "th" ? "สาขา" : "Branch"}</TableHead>
                    <TableHead>{language === "th" ? "ตำแหน่ง" : "Role"}</TableHead>
                    <TableHead>{language === "th" ? "ประเภท" : "Type"}</TableHead>
                    <TableHead>{language === "th" ? "สถานะ" : "Status"}</TableHead>
                    <TableHead className="text-right">{language === "th" ? "จัดการ" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((s) => {
                    const branchInfo = BRANCH_INFO[s.branch];
                    return (
                      <TableRow key={s.id + s.branch} className={!s.isActive ? "opacity-50" : ""}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{s.displayName}</p>
                            {s.hasAuthAccount && s.email && (
                              <p className="text-xs text-muted-foreground">{s.email}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <span>{branchInfo?.icon || "📍"}</span>
                            <span className="hidden sm:inline">
                              {language === "th" ? branchInfo?.nameTh : branchInfo?.nameEn}
                            </span>
                            <span className="sm:hidden">{s.branch}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{getJobRoleLabel(s.jobRole)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={s.hasAuthAccount ? "border-primary/30 text-primary" : "border-muted-foreground/30"}>
                            {s.hasAuthAccount
                              ? (language === "th" ? "มีบัญชี" : "Account")
                              : (language === "th" ? "โปรไฟล์" : "Profile")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.isActive ? "default" : "secondary"}>
                            {s.isActive
                              ? (language === "th" ? "ใช้งาน" : "Active")
                              : (language === "th" ? "ปิดใช้งาน" : "Inactive")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {s.staffProfileId && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title={s.isActive ? "Deactivate" : "Activate"}
                                onClick={() => handleToggleActive(s)}
                              >
                                {s.isActive ? <ShieldOff className="h-4 w-4 text-muted-foreground" /> : <ShieldCheck className="h-4 w-4 text-primary" />}
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    {language === "th" ? "ยืนยันการลบ" : "Confirm Removal"}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {language === "th"
                                      ? `ต้องการลบสิทธิ์ "${s.displayName}" ออกจากสาขาหรือไม่?`
                                      : `Remove "${s.displayName}" from branch staff?`}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    {language === "th" ? "ยกเลิก" : "Cancel"}
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteStaff(s.id, s.displayName)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {language === "th" ? "ลบ" : "Remove"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminBranchStaffContent;
