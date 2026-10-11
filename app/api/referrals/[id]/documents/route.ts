import { after, NextResponse } from "next/server";
import { readAttachments, refreshDocFlags } from "@/lib/extract-docs";
import { currentUser } from "@/lib/auth";
import { T, db } from "@/lib/supabase";

// One model call per attachment, run in parallel.
export const maxDuration = 300;

/** Read a referral's uploaded supporting documents. Called once the browser has finished uploading them. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { data, error } = await db().from(T.referrals).select("id, source").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // The public online form calls this right after submitting; anything else needs a signed-in user.
  // Reading is idempotent: only attachments not yet read are sent to the model.
  if (data.source !== "portal" && !(await currentUser())) {
    return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  }

  after(async () => {
    try {
      await readAttachments(id);
    } finally {
      await refreshDocFlags(id);
    }
  });
  return NextResponse.json({ ok: true });
}
