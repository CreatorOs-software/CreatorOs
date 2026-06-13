// Supabase Edge Function — called by pg_cron every hour via pg_net.http_post.
// Processes pending sync_jobs in batches, respecting rate limits per platform.
//
// Deploy: supabase functions deploy sync-platform
// Invoke URL: https://<project>.supabase.co/functions/v1/sync-platform

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_BATCH = 20; // jobs per invocation to stay within Edge Function timeout

Deno.serve(async (req) => {
  // Validate service role caller (pg_cron passes the Authorization header)
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Claim pending jobs atomically — update to 'running' to prevent double-processing
  const { data: jobs, error } = await supabase
    .from("sync_jobs")
    .update({ status: "running", started_at: new Date().toISOString(), attempts: supabase.rpc("increment", { row_id: "id" }) })
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .lt("attempts", 3)
    .order("priority", { ascending: true })
    .order("scheduled_at", { ascending: true })
    .limit(MAX_BATCH)
    .select();

  if (error) {
    console.error("[sync-platform] failed to claim jobs:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!jobs?.length) {
    return Response.json({ processed: 0 });
  }

  // Process jobs in parallel — each calls the app's /api/integrations/sync endpoint
  // which holds the adapter logic (keeps it in one codebase, not duplicated in Edge land)
  const appUrl = Deno.env.get("APP_URL")!;
  const internalSecret = Deno.env.get("INTERNAL_SYNC_SECRET")!;

  const results = await Promise.allSettled(
    jobs.map(async (job: { id: string; creator_account_id: string }) => {
      const res = await fetch(`${appUrl}/api/integrations/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": internalSecret,
        },
        body: JSON.stringify({ account_id: job.creator_account_id }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return job.id;
    }),
  );

  // Mark jobs as done or failed
  const done: string[] = [];
  const failed: { id: string; error: string }[] = [];

  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      done.push(jobs[i].id);
    } else {
      failed.push({
        id: jobs[i].id,
        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      });
    }
  });

  if (done.length) {
    await supabase
      .from("sync_jobs")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .in("id", done);
  }

  for (const f of failed) {
    await supabase
      .from("sync_jobs")
      .update({
        status: "failed",
        error: f.error,
        completed_at: new Date().toISOString(),
      })
      .eq("id", f.id);
  }

  console.log(`[sync-platform] done=${done.length} failed=${failed.length}`);
  return Response.json({ processed: jobs.length, done: done.length, failed: failed.length });
});
