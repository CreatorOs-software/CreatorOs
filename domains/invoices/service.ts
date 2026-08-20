import { getAuthContext } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { InvoiceRepository } from "./repository";
import type { Invoice } from "./types";

export const InvoiceService = {
  async getInvoicesByCreator(creatorId: string): Promise<Invoice[]> {
    const supabase = await createClient();
    await getAuthContext(supabase);
    return InvoiceRepository.findByCreator(supabase, creatorId);
  },
};
