# AGENTS.md

- Every hand-written source file starts with the `/*! © ... Sole Creator */` creator header and new files must keep it — it is the code-level authorship watermark (the `/*!` form survives minification). Never add it to auto-generated files (integrations, supabase/functions/mcp) — generators refuse to overwrite modified files and the preview fails to start.
- Creator identity lives in `src/lib/creatorSignature.ts` and the immutable `system_provenance` table; public credit lines (Partner page, copyright footers, article bylines) name the creator, but legal data-controller contacts (privacy policy) stay with the operating organization — PDPA requires the real controller.
