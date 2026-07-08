import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Beta @supabase/supabase-js OAuth helpers — typed locally so TS doesn't complain.
type OAuthResult = { data: any; error: { message: string } | null };
interface OAuthApi {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
}
const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

function isSafeRelative(path: string | null): path is string {
  return !!path && path.startsWith("/") && !path.startsWith("//");
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-lg font-semibold mb-2">Authorization error</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  const clientName = details.client?.name ?? "an app";

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h1 className="text-xl font-semibold">Connect {clientName} to your testD account</h1>
        <p className="text-sm text-muted-foreground">
          {clientName} will be able to call this app's enabled tools while you are signed in.
          This does not bypass this app's permissions or backend policies.
        </p>
        <div className="flex gap-2 pt-2">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 rounded-full bg-primary text-primary-foreground font-semibold text-sm py-2.5 disabled:opacity-60"
          >
            Approve
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 rounded-full border border-border font-semibold text-sm py-2.5 disabled:opacity-60"
          >
            Cancel connection
          </button>
        </div>
      </div>
    </main>
  );
}
