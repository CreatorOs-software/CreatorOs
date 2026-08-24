import type { SupabaseClient } from "@supabase/supabase-js";
import type { Invoice } from "./types";

const INVOICE_SELECT = `id, number, amount, status, issued_at, due_date, paid_at, brands(company_name, color, short_code)`;

export const InvoiceRepository = {
  async findByCreator(supabase: SupabaseClient, creatorId: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from("invoices")
      .select(INVOICE_SELECT)
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Invoice[];
  },
};
