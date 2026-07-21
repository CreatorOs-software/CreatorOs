"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Trash2, Copy, Check, Crown, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { PERMISSION_GROUPS, EMPTY_PERMISSIONS } from "@/domains/auth/permissions";
import type { AgencyMember, AgencyInvitation } from "@/domains/members";
import type { PermissionMap, Role } from "@/domains/auth/types";

// ─── Invite Form ─────────────────────────────────────────────────────────────

function InviteForm({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState<PermissionMap>({ ...EMPTY_PERMISSIONS });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: "member" as Role, permissions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data.invitation;
    },
    onSuccess: (invitation) => {
      onSuccess(invitation.token);
      setEmail("");
      setPermissions({ ...EMPTY_PERMISSIONS });
    },
  });

  function togglePermission(key: keyof PermissionMap) {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleGroup(readKey: keyof PermissionMap, editKey: keyof PermissionMap) {
    const allOn = permissions[readKey] && permissions[editKey];
    setPermissions((prev) => ({ ...prev, [readKey]: !allOn, [editKey]: !allOn }));
  }

  return (
    <div className="bg-card rounded-2xl p-5 space-y-4">
      <h2 className="text-sm font-semibold">Mitglied einladen</h2>

      <div className="space-y-1.5">
        <Label htmlFor="invite-email">E-Mail</Label>
        <Input
          id="invite-email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Berechtigungen</p>
        <div className="divide-y divide-border-light">
          {PERMISSION_GROUPS.map(({ label, permissions: [readKey, editKey] }) => (
            <div key={label} className="py-2.5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleGroup(readKey, editKey)}
                className={cn(
                  "text-xs font-medium w-24 text-left",
                  permissions[readKey] || permissions[editKey]
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {label}
              </button>
              <div className="flex items-center gap-4 ml-auto">
                {(
                  [
                    [readKey, "Lesen"],
                    [editKey, "Bearbeiten"],
                  ] as [keyof PermissionMap, string][]
                ).map(([key, caption]) => (
                  <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={permissions[key]}
                      onCheckedChange={() => togglePermission(key)}
                    />
                    <span className="text-xs text-muted-foreground">{caption}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {mutation.error && (
        <p className="text-xs text-destructive">{(mutation.error as Error).message}</p>
      )}

      <Button
        onClick={() => mutation.mutate()}
        disabled={!email || mutation.isPending}
        className="w-full"
      >
        <UserPlus className="w-4 h-4" />
        {mutation.isPending ? "Wird erstellt…" : "Einladungslink erstellen"}
      </Button>
    </div>
  );
}

// ─── Invite Link Banner ───────────────────────────────────────────────────────

function InviteLinkBanner({ token, onDismiss }: { token: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/join?token=${token}`;

  function copy() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium mb-0.5">Einladungslink erstellt</p>
        <p className="text-xs text-muted-foreground truncate">{link}</p>
      </div>
      <Button size="sm" variant="outline" onClick={copy}>
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? "Kopiert" : "Kopieren"}
      </Button>
      <button onClick={onDismiss} className="text-xs text-muted-foreground hover:text-foreground">
        ✕
      </button>
    </div>
  );
}

// ─── Members List ─────────────────────────────────────────────────────────────

function MemberRow({ member }: { member: AgencyMember }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span
        className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ background: member.color || "#6b7280" }}
      >
        {member.initials}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{member.display_name ?? "—"}</p>
        <p className="text-xs text-muted-foreground">
          {member.role === "admin" ? "Admin" : "Mitglied"}
        </p>
      </div>
      {member.role === "admin" ? (
        <Crown className="w-4 h-4 text-yellow-500 shrink-0" />
      ) : (
        <User className="w-4 h-4 text-muted-foreground shrink-0" />
      )}
    </div>
  );
}

// ─── Pending Invitations ──────────────────────────────────────────────────────

function InvitationRow({
  invitation,
  onDelete,
}: {
  invitation: AgencyInvitation;
  onDelete: (id: string) => void;
}) {
  const expired = new Date(invitation.expires_at) < new Date();
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
        <UserPlus className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{invitation.email}</p>
        <p className={cn("text-xs", expired ? "text-destructive" : "text-muted-foreground")}>
          {expired ? "Abgelaufen" : `Läuft ab ${new Date(invitation.expires_at).toLocaleDateString("de")}`}
        </p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(invitation.id)}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminMembersPage() {
  const queryClient = useQueryClient();
  const [newToken, setNewToken] = useState<string | null>(null);

  const { data: membersData } = useQuery<{ members: AgencyMember[] }>({
    queryKey: ["admin", "members"],
    queryFn: () => fetch("/api/admin/members").then((r) => r.json()),
  });

  const { data: invitationsData } = useQuery<{ invitations: AgencyInvitation[] }>({
    queryKey: ["admin", "invitations"],
    queryFn: () => fetch("/api/admin/invitations").then((r) => r.json()),
  });

  const deleteInvitation = useMutation({
    mutationFn: (id: string) =>
      fetch("/api/admin/invitations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "invitations"] }),
  });

  const members = membersData?.members ?? [];
  const invitations = invitationsData?.invitations ?? [];

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-base font-semibold">Members</h1>
        <p className="text-xs text-muted-foreground">
          {members.length} Mitglied{members.length !== 1 ? "er" : ""} in dieser Agentur
        </p>
      </div>

      {newToken && (
        <InviteLinkBanner token={newToken} onDismiss={() => setNewToken(null)} />
      )}

      <InviteForm
        onSuccess={(token) => {
          setNewToken(token);
          queryClient.invalidateQueries({ queryKey: ["admin", "invitations"] });
        }}
      />

      <div className="bg-card rounded-2xl px-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-4 pb-2">
          Aktive Mitglieder
        </p>
        <div className="divide-y divide-border-light">
          {members.map((m) => (
            <MemberRow key={m.id} member={m} />
          ))}
        </div>
      </div>

      {invitations.length > 0 && (
        <div className="bg-card rounded-2xl px-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-4 pb-2">
            Ausstehende Einladungen
          </p>
          <div className="divide-y divide-border-light">
            {invitations.map((inv) => (
              <InvitationRow
                key={inv.id}
                invitation={inv}
                onDelete={(id) => deleteInvitation.mutate(id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
