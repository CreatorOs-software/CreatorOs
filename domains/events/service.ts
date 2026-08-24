import { getAuthContext } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { EventRepository } from "./repository";
import type { CalendarEvent, EventCreateInput, EventFilters, EventPatch } from "./types";

export class EventError extends Error {}

export const EventService = {
  async listEvents(filters: EventFilters = {}): Promise<CalendarEvent[]> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return EventRepository.findAll(supabase, agencyId, filters);
  },

  async createEvent(input: EventCreateInput): Promise<CalendarEvent> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return EventRepository.create(supabase, agencyId, input);
  },

  async updateEvent(id: string, patch: EventPatch): Promise<CalendarEvent> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return EventRepository.update(supabase, id, agencyId, patch);
  },

  async deleteEvent(id: string): Promise<void> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return EventRepository.remove(supabase, id, agencyId);
  },
};
