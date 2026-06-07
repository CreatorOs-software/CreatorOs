import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border-light">
        <div className="flex items-center gap-4">
          <div className="rounded-lg border border-foreground/20 px-4 py-2">
            <span className="text-lg font-semibold text-foreground">Crextio</span>
          </div>
        </div>
        <Link
          href="/inbox"
          className="flex items-center gap-2 bg-card rounded-full px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          ← Back to Inbox
        </Link>
      </header>
      <main className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
