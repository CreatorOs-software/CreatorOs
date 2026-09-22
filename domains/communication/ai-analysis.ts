export type AiAnalysisResult = {
  creator_id: string | null;
  creator_confidence: number;
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
  deliverables: Array<{
    count: number;
    content_type: string;
    platform: string;
    draft_deadline: string | null;
    freigabe_deadline: string | null;
    live_date: string | null;
  }>;
  payment_items: Array<{
    label: string;
    amount: number;
    invoice_date: string | null;
    payment_term: 14 | 30 | 45;
  }>;
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
  missing_information: string[];
  suggested_reply: string | null;
};

export type AnalyseResult = AiAnalysisResult & {
  brand_name: string | null;
  brand_id: string | null;
  brand_is_new: boolean;
  anfrage_id: string | null;
};
