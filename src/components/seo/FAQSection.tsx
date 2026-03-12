import { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface FAQItem {
  questionEn: string;
  questionTh: string;
  answerEn: string;
  answerTh: string;
}

interface Props {
  faqs: FAQItem[];
  isEn: boolean;
}

/**
 * FAQ accordion section with semantic markup for search engines.
 */
export function FAQSection({ faqs, isEn }: Props) {
  if (!faqs || faqs.length === 0) return null;

  return (
    <section
      className="space-y-3"
      aria-label="Frequently Asked Questions"
      itemScope
      itemType="https://schema.org/FAQPage"
    >
      <div className="flex items-center gap-2.5 px-1">
        <div className="w-8 h-8 rounded-xl bg-hr-surface flex items-center justify-center flex-shrink-0">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </div>
        <h2 className="text-[13px] font-semibold text-foreground uppercase tracking-wider">
          {isEn ? "Frequently Asked Questions" : "คำถามที่พบบ่อย"}
        </h2>
      </div>

      <div className="space-y-2">
        {faqs.map((faq, i) => (
          <FAQAccordionItem key={i} faq={faq} isEn={isEn} />
        ))}
      </div>
    </section>
  );
}

function FAQAccordionItem({ faq, isEn }: { faq: FAQItem; isEn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className="rounded-2xl bg-card overflow-hidden"
        style={{ boxShadow: "var(--hr-card-shadow)" }}
        itemScope
        itemProp="mainEntity"
        itemType="https://schema.org/Question"
      >
        <CollapsibleTrigger className="w-full">
          <div className="p-4 flex items-center gap-3">
            <span className="flex-1 text-[14px] font-medium text-foreground text-left" itemProp="name">
              {isEn ? faq.questionEn : faq.questionTh}
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div
            className="px-4 pb-4 pt-0"
            itemScope
            itemProp="acceptedAnswer"
            itemType="https://schema.org/Answer"
          >
            <p className="text-[13px] text-muted-foreground leading-relaxed" itemProp="text">
              {isEn ? faq.answerEn : faq.answerTh}
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
