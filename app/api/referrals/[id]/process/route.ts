import { after, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { processScan } from "@/lib/process";
import { T, db } from "@/lib/supabase";

// Reading a multi-page fax with up to three model calls can take a minute or two.
export const maxDuration = 300;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { data, error } = await db().from(T.referrals).select("id, source, status").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Faxed scans are staff-only; the public online form may only (re)read its own unsubmitted draft.
  if (data.source === "scan" && !(await currentUser())) {
    return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  }
  if (data.source === "portal" && !["processing", "draft"].includes(data.status)) {
    return NextResponse.json({ error: "This referral was already submitted" }, { status: 409 });
  }

  await db()
    .from(T.referrals)
    .update({ status: "processing", error: null, updated_at: new Date().toISOString() })
    .eq("id", id);

  // Respond right away; the review page polls until status leaves "processing".
  after(() => processScan(id));
  return NextResponse.json({ ok: true });
}
