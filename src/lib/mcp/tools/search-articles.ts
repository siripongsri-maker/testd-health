import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "search_articles",
  title: "Search health articles",
  description: "Search published testD health/harm-reduction articles by keyword. Returns id, slug, title, excerpt.",
  inputSchema: {
    query: z.string().trim().min(1).describe("Keyword to search titles and excerpts."),
    limit: z.number().int().min(1).max(20).default(10).describe("Max results (1-20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await supabase
      .from("articles")
      .select("id,slug,title,excerpt,published_at")
      .eq("status", "published")
      .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%`)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { articles: data ?? [] },
    };
  },
});
