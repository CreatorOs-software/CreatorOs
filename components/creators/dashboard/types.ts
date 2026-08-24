import type {
  CreatorAccount,
  MetricsCurrent,
  MetricsDaily,
} from "@/domains/social-accounts/types";

export type {
  Deliverable,
  DealRights,
  ApprovalInfo,
  DeliveryInfo,
  DealGuidelines,
  TrackingAssets,
  ExclusivityInfo,
  Embargo,
  WhitelistingInfo,
  PaymentItem,
  DealFull,
} from "@/domains/deals";

export type { Anfrage } from "@/domains/anfragen";
export type { Invoice } from "@/domains/invoices";

export type MetricsResponse = {
  accounts: CreatorAccount[];
  metrics: Record<
    string,
    { current: MetricsCurrent | null; daily: MetricsDaily[] }
  >;
};

