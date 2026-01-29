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
} from "lucide-react";
import { format } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  recipient_user_id: string | null;
  created_at: string;
  expires_at: string | null;
}

interface UserProfile {
  id: string;
  display_name: string | null;
}

export default function AdminNotificationsContent() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [notificationType, setNotificationType] = useState<"broadcast" | "direct">("broadcast");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching notifications:", error);
      toast({
        title: language === "th" ? "เกิดข้อผิดพลาด" : "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setNotifications(data || []);
    }
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === "th" ? "ทั้งหมด" : "Total"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === "th" ? "ส่งถึงทุกคน" : "Broadcasts"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications.filter((n) => n.notification_type === "broadcast").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === "th" ? "ส่งถึงรายบุคคล" : "Direct Messages"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications.filter((n) => n.notification_type === "direct").length}
            </div>
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
                    <TableHead>{language === "th" ? "วันที่" : "Date"}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {notification.notification_type === "broadcast" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                              <Megaphone className="h-3 w-3" />
                              {language === "th" ? "ทุกคน" : "All"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">
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
                          : language === "th"
                          ? "ทุกคน"
                          : "Everyone"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(notification.created_at), "dd/MM/yy HH:mm")}
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
