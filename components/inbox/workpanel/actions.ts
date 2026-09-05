import type { LucideIcon } from "lucide-react";
import {
  Ban,
  BadgeEuro,
  Building2,
  FilePlus2,
  FolderInput,
  Gauge,
  Handshake,
  ReceiptText,
  RefreshCw,
  Send,
  Sparkles,
  SquarePen,
} from "lucide-react";
import type { SystemLabel } from "@/domains/communication";

export type WorkPanelActionId =
  | "analyse"
  | "invoice-ai"
  | "manual"
  | "mediakit"
  | "price-check"
  | "brand-check"
  | "capacity"
  | "assign"
  | "not-coop"
  | "anfrage-edit"
  | "deal-open"
  | "reanalyse";

// Canonical render order for the label-driven flow — keeps the main-action
// block visually consistent regardless of how a label maps its actions.
// The link-driven actions ("anfrage-edit", "deal-open") are intentionally
// excluded: they only appear when a Vorgang is already linked.
const ACTION_ORDER: WorkPanelActionId[] = [
  "analyse",
  "invoice-ai",
  "manual",
  "mediakit",
  "price-check",
  "brand-check",
  "capacity",
  "assign",
  "not-coop",
];

export const ACTION_META: Record<
  WorkPanelActionId,
  {
    label: string;
    variant: "default" | "secondary" | "outline";
    icon: LucideIcon;
    /** KI-driven action — surfaced with the Sparkles icon. */
    ai?: boolean;
  }
> = {
  analyse: { label: "Als Kooperationsanfrage lesen", variant: "default", icon: Sparkles, ai: true },
  "invoice-ai": { label: "Rechnung mit KI lesen", variant: "default", icon: ReceiptText, ai: true },
  manual: { label: "Anfrage anlegen", variant: "secondary", icon: FilePlus2 },
  mediakit: { label: "Media Kit senden", variant: "secondary", icon: Send },
  "price-check": { label: "Preis Check", variant: "outline", icon: BadgeEuro, ai: true },
  "brand-check": { label: "Brand prüfen", variant: "outline", icon: Building2, ai: true },
  capacity: { label: "Auslastung", variant: "outline", icon: Gauge, ai: true },
  assign: { label: "Zu bestehendem Vorgang zuordnen", variant: "outline", icon: FolderInput },
  "not-coop": { label: "Keine Anfrage – nicht scannen", variant: "outline", icon: Ban },
  "anfrage-edit": { label: "Anfrage bearbeiten", variant: "default", icon: SquarePen },
  "deal-open": { label: "Deal öffnen", variant: "default", icon: Handshake },
  reanalyse: { label: "Neue Infos übernehmen", variant: "secondary", icon: RefreshCw, ai: true },
};

// "Zu bestehendem Vorgang zuordnen" is always a main action.
const ALWAYS_MAIN: WorkPanelActionId[] = ["assign"];

const MAIN_BY_LABEL: Partial<Record<SystemLabel, WorkPanelActionId[]>> = {
  ANFRAGE: ["analyse", "manual", "mediakit"],
  LAUFEND: ["capacity"],
  RECHNUNG: ["invoice-ai"],
  PROMOTIONS: ["not-coop"],
  ANDERES: ["not-coop"],
};

const DEFAULT_MAIN: WorkPanelActionId[] = ["analyse", "manual"];

// When a Vorgang is already linked, creating one makes no sense.
const HIDDEN_WHEN_LINKED: WorkPanelActionId[] = ["manual", "analyse", "invoice-ai"];

export type WorkPanelLink = { anfrageId?: string | null; dealId?: string | null };

export function resolveActions(
  labels: SystemLabel[],
  link?: WorkPanelLink,
): { main: WorkPanelActionId[]; more: WorkPanelActionId[] } {
  if (link?.dealId || link?.anfrageId) {
    const primary: WorkPanelActionId = link.dealId ? "deal-open" : "anfrage-edit";
    return {
      main: [primary, "reanalyse", "assign"],
      more: ACTION_ORDER.filter(
        (id) => id !== "assign" && !HIDDEN_WHEN_LINKED.includes(id),
      ),
    };
  }

  const ctx = labels.map((l) => MAIN_BY_LABEL[l]).find((v) => v !== undefined) ?? DEFAULT_MAIN;
  const mainSet = new Set<WorkPanelActionId>([...ctx, ...ALWAYS_MAIN]);
  return {
    main: ACTION_ORDER.filter((id) => mainSet.has(id)),
    more: ACTION_ORDER.filter((id) => !mainSet.has(id)),
  };
}
