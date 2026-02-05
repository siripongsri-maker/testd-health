import { useState, useEffect } from "react";
import { Bell, Check, Megaphone, User, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { formatDistanceToNow } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: "broadcast" | "direct";
  created_at: string;
  isRead: boolean;
}

export function NotificationBell() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const fetchNotifications = async (pageNum: number, append: boolean = false) => {
    if (!user) return;
    
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    const offset = pageNum * PAGE_SIZE;

    // Fetch notifications (both broadcast and direct for this user)
    const { data: notifs, error: notifsError } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (notifsError) {
      console.error("Error fetching notifications:", notifsError);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    // Check if there are more notifications
    setHasMore((notifs?.length || 0) === PAGE_SIZE);

    if (append) {
      setNotifications((prev) => {
        const existingIds = new Set(prev.map(n => n.id));
        const newNotifs = (notifs || []).filter(n => !existingIds.has(n.id));
        return [
          ...prev,
          ...newNotifs.map((n) => ({
            ...n,
            notification_type: n.notification_type as "broadcast" | "direct",
            isRead: readIds.has(n.id),
          })),
        ];
      });
    } else {
      // Fetch read status
      const { data: reads, error: readsError } = await supabase
        .from("notification_reads")
        .select("notification_id")
        .eq("user_id", user.id);

      if (readsError) {
        console.error("Error fetching read status:", readsError);
      }

      const readSet = new Set(reads?.map((r) => r.notification_id) || []);
      setReadIds(readSet);

      setNotifications(
        (notifs || []).map((n) => ({
          ...n,
          notification_type: n.notification_type as "broadcast" | "direct",
          isRead: readSet.has(n.id),
        }))
      );
    }

    setLoading(false);
    setLoadingMore(false);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage, true);
  };

  useEffect(() => {
    if (!user) return;

    setPage(0);
    setHasMore(true);
    fetchNotifications(0, false);

    // Subscribe to realtime notifications
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          // Only add if it's for this user (broadcast or direct to them)
          if (
            newNotif.notification_type === "broadcast" ||
            (newNotif as any).recipient_user_id === user.id
          ) {
            setNotifications((prev) => [
              { ...newNotif, isRead: false },
              ...prev,
            ]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    if (!user || readIds.has(notificationId)) return;

    const { error } = await supabase.from("notification_reads").insert({
      notification_id: notificationId,
      user_id: user.id,
    });

    if (!error) {
      setReadIds((prev) => new Set([...prev, notificationId]));
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const unreadNotifs = notifications.filter((n) => !readIds.has(n.id));
    if (unreadNotifs.length === 0) return;

    const inserts = unreadNotifs.map((n) => ({
      notification_id: n.id,
      user_id: user.id,
    }));

    const { error } = await supabase
      .from("notification_reads")
      .upsert(inserts, { onConflict: "notification_id,user_id" });

    if (!error) {
      const allIds = new Set(notifications.map((n) => n.id));
      setReadIds(allIds);
    }
  };

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold text-base">
            {language === "th" ? "การแจ้งเตือน" : "Notifications"}
          </h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-sm h-8"
              onClick={markAllAsRead}
            >
              <Check className="h-4 w-4 mr-1" />
              {language === "th" ? "อ่านทั้งหมด" : "Mark all read"}
            </Button>
          )}
        </div>

        <ScrollArea className="h-96">
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Bell className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-base">
                {language === "th" ? "ไม่มีการแจ้งเตือน" : "No notifications"}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y">
              {notifications.map((notification) => {
                const isRead = readIds.has(notification.id);
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                      !isRead && "bg-primary/5"
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex gap-4">
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                          notification.notification_type === "broadcast"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-purple-100 text-purple-600"
                        )}
                      >
                        {notification.notification_type === "broadcast" ? (
                          <Megaphone className="h-5 w-5" />
                        ) : (
                          <User className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-base font-semibold leading-tight",
                              !isRead && "text-foreground",
                              isRead && "text-muted-foreground"
                            )}
                          >
                            {notification.title}
                          </p>
                          {!isRead && (
                            <div className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-2">
                          {formatDistanceToNow(
                            new Date(notification.created_at),
                            {
                              addSuffix: true,
                              locale: language === "th" ? th : enUS,
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
              
              {/* Load more button */}
              {hasMore && (
                <div className="p-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-sm"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {language === "th" ? "กำลังโหลด..." : "Loading..."}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        {language === "th" ? "โหลดเพิ่มเติม" : "Load more"}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
