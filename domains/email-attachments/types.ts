export type AttachmentClassification = "RECHNUNG" | "VERTRAG_BRIEFING" | "ANDERES";

export type EmailAttachment = {
  id: string;
  email_thread_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  is_classifiable: boolean;
  storage_path: string | null;
  classification: AttachmentClassification | null;
  classification_confidence: number | null;
  extracted: Record<string, unknown> | null;
  analysed_at: string | null;
  assigned_creator_id: string | null;
  assigned_at: string | null;
};

export type AttachmentAnalyzeResult = {
  classification: AttachmentClassification;
  classification_confidence: number;
  extracted: Record<string, unknown> | null;
};
