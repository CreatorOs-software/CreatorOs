"use client";

import { useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { register } from "@/domains/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function JoinPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!token) {
    return (
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Ungültiger Link</h1>
        <p className="text-sm text-muted-foreground">Dieser Einladungslink ist nicht gültig.</p>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;

    startTransition(async () => {
      const result = await register({
        fullName: form.fullName.value,
        email: form.email.value,
        password: form.password.value,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      // After signup, accept the invitation
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Einladung konnte nicht angenommen werden.");
        return;
      }
      router.push("/dashboard");
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Einladung annehmen</h1>
        <p className="text-sm text-muted-foreground">
          Erstelle deinen Account und tritt der Agentur bei.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Name</Label>
          <Input id="fullName" name="fullName" type="text" placeholder="Max Mustermann" required disabled={isPending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-Mail</Label>
          <Input id="email" name="email" type="email" placeholder="name@example.com" required disabled={isPending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Passwort</Label>
          <Input id="password" name="password" type="password" placeholder="••••••••" minLength={6} required disabled={isPending} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Wird erstellt…" : "Account erstellen & beitreten"}
        </Button>
      </form>
    </div>
  );
}
