import { after, NextResponse } from "next/server";
import { readAttachments, refreshDocFlags } from "@/lib/extract-docs";
import { apiUser } from "@/lib/auth";
import { T, db } from "@/lib/supabase";

// One model call per attachment, run in parallel.
export const maxDuration = 300;

/** Read a referral's uploaded supporting documents. Called once the browser has finished uploading them. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  // Only signed-in staff submit referrals now, so reading their documents needs a signed-in user too.
  if (!(await apiUser())) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const { data, error } = await db().from(T.referrals).select("id").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  after(async () => {
    try {
      await readAttachments(id);
    } finally {
      await refreshDocFlags(id);
    }
  });
  return NextResponse.json({ ok: true });
}
