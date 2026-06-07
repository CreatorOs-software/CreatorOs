# CreatorOS — Architektur-Dokument

> **Domain-Driven Modular Monolith — v1**
> Eine Codebase. Ein Backend. Eine Datenbank. Intern sauber in fachliche Domains strukturiert.

---

# 1. Architektur-Prinzip

CreatorOS wird als **Domain-Driven Modular Monolith** gebaut. Das bedeutet: eine Codebase, ein Backend, eine Hauptdatenbank — aber intern sauber in fachliche Domains strukturiert.

Wir starten bewusst nicht mit Microservices, um Geschwindigkeit, Einfachheit und geringe Infrastruktur-Komplexität zu maximieren. Die Architektur erlaubt es, einzelne Bereiche später bei Bedarf auszulagern, ohne dabei die gesamte Anwendung neu strukturieren zu müssen.

## Kernprinzipien

- Eine Anwendung — kein verteiltes System
- Fachliche Struktur durch Domain-Driven Design (DDD)
- Klare Domain-Grenzen mit expliziten Kommunikationsregeln
- Event-driven Workflows — auch im Monolith
- Spätere Auslagerung einzelner Domains möglich (AI, Email Processing)

---

# 2. Domain-Struktur

Die Anwendung ist in **6 Kern-Domains** und **2 Shared-Infrastructure-Module** aufgeteilt. Jede Kern-Domain besitzt eigene Business-Logik, eigene Datenverantwortung und klar definierte Schnittstellen nach außen.

> 💡 **Designentscheidung**
> Notification und Analytics wurden bewusst als **Shared Infrastructure** definiert, nicht als vollwertige Domains. In v1 haben sie keine eigene Business-Logik — sie sind Cross-Cutting Concerns. Das verhindert, dass zu früh Grenzen zementiert werden, die sich später als falsch herausstellen.

## Domain-Übersicht

| Domain                 | Verantwortung                                                |
| ---------------------- | ------------------------------------------------------------ |
| **Creator**            | Profile, Stats, Portfolio, Onboarding, Creator-Lifecycle     |
| **Brand**              | CRM, Kontakte, Brand-Profile, Vertragspartner                |
| **Campaign**           | Lifecycle, Briefings, Creator-Assignments, Deadlines, Status |
| **Communication**      | Email-Threads, Attachments, Gesprächsverlauf                 |
| **Task**               | Kanban, Assignments, Overdue-Checks, Prioritäten             |
| **AI**                 | Prompt Registry, Context Builder, LLM-Integration            |
| `shared/notifications` | Technische Benachrichtigungen (kein eigenes Bounded Context) |
| `shared/analytics`     | Queries auf vorhandene Domänen-Daten (v1: read-only)         |

## Ordnerstruktur

```
CreatorOS/
├── domains/
│   ├── creators/
│   │   ├── index.ts          ← public API (nur das wird exportiert)
│   │   ├── service.ts
│   │   ├── repository.ts     ← DB-Zugriff nur hier
│   │   └── types.ts
│   ├── brands/
│   ├── campaigns/
│   ├── communication/
│   ├── tasks/
│   └── ai/
├── shared/
│   ├── notifications/        ← Infrastruktur, keine Business-Logik
│   └── analytics/
├── lib/
│   ├── event-bus.ts          ← Outbox-basierter Event Bus
│   └── db.ts
└── app/                      ← Next.js App Router
```

---

# 3. Domain-Grenzen & Kommunikationsregeln

Domain-Grenzen sind nur dann wertvoll, wenn sie im Code tatsächlich durchgesetzt werden. CreatorOS folgt zwei expliziten Regeln, die über Code Reviews und automatisierte Linting-Rules erzwungen werden.

## Regel 1 — Kein direkter DB-Zugriff über Domain-Grenzen

Jede Domain kapselt ihre Daten hinter einem Service. Andere Domains greifen nie direkt auf fremde Tabellen zu.

```tsx
// ❌ Verboten — direkte DB-Abfrage aus fremder Domain
import { db } from "@/lib/db";
const creator = await db.query("SELECT * FROM creators WHERE id = $1", [id]);

// ✅ Erlaubt — nur über den Domain-Service
import { CreatorService } from "@/domains/creators";
const creator = await CreatorService.findById(id);
```

## Regel 2 — Domains kommunizieren über Events

Domains rufen sich nie direkt auf. Stattdessen schreibt die auslösende Domain ein Event in den Outbox — andere Domains reagieren darauf, vollständig entkoppelt.

```tsx
// ❌ Verboten — direkte Domain-zu-Domain Calls
import { NotificationService } from '@/domains/notifications'
await NotificationService.send(...)

// ✅ Erlaubt — Event schreiben, andere Domains reagieren selbst
await EventBus.publish('campaign.created', { campaignId, creatorId })
// Notification-Handler reagiert → Task-Handler reagiert → etc.
```

## Technische Durchsetzung

ESLint erzwingt die Grenzen automatisch im CI:

```jsx
// .eslintrc.js
rules: {
  'no-restricted-imports': ['error', {
    patterns: [
      {
        group: ['*/domains/*/repository'],
        message: 'Nur über index.ts importieren'
      }
    ]
  }]
}
```

---

# 4. Event-Driven Workflows — Outbox Pattern

CreatorOS arbeitet event-driven, obwohl es ein Monolith ist. Das Event-System basiert auf dem **Outbox Pattern**: Events werden in derselben Datenbank-Transaktion wie die Geschäftsdaten persistiert — damit geht kein Event verloren, auch wenn die Anwendung zwischendurch neu startet.

> ⚠️ **Warum nicht Supabase Triggers direkt?**
> Triggers + Edge Functions sind nicht für zuverlässige, mehrstufige Workflows gebaut. Fehlerbehandlung, Retry-Logik und Observability fehlen. Das Outbox Pattern löst alle diese Probleme mit einem einfachen DB-Table — kein zusätzlicher Service nötig.

## 4.1 Outbox-Tabelle

```sql
create table domain_events (
  id            uuid primary key default gen_random_uuid(),
  event_type    text not null,           -- 'email.received', 'campaign.created'
  payload       jsonb not null,
  status        text default 'pending',  -- pending | processing | done | failed
  attempts      int default 0,
  max_attempts  int default 3,
  created_at    timestamptz default now(),
  process_after timestamptz default now(), -- für Retry-Delay
  processed_at  timestamptz
);

create index on domain_events (status, process_after)
  where status in ('pending', 'failed');
```

## 4.2 Event-Flow: Email received

**Schritt 1 — Email empfangen + Event schreiben (eine Transaktion)**

```tsx
// Next.js API Route — alles in einer Supabase Transaction
await supabase.rpc("receive_email", {
  email_data: { from, subject, body, attachments },
  event_type: "email.received",
});
// → Email wird gespeichert UND Event in domain_events geschrieben
// → Atomisch: kein Event geht verloren
```

**Schritt 2 — Cron verarbeitet pending Events (alle 30 Sekunden)**

```tsx
// Supabase Cron Job — alle 30s
const { data: events } = await supabase
  .from("domain_events")
  .select()
  .eq("status", "pending")
  .lte("process_after", new Date().toISOString())
  .order("created_at")
  .limit(10);

for (const event of events) {
  await processEvent(event); // ruft den richtigen Handler auf
}
```

**Schritt 3 — Retry-Logik bei Fehlern**

```tsx
async function processEvent(event) {
  try {
    await handlersevent.event_type;
    await markDone(event.id);
  } catch (err) {
    const attempts = event.attempts + 1;
    if (attempts >= event.max_attempts) {
      await markFailed(event.id); // → Alert im Dashboard
    } else {
      const delay = Math.pow(2, attempts) * 60 * 1000; // exponential backoff
      await scheduleRetry(event.id, attempts, delay);
    }
  }
}
```

## 4.3 Geplante Event-Flows

| Auslöser             | Folge-Events                                                                    |
| -------------------- | ------------------------------------------------------------------------------- |
| `email.received`     | `ai.summary_requested` → `task.extracted` → `crm.updated` → `notification.sent` |
| `campaign.created`   | `creator.assigned` → `deadlines.set` → `notification.sent`                      |
| `task.overdue`       | `notification.sent` → `campaign.status_updated`                                 |
| `campaign.completed` | `analytics.recorded` → `creator.stats_updated`                                  |

---

# 5. Tech Stack

## 5.1 Next.js — Frontend + Backend

Next.js übernimmt in v1 sowohl Frontend als auch Backend.

| Verantwortung        | Details                                    |
| -------------------- | ------------------------------------------ |
| **Frontend UI**      | Dashboard, CRM-Oberfläche, Creator-Profile |
| **API Layer**        | Route Handlers für alle Domain-Operationen |
| **Business Logic**   | Service-Layer der Domains                  |
| **Webhooks**         | Email-Empfang, externe Integrationen       |
| **Event Processing** | Cron-basierter Outbox-Processor            |

## 5.2 Supabase — Database + Auth + Infrastructure

| Service            | Nutzung                                                  |
| ------------------ | -------------------------------------------------------- |
| **PostgreSQL**     | Alle Domain-Daten + Outbox Table + `domain_events`       |
| **Authentication** | Login, Sessions, OAuth, Team Access                      |
| **Storage**        | Verträge, Briefings, Assets, Email-Attachments           |
| **Realtime**       | Live-Updates: Notifications, AI Status, Task-Updates     |
| **Cron Jobs**      | Outbox-Processor (30s), Daily Summaries, Reminder Checks |
| **Edge Functions** | Email Processing, AI Summaries (Ergänzung zum Cron)      |

---

# 6. AI Architecture

AI wird als eigene, isolierte Domain gebaut. Kein direkter Zugriff vom Frontend auf LLM APIs — alle AI-Anfragen laufen über den Next.js API Layer und die AI Domain.

```
Frontend
   ↓
Next.js API (Auth check)
   ↓
AI Domain
   ├── Context Builder   ← strukturierter Input statt rohe Daten
   └── Prompt Registry   ← versionierte Prompts
         ↓
LLM Provider (OpenAI primär)
```

## 6.1 Prompt Registry

Alle Prompts sind versioniert und zentral gespeichert. Das erlaubt A/B-Testing und einfache Verbesserungen ohne Code-Änderungen.

```tsx
const prompts = {
  'email_summary_v1': {
    system: 'Du bist ein Assistent für Creator-Management...',
    template: 'Fasse diese Email zusammen: {{email_content}}',
    model: 'gpt-4o-mini',
    version: 1
  },
  'task_extraction_v1': { ... },
  'brand_analysis_v1': { ... }
}
```

## 6.2 Context Builder

Die AI bekommt strukturierten, relevanten Kontext statt roher Datenbankdaten.

```tsx
async function buildEmailContext(emailId: string) {
  const email = await EmailService.findById(emailId);
  const creator = await CreatorService.findByEmail(email.from);
  const recentCampaigns = await CampaignService.findActive(creator.id);

  return {
    email: { subject: email.subject, body: email.body },
    creator: { name: creator.name, tags: creator.tags },
    context: { activeCampaigns: recentCampaigns.length },
  };
}
```

## 6.3 Multi-Model Strategy (v2)

| Use Case                   | Modell                                |
| -------------------------- | ------------------------------------- |
| Email Summaries (v1)       | OpenAI GPT-4o-mini (schnell, günstig) |
| Task Extraction (v1)       | OpenAI GPT-4o-mini                    |
| Complex Reasoning (v2)     | OpenAI GPT-4o oder Anthropic Claude   |
| Structured Extraction (v2) | Spezialisiertes Fine-Tuned Model      |

---

# 7. Deployment

| Komponente                       | Service                                   |
| -------------------------------- | ----------------------------------------- |
| **Frontend + Backend** (Next.js) | Vercel — automatisches Deployment aus Git |
| **Database + Auth + Storage**    | Supabase — managed PostgreSQL             |
| **AI Provider (primär)**         | OpenAI API                                |
| **AI Provider (v2, optional)**   | Anthropic API                             |

> ✅ **Skalierungspfad**
> Bei starkem Wachstum können einzelne Domains (AI, Email Processing) in separate Services ausgelagert werden, ohne die Gesamtarchitektur zu ändern. Die Event-Grenzen sind bereits sauber gezogen. Trigger.dev ist als Job-Queue für v2 evaluiert, wenn der Cron-basierte Ansatz an Grenzen stößt.

---

# 8. Architektur-Entscheidungen (ADR)

| Entscheidung                           | Begründung                                                        |
| -------------------------------------- | ----------------------------------------------------------------- |
| Modular Monolith statt Microservices   | Schnelligkeit, Einfachheit, kein Infra-Overhead in v1             |
| Outbox Pattern statt Supabase Triggers | Fehlertoleranz, Retry-Logik, Observability ohne Extra-Service     |
| 6 Domains statt 8                      | Notification + Analytics sind Infrastruktur, keine echten Domains |
| ESLint für Domain-Grenzen              | Automatische Durchsetzung, kein manueller Code-Review nötig       |
| Prompt Registry von Anfang an          | Schwer nachzurüsten; Versionierung verhindert Prompt-Chaos        |
| Supabase Cron als Event-Processor      | Einfach, keine externe Abhängigkeit, in v1 ausreichend            |
