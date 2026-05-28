import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---- Shared helpers ------------------------------------------------

async function logActivity(
  supabase: any,
  agencyId: string,
  threadId: string,
  actorId: string,
  eventType: string,
  payload: Record<string, unknown>,
) {
  await supabase.from("thread_activity").insert({
    agency_id: agencyId,
    thread_id: threadId,
    actor_id: actorId,
    event_type: eventType,
    payload,
  });
}

async function getAgencyId(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("agency_id").eq("id", userId).single();
  if (!data?.agency_id) throw new Error("No agency");
  return data.agency_id;
}

// ---- getThreadDetail -----------------------------------------------

export const getThreadDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ thread_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [notesRes, activityRes, creatorsRes] = await Promise.all([
      supabase
        .from("thread_notes")
        .select("id, body, created_at, author:profiles(id, initials, color, display_name)")
        .eq("thread_id", data.thread_id)
        .order("created_at", { ascending: false }),
      supabase
        .from("thread_activity")
        .select(
          "id, event_type, payload, created_at, actor:profiles(id, initials, color, display_name)",
        )
        .eq("thread_id", data.thread_id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("thread_creators")
        .select("id, creator_id, creator:creators(id, full_name, initials, color, handle)")
        .eq("thread_id", data.thread_id),
    ]);
    return {
      notes: notesRes.data ?? [],
      activity: activityRes.data ?? [],
      thread_creators: creatorsRes.data ?? [],
    };
  });

// ---- updateEmailThread ---------------------------------------------

export const UpdatePatchSchema = z.object({
  thread_priority: z.enum(["critical", "high", "medium", "low", "ignore"]).optional(),
  workflow_status: z
    .enum([
      "new",
      "to_review",
      "waiting_reply",
      "in_negotiation",
      "needs_creator_input",
      "internal_discussion",
      "follow_up_needed",
      "converted_to_deal",
      "done",
      "archived",
    ])
    .optional(),
  message_type: z
    .enum([
      "deal_opportunity",
      "existing_campaign",
      "creator_communication",
      "finance",
      "legal",
      "urgent_issue",
      "pr_outreach",
      "general",
    ])
    .nullable()
    .optional(),
  next_action: z
    .enum([
      "reply",
      "follow_up",
      "call",
      "send_media_kit",
      "send_pricing",
      "create_offer",
      "ask_creator",
      "approve_content",
      "create_deal",
      "ignore",
      "none",
    ])
    .optional(),
  next_action_due_at: z.string().nullable().optional(),
  opportunity_score: z.number().int().min(0).max(100).nullable().optional(),
  brand_id: z.string().uuid().nullable().optional(),
  starred: z.boolean().optional(),
  unread: z.boolean().optional(),
});

export type UpdatePatch = z.infer<typeof UpdatePatchSchema>;

const UpdateSchema = z.object({
  thread_id: z.string().uuid(),
  patch: UpdatePatchSchema,
});

export const updateEmailThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpdateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const agencyId = await getAgencyId(supabase, userId);

    // Fetch current values for activity diff
    const { data: current } = await supabase
      .from("email_threads")
      .select(
        "thread_priority, workflow_status, message_type, next_action, opportunity_score, brand_id",
      )
      .eq("id", data.thread_id)
      .single();

    const { error } = await supabase
      .from("email_threads")
      .update(data.patch)
      .eq("id", data.thread_id);
    if (error) throw new Error(error.message);

    // Log activity for each changed field
    const activities: Promise<void>[] = [];
    if (data.patch.thread_priority && data.patch.thread_priority !== current?.thread_priority) {
      activities.push(
        logActivity(supabase, agencyId, data.thread_id, userId, "priority_changed", {
          old: current?.thread_priority,
          new: data.patch.thread_priority,
        }),
      );
    }
    if (data.patch.workflow_status && data.patch.workflow_status !== current?.workflow_status) {
      activities.push(
        logActivity(supabase, agencyId, data.thread_id, userId, "status_changed", {
          old: current?.workflow_status,
          new: data.patch.workflow_status,
        }),
      );
    }
    if (
      data.patch.message_type !== undefined &&
      data.patch.message_type !== current?.message_type
    ) {
      activities.push(
        logActivity(supabase, agencyId, data.thread_id, userId, "type_changed", {
          old: current?.message_type,
          new: data.patch.message_type,
        }),
      );
    }
    if (
      data.patch.opportunity_score !== undefined &&
      data.patch.opportunity_score !== current?.opportunity_score
    ) {
      activities.push(
        logActivity(supabase, agencyId, data.thread_id, userId, "score_changed", {
          old: current?.opportunity_score,
          new: data.patch.opportunity_score,
        }),
      );
    }
    if (data.patch.next_action && data.patch.next_action !== current?.next_action) {
      activities.push(
        logActivity(supabase, agencyId, data.thread_id, userId, "next_action_set", {
          old: current?.next_action,
          new: data.patch.next_action,
        }),
      );
    }
    if (data.patch.brand_id !== undefined && data.patch.brand_id !== current?.brand_id) {
      activities.push(
        logActivity(supabase, agencyId, data.thread_id, userId, "brand_changed", {
          old: current?.brand_id,
          new: data.patch.brand_id,
        }),
      );
    }
    await Promise.all(activities);
    return { ok: true as const };
  });

// ---- assignThreadCreator / removeThreadCreator ---------------------

export const assignThreadCreator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ thread_id: z.string().uuid(), creator_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const agencyId = await getAgencyId(supabase, userId);

    const { error } = await supabase.from("thread_creators").insert({
      agency_id: agencyId,
      thread_id: data.thread_id,
      creator_id: data.creator_id,
      assigned_by: userId,
    });
    if (error && error.code !== "23505") throw new Error(error.message); // ignore unique violation

    const { data: creator } = await supabase
      .from("creators")
      .select("full_name")
      .eq("id", data.creator_id)
      .single();

    await logActivity(supabase, agencyId, data.thread_id, userId, "creator_assigned", {
      creator_id: data.creator_id,
      creator_name: creator?.full_name,
    });
    return { ok: true as const };
  });

export const removeThreadCreator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ thread_id: z.string().uuid(), creator_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const agencyId = await getAgencyId(supabase, userId);

    const { data: creator } = await supabase
      .from("creators")
      .select("full_name")
      .eq("id", data.creator_id)
      .single();

    const { error } = await supabase
      .from("thread_creators")
      .delete()
      .eq("thread_id", data.thread_id)
      .eq("creator_id", data.creator_id);
    if (error) throw new Error(error.message);

    await logActivity(supabase, agencyId, data.thread_id, userId, "creator_removed", {
      creator_id: data.creator_id,
      creator_name: creator?.full_name,
    });
    return { ok: true as const };
  });

// ---- addThreadNote / deleteThreadNote ------------------------------

export const addThreadNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ thread_id: z.string().uuid(), body: z.string().trim().min(1).max(5000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const agencyId = await getAgencyId(supabase, userId);

    const { data: note, error } = await supabase
      .from("thread_notes")
      .insert({
        agency_id: agencyId,
        thread_id: data.thread_id,
        author_id: userId,
        body: data.body,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await logActivity(supabase, agencyId, data.thread_id, userId, "note_added", {
      note_id: note.id,
      preview: data.body.slice(0, 80),
    });
    return { ok: true as const, note_id: note.id };
  });

export const deleteThreadNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ note_id: z.string().uuid(), thread_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("thread_notes")
      .delete()
      .eq("id", data.note_id)
      .eq("author_id", context.userId); // only own notes
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---- createDealFromThread ------------------------------------------

const CreateDealSchema = z.object({
  thread_id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  brand_id: z.string().uuid().nullable().optional(),
  creator_id: z.string().uuid().nullable().optional(),
  platform: z.string().max(60).optional().nullable(),
  budget: z.number().min(0).optional(),
});

export type CreateDealInput = Omit<z.infer<typeof CreateDealSchema>, "thread_id">;

export const createDealFromThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CreateDealSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const agencyId = await getAgencyId(supabase, userId);

    // Create the deal
    const { data: deal, error: dealErr } = await supabase
      .from("deals")
      .insert({
        agency_id: agencyId,
        title: data.title,
        brand_id: data.brand_id ?? null,
        creator_id: data.creator_id ?? null,
        platform: data.platform ?? null,
        budget: data.budget ?? 0,
        email_thread_id: data.thread_id,
        source: "inbox",
        status: "incoming",
        priority: "med",
      })
      .select("id")
      .single();
    if (dealErr) throw new Error(dealErr.message);

    // Link thread → deal + update workflow status
    const { error: threadErr } = await supabase
      .from("email_threads")
      .update({
        linked_deal_id: deal.id,
        workflow_status: "converted_to_deal",
      })
      .eq("id", data.thread_id);
    if (threadErr) throw new Error(threadErr.message);

    await logActivity(supabase, agencyId, data.thread_id, userId, "deal_created", {
      deal_id: deal.id,
      title: data.title,
    });
    return { ok: true as const, deal_id: deal.id };
  });
