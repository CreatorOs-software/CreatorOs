import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/layout/app-layout";
import { Prefetch } from "@/components/context/prefetch";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const displayUser = {
    id: user.id,
    name: (user.user_metadata?.full_name as string | undefined) ?? user.email,
    email: user.email,
  };

  return (
    <AppLayout fullHeight user={displayUser}>
      <Prefetch />
      {children}
    </AppLayout>
  );
}
