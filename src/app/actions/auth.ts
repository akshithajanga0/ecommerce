"use server";

import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";

/**
 * Customer / Super Admin sign-in, resolved entirely on the server.
 *
 * The password check and the `profiles.role` lookup happen in this single
 * server request — after Supabase has written the session cookies through the
 * SSR cookie store. Doing it here removes the previous race where the browser
 * asked a second server action for the role before the session cookie had
 * propagated; losing that race dropped a Super Admin on the storefront.
 *
 * The action does NOT redirect. It returns the resolved destination so the
 * client can (a) reload its session-backed context first (`refreshAuth()`) and
 * then (b) navigate — which makes the logged-in UI update immediately instead
 * of only after a manual refresh. The role still decides the destination, so a
 * Super Admin can never be routed to the storefront.
 *
 * The role read is a ROUTING hint only, not the security boundary: every
 * privileged operation is still independently gated by `requireAdmin()` and the
 * `/admin` layout gate.
 */

export interface LoginActionResult {
  success: boolean;
  error?: string;
  /** Server-resolved landing route. Present only on success. */
  destination?: string;
}

/** Only allow same-origin, absolute-path redirects (no open redirect). */
function safeNextPath(raw: string | undefined | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "";
}

export async function loginAction(
  identifier: string,
  password: string,
  next: string
): Promise<LoginActionResult> {
  const email = (identifier ?? "").trim();
  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { success: false, error: error?.message ?? "Invalid email or password." };
  }

  // Resolve the role from the server-side profile (service-role client,
  // server-only). A lookup failure degrades to the customer destination; the
  // server gate still protects /admin.
  let role = "customer";
  const { data: profile, error: profileError } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();
  if (!profileError && profile?.role) role = profile.role;

  const safeNext = safeNextPath(next);
  const destination =
    role === "admin"
      ? // A Super Admin always lands in the admin panel (honouring an explicit
        // /admin path), never the storefront.
        safeNext.startsWith("/admin")
        ? safeNext
        : "/admin"
      : // A customer goes to their intended page, but never to /admin (the
        // server gate would only bounce them back anyway).
        safeNext && !safeNext.startsWith("/admin")
        ? safeNext
        : "/";

  return { success: true, destination };
}
