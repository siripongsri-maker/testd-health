import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Clock } from "lucide-react";

interface DetailField {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  fullWidth?: boolean;
}

interface TimelineEvent {
  label: string;
  time: string | null;
  status?: 'success' | 'error' | 'warning' | 'neutral';
}

interface AdminDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  fields: DetailField[];
  timeline?: TimelineEvent[];
  children?: React.ReactNode;
}

const dotColor = (s?: string) =>
  s === 'success' ? 'bg-emerald-500' :
  s === 'error' ? 'bg-red-500' :
  s === 'warning' ? 'bg-amber-500' :
  'bg-muted-foreground/40';

export default function AdminDetailDrawer({ open, onOpenChange, title, subtitle, fields, timeline, children }: AdminDetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg">{title}</SheetTitle>
          {subtitle && <SheetDescription>{subtitle}</SheetDescription>}
        </SheetHeader>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {fields.map((f, i) => (
            <div key={i} className={cn(f.fullWidth && "col-span-2")}>
              <p className="text-xs text-muted-foreground mb-0.5">{f.label}</p>
              <p className={cn("text-sm text-foreground break-all", f.mono && "font-mono text-xs")}>{f.value ?? '—'}</p>
            </div>
          ))}
        </div>

        {timeline && timeline.length > 0 && (
          <>
            <Separator className="my-5" />
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Timeline</p>
            </div>
            <div className="relative pl-4 space-y-3">
              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
              {timeline.map((evt, i) => (
                <div key={i} className="relative flex items-start gap-3">
                  <div className={cn("absolute left-[-12px] top-1.5 h-2 w-2 rounded-full", dotColor(evt.status))} />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{evt.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {evt.time ? format(new Date(evt.time), 'dd/MM/yyyy HH:mm:ss') : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {children && (
          <>
            <Separator className="my-5" />
            {children}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
