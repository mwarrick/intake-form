import { NextResponse } from "next/server";
import { cleanupStaleUploads } from "@/lib/cleanup";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Run daily by Vercel Cron (vercel.json). When CRON_SECRET is set, Vercel sends it as a bearer token
// and other callers are refused. Without it the route stays open, which is harmless: it only removes
// uploads that are already a day old and attached to no intake record.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await cleanupStaleUploads();
    console.log("cleanup", result);
    return NextResponse.json(result);
  } catch (e) {
    console.error("cleanup failed", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
