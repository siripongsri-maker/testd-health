import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { FileText, ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const AVAILABLE_DOCS = [
  { name: "BOOKING_STAFF_GUIDE.html", label: "Staff Booking Guide (English)" },
  { name: "BOOKING_STAFF_GUIDE_TH.html", label: "คู่มือการจองสำหรับเจ้าหน้าที่ (ภาษาไทย)" },
];

const DocsIndex = () => (
  <div className="min-h-screen bg-background flex items-center justify-center p-6">
    <div className="max-w-md w-full space-y-6 text-center">
      <FileText className="h-12 w-12 mx-auto text-primary" />
      <h1 className="text-2xl font-bold text-foreground">Staff Documents</h1>
      <div className="space-y-3">
        {AVAILABLE_DOCS.map((doc) => (
          <a
            key={doc.name}
            href={`/docs/${doc.name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button variant="outline" className="w-full justify-start gap-3">
              <FileText className="h-4 w-4 shrink-0" />
              {doc.label}
            </Button>
          </a>
        ))}
      </div>
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to app
      </Link>
    </div>
  </div>
);

const DocsViewer = () => {
  const { docName } = useParams<{ docName: string }>();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const docUrl = `/docs/${docName}`;

  useEffect(() => {
    if (!docName) {
      setStatus("error");
      return;
    }
    fetch(docUrl, { method: "HEAD" })
      .then((r) => setStatus(r.ok ? "ok" : "error"))
      .catch(() => setStatus("error"));
  }, [docName, docUrl]);

  if (!docName) return <DocsIndex />;

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading document…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
          <h1 className="text-xl font-bold text-foreground">Document not found</h1>
          <p className="text-muted-foreground text-sm">
            <code className="bg-muted px-2 py-1 rounded">{docName}</code> could not be loaded.
          </p>
          <div className="space-y-3 pt-4">
            <p className="text-sm font-medium text-foreground">Available documents:</p>
            {AVAILABLE_DOCS.map((doc) => (
              <a key={doc.name} href={`/docs/${doc.name}`} target="_blank" rel="noopener noreferrer" className="block">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                  <FileText className="h-4 w-4 shrink-0" />
                  {doc.label}
                </Button>
              </a>
            ))}
          </div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to app
          </Link>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={docUrl}
      title={docName}
      className="w-full h-screen border-0"
      sandbox="allow-same-origin allow-popups"
    />
  );
};

export { DocsIndex };
export default DocsViewer;
