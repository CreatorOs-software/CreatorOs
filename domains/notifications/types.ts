export type NotificationSeverity = "LAUT" | "NORMAL" | "LEISE";

export type NotificationStatus = "OPEN" | "DISMISSED" | "CONVERTED";

export type NotificationSubjectType =
  | "ANFRAGE"
  | "DEAL"
  | "INVOICE"
  | "EMAIL_THREAD"
  | "EVENT";

export type NotificationType =
  // Kategorie 1 – Bewegung
  | "BRAND_REPLIED"
  | "OFFER_ACCEPTED"
  | "OFFER_REJECTED"
  | "OFFER_COUNTERED"
  | "APPROVAL_GRANTED"
  | "APPROVAL_REJECTED"
  | "CONTENT_DELIVERED"
  | "PAYMENT_RECEIVED"
  | "NEW_REQUEST_DETECTED"
  // Kategorie 2 – Nicht-Bewegung
  | "REQUEST_STALE"
  | "OFFER_STALE"
  | "DRAFT_DUE_SOON"
  | "DRAFT_OVERDUE"
  | "INVOICE_OVERDUE"
  | "PAYOUT_PENDING";

export type NotificationCreator = {
  id: string;
  full_name: string;
  initials: string;
};

export type Notification = {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  subject_type: NotificationSubjectType;
  subject_id: string | null;
  vorgang_key: string;
  creator_id: string | null;
  title: string;
  reason: string | null;
  href: string | null;
  payload: Record<string, unknown>;
  status: NotificationStatus;
  todo_id: string | null;
  created_at: string;
  updated_at: string;
  read_at: string | null;
  creator: NotificationCreator | null;
};

export type EmitInput = {
  agencyId: string;
  recipientId: string;
  type: NotificationType;
  severity: NotificationSeverity;
  subjectType: NotificationSubjectType;
  subjectId: string | null;
  vorgangKey: string;
  creatorId?: string | null;
  title: string;
  reason?: string | null;
  href?: string | null;
  payload?: Record<string, unknown>;
  bundleKey?: string | null;
};

export type MuteScopeType = "VORGANG" | "CREATOR";

export type NotificationMute = {
  id: string;
  scope_type: MuteScopeType;
  scope_key: string;
  created_at: string;
};

export type MuteInput = {
  scopeType: MuteScopeType;
  scopeKey: string;
};
