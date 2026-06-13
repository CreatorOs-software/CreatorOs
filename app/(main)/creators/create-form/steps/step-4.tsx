import { UserRound } from "lucide-react";
import type { CreatorForm } from "../creator-form.types";
import { fullName, getInitials, pickColor } from "../creator-form.helpers";
import { StepNav } from "./step-nav";

const STATUS_LABEL = {
  active: "Aktiv",
  "on-break": "Pause",
  inactive: "Inaktiv",
} as const;

interface Step4Props {
  form: CreatorForm;
  saving: boolean;
  error: string | null;
  onPrev: () => void;
  onSubmit: () => void;
}

export function Step4({ form, saving, error, onPrev, onSubmit }: Step4Props) {
  const v = form.state.values;
  const name = fullName(v.vorname, v.nachname);

  const rows: [string, string][] = [
    ["Name", name || "–"],
    ["Handle", v.handle || "–"],
    ["E-Mail", v.email || "–"],
    ["Nische", v.niche || "–"],
    ["Status", STATUS_LABEL[v.status]],
    ["Plattformen", v.platforms.join(", ") || "–"],
    ["Reichweite", v.followers || "–"],
    ["Monatl. Revenue", v.monthly_revenue ? `$${v.monthly_revenue}` : "–"],
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-semibold">Zusammenfassung</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Alles korrekt? Dann Creator jetzt anlegen.
        </p>
      </div>

      {/* Avatar preview */}
      <div className="flex items-center gap-3 p-4 bg-muted/40 rounded-xl">
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ background: name ? pickColor(name) : "#6b7280" }}
        >
          {name ? getInitials(name) : <UserRound className="w-5 h-5" />}
        </span>
        <div>
          <p className="text-sm font-semibold">{name || "–"}</p>
          <p className="text-xs text-muted-foreground">{v.handle || v.email || "–"}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border-light divide-y divide-border-light">
        {rows.map(([key, val]) => (
          <div key={key} className="flex items-start gap-3 px-4 py-2.5">
            <span className="text-xs text-muted-foreground w-32 shrink-0">{key}</span>
            <span className="text-xs font-medium flex-1">{val}</span>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <StepNav onPrev={onPrev} onSubmit={onSubmit} saving={saving} />
    </div>
  );
}
