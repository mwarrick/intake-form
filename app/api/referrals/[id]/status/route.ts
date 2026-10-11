import { NextResponse } from "next/server";
import { T, db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { data, error } = await db().from(T.referrals).select("status").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { count } = await db()
    .from(T.supporting)
    .select("id", { count: "exact", head: true })
    .eq("referral_id", id)
    .eq("status", "processing");
  return NextResponse.json({ status: data.status, docsPending: count ?? 0 });
}
