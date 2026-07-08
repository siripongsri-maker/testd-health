import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listBranches from "./tools/list-branches";
import listServices from "./tools/list-services";
import searchArticles from "./tools/search-articles";

// Build the OAuth issuer from the Supabase project ref (never from SUPABASE_URL,
// which on Lovable Cloud is a .lovable.cloud proxy that mcp-js will reject as
// a mismatched issuer). VITE_SUPABASE_PROJECT_ID is inlined by Vite at build
// time so this stays import-safe.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "testd-mcp",
  title: "testD Health MCP",
  version: "0.1.0",
  instructions:
    "Read-only tools for the testD × SWING Clinic app: list clinic branches, list bookable services, and search published health/harm-reduction articles.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listBranches, listServices, searchArticles],
});
