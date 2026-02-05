 import { useState, useEffect } from "react";
 import { useLanguage } from "@/lib/i18n";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Package, Clock, Truck, CheckCircle, AlertCircle, PackageCheck } from "lucide-react";
 import { AnimatedCounter } from "@/components/AnimatedCounter";
 import { Skeleton } from "@/components/ui/skeleton";
 
 interface BranchStats {
   pending: number;
   packed: number;
   shipped: number;
   outForDelivery: number;
   delivered: number;
   confirmed: number;
   total: number;
 }
 
 interface BranchDashboardContentProps {
   userBranch: string | null;
 }
 
 export default function BranchDashboardContent({ userBranch }: BranchDashboardContentProps) {
   const { language } = useLanguage();
   const [stats, setStats] = useState<BranchStats | null>(null);
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     if (userBranch) {
       fetchBranchStats();
     }
   }, [userBranch]);
 
   const fetchBranchStats = async () => {
     if (!userBranch) return;
     
     try {
       // Fetch HIV selftest requests for this branch
       const { data: requests, error } = await supabase
         .from("hiv_selftest_requests")
         .select("status")
         .eq("assigned_branch", userBranch);
 
       if (error) throw error;
 
       // Count by status
       const statusCounts = {
         pending: 0,
         packed: 0,
         shipped: 0,
         outForDelivery: 0,
         delivered: 0,
         confirmed: 0,
         total: requests?.length || 0,
       };
 
       requests?.forEach((req) => {
         switch (req.status) {
           case "pending":
           case "requested":
             statusCounts.pending++;
             break;
           case "packed":
             statusCounts.packed++;
             break;
           case "shipped":
             statusCounts.shipped++;
             break;
           case "out_for_delivery":
             statusCounts.outForDelivery++;
             break;
           case "delivered":
           case "delivered_unconfirmed":
             statusCounts.delivered++;
             break;
           case "received_confirmed":
             statusCounts.confirmed++;
             break;
         }
       });
 
       setStats(statusCounts);
     } catch (error) {
       console.error("Error fetching branch stats:", error);
     } finally {
       setLoading(false);
     }
   };
 
   const branchName = userBranch === 'silom' ? 'SWING Silom' : userBranch === 'pattaya' ? 'SWING Pattaya' : userBranch;
 
   const statCards = [
     {
       title: language === 'th' ? 'รอดำเนินการ' : 'Pending',
       value: stats?.pending || 0,
       icon: Clock,
       color: 'text-orange-500',
       bgColor: 'bg-orange-500/10',
       borderColor: 'border-orange-500/20',
     },
     {
       title: language === 'th' ? 'แพ็คแล้ว' : 'Packed',
       value: stats?.packed || 0,
       icon: Package,
       color: 'text-blue-500',
       bgColor: 'bg-blue-500/10',
       borderColor: 'border-blue-500/20',
     },
     {
       title: language === 'th' ? 'จัดส่งแล้ว' : 'Shipped',
       value: stats?.shipped || 0,
       icon: Truck,
       color: 'text-purple-500',
       bgColor: 'bg-purple-500/10',
       borderColor: 'border-purple-500/20',
     },
     {
       title: language === 'th' ? 'กำลังจัดส่ง' : 'Out for Delivery',
       value: stats?.outForDelivery || 0,
       icon: AlertCircle,
       color: 'text-amber-500',
       bgColor: 'bg-amber-500/10',
       borderColor: 'border-amber-500/20',
     },
     {
       title: language === 'th' ? 'ส่งถึงแล้ว' : 'Delivered',
       value: stats?.delivered || 0,
       icon: PackageCheck,
       color: 'text-teal-500',
       bgColor: 'bg-teal-500/10',
       borderColor: 'border-teal-500/20',
     },
     {
       title: language === 'th' ? 'ยืนยันรับแล้ว' : 'Confirmed',
       value: stats?.confirmed || 0,
       icon: CheckCircle,
       color: 'text-green-500',
       bgColor: 'bg-green-500/10',
       borderColor: 'border-green-500/20',
     },
   ];
 
   if (loading) {
     return (
       <div className="space-y-6">
         <div>
           <Skeleton className="h-8 w-48 mb-2" />
           <Skeleton className="h-4 w-72" />
         </div>
         <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
           {[...Array(6)].map((_, i) => (
             <Skeleton key={i} className="h-32 rounded-xl" />
           ))}
         </div>
       </div>
     );
   }
 
   return (
     <div className="space-y-6">
       <div>
         <h2 className="text-2xl font-bold">
           {language === 'th' ? `ภาพรวมสาขา ${branchName}` : `${branchName} Overview`}
         </h2>
         <p className="text-muted-foreground">
           {language === 'th' ? 'สถิติการจัดส่งชุดตรวจ HIV ของสาขา' : 'HIV test kit delivery statistics for your branch'}
         </p>
       </div>
 
       {/* Total Card */}
       <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
         <CardHeader className="pb-2">
           <CardTitle className="text-sm font-medium text-muted-foreground">
             {language === 'th' ? 'จำนวนคำขอทั้งหมด' : 'Total Requests'}
           </CardTitle>
         </CardHeader>
         <CardContent>
           <div className="text-4xl font-bold text-primary">
             <AnimatedCounter value={stats?.total || 0} duration={1000} />
           </div>
         </CardContent>
       </Card>
 
       {/* Status Cards Grid */}
       <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
         {statCards.map((card, index) => (
           <Card key={index} className={`relative overflow-hidden border ${card.borderColor}`}>
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-xs font-medium text-muted-foreground">
                 {card.title}
               </CardTitle>
               <div className={`p-2 rounded-lg ${card.bgColor}`}>
                 <card.icon className={`h-4 w-4 ${card.color}`} />
               </div>
             </CardHeader>
             <CardContent>
               <span className={`text-2xl font-bold ${card.color}`}>
                 <AnimatedCounter value={card.value} duration={800} />
               </span>
             </CardContent>
           </Card>
         ))}
       </div>
 
       {/* Quick Actions Card */}
       <Card>
         <CardHeader>
           <CardTitle className="text-lg">
             {language === 'th' ? 'การดำเนินการด่วน' : 'Quick Actions'}
           </CardTitle>
         </CardHeader>
         <CardContent>
           <p className="text-muted-foreground text-sm">
             {language === 'th' 
               ? 'ใช้แท็บ "ชุดตรวจ" ด้านบนเพื่อจัดการคำขอชุดตรวจ HIV, อัพเดทสถานะ หรือเพิ่มเลขพัสดุ' 
               : 'Use the "Orders" tab above to manage HIV kit requests, update status, or add tracking numbers.'}
           </p>
         </CardContent>
       </Card>
     </div>
   );
 }