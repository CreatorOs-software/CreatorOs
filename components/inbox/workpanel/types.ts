export type ExtractedDeliverable = {
  count: number;
  content_type: string;
  platform: string;
  draft_deadline: string;
  freigabe_deadline: string;
  live_date: string;
};

export type ExtractedGuidelines = {
  labeling: string;
  wording: string;
  nogo: string;
  hashtags: string[];
};

export type ExtractedTrackingAssets = {
  discountCode: string;
  affiliateLinks: string[];
  utmParams: string;
};

export type ExtractedPaymentItem = {
  label: string;
  amount: number | null;
  invoiceDate: string;
  paymentTerm: 14 | 30 | 45;
};

export type ExtractedEmailData = {
  brand: string;
  contact: string;
  creatorId: string | null;
  creatorConfidence: number;
  title: string;
  product: string;
  budget: number | null;
  budgetOffer: number | null;
  fee: number | null;
  period: string;
  campaign_start: string;
  campaign_end: string;
  notes: string;
  deliverables: ExtractedDeliverable[];
  paymentItems: ExtractedPaymentItem[];
  guidelines: ExtractedGuidelines;
  trackingAssets: ExtractedTrackingAssets;
  uncertainFields: string[];
  /** Field names the AI actually returned a value for; drives which fields show by default. */
  detectedFields: string[];
};

export type LocalVorgang = {
  brand: string;
  creatorId: string | null;
  title: string;
  status: "anfrage" | "verh" | "aktiv" | "fertig";
  amZug: "wir" | "brand" | "creator";
  honorar: number | null;
  stand: string;
  history: Array<{
    who: "wir" | "brand";
    amount: number | null;
    note: string;
    date: string;
  }>;
};

export type NewBrandData = {
  brand_name: string;
  industry: string | null;
  extractedData: ExtractedEmailData;
};

export type WorkPanelState =
  | { phase: "idle" }
  | { phase: "scanning"; mode: "create" | "merge"; anfrageId?: string }
  | { phase: "not-coop" }
  | { phase: "new-brand"; newBrand: NewBrandData }
  | { phase: "extracted"; data: ExtractedEmailData; merge?: { anfrageId: string } }
  | { phase: "vorgang"; vorgang: LocalVorgang };
