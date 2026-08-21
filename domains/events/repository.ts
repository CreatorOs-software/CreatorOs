import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarEvent, EventCreateInput, EventFilters, EventPatch } from "./types";

const EVENT_SELECT = `
  id, title, notes, start_at, end_at, type, location, creator_id, attendee_ids, all_day, recurrence,
  creators:creator_id (full_name, initials)
`;

export const EventRepository = {
  async findAll(
    supabase: SupabaseClient,
    agencyId: string,
    filters: EventFilters = {},
  ): Promise<CalendarEvent[]> {
    let query = supabase
      .from("events")
      .select(EVENT_SELECT)
      .eq("agency_id", agencyId)
      .order("start_at");

    if (filters.from) query = query.gte("start_at", filters.from);
    if (filters.to) query = query.lte("start_at", filters.to);
    if (filters.creator_id) query = query.eq("creator_id", filters.creator_id);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as unknown as CalendarEvent[];
  },

  async create(
    supabase: SupabaseClient,
    agencyId: string,
    input: EventCreateInput,
  ): Promise<CalendarEvent> {
    const { data, error } = await supabase
      .from("events")
      .insert({ ...input, agency_id: agencyId })
      .select(EVENT_SELECT)
      .single();
    if (error) throw error;
    return data as unknown as CalendarEvent;
  },

  async update(
    supabase: SupabaseClient,
    id: string,
    agencyId: string,
    patch: EventPatch,
  ): Promise<CalendarEvent> {
    const { data, error } = await supabase
      .from("events")
      .update(patch)
      .eq("id", id)
      .eq("agency_id", agencyId)
      .select(EVENT_SELECT)
      .single();
    if (error) throw error;
    return data as unknown as CalendarEvent;
  },

  async remove(supabase: SupabaseClient, id: string, agencyId: string): Promise<void> {
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id)
      .eq("agency_id", agencyId);
    if (error) throw error;
  },
};
