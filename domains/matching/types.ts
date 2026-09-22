import type { AnalyseResult } from "@/domains/communication/ai-analysis";

export type MatchingStatus = "strong" | "conditional" | "weak" | "unknown";

export type MatchingDimension = {
  score: number | null;
  status: MatchingStatus;
  explanation: string;
  evidence: string[];
};

export type CreatorMatchingResult = {
  score: number;
  confidence: number;
  verdict: Exclude<MatchingStatus, "unknown">;
  summary: string;
  dimensions: {
    goal_fit: MatchingDimension;
    content_fit: MatchingDimension;
    budget_fit: MatchingDimension;
    timing_fit: MatchingDimension;
    brand_fit: MatchingDimension;
  };
  strengths: string[];
  concerns: string[];
  missing_information: string[];
  suggested_questions: string[];
  recommendation: string;
};

export type CreatorGoalProgress = {
  value: number;
  type: "umsatz" | "kooperationen" | "post";
  period: "30_tage" | "3_monate" | "1_jahr";
  current: number;
  request_contribution: number | null;
  progress_percent: number;
  projected_percent: number | null;
};

export type MatchingRuleResult = {
  id: string;
  status: "pass" | "warning" | "fail" | "unknown";
  label: string;
  explanation: string;
};

export type MatchingResponse = {
  extraction: AnalyseResult;
  matching: CreatorMatchingResult;
  goal_progress: CreatorGoalProgress[];
  deterministic_rules: MatchingRuleResult[];
  prompt_version: string;
};
