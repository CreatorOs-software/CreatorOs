"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { Button, Input, Textarea } from "@talentos/ui";
import { useAuth } from "@/components/auth/use-auth";

export default function HelpPage() {
  const { user } = useAuth();

  const [name, setName] = useState(
    (user?.user_metadata?.full_name as string | undefined) ?? "",
  );
  const [email, setEmail] = useState(user?.email ?? "");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: Formular ist noch nicht an einen Versandweg angebunden.
    setSubmitted(true);
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-xl">
      <div>
        <h1 className="text-lg font-semibold">Kontakt</h1>
        <p className="text-sm text-muted-foreground">
          Fragen, Feedback oder ein Problem gefunden? Schreib uns kurz, was
          los ist.
        </p>
      </div>

      {submitted ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
          <Mail className="size-4 shrink-0 text-primary" />
          Danke für deine Nachricht! Wir melden uns so schnell wie möglich.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="help-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="help-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="help-email" className="text-sm font-medium">
              E-Mail
            </label>
            <Input
              id="help-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="help-message" className="text-sm font-medium">
              Nachricht
            </label>
            <Textarea
              id="help-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              required
            />
          </div>

          <Button type="submit" className="self-start">
            Nachricht senden
          </Button>
        </form>
      )}
    </div>
  );
}
