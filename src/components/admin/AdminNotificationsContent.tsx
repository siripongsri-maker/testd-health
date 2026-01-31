import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Send,
  Megaphone,
  User,
  Trash2,
  Plus,
  Loader2,
  Bell,
  Users,
  Eye,
  TrendingUp,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AppNotification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  recipient_user_id: string | null;
  created_at: string;
  expires_at: string | null;
}

interface NotificationWithStats extends AppNotification {
  read_count: number;
  target_count: number;
}

interface UserProfile {
  id: string;
  display_name: string | null;
}

export default function AdminNotificationsContent() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationWithStats[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [notificationType, setNotificationType] = useState<"broadcast" | "direct">("broadcast");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Engagement stats
  const totalReadCount = notifications.reduce((sum, n) => sum + n.read_count, 0);
  const broadcastNotifications = notifications.filter((n) => n.notification_type === "broadcast");
  const avgReadRate = broadcastNotifications.length > 0
    ? broadcastNotifications.reduce((sum, n) => {
        const rate = n.target_count > 0 ? (n.read_count / n.target_count) * 100 : 0;
        return sum + rate;
      }, 0) / broadcastNotifications.length
    : 0;

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    
    // Fetch notifications
    const { data: notifs, error: notifsError } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (notifsError) {
      console.error("Error fetching notifications:", notifsError);
      toast({
        title: language === "th" ? "เกิดข้อผิดพลาด" : "Error",
        description: notifsError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Fetch total user count for broadcast target calculation
    const { count: userCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    
    setTotalUsers(userCount || 0);

    // Fetch read counts for each notification
    const notificationIds = (notifs || []).map((n) => n.id);
    
    let readCounts: Record<string, number> = {};
    if (notificationIds.length > 0) {
      const { data: reads } = await supabase
        .from("notification_reads")
        .select("notification_id")
        .in("notification_id", notificationIds);

      // Count reads per notification
      (reads || []).forEach((read) => {
        readCounts[read.notification_id] = (readCounts[read.notification_id] || 0) + 1;
      });
    }

    // Combine notifications with their stats
    const notifsWithStats: NotificationWithStats[] = (notifs || []).map((n) => ({
      ...n,
      read_count: readCounts[n.id] || 0,
      target_count: n.notification_type === "broadcast" ? (userCount || 0) : 1,
    }));

    setNotifications(notifsWithStats);
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .order("display_name");

    if (!error && data) {
      setUsers(data);
    }
  };

  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: language === "th" ? "กรุณากรอกข้อมูล" : "Missing fields",
        description:
          language === "th"
            ? "กรุณากรอกหัวข้อและข้อความ"
            : "Please fill in title and message",
        variant: "destructive",
      });
      return;
    }

    if (notificationType === "direct" && !selectedUserId) {
      toast({
        title: language === "th" ? "กรุณาเลือกผู้ใช้" : "Select user",
        description:
          language === "th"
            ? "กรุณาเลือกผู้ใช้ที่ต้องการส่งถึง"
            : "Please select a user to send to",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    const { error } = await supabase.from("notifications").insert({
      title: title.trim(),
      message: message.trim(),
      notification_type: notificationType,
      recipient_user_id: notificationType === "direct" ? selectedUserId : null,
      created_by: user?.id,
    });

    if (error) {
      console.error("Error sending notification:", error);
      toast({
        title: language === "th" ? "เกิดข้อผิดพลาด" : "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: language === "th" ? "ส่งสำเร็จ" : "Sent successfully",
        description:
          language === "th"
            ? "ส่งการแจ้งเตือนเรียบร้อยแล้ว"
            : "Notification sent successfully",
      });
      setTitle("");
      setMessage("");
      setNotificationType("broadcast");
      setSelectedUserId("");
      setIsDialogOpen(false);
      fetchNotifications();
    }

    setSending(false);
  };

  const handleDeleteNotification = async (id: string) => {
    const { error } = await supabase.from("notifications").delete().eq("id", id);

    if (error) {
      toast({
        title: language === "th" ? "เกิดข้อผิดพลาด" : "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: language === "th" ? "ลบสำเร็จ" : "Deleted",
        description:
          language === "th"
            ? "ลบการแจ้งเตือนเรียบร้อยแล้ว"
            : "Notification deleted successfully",
      });
      fetchNotifications();
    }
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return "-";
    const foundUser = users.find((u) => u.id === userId);
    return foundUser?.display_name || userId.slice(0, 8);
  };

  const getReadRateColor = (rate: number) => {
    if (rate >= 70) return "text-green-600";
    if (rate >= 40) return "text-amber-600";
    return "text-red-500";
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 70) return "bg-green-500";
    if (rate >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {language === "th" ? "การแจ้งเตือน" : "Notifications"}
          </h2>
          <p className="text-muted-foreground">
            {language === "th"
              ? "ส่งการแจ้งเตือนถึงผู้ใช้ทั้งหมดหรือรายบุคคล"
              : "Send notifications to all users or specific individuals"}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {language === "th" ? "ส่งการแจ้งเตือน" : "Send Notification"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {language === "th" ? "ส่งการแจ้งเตือนใหม่" : "Send New Notification"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>{language === "th" ? "ประเภท" : "Type"}</Label>
                <Select
                  value={notificationType}
                  onValueChange={(v) => setNotificationType(v as "broadcast" | "direct")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="broadcast">
                      <div className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4" />
                        {language === "th" ? "ส่งถึงทุกคน" : "Broadcast to all"}
                        <span className="text-xs text-muted-foreground">
                          ({totalUsers} {language === "th" ? "คน" : "users"})
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="direct">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {language === "th" ? "ส่งถึงผู้ใช้เฉพาะ" : "Direct to user"}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {notificationType === "direct" && (
                <div className="space-y-2">
                  <Label>{language === "th" ? "เลือกผู้ใช้" : "Select User"}</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          language === "th" ? "เลือกผู้ใช้..." : "Select a user..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.display_name || u.id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>{language === "th" ? "หัวข้อ" : "Title"}</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    language === "th" ? "หัวข้อการแจ้งเตือน..." : "Notification title..."
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>{language === "th" ? "ข้อความ" : "Message"}</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    language === "th" ? "เนื้อหาข้อความ..." : "Message content..."
                  }
                  rows={4}
                />
              </div>

              <Button
                onClick={handleSendNotification}
                disabled={sending}
                className="w-full"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {language === "th" ? "ส่งการแจ้งเตือน" : "Send Notification"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Bell className="h-4 w-4" />
              {language === "th" ? "ทั้งหมด" : "Total Sent"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedCounter value={notifications.length} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              {language === "th" ? "ส่งถึงทุกคน" : "Broadcasts"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedCounter value={broadcastNotifications.length} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              → {totalUsers} {language === "th" ? "ผู้ใช้" : "users"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {language === "th" ? "อ่านแล้ว" : "Total Reads"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              <AnimatedCounter value={totalReadCount} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {language === "th" ? "ครั้ง" : "times"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {language === "th" ? "อัตราอ่าน (เฉลี่ย)" : "Avg Read Rate"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getReadRateColor(avgReadRate)}`}>
              {avgReadRate.toFixed(1)}%
            </div>
            <Progress 
              value={avgReadRate} 
              className="h-1.5 mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Notifications Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {language === "th" ? "ประวัติการแจ้งเตือน" : "Notification History"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p>{language === "th" ? "ยังไม่มีการแจ้งเตือน" : "No notifications yet"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "th" ? "ประเภท" : "Type"}</TableHead>
                    <TableHead>{language === "th" ? "หัวข้อ" : "Title"}</TableHead>
                    <TableHead className="hidden md:table-cell">
                      {language === "th" ? "ข้อความ" : "Message"}
                    </TableHead>
                    <TableHead>
                      {language === "th" ? "ผู้รับ" : "Recipient"}
                    </TableHead>
                    <TableHead className="text-center">
                      {language === "th" ? "อ่านแล้ว" : "Read"}
                    </TableHead>
                    <TableHead>{language === "th" ? "ส่งเมื่อ" : "Sent"}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notification) => {
                    const readRate = notification.target_count > 0 
                      ? (notification.read_count / notification.target_count) * 100 
                      : 0;
                    
                    return (
                      <TableRow key={notification.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {notification.notification_type === "broadcast" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                <Megaphone className="h-3 w-3" />
                                {language === "th" ? "ทุกคน" : "All"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                <User className="h-3 w-3" />
                                {language === "th" ? "รายบุคคล" : "Direct"}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium max-w-[150px] truncate">
                          {notification.title}
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-[200px] truncate text-muted-foreground">
                          {notification.message}
                        </TableCell>
                        <TableCell>
                          {notification.notification_type === "direct"
                            ? getUserName(notification.recipient_user_id)
                            : (
                              <span className="text-muted-foreground">
                                {totalUsers} {language === "th" ? "คน" : "users"}
                              </span>
                            )}
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex items-center gap-1">
                                    <Eye className="h-3 w-3 text-muted-foreground" />
                                    <span className={`text-sm font-medium ${getReadRateColor(readRate)}`}>
                                      {notification.read_count}/{notification.target_count}
                                    </span>
                                  </div>
                                  <div className="w-16">
                                    <Progress 
                                      value={readRate} 
                                      className="h-1"
                                    />
                                  </div>
                                  <span className={`text-xs ${getReadRateColor(readRate)}`}>
                                    {readRate.toFixed(0)}%
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {language === "th" 
                                    ? `${notification.read_count} จาก ${notification.target_count} คนอ่านแล้ว`
                                    : `${notification.read_count} of ${notification.target_count} users read`
                                  }
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">
                                  {formatDistanceToNow(new Date(notification.created_at), {
                                    addSuffix: true,
                                    locale: language === "th" ? th : enUS,
                                  })}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{format(new Date(notification.created_at), "dd/MM/yyyy HH:mm:ss")}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteNotification(notification.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
