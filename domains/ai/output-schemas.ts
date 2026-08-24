import { z } from "zod";

export const EmailAnalysisOutputSchema = z.object({
  label: z.enum(["REQUEST", "INFO", "SPAM", "PERSONAL", "OTHER"]),
  is_request:            z.boolean(),
  information_complete:  z.boolean(),
  missing_information:   z.array(z.string()),
  suggested_reply:       z.string().nullable(),
  matched_brand_name:    z.string().nullable(),
});

export type EmailAnalysisOutput = z.infer<typeof EmailAnalysisOutputSchema>;

export const EmailLabelOutputSchema = z.object({
  label: z.enum(["REQUEST", "INFO", "SPAM", "PERSONAL", "OTHER"]),
});

export type EmailLabelOutput = z.infer<typeof EmailLabelOutputSchema>;
