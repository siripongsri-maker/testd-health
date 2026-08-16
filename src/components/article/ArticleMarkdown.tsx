import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

const isSafeImageUrl = (url: string) =>
  /^https:\/\//i.test(url) || url.startsWith("/");

/**
 * บทความเก่าจากตัวแก้ไขในระบบใช้ "• " เป็นรายการ และบรรทัดที่ลงท้ายด้วย ":"
 * เป็นหัวข้อย่อย — แปลงให้เป็น Markdown มาตรฐานก่อนเรนเดอร์
 */
function normalizeLegacyContent(raw: string): string {
  return raw
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (/^[•·]\s+/.test(trimmed)) return trimmed.replace(/^[•·]\s+/, "- ");
      if (
        trimmed.length > 0 &&
        trimmed.length <= 80 &&
        /[:：]$/.test(trimmed) &&
        !/^#{1,6}\s/.test(trimmed) &&
        !/^[-*>|]/.test(trimmed)
      ) {
        return `### ${trimmed.replace(/[:：]$/, "")}`;
      }
      return line;
    })
    .join("\n");
}

/**
 * Renders article body content written in Markdown (headings, tables,
 * bold, lists, blockquotes) using the project's design tokens.
 */
export function ArticleMarkdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}

        components={{
          h1: ({ children }) => (
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">{children}</h2>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-foreground mt-8 mb-3">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-bold text-foreground mt-6 mb-2">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-foreground leading-relaxed mb-4">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          ul: ({ children }) => (
            <ul className="list-disc ps-5 space-y-1 mb-4 text-foreground">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal ps-5 space-y-1 mb-4 text-foreground">{children}</ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-s-4 border-primary/60 bg-muted/40 rounded-e-lg px-4 py-3 my-4 text-sm text-muted-foreground">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-primary underline underline-offset-2"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-5 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
          th: ({ children }) => (
            <th className="text-start font-semibold text-foreground px-3 py-2 border-b border-border whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-border/60 text-foreground align-top">
              {children}
            </td>
          ),
          img: ({ src, alt }) =>
            typeof src === "string" && isSafeImageUrl(src) ? (
              <img src={src} alt={alt ?? ""} loading="lazy" className="rounded-lg max-w-full my-4" />
            ) : null,
          hr: () => <hr className="my-6 border-border" />,
        }}
      >
        {normalizeLegacyContent(content)}
      </ReactMarkdown>
    </div>
  );
}

export default ArticleMarkdown;
