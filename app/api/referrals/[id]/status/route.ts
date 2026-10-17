import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import type { ReadStatus } from "@/lib/progress";
import { T, db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!(await currentUser())) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const { data, error } = await db().from(T.referrals).select("status, pipeline").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data: docs } = await db().from(T.supporting).select("status").eq("referral_id", id);
  const body: ReadStatus = {
    status: data.status,
    progress: data.status === "processing" ? (data.pipeline?.progress ?? null) : null,
    docsPending: (docs ?? []).filter((d) => d.status === "processing").length,
    docsTotal: docs?.length ?? 0,
  };
  return NextResponse.json(body);
}
