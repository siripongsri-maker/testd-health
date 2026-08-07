import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

const STYLE_ID = "admin-print-style";

const PRINT_CSS = `
@media print {
  aside, nav, [data-sidebar], .no-print { display: none !important; }
  body { background: #fff !important; }
  main, [role="main"] { width: 100% !important; margin: 0 !important; padding: 0 !important; }
  .print-block, table, .rounded-xl, .rounded-lg { break-inside: avoid; }
  * { box-shadow: none !important; }
}
@page { size: A4 landscape; margin: 10mm; }
`;

function ensurePrintStyle() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = PRINT_CSS;
  document.head.appendChild(style);
}

interface Props {
  /** Document title used as the PDF file name suggestion */
  documentTitle?: string;
  className?: string;
  size?: "sm" | "default";
}

/** Shared "Print / PDF" trigger for admin pages (uses the browser Save-as-PDF dialog). */
export default function PrintButton({ documentTitle, className, size = "sm" }: Props) {
  const { language } = useLanguage();
  const label = language === "th" ? "พิมพ์ / PDF" : "Print / PDF";

  const handlePrint = () => {
    ensurePrintStyle();
    const previous = document.title;
    if (documentTitle) document.title = documentTitle;
    window.print();
    window.setTimeout(() => { document.title = previous; }, 1000);
  };

  return (
    <Button variant="outline" size={size} className={`no-print ${className || ""}`} onClick={handlePrint}>
      <Printer className="h-3.5 w-3.5 mr-1" />{label}
    </Button>
  );
}
