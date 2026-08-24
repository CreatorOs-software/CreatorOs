export type AITaskType =
  | "INCOMING_EMAIL_ANALYSIS"
  | "EMAIL_LABEL";

export type AIJobStatus =
  | "pending"
  | "running"
  | "done"
  | "failed"
  | "cancelled";

export type AIJobInput = {
  task_type:     AITaskType;
  input_payload: Record<string, unknown>;
  agency_id:     string;
  created_by?:   string;
  priority?:     1 | 2 | 3;
};

export type AIJob = {
  id:            string;
  agency_id:     string;
  created_by:    string | null;
  task_type:     AITaskType;
  input_payload: Record<string, unknown>;
  result:        Record<string, unknown> | null;
  status:        AIJobStatus;
  attempts:      number;
  max_attempts:  number;
  priority:      number;
  scheduled_at:  string;
  started_at:    string | null;
  completed_at:  string | null;
  error:         string | null;
  created_at:    string;
};
