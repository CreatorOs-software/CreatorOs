import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@talentos/ui";
import type { EmailRequestStatus, SystemLabel } from "@/domains/communication";
import type { Creator } from "../../types";
import {
  AttachmentAnalyzer,
  type AttachmentExtractedFields,
} from "./attachment-analyzer";
import { AssignVorgangDialog } from "./assign-vorgang-dialog";
import {
  ACTION_META,
  resolveActions,
  type WorkPanelActionId,
} from "../actions";

type Props = {
  threadId: string;
  creators: Creator[];
  labels: SystemLabel[];
  anfrageId?: string | null;
  dealId?: string | null;
  onAnalyse: () => void;
  onReanalyse?: () => void;
  onManualCreate: () => void;
  onBriefingExtracted: (
    filename: string,
    extracted: AttachmentExtractedFields,
  ) => void;
  onInvoiceAi?: () => void;
  onMatching?: () => void;
  requestStatus: EmailRequestStatus;
  onReject: () => Promise<void>;
};

export function IdlePanel({
  threadId,
  creators,
  labels,
  anfrageId,
  dealId,
  onAnalyse,
  onReanalyse,
  onManualCreate,
  onBriefingExtracted,
  onInvoiceAi,
  onMatching,
  requestStatus,
  onReject,
}: Props) {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const { main, more } = resolveActions(labels, { anfrageId, dealId });
  const isLinked = !!(anfrageId || dealId);

  const handlers: Record<WorkPanelActionId, (() => void) | undefined> = {
    analyse: onAnalyse,
    "invoice-ai": onInvoiceAi,
    manual: onManualCreate,
    matching: onMatching,
    assign: () => setAssignOpen(true),
    "anfrage-edit": anfrageId
      ? () => router.push(`/creators/anfragen/edit/${anfrageId}`)
      : undefined,
    "deal-open": dealId
      ? () => router.push(`/creators/deals/edit/${dealId}`)
      : undefined,
    reanalyse: onReanalyse,
  };

  return (
    <div className="relative flex flex-col items-center gap-4 pt-2 text-center">
      <Tooltip>
        <TooltipTrigger
          className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Warum nicht automatisch?"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </TooltipTrigger>
        <TooltipContent side="left" className="text-left leading-relaxed">
          Würde jede Mail automatisch gescannt, zahlst du auch für Newsletter,
          Spam und interne Mails. So läuft die KI nur da, wo sie etwas wert ist.
        </TooltipContent>
      </Tooltip>

      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
          isLinked ? "bg-brand/10" : "bg-orange-50"
        }`}
      >
        {isLinked ? (
          <Briefcase className="h-6 w-6 text-brand" />
        ) : (
          <Sparkles className="h-6 w-6 text-brand" />
        )}
      </div>

      <div>
        <p className="text-sm font-semibold">
          {isLinked
            ? dealId
              ? "Mit Deal verknüpft"
              : "Mit Anfrage verknüpft"
            : "Noch nicht analysiert"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {isLinked
            ? "Diese Mail gehört zu einem laufenden Vorgang."
            : "Die KI liest diese Mail erst, wenn du es sagst."}
        </p>
      </div>

      <div className="w-full text-left">
        <AttachmentAnalyzer
          threadId={threadId}
          creators={creators}
          onBriefingExtracted={onBriefingExtracted}
        />
      </div>

      {main.map((id) => (
        <Button
          key={id}
          className="w-full gap-1.5"
          variant={ACTION_META[id].variant}
          onClick={handlers[id]}
        >
          {ACTION_META[id].ai && <Sparkles className="h-3.5 w-3.5" />}
          {ACTION_META[id].label}
        </Button>
      ))}

      {!isLinked && labels.includes("ANFRAGE") && requestStatus === "open" && (
        <div className="w-full rounded-(--tui-radius-md) border border-border p-(--tui-space-sm) text-left">
          <p className="text-xs font-semibold text-foreground">Nächster Schritt</p>
          <p className="mt-(--tui-space-3xs) text-xs leading-relaxed text-muted-foreground">
            Lege eine Anfrage an oder lehne sie bewusst ab. Bis dahin bleibt sie im Dashboard sichtbar.
          </p>
          {confirmReject ? (
            <div className="mt-(--tui-space-xs) flex flex-col gap-(--tui-space-2xs)">
              <p className="text-xs font-medium text-destructive">Anfrage wirklich ablehnen?</p>
              {rejectError && <p className="text-xs text-destructive">{rejectError}</p>}
              <div className="flex gap-(--tui-space-2xs)">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={rejecting}
                  onClick={async () => {
                    setRejecting(true);
                    setRejectError(null);
                    try {
                      await onReject();
                    } catch (error) {
                      setRejectError(error instanceof Error ? error.message : "Ablehnen fehlgeschlagen");
                      setRejecting(false);
                    }
                  }}
                >
                  {rejecting ? "Wird abgelehnt…" : "Ja, ablehnen"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={rejecting}
                  onClick={() => setConfirmReject(false)}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-(--tui-space-xs) w-full text-destructive"
              onClick={() => setConfirmReject(true)}
            >
              <XCircle className="h-4 w-4" />
              Anfrage ablehnen
            </Button>
          )}
        </div>
      )}

      {more.length > 0 && (
        <div className="flex w-full flex-col gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            aria-expanded={showAll}
            onClick={() => setShowAll((v) => !v)}
          >
            Alle Aktionen
            {showAll ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
          {showAll && (
            <div className="grid grid-cols-2 gap-2">
              {more.map((id) => {
                const Icon = ACTION_META[id].icon;
                return (
                  <Button
                    key={id}
                    type="button"
                    variant="ghost"
                    onClick={handlers[id]}
                    className="h-auto flex flex-col items-center gap-2 rounded-sm border border-border bg-muted/30 px-2 py-8 text-center text-xs font-medium leading-tight text-foreground hover:bg-muted"
                  >
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    {ACTION_META[id].label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <AssignVorgangDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        threadId={threadId}
        creators={creators}
      />
    </div>
  );
}
