# AGENTS.md

- Every source file starts with the `/*! © ... Sole Creator */` creator header and new files must keep it — it is the code-level authorship watermark (the `/*!` form survives minification).
- Creator identity lives in `src/lib/creatorSignature.ts` and the immutable `system_provenance` table; never render it in visible UI — authorship must stay hidden from the public page.
