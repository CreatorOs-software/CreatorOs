import { z } from "zod";
import { getAuthContext } from "@/domains/auth";
import { toErrorResponse } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";

const deliverableSchema = z.object({
  count: z.number().min(1),
  content_type: z.string().min(1),
  platform: z.string().min(1),
  draft_deadline: z.string().nullable().optional(),
  freigabe_deadline: z.string().nullable().optional(),
  live_date: z.string().nullable().optional(),
});

const paymentItemSchema = z.object({
  label: z.string(),
  amount: z.number().min(0),
  invoice_date: z.string().nullable().optional(),
  payment_term: z.union([z.literal(14), z.literal(30), z.literal(45)]),
});

const groupSchema = z.object({
  key: z.string().min(1),
  creator_ids: z.array(z.string().uuid()).min(1),
  title: z.string().nullable(),
  product: z.string().nullable(),
  budget: z.number().nullable(),
  budget_offer: z.number().nullable(),
  fee: z.number().nullable(),
  campaign_start: z.string().nullable(),
  campaign_end: z.string().nullable(),
  notes: z.string().nullable(),
  deliverables: z.array(deliverableSchema),
  payment_items: z.array(paymentItemSchema),
  guidelines: z.record(z.string(), z.unknown()).nullable(),
  tracking_assets: z.record(z.string(), z.unknown()).nullable(),
});

const bodySchema = z.object({
  brand_id: z.string().uuid().nullable(),
  brand_name: z.string().nullable(),
  contact_person: z.string().nullable(),
  title: z.string().nullable(),
  groups: z.array(groupSchema).min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: threadId } = await params;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Ungültige Anfragegruppen" }, { status: 400 });
    }

    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    const { data: thread, error: threadError } = await supabase
      .from("email_threads")
      .select("id, conversation_id, subject")
      .eq("id", threadId)
      .eq("agency_id", agencyId)
      .single();
    if (threadError || !thread) {
      return Response.json({ error: "E-Mail nicht gefunden" }, { status: 404 });
    }

    const creatorIds = [...new Set(parsed.data.groups.flatMap((group) => group.creator_ids))];
    const { data: validCreators, error: creatorError } = await supabase
      .from("creators")
      .select("id")
      .eq("agency_id", agencyId)
      .in("id", creatorIds);
    if (creatorError || (validCreators?.length ?? 0) !== creatorIds.length) {
      return Response.json({ error: "Mindestens ein Creator ist ungültig" }, { status: 400 });
    }

    const { data: campaignGroup, error: campaignError } = await supabase
      .from("campaign_groups")
      .insert({
        agency_id: agencyId,
        email_thread_id: threadId,
        title: parsed.data.title ?? thread.subject,
      })
      .select("id")
      .single();
    if (campaignError) throw campaignError;

    const rows = parsed.data.groups.flatMap((group) =>
      group.creator_ids.map((creatorId) => ({
        agency_id: agencyId,
        creator_id: creatorId,
        campaign_group_id: campaignGroup.id,
        brand_id: parsed.data.brand_id,
        brand_name: parsed.data.brand_name,
        contact_person: parsed.data.contact_person,
        title: group.title,
        product: group.product,
        budget_requested: group.budget,
        budget_offer: group.budget_offer,
        fee: group.fee,
        campaign_start: group.campaign_start,
        campaign_end: group.campaign_end,
        notes: group.notes,
        deliverables: group.deliverables,
        payment_items: group.payment_items.map((item) => ({
          ...item,
          invoice_date: item.invoice_date ?? "",
        })),
        guidelines: group.guidelines,
        tracking_assets: group.tracking_assets,
        source: "email" as const,
      })),
    );

    const { data: anfragen, error: insertError } = await supabase
      .from("anfragen")
      .insert(rows)
      .select("id, creator_id, campaign_group_id");
    if (insertError) {
      await supabase
        .from("campaign_groups")
        .delete()
        .eq("id", campaignGroup.id)
        .eq("agency_id", agencyId);
      throw insertError;
    }

    const firstAnfrageId = anfragen?.[0]?.id;
    if (firstAnfrageId && thread.conversation_id) {
      await supabase
        .from("conversations")
        .update({ anfrage_id: firstAnfrageId })
        .eq("id", thread.conversation_id)
        .eq("agency_id", agencyId);
    }
    await supabase
      .from("email_threads")
      .update({ request_status: "converted" })
      .eq("id", threadId)
      .eq("agency_id", agencyId);

    return Response.json({ campaign_group_id: campaignGroup.id, anfragen }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
