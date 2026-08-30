export type Invoice = {
  id: string;
  number: string;
  amount: number;
  status: string;
  issued_at: string | null;
  due_date: string | null;
  paid_at: string | null;
  brands: { company_name: string; short_code: string } | null;
};
