import { Zap } from "lucide-react";

interface QuickFact {
  labelEn: string;
  labelTh: string;
  valueEn: string;
  valueTh: string;
}

interface Props {
  facts: QuickFact[];
  isEn: boolean;
}

/**
 * Structured Quick Facts card — machine-readable and visually scannable.
 */
export function QuickFactsCard({ facts, isEn }: Props) {
  if (!facts || facts.length === 0) return null;
  return (
    <section
      className="rounded-2xl bg-card p-5 space-y-3"
      style={{ boxShadow: "var(--hr-card-shadow)" }}
      aria-label="Quick Facts"
      data-structured-facts="true"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-hr-blue/10 flex items-center justify-center flex-shrink-0">
          <Zap className="h-4 w-4 text-hr-blue" />
        </div>
        <h2 className="text-[13px] font-semibold text-foreground uppercase tracking-wider">
          {isEn ? "Quick Facts" : "ข้อมูลสำคัญ"}
        </h2>
      </div>
      <dl className="grid grid-cols-1 gap-2 ml-[42px]">
        {facts.map((fact, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <dt className="text-[12px] text-muted-foreground/60 font-medium uppercase tracking-wide">
              {isEn ? fact.labelEn : fact.labelTh}
            </dt>
            <dd className="text-[14px] text-foreground font-medium">
              {isEn ? fact.valueEn : fact.valueTh}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
