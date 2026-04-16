import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ExternalLink, HelpCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { supportFaqs, type SupportFaqItem } from "@/data/supportFaqData";

interface Props {
  language: string;
  compact?: boolean;
}

export function SupportFAQ({ language, compact = false }: Props) {
  const isEn = language === "en";

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {!compact && (
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <HelpCircle className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">
            {isEn ? "Frequently Asked Questions" : "คำถามที่พบบ่อย"}
          </h2>
        </div>
      )}
      <div className="space-y-1.5">
        {supportFaqs.map((faq) => (
          <FaqItem key={faq.id} faq={faq} isEn={isEn} />
        ))}
      </div>
    </div>
  );
}

function FaqItem({ faq, isEn }: { faq: SupportFaqItem; isEn: boolean }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl bg-card border overflow-hidden">
        <CollapsibleTrigger className="w-full">
          <div className="px-3.5 py-3 flex items-center gap-2.5">
            <span className="flex-1 text-[13px] font-medium text-foreground text-left leading-snug">
              {isEn ? faq.questionEn : faq.questionTh}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3.5 pb-3 pt-0 space-y-2">
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              {isEn ? faq.answerEn : faq.answerTh}
            </p>
            {faq.linkPath && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px] rounded-lg gap-1.5"
                onClick={() => navigate(faq.linkPath!)}
              >
                <ExternalLink className="h-3 w-3" />
                {isEn ? faq.linkLabelEn : faq.linkLabelTh}
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
