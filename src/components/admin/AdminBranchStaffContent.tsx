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
 import { Plus, Trash2, Building2, Users, Loader2, MapPin, Eye, EyeOff } from "lucide-react";
 
 interface BranchStaff {
   id: string;
   displayName: string;
   email: string;
   branch: string;
   createdAt: string;
 }
 
 const BRANCH_INFO: Record<string, { nameEn: string; nameTh: string; icon: string }> = {
   silom: { nameEn: "SWING Silom (Bangkok)", nameTh: "SWING สีลม (กรุงเทพฯ)", icon: "🏢" },
   pattaya: { nameEn: "SWING Pattaya", nameTh: "SWING พัทยา", icon: "🏖️" },
 };
 
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
 
   useEffect(() => {
     fetchStaff();
   }, []);
 
   const fetchStaff = async () => {
     setLoading(true);
     try {
       // Get all staff with branch assignments
       const { data, error } = await supabase
         .from("staff_branch_assignments")
         .select(`
           user_id,
           branch,
           created_at
         `)
         .order("created_at", { ascending: false });
 
       if (error) throw error;
 
       // Get profile info for each staff member
       const staffList: BranchStaff[] = [];
       for (const assignment of data || []) {
         const { data: profile } = await supabase
           .from("profiles")
           .select("display_name")
           .eq("id", assignment.user_id)
           .single();
 
         staffList.push({
           id: assignment.user_id,
           displayName: profile?.display_name || "Unknown",
           email: `${profile?.display_name?.toLowerCase().replace(/\s+/g, "_") || "staff"}@swingth.local`,
           branch: assignment.branch,
           createdAt: assignment.created_at,
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
 
     if (password.length < 6) {
       toast.error(language === "th" ? "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" : "Password must be at least 6 characters");
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
       setDialogOpen(false);
 
       // Refresh list
       fetchStaff();
     } catch (error: any) {
       console.error("Error creating staff:", error);
       toast.error(error.message || (language === "th" ? "ไม่สามารถสร้างบัญชีได้" : "Failed to create account"));
     } finally {
       setCreating(false);
     }
   };
 
   const handleDeleteStaff = async (staffId: string, staffName: string) => {
     try {
       // Remove from branch assignments
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
             {language === "th" ? "จัดการ Branch Staff" : "Branch Staff Management"}
           </h2>
           <p className="text-muted-foreground">
             {language === "th"
               ? "สร้างและจัดการบัญชี staff สำหรับแต่ละสาขา"
               : "Create and manage staff accounts for each branch"}
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
                   ? "Staff จะสามารถเข้าถึงเฉพาะข้อมูลของสาขาที่กำหนด"
                   : "Staff will only have access to data from their assigned branch"}
               </DialogDescription>
             </DialogHeader>
 
             <div className="space-y-4 py-4">
               <div className="space-y-2">
                 <Label htmlFor="username">
                   {language === "th" ? "ชื่อผู้ใช้ *" : "Username *"}
                 </Label>
                 <Input
                   id="username"
                   placeholder="e.g. staff_silom"
                   value={username}
                   onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                 />
                 <p className="text-xs text-muted-foreground">
                   {language === "th" ? "จะใช้เป็น" : "Will be used as"}: {username || "username"}@swingth.local
                 </p>
               </div>
 
               <div className="space-y-2">
                 <Label htmlFor="password">
                   {language === "th" ? "รหัสผ่าน *" : "Password *"}
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
                   placeholder="e.g. SWING Silom Staff"
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
                     <SelectItem value="silom">
                       <div className="flex items-center gap-2">
                         <span>🏢</span>
                         <span>{language === "th" ? "SWING สีลม (กรุงเทพฯ)" : "SWING Silom (Bangkok)"}</span>
                       </div>
                     </SelectItem>
                     <SelectItem value="pattaya">
                       <div className="flex items-center gap-2">
                         <span>🏖️</span>
                         <span>{language === "th" ? "SWING พัทยา" : "SWING Pattaya"}</span>
                       </div>
                     </SelectItem>
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
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
         {Object.entries(BRANCH_INFO).map(([key, info]) => (
           <Card key={key}>
             <CardContent className="flex items-center gap-4 p-4">
               <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                 {info.icon}
               </div>
               <div className="flex-1">
                 <p className="font-medium">{language === "th" ? info.nameTh : info.nameEn}</p>
                 <p className="text-sm text-muted-foreground">
                   {branchCounts[key] || 0} {language === "th" ? "staff" : "staff members"}
                 </p>
               </div>
               <Badge variant="secondary" className="text-lg px-3 py-1">
                 {branchCounts[key] || 0}
               </Badge>
             </CardContent>
           </Card>
         ))}
       </div>
 
       {/* Staff List */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Users className="h-5 w-5" />
             {language === "th" ? "รายชื่อ Branch Staff" : "Branch Staff List"}
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
               <p>{language === "th" ? "ยังไม่มี Branch Staff" : "No branch staff yet"}</p>
             </div>
           ) : (
             <div className="overflow-x-auto">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>{language === "th" ? "ชื่อ" : "Name"}</TableHead>
                     <TableHead>{language === "th" ? "สาขา" : "Branch"}</TableHead>
                     <TableHead className="hidden sm:table-cell">{language === "th" ? "วันที่สร้าง" : "Created"}</TableHead>
                     <TableHead className="text-right">{language === "th" ? "จัดการ" : "Actions"}</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {staff.map((s) => {
                     const branchInfo = BRANCH_INFO[s.branch];
                     return (
                       <TableRow key={s.id}>
                         <TableCell>
                           <div>
                             <p className="font-medium">{s.displayName}</p>
                             <p className="text-xs text-muted-foreground">{s.email}</p>
                           </div>
                         </TableCell>
                         <TableCell>
                           <Badge variant="outline" className="gap-1">
                             <span>{branchInfo?.icon}</span>
                             <span className="hidden sm:inline">
                               {language === "th" ? branchInfo?.nameTh : branchInfo?.nameEn}
                             </span>
                             <span className="sm:hidden">
                               {s.branch === "silom" ? "Silom" : "Pattaya"}
                             </span>
                           </Badge>
                         </TableCell>
                         <TableCell className="hidden sm:table-cell text-muted-foreground">
                           {new Date(s.createdAt).toLocaleDateString(language === "th" ? "th-TH" : "en-US")}
                         </TableCell>
                         <TableCell className="text-right">
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
                                     ? `ต้องการลบสิทธิ์ "${s.displayName}" ออกจากสาขาหรือไม่? บัญชีจะยังคงอยู่แต่จะไม่สามารถเข้าถึงข้อมูลสาขาได้`
                                     : `Remove "${s.displayName}" from branch staff? The account will remain but won't have branch access.`}
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