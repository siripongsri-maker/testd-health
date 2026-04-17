import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, X } from "lucide-react";

export interface FaqSuggestion {
  id: string;
  path?: string;
  label_en?: string;
  label_th?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: FaqSuggestion[];
  isEn: boolean;
  /** Whether the post itself was approved (so we tell user it's posted, not pending) */
  approved: boolean;
}

export function CommunitySuggestionsDialog({
  open, onOpenChange, suggestions, isEn, approved,
}: Props) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <DialogTitle className="text-base">
              {isEn ? "We may already have an answer" : "เรามีคำตอบอยู่แล้ว"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs pt-2">
            {approved
              ? isEn
                ? "Your post is live. While you wait for replies, these resources may help right now:"
                : "โพสต์ของคุณขึ้นแล้ว ระหว่างรอคนตอบ ลองดูแหล่งข้อมูลเหล่านี้เลย:"
              : isEn
                ? "Your post is being reviewed. Meanwhile, these resources may help right now:"
                : "โพสต์ของคุณกำลังตรวจสอบ ระหว่างนี้ลองดูแหล่งข้อมูลเหล่านี้:"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {suggestions.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                if (s.path) navigate(s.path);
                onOpenChange(false);
              }}
              className="w-full text-left rounded-xl border border-border/50 bg-card p-3 flex items-center gap-3 hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-[0.98]"
            >
              <span className="flex-1 text-sm font-medium text-foreground">
                {isEn ? s.label_en : s.label_th}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-xl gap-1 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
            {isEn ? "Stay in community" : "อยู่ในชุมชนต่อ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
