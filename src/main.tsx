import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Sync html lang attribute with stored language preference
const storedLang = localStorage.getItem('testd-language') || 'th';
document.documentElement.lang = storedLang;

// Dev-only: confirm which backend project is connected
if (import.meta.env.DEV) {
  try {
    const url = new URL(import.meta.env.VITE_SUPABASE_URL);
    console.log(`[DEV] Backend connected: ${url.host}`);
  } catch {
    console.warn('[DEV] VITE_SUPABASE_URL is not set or invalid');
  }
}

createRoot(document.getElementById("root")!).render(<App />);
