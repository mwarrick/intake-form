import { after, NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { checkReferralCriteria } from "@/lib/process";
import { T, db } from "@/lib/supabase";

// Transcribing a 35-page packet and judging every rule group takes a minute or two.
export const maxDuration = 300;

/** Run the admission criteria check again on a referral's scanned pages (staff only). */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!(await apiUser())) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const { data, error } = await db().from(T.referrals).select("id, status").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (["draft", "processing", "failed"].includes(data.status)) {
    return NextResponse.json({ error: "The scan hasn't been read yet" }, { status: 409 });
  }
  // Respond right away; the review screen polls the status endpoint until the check is done.
  after(() => checkReferralCriteria(id));
  return NextResponse.json({ ok: true });
}
