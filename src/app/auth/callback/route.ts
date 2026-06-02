import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    // Seed currency from signup metadata into user_context if not already saved.
    // The RLS-blocked insert during signup gets resolved here once session is live.
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const metaCurrency = user.user_metadata?.currency as string | undefined
      if (metaCurrency) {
        await supabase.from("user_context").upsert(
          { user_id: user.id, key: "currency", value: metaCurrency, updated_at: new Date().toISOString() },
          { onConflict: "user_id,key", ignoreDuplicates: true }
        )
      }
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin
  return NextResponse.redirect(`${siteUrl}/dashboard`)
}
