# TalentOS – Architektur & Konventionen

## Domain-Schicht (`domains/`)

Jede fachliche Domäne bekommt ein eigenes Verzeichnis mit exakt dieser Struktur:

```
domains/<name>/
  types.ts       – TypeScript-Typen, keine Logik
  repository.ts  – alle Supabase-Queries, keine Business-Logik
  service.ts     – Business-Logik, orchestriert Repository-Calls
  index.ts       – öffentliche Re-Exports (Service + Typen)
```

**Regeln:**
- Repository-Funktionen werfen bei Supabase-Fehlern, geben niemals `null | undefined` ohne expliziten Rückgabetyp zurück.
- Service-Funktionen holen Auth-Kontext selbst (`getAuthContext`) — API-Routes übergeben ihn nicht.
- API-Routes enthalten ausschließlich Input-Validierung (Zod) und Delegation an den Service. Keine Queries, keine Business-Logik.
- Neue Domänen (z. B. `deals`, `anfragen`) werden nach demselben Muster angelegt, sobald ihre API-Route mehr als eine Supabase-Query enthält.

---

## Komponenten-Struktur (`components/`)

### Wann eine Komponente ausgelagert wird

| Signal | Maßnahme |
|---|---|
| Datei > 300 Zeilen | Kandidat zum Aufteilen prüfen |
| Dialog/Sheet als lokale Funktion definiert | Eigene Datei `<name>-dialog.tsx` |
| Mehr als ein Dialog in einer Datei | Jeder Dialog bekommt eine eigene Datei |
| Wiederverwendbar über mehrere Seiten | Nach `components/ui/` oder in das nächste gemeinsame Verzeichnis |
| Lokale Hilfsfunktion > 20 Zeilen, die UI rendert | Eigene Komponenten-Datei |

### Dateibenennungs-Konvention

```
<feature>-panel.tsx      – Listenansicht + lokaler State (keine Dialogs)
<feature>-dialog.tsx     – ein einzelner Dialog
neue-<feature>-dialog.tsx – Erstellungs-Dialog
<feature>-columns.tsx    – Tabellen-Spaltendefinitionen
<feature>-tab.tsx        – Tab-Inhalt (orchestriert Panels)
```

### Verzeichnis-Struktur bei mehreren zusammengehörenden Dateien

Ab 3+ Dateien zu einem Feature → eigenes Unterverzeichnis:

```
components/creators/dashboard/
  anfragen/
    anfragen-panel.tsx
    anfrage-dialog.tsx
    neue-anfrage-dialog.tsx
    anfragen-columns.tsx
  deals/
    deals-panel.tsx
    deal-dialog.tsx
    deals-columns.tsx
```

---

## State-Management

- Optimistische Updates immer mit Rollback: vorherigen Cache-State sichern, bei Fehler wiederherstellen.
- Kein fire-and-forget für mutierende Fetches — immer `res.ok` prüfen.
- Server-State via React Query (`useQuery` / `queryClient`), kein globaler Client-State für Server-Daten.

---

## Allgemeine Regeln

- Keine Kommentare außer wenn das *Warum* nicht aus dem Code ersichtlich ist.
- Keine `any`-Casts außer bei Supabase-Join-Ergebnissen (dort `as unknown as T`).
- DB-Writes nach einem bereits erfolgreichen Netzwerk-Call (z. B. SMTP-Send) immer best-effort wrappen (`try/catch` ohne rethrow), um Retry-Duplikate zu verhindern.
- `folder`-Werte in der DB immer uppercase (`"SENT"`, `"INBOX"`, `"TRASH"`).
