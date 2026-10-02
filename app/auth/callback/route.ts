import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/auth/redirect";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const rawNext = requestUrl.searchParams.get("next");
  const error = requestUrl.searchParams.get("error");
  const errorCode = requestUrl.searchParams.get("error_code");

  // Determine site origin, supporting x-forwarded-host behind Vercel / proxy
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : requestUrl.origin;

  const safeNext = safeRedirectPath(rawNext, "/");

  // If provider returned an error parameter
  if (error || errorCode) {
    const codeParam = encodeURIComponent(errorCode || error || "oauth_error");
    return NextResponse.redirect(`${origin}/login?error=${codeParam}`);
  }

  // Code is required for session exchange
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=invalid_code`);
  }

  // Check onboarding status
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", data.user.id)
    .single();

  if (!profile || !profile.onboarded_at) {
    const encodedNext = encodeURIComponent(safeNext);
    return NextResponse.redirect(`${origin}/onboarding?next=${encodedNext}`);
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
