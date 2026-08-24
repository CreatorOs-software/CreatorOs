# AI Execution Layer – Architektur

## Übersicht

Zentraler AI-Infrastruktur-Layer für CreatorOS. Alle KI-Aufrufe laufen ausschließlich über diesen Layer – niemals direkt aus Feature-Code heraus.

**Kernprinzipien:**
- KI erzeugt keine Domain-Objekte direkt (keine Anfragen, keine Deals, keine E-Mails)
- KI liefert ein validiertes Structured Output – Business Logic entscheidet, was damit passiert
- Alle Kosten und Credits sind nachvollziehbar und getrennt erfassbar
- Supabase ist das Backend Core – kein externer Queue-Service

---

## Komponentenübersicht

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Next.js Application                          │
│                                                                      │
│   Domain Logic        API Routes          React Query / UI          │
│   (domains/)          (app/api/)          (components/)             │
│        │                   │                                         │
│        └───────────────────┴──── enqueues AI Job ─────────────────┐ │
└────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Supabase / PostgreSQL                            │
│                                                                      │
│   ai_jobs               ai_executions         credit_ledger         │
│   (Job Queue)           (Execution Log)       (Append-only)         │
│   status/attempts/      provider/model/                             │
│   payload/result        tokens/cost/ms/       agency_credits        │
│                         prompt_version        (Balance Snapshot)    │
│                                                                      │
│   pg_cron (scheduled)        pg_net (HTTP → Edge Function)          │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│           Supabase Edge Function: execute-ai-job                     │
│                                                                      │
│   1. Job claim (SELECT FOR UPDATE SKIP LOCKED)                       │
│   2. Credit check + reservation                                      │
│   3. Context Builder → holt relevante DB-Daten                      │
│   4. Prompt Registry → baut Prompt aus Context                      │
│   5. AI Provider Adapter aufrufen                                    │
│   6. Structured Output validieren (Zod)                              │
│   7. Execution log schreiben                                         │
│   8. Credits finalisieren                                            │
│   9. Result in ai_jobs.result + Domain-Callback                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     AI Provider Adapter                              │
│                                                                      │
│   interface AIProviderAdapter {                                      │
│     execute(req: AIRequest): Promise<string>                         │
│   }                                                                  │
│                                                                      │
│   AnthropicAdapter          OpenAIAdapter                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Datenbankschema

### `ai_jobs` — Job Queue

```sql
ai_jobs (
  id              UUID PK
  agency_id       UUID NOT NULL → agencies       -- RLS
  created_by      UUID          → profiles
  task_type       TEXT NOT NULL                  -- 'INCOMING_EMAIL_ANALYSIS' | 'EMAIL_LABEL' | ...
  input_payload   JSONB NOT NULL                 -- { email_thread_id, ... }
  result          JSONB                          -- Validated Output nach Completion
  status          TEXT NOT NULL DEFAULT 'pending'
                                                 -- pending | running | done | failed | cancelled
  attempts        INT  NOT NULL DEFAULT 0
  max_attempts    INT  NOT NULL DEFAULT 3
  priority        INT  NOT NULL DEFAULT 2        -- 1=high, 2=normal, 3=low
  scheduled_at    TIMESTAMPTZ   DEFAULT now()
  started_at      TIMESTAMPTZ
  completed_at    TIMESTAMPTZ
  error           TEXT
  created_at      TIMESTAMPTZ   DEFAULT now()
)
```

RLS: Agency kann nur lesen. Service Role schreibt (Claim, Status, Result).

---

### `ai_executions` — Execution Log (unveränderlich)

```sql
ai_executions (
  id               UUID PK
  ai_job_id        UUID NOT NULL → ai_jobs
  agency_id        UUID NOT NULL               -- denormalisiert für RLS + Queries
  task_type        TEXT NOT NULL               -- denormalisiert für Filterung
  provider         TEXT NOT NULL               -- 'anthropic' | 'openai'
  model            TEXT NOT NULL               -- 'claude-haiku-4-5-20251001'
  prompt_version   TEXT NOT NULL               -- 'INCOMING_EMAIL_v1.0'
  input_tokens     INT
  output_tokens    INT
  estimated_cost   NUMERIC(10,6)               -- USD, vor dem Call
  actual_cost      NUMERIC(10,6)               -- USD, aus API-Response
  latency_ms       INT
  status           TEXT NOT NULL               -- 'success' | 'error' | 'invalid_output'
  raw_output       TEXT                        -- roh, vor Validierung (Debugging)
  validated_output JSONB                       -- nach Zod-Validierung
  error_message    TEXT
  attempt_number   INT  NOT NULL DEFAULT 1
  created_at       TIMESTAMPTZ   DEFAULT now()
)
```

---

### `credit_ledger` + `agency_credits` — Credits

```sql
-- Append-only, kein UPDATE, kein DELETE
credit_ledger (
  id          UUID PK
  agency_id   UUID NOT NULL → agencies
  amount      INT  NOT NULL             -- positiv = Gutschrift, negativ = Verbrauch
  type        TEXT NOT NULL             -- 'purchase' | 'reservation' | 'consumption'
                                        -- | 'refund' | 'reservation_release'
  reason      TEXT                      -- 'INCOMING_EMAIL_ANALYSIS job abc123'
  ai_job_id   UUID          → ai_jobs  -- nullable
  created_at  TIMESTAMPTZ   DEFAULT now()
)

-- Denormalisierter Snapshot für schnelle Checks
agency_credits (
  agency_id   UUID PK → agencies
  balance     INT  NOT NULL DEFAULT 0
  reserved    INT  NOT NULL DEFAULT 0   -- aktuell in-flight reservierte Credits
  updated_at  TIMESTAMPTZ DEFAULT now()
)
```

**Wichtig:** Provider Cost (USD) ≠ User Credits. Beides wird getrennt erfasst:
- `ai_executions.actual_cost` = was der Provider berechnet hat (USD)
- `credit_ledger` = was dem User abgezogen wurde (interne Credits)

---

## Folder-Struktur

### Next.js App (`domains/ai/`)

```
domains/ai/
  types.ts            AITaskType, AIJobInput, AIJobStatus — für Enqueue + UI
  output-schemas.ts   Zod-Schemas zum Parsen von ai_jobs.result in der UI
  index.ts
```

### Edge Function (`supabase/functions/execute-ai-job/`)

```
supabase/functions/execute-ai-job/
  index.ts            Main handler (Claim → Execute → Finalize)
  registry.ts         Prompt Registry (task_type → PromptDefinition)
  adapters/
    anthropic.ts
    openai.ts
  tasks/
    incoming-email-analysis/
      context.ts      Context Builder (holt DB-Daten)
      prompt.ts       Prompt-Template + Output-Schema
    email-label/
      context.ts
      prompt.ts
```

---

## Prompt Registry

```typescript
type PromptDefinition<TCtx, TOut> = {
  version:          string        // 'INCOMING_EMAIL_v1.0' — in ai_executions gespeichert
  provider:         'anthropic' | 'openai'
  model:            string
  maxTokens:        number
  estimatedCredits: number        // für Credit-Reservation vor dem Call
  system:           string        // statischer System-Prompt
  buildMessages:    (ctx: TCtx) => { role: 'user'; content: string }[]
  outputSchema:     ZodSchema<TOut>
}

export const PROMPT_REGISTRY = {
  INCOMING_EMAIL_ANALYSIS: incomingEmailAnalysisPrompt,
  EMAIL_LABEL:             emailLabelPrompt,
} satisfies Record<AITaskType, PromptDefinition<unknown, unknown>>
```

**Versionierung:** Version bumpen bei: neuem Output-Schema, anderen Context-Daten, anderem Modell. Nicht bei reinen Formulierungsänderungen ohne semantische Auswirkung.

---

## Context Builder

Jeder Task Type hat einen eigenen Context Builder. Er ist der **einzige Ort**, an dem entschieden wird, welche Daten an externe Provider gesendet werden.

```typescript
// Beispiel: incoming-email-analysis/context.ts
export type EmailAnalysisContext = {
  email: {
    subject:      string
    body:         string   // max 4000 Zeichen
    sender_email: string
    sender_name:  string | null
  }
  agency: {
    known_brands: { company_name: string; industry: string | null }[]  // max 40
    creators:     { full_name: string; niche: string[]; min_budget: number | null }[]  // max 20
  }
}

export async function buildEmailAnalysisContext(
  payload: { email_thread_id: string },
  agencyId: string,
  db: SupabaseClient
): Promise<EmailAnalysisContext>
```

Context Builder ist auch ein Privacy Control Point: Durch `.slice(0, 4000)` und `.limit(40)` steuern wir explizit, was das System verlässt.

---

## AI Job Lifecycle

```
Domain Code
  → INSERT ai_jobs (status='pending')
  → (optional direkter HTTP-Call für high-priority)

Edge Function: execute-ai-job
  1. SELECT FOR UPDATE SKIP LOCKED → status='running'
  2. Credit Check: (balance - reserved) >= estimatedCredits?
       Nein → status='failed', error='insufficient_credits'
  3. Credit Reservation: INSERT credit_ledger (type='reservation')
  4. Context Builder aufrufen
  5. Prompt aus Registry laden + Messages bauen
  6. AI Provider Call
  7. INSERT ai_executions (tokens, cost, latency, raw_output)
  8. Zod-Validierung
       Fehler + retry möglich → status='pending', scheduled_at=now()+30s
       Fehler + max_attempts erreicht → status='failed', Refund
  9. Credit Finalisierung (atomar):
       INSERT credit_ledger (type='consumption', amount=-actual)
       INSERT credit_ledger (type='reservation_release', amount=+estimated)
       UPDATE agency_credits
 10. UPDATE ai_jobs SET status='done', result=validated_output
 11. Domain Callback:
       UPDATE email_threads SET ai_processed=true, extracted=result
       (nur vordefinierte Felder, kein Erzeugen von Domain-Objekten)
```

---

## Credit Lifecycle

```
Job erstellt
  → estimatedCredits aus Prompt Registry
  → available = balance - reserved
  → IF available < estimated → sofort failed (kein API-Call)
  → INSERT credit_ledger (type='reservation', amount=-estimated)
  → UPDATE agency_credits SET reserved += estimated

AI Execution abgeschlossen
  → actual_credits = f(actual_tokens)
  → INSERT credit_ledger (type='consumption', amount=-actual)
  → INSERT credit_ledger (type='reservation_release', amount=+estimated)
  → UPDATE agency_credits SET balance -= actual, reserved -= estimated

Bei Failure
  → INSERT credit_ledger (type='refund', amount=+estimated)
  → UPDATE agency_credits SET reserved -= estimated
```

---

## Beispiel-Workflow: Incoming Email

```
sync-imap Edge Function
  → INSERT email_threads (ai_processed=false)

API Route oder DB Trigger
  → INSERT ai_jobs ({
      task_type: 'INCOMING_EMAIL_ANALYSIS',
      input_payload: { email_thread_id },
      agency_id,
      priority: 1
    })

execute-ai-job Edge Function
  → Context: Email + Brands + Creators
  → Prompt: Analyse + JSON-Anforderung
  → Anthropic: { label, is_request, information_complete, missing_information, suggested_reply }
  → Validierung: EmailAnalysisOutputSchema
  → UPDATE email_threads SET ai_processed=true, extracted={...}

Business Logic (domains/communication)
  liest email_threads.extracted:

  label='REQUEST' + information_complete=true
    → User-Notification: "Vollständige Anfrage eingegangen"
    → User klickt "Anfrage erstellen" → domains/anfragen/service.ts

  label='REQUEST' + information_complete=false
    → Reply-Entwurf aus suggested_reply anzeigen
    → User bearbeitet + sendet manuell

  label='SPAM'
    → email_threads.folder = 'TRASH'
```

---

## Verantwortungsgrenzen

| Was | Wer |
|---|---|
| KI aufrufen | AI Execution Layer (Edge Function) |
| Welche Daten an Provider gehen | Context Builder (pro Task Type) |
| Prompt-Text und Output-Schema | Prompt Registry |
| Credits verwalten | Credit System (credit_ledger + agency_credits) |
| Anfrage erstellen | domains/anfragen/service.ts |
| E-Mail senden | domains/communication/service.ts |
| Notification auslösen | Notification System (noch nicht gebaut) |
| Domain-Objekte erzeugen | Business Logic — niemals der AI Layer direkt |

---

## Was NICHT in den AI Layer gehört

- Domain-Objekte erzeugen (Anfragen, Deals, Drafts)
- E-Mails versenden
- Notifications auslösen
- Entscheiden, ob eine Anfrage vollständig ist (das ist Business Logic)
- Credit-Kauf / Subscription-Verwaltung
- Prompt-Inhalte bestimmen (das ist Product-Entscheidung)

---

## Offene Entscheidungen

1. **Job-Trigger:** DB Trigger bei email_threads INSERT vs. expliziter API-Call — vorerst explizit
2. **High-Priority Execution:** Direkter HTTP-Call aus API Route (für interaktive AI) vs. pg_cron-Polling (für Background AI) — beide Wege sollen unterstützt werden
3. **Prompt in DB:** Erst wenn non-dev Prompts iterieren muss oder A/B-Testing gebraucht wird
4. **Email-Body Datenschutz:** Rechtliche Klärung ob vollständige Bodies an Anthropic gesendet werden dürfen

---

## Supabase-Komponenten

| Komponente | Rolle |
|---|---|
| PostgreSQL | ai_jobs, ai_executions, credit_ledger, agency_credits |
| RLS + current_agency_id() | User Isolation, Service Role bypassed RLS |
| pg_cron | Alle 60s pending ai_jobs enqueuen (low/normal priority) |
| pg_net | HTTP-Call aus pg_cron an execute-ai-job Edge Function |
| Edge Functions (Deno) | execute-ai-job: Claim, Context, Prompt, Provider, Validate, Log, Finalize |
| Supabase Secrets | ANTHROPIC_API_KEY, OPENAI_API_KEY — nur in Deno.env, nie im App-Code |
| Supabase Realtime | Optional: pg_notify nach Job-Completion → React Query invalidation |
| Service Role Key | Nur in Edge Functions — exakt wie platform_connections |
