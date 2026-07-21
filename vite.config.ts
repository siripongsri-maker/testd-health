import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mcpPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split heavy shared libraries into their own long-cached chunks so
        // route bundles stop re-embedding them. Order matters: more specific
        // matches (leaflet, recharts) go first.
        manualChunks(id) {
          if (id.endsWith("thailand-geography.json")) return "vendor-thai-geo";
          if (!id.includes("node_modules")) return;
          if (id.includes("/leaflet/")) return "vendor-leaflet";
          if (id.includes("/recharts/") || id.includes("/d3-")) return "vendor-charts";
          if (id.includes("/@supabase/")) return "vendor-supabase";
          if (
            id.includes("/react-hook-form/") ||
            id.includes("/@hookform/") ||
            id.includes("/zod/")
          )
            return "vendor-forms";
          if (id.includes("/@radix-ui/")) return "vendor-radix";
          if (id.includes("/lucide-react/")) return "vendor-icons";
          if (id.includes("/date-fns/")) return "vendor-datefns";
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/react-router") ||
            id.includes("/scheduler/")
          )
            return "vendor-react";
        },
      },
    },
  },
  // Note: do NOT set optimizeDeps.force = true — that re-prebundles every dep
  // on every server start, making cold loads take 8+ seconds.
}));