export type ExtractedEmailData = {
  brand: string;
  contact: string;
  creatorId: string | null;
  creatorConfidence: number;
  format: string;
  product: string;
  budget: number | null;
  period: string;
  uncertainFields: string[];
};

export type LocalVorgang = {
  brand: string;
  creatorId: string | null;
  title: string;
  status: "anfrage" | "verh" | "aktiv" | "fertig";
  amZug: "wir" | "brand" | "creator";
  honorar: number | null;
  stand: string;
  history: Array<{
    who: "wir" | "brand";
    amount: number | null;
    note: string;
    date: string;
  }>;
};

export type WorkPanelState =
  | { phase: "idle" }
  | { phase: "scanning" }
  | { phase: "not-coop" }
  | { phase: "extracted"; data: ExtractedEmailData }
  | { phase: "vorgang"; vorgang: LocalVorgang };
