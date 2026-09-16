"use client";

import { useState } from "react";
import { Sparkles, Plus, Trash2, ChevronDown, ChevronUp, RefreshCw, Paperclip, Loader2, Check, FileText } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from "@talentos/ui";
import type { Creator } from "../../types";
import type { WorkPanelState, ExtractedEmailData, ExtractedAttachment, LocalVorgang } from "../types";
import { SectionLabel, FormField } from "./shared";
import { AttachmentBadge } from "./attachment-badge";
import {
  collectErrors,
  type ExtractedErrors,
  type ExtractedField,
  type ExtractedFormValues,
} from "./extracted-form.schema";

type AttachmentExtractedFields = {
  creator_id: string | null;
  contact: string | null;
  title: string | null;
  product: string | null;
  budget: number | null;
  budget_offer: number | null;
  fee: number | null;
  period: string | null;
  campaign_start: string | null;
  campaign_end: string | null;
  notes: string | null;
  deliverables: {
    count: number;
    content_type: string;
    platform: string;
    draft_deadline: string | null;
    freigabe_deadline: string | null;
    live_date: string | null;
  }[];
  payment_items: {
    label: string;
    amount: number;
    invoice_date: string | null;
    payment_term: 14 | 30 | 45;
  }[];
  guidelines: {
    labeling: string | null;
    wording: string | null;
    nogo: string | null;
    hashtags: string[];
  } | null;
  tracking_assets: {
    discount_code: string | null;
    affiliate_links: string[];
    utm_params: string | null;
  } | null;
};

type AttachmentAnalyzeResponse = {
  filename: string;
  classification: "RECHNUNG" | "VERTRAG_BRIEFING" | "ANDERES";
  classification_confidence: number;
  extracted: AttachmentExtractedFields | null;
};

const TODAY = new Date().toLocaleDateString("de-DE", {
  day: "2-digit",
  month: "2-digit",
});

const CONTENT_TYPES = [
  "Video",
  "Reel",
  "Story",
  "Post",
  "Shorts",
  "Podcast",
  "Blog",
  "Newsletter",
];
const PLATFORMS = [
  "Instagram",
  "YouTube",
  "TikTok",
  "X / Twitter",
  "LinkedIn",
  "Podcast",
  "Blog",
];
const PAYMENT_TERMS = [14, 30, 45] as const;

// Optional fields — hidden until the AI detected them or "+ Weitere Felder".
// "campaign" = the combined Kampagnenstart/-ende grid.
const OPTIONAL_FIELDS = [
  "contact",
  "title",
  "product",
  "budget",
  "budgetOffer",
  "fee",
  "period",
  "campaign",
  "notes",
  "guidelines",
  "trackingAssets",
  "paymentItems",
  "deliverables",
];

type ExistingAnfrage = {
  deliverables?: unknown[] | null;
  payment_items?: unknown[] | null;
  guidelines?: {
    labeling?: string | null;
    wording?: string | null;
    nogo?: string | null;
    hashtags?: string[] | null;
  } | null;
  tracking_assets?: {
    discount_code?: string | null;
    affiliate_links?: string[] | null;
    utm_params?: string | null;
  } | null;
};

type Props = {
  data: ExtractedEmailData;
  creators: Creator[];
  threadId: string;
  merge?: { anfrageId: string };
  onSetWorkState: (s: WorkPanelState) => void;
};

function buildVorgang(v: ExtractedFormValues): LocalVorgang {
  return {
    brand: v.brand || "Unbekannte Brand",
    creatorId: v.creatorId || null,
    title:
      v.title ||
      (v.deliverables.length > 0
        ? v.deliverables.map((d) => `${d.count}x ${d.content_type}`).join(" + ")
        : "Kooperation"),
    status: "anfrage",
    amZug: "wir",
    honorar: null,
    stand: "Anfrage aus E-Mail übernommen. Noch nicht beantwortet.",
    history: v.budget
      ? [{ who: "brand", amount: v.budget, note: "aus der Anfrage", date: TODAY }]
      : [],
  };
}

const commaList = (s: string) =>
  s.split(",").map((x) => x.trim()).filter(Boolean);

export function ExtractedPanel({
  data,
  creators,
  threadId,
  merge,
  onSetWorkState,
}: Props) {
  const isMerge = !!merge;
  const queryClient = useQueryClient();

  const { data: brandsData } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const res = await fetch("/api/brands");
      return res.json() as Promise<{
        brands: { id: string; company_name: string }[];
      }>;
    },
  });
  const brands = brandsData?.brands ?? [];

  const { data: existingData } = useQuery({
    queryKey: ["anfrage", merge?.anfrageId],
    enabled: isMerge,
    queryFn: async () => {
      const res = await fetch(`/api/anfragen/${merge!.anfrageId}`);
      if (!res.ok) throw new Error("Anfrage konnte nicht geladen werden");
      return res.json() as Promise<{ anfrage: ExistingAnfrage }>;
    },
  });
  const existing = existingData?.anfrage;

  const [errors, setErrors] = useState<ExtractedErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const [showAttachmentCards, setShowAttachmentCards] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analyzeResults, setAnalyzeResults] = useState<
    Record<string, { classification: "RECHNUNG" | "VERTRAG_BRIEFING" | "ANDERES" }>
  >(() =>
    Object.fromEntries(
      data.attachments
        .filter((a) => a.classification)
        .map((a) => [a.id, { classification: a.classification! }]),
    ),
  );
  const [fieldSources, setFieldSources] = useState<Record<string, string>>({});
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [creatorSelection, setCreatorSelection] = useState<Record<string, string>>({});
  const [assignedCreators, setAssignedCreators] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      data.attachments
        .filter((a) => a.assignedCreatorId)
        .map((a) => [a.id, a.assignedCreatorId!]),
    ),
  );

  const form = useForm({
    defaultValues: {
      creatorId: data.creatorId ?? "",
      brand: data.brand ?? "",
      contact: data.contact ?? "",
      title: data.title ?? "",
      product: data.product ?? "",
      budget: data.budget,
      budgetOffer: data.budgetOffer,
      fee: data.fee,
      period: data.period ?? "",
      campaign_start: data.campaign_start ?? "",
      campaign_end: data.campaign_end ?? "",
      notes: data.notes ?? "",
      deliverables: data.deliverables.map((d) => ({
        count: d.count,
        content_type: d.content_type,
        platform: d.platform,
        draft_deadline: d.draft_deadline ?? "",
        freigabe_deadline: d.freigabe_deadline ?? "",
        live_date: d.live_date ?? "",
      })),
      paymentItems: data.paymentItems.map((p) => ({
        label: p.label,
        amount: p.amount,
        invoiceDate: p.invoiceDate,
        paymentTerm: p.paymentTerm,
      })),
      guidelines: { ...data.guidelines },
      trackingAssets: { ...data.trackingAssets },
    } as ExtractedFormValues,
    onSubmit: async ({ value }) => {
      const errs = collectErrors(value, { merge: isMerge });
      setErrors(errs);
      if (Object.keys(errs).length > 0) return;

      setSaving(true);
      setSubmitError(null);
      try {
        if (isMerge) {
          await submitMerge(value);
        } else {
          await submitCreate(value);
        }
        onSetWorkState({ phase: "vorgang", vorgang: buildVorgang(value) });
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : "Unbekannter Fehler");
      } finally {
        setSaving(false);
      }
    },
  });

  // Merges the result of an attachment analysis into the live form — never
  // called automatically, only from handleAnalyzeAttachment below, and only
  // for a VERTRAG_BRIEFING result. Non-null attachment fields win over
  // whatever the form currently holds (email-body value or an earlier
  // attachment) — last click wins.
  function applyExtractedFields(filename: string, data: AttachmentExtractedFields) {
    const sources: Record<string, string> = {};
    const set = <K extends keyof ExtractedFormValues>(name: K, value: ExtractedFormValues[K]) => {
      form.setFieldValue(name as never, value as never);
      sources[name] = filename;
    };

    if (data.contact) set("contact", data.contact);
    if (data.title) set("title", data.title);
    if (data.product) set("product", data.product);
    if (data.budget != null) set("budget", data.budget);
    if (data.budget_offer != null) set("budgetOffer", data.budget_offer);
    if (data.fee != null) set("fee", data.fee);
    if (data.period) set("period", data.period);
    if (data.campaign_start) {
      set("campaign_start", data.campaign_start);
      sources.campaign = filename;
    }
    if (data.campaign_end) {
      set("campaign_end", data.campaign_end);
      sources.campaign = filename;
    }
    if (data.notes) set("notes", data.notes);
    if (data.deliverables.length > 0) {
      set(
        "deliverables",
        data.deliverables.map((d) => ({
          count: d.count,
          content_type: d.content_type,
          platform: d.platform,
          draft_deadline: d.draft_deadline ?? "",
          freigabe_deadline: d.freigabe_deadline ?? "",
          live_date: d.live_date ?? "",
        })),
      );
    }
    if (data.payment_items.length > 0) {
      set(
        "paymentItems",
        data.payment_items.map((p) => ({
          label: p.label,
          amount: p.amount,
          invoiceDate: p.invoice_date ?? "",
          paymentTerm: p.payment_term,
        })),
      );
    }
    if (data.guidelines) {
      set("guidelines", {
        labeling: data.guidelines.labeling ?? "",
        wording: data.guidelines.wording ?? "",
        nogo: data.guidelines.nogo ?? "",
        hashtags: data.guidelines.hashtags ?? [],
      });
    }
    if (data.tracking_assets) {
      set("trackingAssets", {
        discountCode: data.tracking_assets.discount_code ?? "",
        affiliateLinks: data.tracking_assets.affiliate_links ?? [],
        utmParams: data.tracking_assets.utm_params ?? "",
      });
    }
    if (!isMerge && data.creator_id) set("creatorId", data.creator_id);

    setFieldSources((prev) => ({ ...prev, ...sources }));
  }

  // Classifies + (for VERTRAG_BRIEFING) extracts a chosen attachment card in
  // one call. Never runs automatically — only from a click on the card.
  async function handleAnalyzeAttachment(attachment: ExtractedAttachment) {
    setAnalyzingId(attachment.id);
    setAnalyzeError(null);
    try {
      const res = await fetch(`/api/inbox/${threadId}/attachments/${attachment.id}/analyze`, {
        method: "POST",
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Anhang auslesen fehlgeschlagen");
      }
      const result = (await res.json()) as AttachmentAnalyzeResponse;
      setAnalyzeResults((prev) => ({
        ...prev,
        [attachment.id]: { classification: result.classification },
      }));
      if (result.classification === "VERTRAG_BRIEFING" && result.extracted) {
        applyExtractedFields(result.filename, result.extracted);
      }
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setAnalyzingId(null);
    }
  }

  async function handleAssignCreator(attachment: ExtractedAttachment) {
    const creatorId = creatorSelection[attachment.id];
    if (!creatorId) return;
    setAssigningId(attachment.id);
    setAnalyzeError(null);
    try {
      const res = await fetch(
        `/api/inbox/${threadId}/attachments/${attachment.id}/assign-creator`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creatorId }),
        },
      );
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Zuordnen fehlgeschlagen");
      }
      setAssignedCreators((prev) => ({ ...prev, [attachment.id]: creatorId }));
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setAssigningId(null);
    }
  }

  function deliverablesToApi(items: ExtractedFormValues["deliverables"]) {
    return items.map((d) => ({
      count: d.count,
      content_type: d.content_type,
      platform: d.platform,
      draft_deadline: d.draft_deadline || null,
      freigabe_deadline: d.freigabe_deadline || null,
      live_date: d.live_date || null,
    }));
  }

  function paymentItemsToApi(items: ExtractedFormValues["paymentItems"]) {
    return items
      .filter((p) => p.label.trim())
      .map((p) => ({
        label: p.label.trim(),
        amount: p.amount ?? 0,
        invoice_date: p.invoiceDate || "",
        payment_term: p.paymentTerm,
      }));
  }

  // Shared guidelines/tracking schemas use z.string().optional() — never send
  // null for a sub-field; omit it instead.
  function guidelinesToApi(g: ExtractedFormValues["guidelines"]) {
    if (!(g.labeling || g.wording || g.nogo || g.hashtags.length)) return null;
    const out: Record<string, unknown> = { hashtags: g.hashtags };
    if (g.labeling) out.labeling = g.labeling;
    if (g.wording) out.wording = g.wording;
    if (g.nogo) out.nogo = g.nogo;
    return out;
  }

  function trackingToApi(t: ExtractedFormValues["trackingAssets"]) {
    if (!(t.discountCode || t.affiliateLinks.length || t.utmParams)) return null;
    const out: Record<string, unknown> = { affiliate_links: t.affiliateLinks };
    if (t.discountCode) out.discount_code = t.discountCode;
    if (t.utmParams) out.utm_params = t.utmParams;
    return out;
  }

  async function submitCreate(value: ExtractedFormValues) {
    const brandMatch = brands.find((b) => b.company_name === value.brand);
    const g = value.guidelines;
    const t = value.trackingAssets;
    const res = await fetch(`/api/creators/${value.creatorId}/anfragen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "email",
        brand_id: brandMatch?.id ?? null,
        brand_name: value.brand || null,
        contact_person: value.contact || null,
        title: value.title || null,
        product: value.product || null,
        budget_requested: value.budget ?? null,
        budget_offer: value.budgetOffer ?? null,
        fee: value.fee ?? null,
        campaign_start: value.campaign_start || null,
        campaign_end: value.campaign_end || null,
        notes: value.notes || null,
        deliverables: deliverablesToApi(value.deliverables),
        payment_items: paymentItemsToApi(value.paymentItems),
        guidelines: guidelinesToApi(g),
        tracking_assets: trackingToApi(t),
      }),
    });
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(b.error ?? "Anfrage konnte nicht angelegt werden");
    }

    // Anfrage exists — link the mail thread best-effort so a failure here can't
    // trigger a retry that creates a second Anfrage.
    const { anfrage } = (await res.json()) as { anfrage: { id: string } };
    try {
      await fetch(`/api/inbox/${threadId}/anfrage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anfrage_id: anfrage.id }),
      });
    } catch {}
    void queryClient.invalidateQueries({ queryKey: QueryKeys.inbox.all() });
  }

  async function submitMerge(value: ExtractedFormValues) {
    const detected = new Set(data.detectedFields);
    const dirty = (name: string) =>
      form.getFieldMeta(name as never)?.isDirty ?? false;
    const send = (formKey: string, detKey = formKey) =>
      detected.has(detKey) || dirty(formKey);

    const body: Record<string, unknown> = {};
    if (send("contact")) body.contact_person = value.contact || null;
    if (send("title")) body.title = value.title || null;
    if (send("product")) body.product = value.product || null;
    if (send("budget")) body.budget_requested = value.budget ?? null;
    if (send("budgetOffer")) body.budget_offer = value.budgetOffer ?? null;
    if (send("fee")) body.fee = value.fee ?? null;
    if (send("campaign_start", "campaign")) body.campaign_start = value.campaign_start || null;
    if (send("campaign_end", "campaign")) body.campaign_end = value.campaign_end || null;
    if (send("notes")) body.notes = value.notes || null;

    if (send("deliverables") && value.deliverables.length > 0) {
      body.deliverables = [
        ...((existing?.deliverables as unknown[]) ?? []),
        ...deliverablesToApi(value.deliverables),
      ];
    }
    if (send("paymentItems") && value.paymentItems.length > 0) {
      body.payment_items = [
        ...((existing?.payment_items as unknown[]) ?? []),
        ...paymentItemsToApi(value.paymentItems),
      ];
    }
    if (send("guidelines")) {
      const g = value.guidelines;
      const ex = existing?.guidelines;
      const out: Record<string, unknown> = {
        hashtags: [...(ex?.hashtags ?? []), ...g.hashtags],
      };
      const labeling = g.labeling || ex?.labeling;
      const wording = g.wording || ex?.wording;
      const nogo = g.nogo || ex?.nogo;
      if (labeling) out.labeling = labeling;
      if (wording) out.wording = wording;
      if (nogo) out.nogo = nogo;
      body.guidelines = out;
    }
    if (send("trackingAssets")) {
      const t = value.trackingAssets;
      const ex = existing?.tracking_assets;
      const out: Record<string, unknown> = {
        affiliate_links: [...(ex?.affiliate_links ?? []), ...t.affiliateLinks],
      };
      const discountCode = t.discountCode || ex?.discount_code;
      const utmParams = t.utmParams || ex?.utm_params;
      if (discountCode) out.discount_code = discountCode;
      if (utmParams) out.utm_params = utmParams;
      body.tracking_assets = out;
    }

    if (Object.keys(body).length === 0) {
      throw new Error("Keine neuen Infos zum Übernehmen erkannt");
    }

    const res = await fetch(`/api/anfragen/${merge!.anfrageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(b.error ?? "Übernahme fehlgeschlagen");
    }
    void queryClient.invalidateQueries({ queryKey: QueryKeys.inbox.all() });
    void queryClient.invalidateQueries({ queryKey: ["anfrage", merge!.anfrageId] });
    void queryClient.invalidateQueries({ queryKey: ["creator-anfragen"] });
  }

  const uncertain = (f: string) => data.uncertainFields.includes(f);
  const errorList = Object.values(errors);

  const forced = isMerge ? [] : ["brand", "creatorId"];
  const isShown = (f: string) =>
    showMore || forced.includes(f) || data.detectedFields.includes(f) || f in fieldSources;
  const countPool = isMerge ? ["brand", "creatorId", ...OPTIONAL_FIELDS] : OPTIONAL_FIELDS;
  const hiddenCount = countPool.filter(
    (f) => !forced.includes(f) && !data.detectedFields.includes(f),
  ).length;
  const showDeliverables = isShown("deliverables");

  return (
    <div>
      <div className="mb-4 flex items-center gap-1.5">
        {isMerge ? (
          <RefreshCw className="h-3 w-3 text-[#006FFE]" />
        ) : (
          <Sparkles className="h-3 w-3 text-violet-600" />
        )}
        <SectionLabel>
          {isMerge ? "Neue Infos aus dieser Mail" : "Aus der Mail gelesen"}
        </SectionLabel>
        <span className="ml-auto text-[10px] text-muted-foreground">1 Analyse</span>
      </div>

      {isMerge && (
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          Erkannte Felder werden in die bestehende Anfrage übernommen. Listen
          (Deliverables, Zahlungen) werden angehängt.
        </p>
      )}

      {data.attachments.length > 0 && (
        <div className="mb-3">
          {!showAttachmentCards ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAttachmentCards(true)}
              className="w-full gap-1.5"
            >
              <Paperclip className="h-3 w-3" />
              Anhang mit KI auslesen
            </Button>
          ) : (
            <div className="flex flex-col gap-1.5">
              {data.attachments.map((a) => {
                const result = analyzeResults[a.id];
                const isAnalyzing = analyzingId === a.id;
                const isAssigning = assigningId === a.id;
                const assignedCreatorId = assignedCreators[a.id];
                const assignedCreator = assignedCreatorId
                  ? creators.find((c) => c.id === assignedCreatorId)
                  : null;

                if (!result) {
                  return (
                    <button
                      key={a.id}
                      type="button"
                      disabled={isAnalyzing}
                      onClick={() => handleAnalyzeAttachment(a)}
                      className="flex items-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/40 px-2 py-1.5 text-left text-[10px] hover:bg-muted disabled:opacity-60"
                    >
                      <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate font-medium">{a.filename}</span>
                      {isAnalyzing ? (
                        <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />
                      ) : (
                        <span className="shrink-0 text-muted-foreground">auslesen</span>
                      )}
                    </button>
                  );
                }

                return (
                  <div
                    key={a.id}
                    className="flex flex-col gap-1.5 rounded-lg bg-muted px-2 py-1.5 text-[10px]"
                  >
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate font-medium">{a.filename}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {result.classification === "RECHNUNG"
                          ? "Rechnung erkannt"
                          : result.classification === "VERTRAG_BRIEFING"
                            ? "Vertrag/Briefing erkannt"
                            : "kein relevantes Dokument"}
                      </span>
                      {result.classification === "VERTRAG_BRIEFING" && (
                        <span className="flex shrink-0 items-center gap-1 text-emerald-600">
                          <Check className="h-3 w-3" />
                          übernommen
                        </span>
                      )}
                    </div>

                    {result.classification === "RECHNUNG" &&
                      (assignedCreator ? (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <Check className="h-3 w-3" />
                          Zugeordnet zu {assignedCreator.full_name}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Select
                            value={creatorSelection[a.id] || undefined}
                            onValueChange={(v) => {
                              if (v !== null) {
                                setCreatorSelection((prev) => ({ ...prev, [a.id]: v }));
                              }
                            }}
                          >
                            <SelectTrigger className="h-6 flex-1 text-[10px]">
                              <SelectValue placeholder="— Creator wählen —" />
                            </SelectTrigger>
                            <SelectContent>
                              {creators.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!creatorSelection[a.id] || isAssigning}
                            onClick={() => handleAssignCreator(a)}
                            className="h-6 shrink-0 px-2 text-[10px]"
                          >
                            {isAssigning ? (
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            ) : (
                              "Zuordnen"
                            )}
                          </Button>
                        </div>
                      ))}
                  </div>
                );
              })}
              {analyzeError && (
                <p className="text-xs text-destructive">{analyzeError}</p>
              )}
            </div>
          )}
        </div>
      )}

      <Tabs defaultValue="uebersicht" className="mb-4 flex flex-col">
        <TabsList className="w-full">
          <TabsTrigger value="uebersicht" className="flex-1">
            Übersicht
          </TabsTrigger>
          {showDeliverables && (
            <TabsTrigger value="deliverables" className="flex-1">
              Deliverables
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="uebersicht" className="mt-3 space-y-0">
          {isShown("brand") && (
            <form.Field name="brand">
              {(field: ExtractedField<"brand">) => (
                <FormField label="Brand" uncertain={uncertain("brand")}>
                  <Select
                    value={field.state.value || undefined}
                    onValueChange={(v) => {
                      if (v !== null) field.handleChange(v);
                    }}
                  >
                    <SelectTrigger
                      className={cn(
                        "w-full",
                        (uncertain("brand") || errors.brand) &&
                          "border-dashed border-amber-300 bg-amber-50",
                      )}
                    >
                      <SelectValue placeholder="— Brand auswählen —" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((b) => (
                        <SelectItem key={b.id} value={b.company_name}>
                          {b.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.brand && (
                    <p data-field-error className="mt-1 text-xs text-destructive">
                      {errors.brand}
                    </p>
                  )}
                </FormField>
              )}
            </form.Field>
          )}

          {isShown("contact") && (
            <form.Field name="contact">
              {(field: ExtractedField<"contact">) => (
                <FormField label="Ansprechpartner" uncertain={uncertain("contact")} source={fieldSources.contact}>
                  <Input
                    value={field.state.value}
                    className={cn(
                      uncertain("contact") &&
                        "border-dashed border-amber-300 bg-amber-50",
                    )}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </FormField>
              )}
            </form.Field>
          )}

          {isShown("creatorId") && (
            <form.Field name="creatorId">
              {(field: ExtractedField<"creatorId">) => (
                <FormField
                  label={
                    data.creatorConfidence > 0
                      ? `Creator · ${data.creatorConfidence}% sicher`
                      : "Creator"
                  }
                  uncertain={uncertain("creatorId")}
                >
                  <Select
                    value={field.state.value || ""}
                    onValueChange={(v) => field.handleChange(v || "")}
                  >
                    <SelectTrigger
                      className={cn(
                        "w-full",
                        (uncertain("creatorId") || errors.creatorId) &&
                          "border-dashed border-amber-300 bg-amber-50",
                      )}
                    >
                      <SelectValue placeholder="— Creator zuordnen —" />
                    </SelectTrigger>
                    <SelectContent>
                      {creators.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.creatorId ? (
                    <p data-field-error className="mt-1 text-xs text-destructive">
                      {errors.creatorId}
                    </p>
                  ) : (
                    !field.state.value &&
                    !isMerge && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Kein Name in der Mail — bitte manuell zuordnen.
                      </p>
                    )
                  )}
                </FormField>
              )}
            </form.Field>
          )}

          {isShown("title") && (
            <form.Field name="title">
              {(field: ExtractedField<"title">) => (
                <FormField label="Titel" uncertain={uncertain("title")} source={fieldSources.title}>
                  <Input
                    value={field.state.value}
                    placeholder="z. B. Sommerkampagne 2026"
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </FormField>
              )}
            </form.Field>
          )}

          {isShown("product") && (
            <form.Field name="product">
              {(field: ExtractedField<"product">) => (
                <FormField label="Produkt" uncertain={uncertain("product")} source={fieldSources.product}>
                  <Input
                    value={field.state.value}
                    placeholder="z. B. Daily Greens"
                    className={cn(
                      uncertain("product") &&
                        "border-dashed border-amber-300 bg-amber-50",
                    )}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </FormField>
              )}
            </form.Field>
          )}

          {isShown("budget") && (
            <form.Field name="budget">
              {(field: ExtractedField<"budget">) => (
                <FormField label="Budget (Brand)" uncertain={uncertain("budget")} source={fieldSources.budget}>
                  <Input
                    value={field.state.value?.toString() ?? ""}
                    placeholder="z. B. 5500"
                    className={cn(
                      uncertain("budget") &&
                        "border-dashed border-amber-300 bg-amber-50",
                    )}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value
                          ? parseFloat(e.target.value.replace(/[^0-9.]/g, ""))
                          : null,
                      )
                    }
                  />
                </FormField>
              )}
            </form.Field>
          )}

          {isShown("budgetOffer") && (
            <form.Field name="budgetOffer">
              {(field: ExtractedField<"budgetOffer">) => (
                <FormField label="Unser Angebot" source={fieldSources.budgetOffer}>
                  <Input
                    value={field.state.value?.toString() ?? ""}
                    placeholder="z. B. 6000"
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value
                          ? parseFloat(e.target.value.replace(/[^0-9.]/g, ""))
                          : null,
                      )
                    }
                  />
                </FormField>
              )}
            </form.Field>
          )}

          {isShown("fee") && (
            <form.Field name="fee">
              {(field: ExtractedField<"fee">) => (
                <FormField label="Honorar (fix)" source={fieldSources.fee}>
                  <Input
                    value={field.state.value?.toString() ?? ""}
                    placeholder="z. B. 5000"
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value
                          ? parseFloat(e.target.value.replace(/[^0-9.]/g, ""))
                          : null,
                      )
                    }
                  />
                </FormField>
              )}
            </form.Field>
          )}

          {isShown("period") && (
            <form.Field name="period">
              {(field: ExtractedField<"period">) => (
                <FormField label="Zeitraum" uncertain={uncertain("period")}>
                  <Input
                    value={field.state.value}
                    placeholder="steht nicht in der Mail"
                    className={cn(
                      uncertain("period") &&
                        "border-dashed border-amber-300 bg-amber-50",
                    )}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </FormField>
              )}
            </form.Field>
          )}

          {isShown("campaign") && (
            <div className="grid grid-cols-2 gap-2">
              <form.Field name="campaign_start">
                {(field: ExtractedField<"campaign_start">) => (
                  <FormField label="Kampagnenstart" source={fieldSources.campaign_start}>
                    <Input
                      type="date"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </FormField>
                )}
              </form.Field>
              <form.Field name="campaign_end">
                {(field: ExtractedField<"campaign_end">) => (
                  <FormField label="Kampagnenende" source={fieldSources.campaign_end}>
                    <Input
                      type="date"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </FormField>
                )}
              </form.Field>
            </div>
          )}

          {isShown("notes") && (
            <form.Field name="notes">
              {(field: ExtractedField<"notes">) => (
                <FormField label="Notizen" source={fieldSources.notes}>
                  <Textarea
                    rows={2}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </FormField>
              )}
            </form.Field>
          )}

          {isShown("guidelines") && (
            <div className="mt-1 rounded-xl border border-border bg-muted/30 p-2.5">
              <div className="mb-2 flex items-center gap-1.5">
                <SectionLabel>Vorgaben</SectionLabel>
                {fieldSources.guidelines && <AttachmentBadge filename={fieldSources.guidelines} />}
              </div>
              <form.Field name="guidelines">
                {(field: ExtractedField<"guidelines">) => {
                  const g = field.state.value;
                  const set = (patch: Partial<typeof g>) =>
                    field.handleChange({ ...g, ...patch });
                  return (
                    <div className="flex flex-col gap-2">
                      <FormField label="Kennzeichnung">
                        <Input
                          value={g.labeling}
                          placeholder="z. B. #ad, Werbung"
                          onChange={(e) => set({ labeling: e.target.value })}
                        />
                      </FormField>
                      <FormField label="Wording">
                        <Input
                          value={g.wording}
                          onChange={(e) => set({ wording: e.target.value })}
                        />
                      </FormField>
                      <FormField label="No-Gos">
                        <Input
                          value={g.nogo}
                          onChange={(e) => set({ nogo: e.target.value })}
                        />
                      </FormField>
                      <FormField label="Pflicht-Hashtags (Komma-getrennt)">
                        <Input
                          value={g.hashtags.join(", ")}
                          placeholder="#brand, #kampagne"
                          onChange={(e) =>
                            set({ hashtags: commaList(e.target.value) })
                          }
                        />
                      </FormField>
                    </div>
                  );
                }}
              </form.Field>
            </div>
          )}

          {isShown("trackingAssets") && (
            <div className="mt-1 rounded-xl border border-border bg-muted/30 p-2.5">
              <div className="mb-2 flex items-center gap-1.5">
                <SectionLabel>Tracking</SectionLabel>
                {fieldSources.trackingAssets && <AttachmentBadge filename={fieldSources.trackingAssets} />}
              </div>
              <form.Field name="trackingAssets">
                {(field: ExtractedField<"trackingAssets">) => {
                  const t = field.state.value;
                  const set = (patch: Partial<typeof t>) =>
                    field.handleChange({ ...t, ...patch });
                  return (
                    <div className="flex flex-col gap-2">
                      <FormField label="Rabattcode">
                        <Input
                          value={t.discountCode}
                          placeholder="SUMMER20"
                          onChange={(e) => set({ discountCode: e.target.value })}
                        />
                      </FormField>
                      <FormField label="Affiliate-Links (Komma-getrennt)">
                        <Input
                          value={t.affiliateLinks.join(", ")}
                          onChange={(e) =>
                            set({ affiliateLinks: commaList(e.target.value) })
                          }
                        />
                      </FormField>
                      <FormField label="UTM-Parameter">
                        <Input
                          value={t.utmParams}
                          onChange={(e) => set({ utmParams: e.target.value })}
                        />
                      </FormField>
                    </div>
                  );
                }}
              </form.Field>
            </div>
          )}

          {isShown("paymentItems") && (
            <div className="mt-1 rounded-xl border border-border bg-muted/30 p-2.5">
              <div className="mb-2 flex items-center gap-1.5">
                <SectionLabel>Zahlungen</SectionLabel>
                {fieldSources.paymentItems && <AttachmentBadge filename={fieldSources.paymentItems} />}
              </div>
              <form.Field name="paymentItems">
                {(field: ExtractedField<"paymentItems">) => {
                  const items = field.state.value ?? [];
                  const update = (
                    i: number,
                    patch: Partial<ExtractedFormValues["paymentItems"][number]>,
                  ) =>
                    field.handleChange(
                      items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
                    );
                  return (
                    <div className="flex flex-col gap-2">
                      {items.map((p, i) => (
                        <div key={i} className="flex items-end gap-1.5">
                          <div className="flex-1">
                            <p className="mb-1 text-[10px] text-muted-foreground">
                              Bezeichnung
                            </p>
                            <Input
                              value={p.label}
                              className="h-7 px-2 text-xs"
                              onChange={(e) => update(i, { label: e.target.value })}
                            />
                          </div>
                          <div className="w-20">
                            <p className="mb-1 text-[10px] text-muted-foreground">
                              Betrag
                            </p>
                            <Input
                              value={p.amount?.toString() ?? ""}
                              className="h-7 px-2 text-xs"
                              onChange={(e) =>
                                update(i, {
                                  amount: e.target.value
                                    ? parseFloat(
                                        e.target.value.replace(/[^0-9.]/g, ""),
                                      )
                                    : null,
                                })
                              }
                            />
                          </div>
                          <div className="w-16">
                            <p className="mb-1 text-[10px] text-muted-foreground">
                              Ziel
                            </p>
                            <Select
                              value={String(p.paymentTerm)}
                              onValueChange={(v) => {
                                if (v)
                                  update(i, {
                                    paymentTerm: Number(v) as 14 | 30 | 45,
                                  });
                              }}
                            >
                              <SelectTrigger className="h-7 w-full px-2 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PAYMENT_TERMS.map((t) => (
                                  <SelectItem key={t} value={String(t)}>
                                    {t}d
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              field.handleChange(items.filter((_, idx) => idx !== i))
                            }
                            className="size-auto pb-1.5 text-muted-foreground hover:text-destructive hover:bg-transparent"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1.5"
                        onClick={() =>
                          field.handleChange([
                            ...items,
                            {
                              label: "",
                              amount: null,
                              invoiceDate: "",
                              paymentTerm: 30,
                            },
                          ])
                        }
                      >
                        <Plus className="h-3 w-3" />
                        Zahlung hinzufügen
                      </Button>
                    </div>
                  );
                }}
              </form.Field>
            </div>
          )}

          {hiddenCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={showMore}
              onClick={() => setShowMore((v) => !v)}
              className="mt-1 w-full text-xs text-muted-foreground"
            >
              {showMore ? "Weniger Felder" : `+ Weitere Felder (${hiddenCount})`}
              {showMore ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </TabsContent>

        {showDeliverables && (
          <TabsContent value="deliverables" className="mt-3">
            <form.Field name="deliverables">
              {(field: ExtractedField<"deliverables">) => {
                const items = field.state.value ?? [];

                const update = (
                  index: number,
                  patch: Partial<ExtractedFormValues["deliverables"][number]>,
                ) =>
                  field.handleChange(
                    items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
                  );

                const addDeliverable = () =>
                  field.handleChange([
                    ...items,
                    {
                      count: 1,
                      content_type: "",
                      platform: "",
                      draft_deadline: "",
                      freigabe_deadline: "",
                      live_date: "",
                    },
                  ]);

                const removeDeliverable = (index: number) =>
                  field.handleChange(items.filter((_, i) => i !== index));

                return (
                  <div className="flex flex-col gap-2">
                    {errors.deliverables && (
                      <p data-field-error className="text-xs text-destructive">
                        {errors.deliverables}
                      </p>
                    )}

                    {items.length === 0 && (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        Noch keine Deliverables. Füge das erste hinzu.
                      </p>
                    )}

                    <Accordion type="multiple" className="flex flex-col gap-2">
                      {items.map((d, i) => {
                        const summary = d.content_type
                          ? `${d.count}x ${d.content_type}${d.platform ? ` · ${d.platform}` : ""}`
                          : `Deliverable ${i + 1}`;
                        return (
                          <AccordionItem
                            key={i}
                            value={String(i)}
                            className="rounded-xl border border-border bg-muted/40"
                          >
                            <div className="flex items-center">
                              <AccordionTrigger className="flex-1 cursor-pointer gap-1.5 px-3 py-2.5! text-left text-xs! font-medium outline-none hover:no-underline!">
                                <span className="flex-1 truncate">{summary}</span>
                              </AccordionTrigger>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeDeliverable(i)}
                                className="size-auto px-3 py-2.5 text-muted-foreground hover:text-destructive hover:bg-transparent"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>

                            <AccordionContent className="px-3">
                              <div className="grid grid-cols-5 gap-1.5 pb-1">
                                <div className="col-span-1">
                                  <p className="mb-1 text-[10px] text-muted-foreground">
                                    Anz.
                                  </p>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={d.count}
                                    className="h-7 px-2 text-xs"
                                    onChange={(e) =>
                                      update(i, {
                                        count: Math.max(
                                          1,
                                          parseInt(e.target.value) || 1,
                                        ),
                                      })
                                    }
                                  />
                                </div>
                                <div className="col-span-4">
                                  <p className="mb-1 text-[10px] text-muted-foreground">
                                    Content-Typ
                                  </p>
                                  <Select
                                    value={d.content_type || undefined}
                                    onValueChange={(v) => {
                                      if (v !== null)
                                        update(i, { content_type: v });
                                    }}
                                  >
                                    <SelectTrigger className="h-7 w-full text-xs">
                                      <SelectValue placeholder="Typ wählen" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {CONTENT_TYPES.map((t) => (
                                        <SelectItem key={t} value={t}>
                                          {t}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="pb-1">
                                <p className="mb-1 text-[10px] text-muted-foreground">
                                  Plattform
                                </p>
                                <Select
                                  value={d.platform || undefined}
                                  onValueChange={(v) => {
                                    if (v !== null) update(i, { platform: v });
                                  }}
                                >
                                  <SelectTrigger className="h-7 w-full text-xs">
                                    <SelectValue placeholder="Plattform wählen" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PLATFORMS.map((p) => (
                                      <SelectItem key={p} value={p}>
                                        {p}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="grid grid-cols-2 gap-1.5 pb-1">
                                <div>
                                  <p className="mb-1 text-[10px] text-muted-foreground">
                                    Draft-Deadline
                                  </p>
                                  <Input
                                    type="date"
                                    value={d.draft_deadline}
                                    className="h-7 px-2 text-xs"
                                    onChange={(e) =>
                                      update(i, { draft_deadline: e.target.value })
                                    }
                                  />
                                </div>
                                <div>
                                  <p className="mb-1 text-[10px] text-muted-foreground">
                                    Live-Datum
                                  </p>
                                  <Input
                                    type="date"
                                    value={d.live_date}
                                    className="h-7 px-2 text-xs"
                                    onChange={(e) =>
                                      update(i, { live_date: e.target.value })
                                    }
                                  />
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={addDeliverable}
                    >
                      <Plus className="h-3 w-3" />
                      Deliverable hinzufügen
                    </Button>
                  </div>
                );
              }}
            </form.Field>
          </TabsContent>
        )}
      </Tabs>

      {(errorList.length > 0 || submitError) && (
        <div className="mb-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {submitError ? (
            <p>{submitError}</p>
          ) : (
            <ul className="list-inside list-disc space-y-0.5">
              {errorList.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-col gap-2">
        <Button
          className="w-full"
          disabled={saving}
          onClick={() => form.handleSubmit()}
        >
          {saving
            ? isMerge
              ? "Wird übernommen…"
              : "Wird angelegt…"
            : isMerge
              ? "In Anfrage übernehmen"
              : "Anfrage erstellen"}
        </Button>
        {isMerge ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onSetWorkState({ phase: "idle" })}
          >
            Abbrechen
          </Button>
        ) : (
          <>
            <Button variant="outline" className="w-full">
              Erst antworten, ohne anzulegen
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => onSetWorkState({ phase: "not-coop" })}
            >
              Verwerfen
            </Button>
          </>
        )}
      </div>

      {!isMerge && (
        <p className="mt-4 rounded-xl bg-muted px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          Beim Anlegen wird der Mail-Thread mit dem Vorgang verknüpft.{" "}
          <span className="font-medium text-foreground">
            Ab dann liest die KI nur noch diesen Thread mit.
          </span>
        </p>
      )}
    </div>
  );
}
