"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@talentos/ui";
import { toast } from "sonner";
import type { AvatarConfig } from "@/lib/avatar";
import { Avatar } from "@/components/ui/avatar-creator";
import { AvatarEditorDialog } from "@/components/ui/avatar-editor-dialog";

interface ProfileAvatarSettingsProps {
  userId: string;
  name: string;
  email: string | null;
  initialConfig: AvatarConfig | null;
}

export function ProfileAvatarSettings({ userId, name, email, initialConfig }: ProfileAvatarSettingsProps) {
  const router = useRouter();
  const [config, setConfig] = useState(initialConfig);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");

  async function save(next: AvatarConfig) {
    setSaving(true);
    try {
      const response = await fetch("/api/profile/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_config: next }),
      });
      if (!response.ok) throw new Error("Avatar konnte nicht gespeichert werden");
      setConfig(next);
      toast.success("Avatar gespeichert");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Avatar konnte nicht gespeichert werden");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl bg-card p-5">
      <div className="flex items-center gap-4">
        <Avatar avatarConfig={config} name={name} initials={initials} size="2xl" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Persönlicher Avatar</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{name}{email ? ` · ${email}` : ""}</p>
          <p className="mt-2 text-xs text-muted-foreground">Dieser Avatar ist für dich und andere Teammitglieder sichtbar.</p>
        </div>
        <Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(true)}>
          <Pencil className="size-4" /> {config ? "Avatar bearbeiten" : "Avatar erstellen"}
        </Button>
      </div>
      <AvatarEditorDialog open={open} onOpenChange={setOpen} value={config} seed={userId} name={name} onSave={save} />
    </section>
  );
}
