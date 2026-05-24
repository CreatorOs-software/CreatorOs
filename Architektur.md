# Next.js Architektur Guide (App Router)

## Ziel

Eine skalierbare, saubere und moderne Architektur für Next.js-Projekte mit:

- App Router (`app/`)
- geschützten Routen
- Feature-basierter Struktur
- sauberer Trennung von UI, Business Logic und Infrastruktur

---

# Empfohlene Ordnerstruktur

```txt
src/
│
├── app/                    # Routing (App Router)
│   ├── layout.tsx
│   ├── page.tsx
│   │
│   ├── (auth)/             # Auth-Routen
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   │
│   ├── (dashboard)/        # Geschützte Bereiche
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   └── api/                # Route Handlers
│       └── auth/
│           └── route.ts
│
├── components/             # Wiederverwendbare UI
│   ├── ui/
│   ├── forms/
│   └── layout/
│
├── features/               # Feature-basierte Business Logic
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── actions.ts
│   │   └── types.ts
│   │
│   └── user/
│
├── lib/                    # Utilities / Config
│   ├── auth.ts
│   ├── db.ts
│   ├── utils.ts
│   └── api.ts
│
├── hooks/
├── services/
├── types/
├── constants/
│
└── middleware.ts
```

# Architektur-Prinzipien

## `app/`

Enthält ausschließlich Routing.

Hier liegen:

- Pages
- Layouts
- Route Groups
- Route Handlers (`api`)

**Keine komplexe Business Logic hier.**

---

## `components/`

Wiederverwendbare UI-Komponenten.

### Beispiele

```txt
components/
├── ui/
│   ├── button.tsx
│   ├── modal.tsx
│   └── input.tsx
│
├── forms/
│   └── login-form.tsx
│
└── layout/
    └── navbar.tsx
```

### Regel

Wenn eine Komponente mehrfach verwendet wird → `components/`

---

## `features/`

Feature-basierte Struktur für Business Logic.

### Beispiel

```txt
features/
└── auth/
    ├── components/
    │   └── login-form.tsx
    │
    ├── hooks/
    │   └── use-auth.ts
    │
    ├── actions.ts
    ├── api.ts
    └── types.ts
```

### Regel

Alles, was zu einem konkreten Feature gehört, bleibt zusammen.

Zum Beispiel:

- Auth
- User
- Payments
- Dashboard
- Analytics

---

## `lib/`

Globale Infrastruktur.

### Beispiele

```txt
lib/
├── auth.ts
├── db.ts
├── redis.ts
├── stripe.ts
└── utils.ts
```

### Regel

Globale Utilities oder Configs → `lib/`

---

# Route Protection

Moderne Next.js Apps schützen Routen **serverseitig**.

**Nicht clientseitig.**

---

## Middleware (erste Sicherheitsstufe)

`middleware.ts`

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token");

  const protectedRoutes = ["/dashboard", "/settings"];

  const isProtected = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*"],
};
```

### Was passiert hier?

1. User öffnet `/dashboard`
2. Middleware prüft Cookie
3. Kein Token vorhanden
4. Redirect zu `/login`

---

## Layout-basierte Protection (empfohlen)

Mit dem App Router können komplette Bereiche geschützt werden.

### Ordnerstruktur

```txt
app/
└── (dashboard)/
    ├── layout.tsx
    ├── dashboard/
    ├── settings/
    └── profile/
```

### Protected Layout

```tsx
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return <>{children}</>;
}
```

### Vorteil

Alle Unterseiten werden automatisch geschützt:

```txt
/dashboard
/settings
/profile
```

---

## Niemals nur clientseitig schützen

### Schlecht

```tsx
"use client";

useEffect(() => {
  if (!user) {
    router.push("/login");
  }
}, []);
```

### Problem

- Sensitive Daten können kurz sichtbar sein
- Flickering
- Unsicher
- Schlechte UX

**Immer serverseitig redirecten.**
