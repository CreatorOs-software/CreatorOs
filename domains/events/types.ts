export type EventType = "shoot" | "travel" | "deadline" | "brand" | "internal" | "posting";

export type Recurrence = "none" | "daily" | "weekly" | "monthly" | "yearly";

export type CalendarEvent = {
  id: string;
  title: string;
  notes: string | null;
  start_at: string;
  end_at: string | null;
  type: EventType;
  location: string | null;
  creator_id: string | null;
  attendee_ids: string[];
  all_day: boolean;
  recurrence: Recurrence;
  creators: { full_name: string; initials: string } | null;
};

export type EventCreateInput = {
  title: string;
  type: EventType;
  start_at: string;
  end_at?: string | null;
  notes?: string | null;
  location?: string | null;
  creator_id?: string | null;
  deal_id?: string | null;
  attendee_ids?: string[];
  all_day?: boolean;
  recurrence?: Recurrence;
};

export type EventPatch = {
  title?: string;
  type?: EventType;
  start_at?: string;
  end_at?: string | null;
  notes?: string | null;
  location?: string | null;
  creator_id?: string | null;
  deal_id?: string | null;
  attendee_ids?: string[];
  all_day?: boolean;
  recurrence?: Recurrence;
};

export type EventFilters = {
  from?: string;
  to?: string;
  creator_id?: string;
};
