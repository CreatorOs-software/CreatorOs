"use client";

import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleAlert,
  Loader2,
  Target,
  XCircle,
} from "lucide-react";
import {
  Badge,
  Button,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@talentos/ui";
import type { Creator, Thread } from "../../types";
import type { MatchingResponse, MatchingStatus } from "@/domains/matching";
import type { WorkPanelState } from "../types";

type Props = {
  thread: Thread;
  creators: Creator[];
  creatorId: string | null;
  status: "idle" | "loading" | "error" | "success";
  error?: string;
  response?: MatchingResponse;
  onSetWorkState: (state: WorkPanelState) => void;
  onRun: () => void;
  onUseExtraction: () => void;
};

const TYPE_LABEL = {
  umsatz: "Umsatz",
  kooperationen: "Kooperationen",
  post: "Posts",
} as const;

const PERIOD_LABEL = {
  "30_tage": "30 Tage",
  "3_monate": "3 Monate",
  "1_jahr": "1 Jahr",
} as const;

function formatGoalValue(value: number, type: keyof typeof TYPE_LABEL) {
  if (type === "umsatz") {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  }
  return value.toLocaleString("de-DE");
}

function goalFitText(goal: Creator["goals"][number]) {
  if (goal.type === "kooperationen") {
    return `Die Anfrage könnte 1 von ${goal.value} geplanten Kooperationen beitragen.`;
  }
  if (goal.type === "umsatz") {
    return "Das erkannte Budget kann nach der Analyse direkt gegen dieses Umsatzziel geprüft werden.";
  }
  return "Die angefragten Deliverables können nach der Analyse auf dieses Posting-Ziel einzahlen.";
}

function goalContribution(
  goal: Creator["goals"][number],
  progress?: MatchingResponse["goal_progress"][number],
) {
  if (progress) {
    const contribution = progress.request_contribution;
    return {
      value: progress.projected_percent ?? progress.progress_percent,
      label: contribution == null
        ? "Beitrag nicht berechenbar"
        : `+${formatGoalValue(contribution, goal.type)} · danach ${progress.projected_percent ?? progress.progress_percent} %`,
    };
  }
  if (goal.type === "kooperationen") {
    return {
      value: Math.min(100, (1 / goal.value) * 100),
      label: `1 mögliche Kooperation · ${Math.round((1 / goal.value) * 100)} % des Ziels`,
    };
  }
  if (goal.type === "umsatz") {
    return { value: 0, label: "Budget noch nicht analysiert" };
  }
  return { value: 0, label: "Deliverables noch nicht analysiert" };
}

const DIMENSION_LABELS = {
  goal_fit: "Ziel-Fit",
  content_fit: "Content-Fit",
  budget_fit: "Budget-Fit",
  timing_fit: "Timing-Fit",
  brand_fit: "Brand-Fit",
} as const;

function statusLabel(status: MatchingStatus) {
  return status === "strong" ? "Stark" : status === "conditional" ? "Bedingt" : status === "weak" ? "Schwach" : "Offen";
}

export function MatchingPanel({
  thread,
  creators,
  creatorId,
  status,
  error,
  response,
  onSetWorkState,
  onRun,
  onUseExtraction,
}: Props) {
  const creator = creators.find((item) => item.id === creatorId) ?? null;
  const sender = thread.sender_name || thread.sender_email;

  return (
    <div className="flex flex-col gap-(--tui-space-sm)">
      <div className="border-b border-hairline border-light pb-(--tui-space-sm)">
        <div className="mb-(--tui-space-2xs) flex items-center gap-(--tui-space-2xs)">
          <div className="flex size-(--tui-space-lg) items-center justify-center rounded-md bg-primary-subtle">
            <Target className="size-(--tui-space-sm) text-primary-subtle-foreground" />
          </div>
          <div>
            <h2 className="text-body-sm font-semibold">Matching prüfen</h2>
            <p className="text-caption text-muted-foreground">
              Anfrage mit den Creator-Zielen abgleichen
            </p>
          </div>
        </div>

        <Select
          value={creatorId ?? undefined}
          onValueChange={(value) =>
            onSetWorkState({ phase: "matching", creatorId: value, status: "idle" })
          }
          disabled={status === "loading"}
        >
          <SelectTrigger className="mt-(--tui-space-xs) w-full text-caption">
            <SelectValue placeholder="Creator auswählen…" />
          </SelectTrigger>
          <SelectContent>
            {creators.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!creator ? (
        <div className="rounded-xl border-hairline border-dashed border-light p-(--tui-space-md) text-center">
          <Target className="mx-auto size-(--tui-space-md) text-muted-foreground" />
          <p className="mt-(--tui-space-2xs) text-caption font-medium">Creator auswählen</p>
          <p className="mt-(--tui-space-3xs) text-caption leading-relaxed text-muted-foreground">
            Danach werden Ziele und Rahmenbedingungen für das Matching angezeigt.
          </p>
        </div>
      ) : (
        <>
          <section className="overflow-hidden rounded-xl border-hairline border-light">
            <div className="flex items-center justify-between bg-surface px-(--tui-space-xs) py-(--tui-space-2xs)">
              <div>
                <p className="text-caption font-semibold">Vereinbarte Ziele</p>
                <p className="mt-(--tui-space-3xs) text-caption text-muted-foreground">
                  Möglicher Beitrag dieser Anfrage
                </p>
              </div>
              <Badge variant="secondary">{creator.goals?.length ?? 0}</Badge>
            </div>
            {creator.goals?.length > 0 ? (
              <div className="divide-y divide-border-light">
                {creator.goals.map((goal, index) => {
                  const contribution = goalContribution(goal, response?.goal_progress?.[index]);
                  return (
                    <div key={`${goal.type}-${goal.period}-${index}`} className="p-(--tui-space-xs)">
                      <div className="flex items-start justify-between gap-(--tui-space-xs)">
                        <div>
                          <p className="text-caption font-semibold">{TYPE_LABEL[goal.type]}</p>
                          <p className="mt-(--tui-space-3xs) text-caption text-muted-foreground">
                            {PERIOD_LABEL[goal.period]}
                          </p>
                        </div>
                        <span className="text-caption font-semibold tabular-nums">
                          {formatGoalValue(goal.value, goal.type)}
                        </span>
                      </div>
                      <div className="mt-(--tui-space-xs)">
                        <div className="mb-(--tui-space-2xs) flex items-center justify-between gap-(--tui-space-2xs) text-caption text-muted-foreground">
                          <span>Potenzial</span>
                          <span className="text-right">{contribution.label}</span>
                        </div>
                        <Progress value={contribution.value} className="h-(--tui-space-3xs)" />
                      </div>
                      <p className="mt-(--tui-space-2xs) text-caption leading-relaxed text-muted-foreground">
                        {goalFitText(goal)}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border-t border-hairline border-light p-(--tui-space-sm)">
                <p className="text-caption text-muted-foreground">
                  Für {creator.full_name} sind noch keine messbaren Ziele hinterlegt.
                </p>
              </div>
            )}
            {creator.weitere_ziele ? (
              <div className="border-t border-hairline border-light bg-surface p-(--tui-space-xs)">
                <p className="text-caption font-semibold uppercase tracking-caps text-muted-foreground">
                  Weitere Ziele
                </p>
                <p className="mt-(--tui-space-3xs) text-caption leading-relaxed">
                  {creator.weitere_ziele}
                </p>
              </div>
            ) : null}
          </section>

          <section className="overflow-hidden rounded-xl border-hairline border-light">
            <div className="flex items-center justify-between bg-surface px-(--tui-space-xs) py-(--tui-space-2xs)">
              <p className="text-caption font-semibold">Anfrage-Signale</p>
              <Badge variant="outline">E-Mail</Badge>
            </div>
            <div className="divide-y divide-border-light border-t border-hairline border-light">
              <div className="flex gap-(--tui-space-2xs) p-(--tui-space-xs)">
                <Building2 className="mt-(--tui-space-3xs) size-(--tui-space-sm) shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-caption font-medium">{sender}</p>
                  <p className="mt-(--tui-space-3xs) truncate text-caption text-muted-foreground">
                    {thread.sender_email}
                  </p>
                </div>
              </div>
              <div className="p-(--tui-space-xs)">
                <p className="text-caption font-medium leading-snug">{thread.subject}</p>
                {thread.preview ? (
                  <p className="mt-(--tui-space-3xs) line-clamp-3 text-caption leading-relaxed text-muted-foreground">
                    {thread.preview}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border-hairline border-light">
            <div className="bg-surface px-(--tui-space-xs) py-(--tui-space-2xs)">
              <p className="text-caption font-semibold">Rahmenbedingungen</p>
              <p className="mt-(--tui-space-3xs) text-caption text-muted-foreground">
                Muss vor einer Zusage abgeglichen werden
              </p>
            </div>
            <div className="divide-y divide-border-light border-t border-hairline border-light">
              {creator.min_kooperation_betrag ? (
                <div className="flex gap-(--tui-space-2xs) bg-warning-subtle p-(--tui-space-xs)">
                  <CircleAlert className="mt-(--tui-space-3xs) size-(--tui-space-sm) shrink-0 text-warning-subtle-foreground" />
                  <div>
                    <p className="text-caption font-semibold uppercase tracking-caps text-warning-subtle-foreground">
                      Mindestbetrag
                    </p>
                    <p className="mt-(--tui-space-3xs) text-caption leading-relaxed text-warning-subtle-foreground">
                      {formatGoalValue(creator.min_kooperation_betrag, "umsatz")} – Budget der Anfrage dagegen prüfen.
                    </p>
                  </div>
                </div>
              ) : null}
              {creator.wunsche_anforderungen ? (
                <div className="p-(--tui-space-xs)">
                  <p className="text-caption font-semibold uppercase tracking-caps text-muted-foreground">
                    Wünsche & Anforderungen
                  </p>
                  <p className="mt-(--tui-space-3xs) text-caption leading-relaxed">
                    {creator.wunsche_anforderungen}
                  </p>
                </div>
              ) : null}
              {!creator.min_kooperation_betrag && !creator.wunsche_anforderungen ? (
                <p className="p-(--tui-space-xs) text-caption text-muted-foreground">
                  Keine zusätzlichen Rahmenbedingungen hinterlegt.
                </p>
              ) : null}
            </div>
          </section>

          {status === "success" && response?.matching ? (
            <div className="flex flex-col gap-(--tui-space-sm)">
              <section className="overflow-hidden rounded-xl border-hairline border-primary-border">
                <div className="h-(--tui-space-3xs) bg-primary" />
                <div className="bg-primary-subtle p-(--tui-space-xs)">
                  <div className="flex items-start justify-between gap-(--tui-space-xs)">
                    <div className="min-w-0">
                      <p className="text-caption font-semibold text-primary-subtle-foreground">
                        KI-Matching
                      </p>
                      <p className="mt-(--tui-space-3xs) text-body-sm font-semibold text-primary-subtle-foreground">
                        {response.matching.summary}
                      </p>
                    </div>
                    <Badge
                      variant={response.matching.verdict === "strong" ? "default" : response.matching.verdict === "conditional" ? "warning" : "destructive"}
                      className="shrink-0"
                    >
                      {response.matching.score} %
                    </Badge>
                  </div>
                  <div className="mt-(--tui-space-xs)">
                    <Progress value={response.matching.score} />
                    <div className="mt-(--tui-space-3xs) flex justify-between text-caption text-primary-subtle-foreground">
                      <span>{statusLabel(response.matching.verdict)}</span>
                      <span>{response.matching.confidence} % Sicherheit</span>
                    </div>
                  </div>
                </div>
              </section>

              {(response.deterministic_rules?.length ?? 0) > 0 ? (
                <section className="overflow-hidden rounded-xl border-hairline border-light">
                  <div className="bg-surface px-(--tui-space-xs) py-(--tui-space-2xs)">
                    <p className="text-caption font-semibold">Rahmenbedingungen</p>
                  </div>
                  <div className="divide-y divide-border-light border-t border-hairline border-light">
                    {response.deterministic_rules?.map((rule) => (
                      <div key={rule.id} className="flex items-start gap-(--tui-space-2xs) p-(--tui-space-xs)">
                        {rule.status === "pass" ? (
                          <CheckCircle2 className="size-(--tui-space-sm) shrink-0 text-success" />
                        ) : rule.status === "fail" ? (
                          <XCircle className="size-(--tui-space-sm) shrink-0 text-destructive" />
                        ) : (
                          <CircleAlert className="size-(--tui-space-sm) shrink-0 text-warning" />
                        )}
                        <div className="min-w-0">
                          <p className="text-caption font-semibold">{rule.label}</p>
                          <p className="mt-(--tui-space-3xs) text-caption leading-relaxed text-muted-foreground">
                            {rule.explanation}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="overflow-hidden rounded-xl border-hairline border-light">
                <div className="bg-surface px-(--tui-space-xs) py-(--tui-space-2xs)">
                  <p className="text-caption font-semibold">Bewertung im Detail</p>
                </div>
                <div className="divide-y divide-border-light border-t border-hairline border-light">
                  {Object.entries(response.matching.dimensions ?? {}).map(([key, dimension]) => (
                    <div key={key} className="p-(--tui-space-xs)">
                      <div className="flex items-center justify-between gap-(--tui-space-2xs)">
                        <p className="text-caption font-semibold">
                          {DIMENSION_LABELS[key as keyof typeof DIMENSION_LABELS]}
                        </p>
                        <span className="text-caption font-semibold tabular-nums">
                          {dimension.score == null ? "Offen" : `${dimension.score} %`}
                        </span>
                      </div>
                      <Progress value={dimension.score ?? 0} className="mt-(--tui-space-2xs)" />
                      <p className="mt-(--tui-space-2xs) text-caption leading-relaxed text-muted-foreground">
                        {dimension.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {((response.matching.strengths?.length ?? 0) > 0 || (response.matching.concerns?.length ?? 0) > 0) ? (
                <section className="overflow-hidden rounded-xl border-hairline border-light">
                  <div className="bg-surface px-(--tui-space-xs) py-(--tui-space-2xs)">
                    <p className="text-caption font-semibold">Chancen & Risiken</p>
                  </div>
                  <div className="divide-y divide-border-light border-t border-hairline border-light">
                    {response.matching.strengths?.map((item) => (
                      <div key={item} className="flex gap-(--tui-space-2xs) bg-success-subtle p-(--tui-space-xs)">
                        <CheckCircle2 className="size-(--tui-space-sm) shrink-0 text-success-subtle-foreground" />
                        <p className="text-caption leading-relaxed text-success-subtle-foreground">{item}</p>
                      </div>
                    ))}
                    {response.matching.concerns?.map((item) => (
                      <div key={item} className="flex gap-(--tui-space-2xs) bg-warning-subtle p-(--tui-space-xs)">
                        <CircleAlert className="size-(--tui-space-sm) shrink-0 text-warning-subtle-foreground" />
                        <p className="text-caption leading-relaxed text-warning-subtle-foreground">{item}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {(response.matching.missing_information?.length ?? 0) > 0 ? (
                <section className="overflow-hidden rounded-xl border-hairline border-info-border">
                  <div className="flex gap-(--tui-space-2xs) bg-info-subtle p-(--tui-space-xs)">
                    <CircleAlert className="size-(--tui-space-sm) shrink-0 text-info-subtle-foreground" />
                    <div>
                      <p className="text-caption font-semibold text-info-subtle-foreground">Noch offen</p>
                      <p className="mt-(--tui-space-3xs) text-caption leading-relaxed text-info-subtle-foreground">
                        {response.matching.missing_information?.join(" · ")}
                      </p>
                    </div>
                  </div>
                </section>
              ) : null}

              {(response.matching.suggested_questions?.length ?? 0) > 0 ? (
                <section className="overflow-hidden rounded-xl border-hairline border-info-border">
                  <div className="bg-info-subtle px-(--tui-space-xs) py-(--tui-space-2xs)">
                    <p className="text-caption font-semibold text-info-subtle-foreground">
                      Empfohlene Rückfragen
                    </p>
                  </div>
                  <div className="divide-y divide-info-border border-t border-hairline border-info-border">
                    {response.matching.suggested_questions?.map((question) => (
                      <div key={question} className="bg-info-subtle p-(--tui-space-xs)">
                        <p className="text-caption leading-relaxed text-info-subtle-foreground">
                          {question}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <div className="rounded-xl border-hairline border-light p-(--tui-space-xs)">
                <p className="text-caption font-semibold">Empfehlung</p>
                <p className="mt-(--tui-space-3xs) text-caption leading-relaxed text-muted-foreground">
                  {response.matching.recommendation}
                </p>
              </div>

              <Button className="w-full" onClick={onUseExtraction}>
                Als Kooperationsanfrage lesen
                <ArrowRight className="size-(--tui-space-sm)" />
              </Button>
            </div>
          ) : (
            <>
              {status === "error" ? (
                <div className="flex gap-(--tui-space-2xs) rounded-xl border-hairline border-destructive-border bg-destructive-subtle p-(--tui-space-xs)">
                  <XCircle className="size-(--tui-space-sm) shrink-0 text-destructive-subtle-foreground" />
                  <p className="text-caption leading-relaxed text-destructive-subtle-foreground">
                    {error ?? "Das Matching konnte nicht abgeschlossen werden."}
                  </p>
                </div>
              ) : null}
              <Button className="w-full" onClick={onRun} disabled={status === "loading" || !creatorId}>
                {status === "loading" ? (
                  <Loader2 className="size-(--tui-space-sm) animate-spin" />
                ) : (
                  <Target className="size-(--tui-space-sm)" />
                )}
                {status === "loading" ? "Matching wird geprüft…" : status === "error" ? "Erneut prüfen" : "KI-Matching starten"}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
