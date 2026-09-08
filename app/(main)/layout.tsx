import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext, AuthError, NoAgencyError } from "@/domains/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Prefetch } from "@/components/context/prefetch";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // getAuthContext validiert den User bereits (auth.getUser) und lädt das
  // Profil — kein separater getUser()-Aufruf davor.
  let auth;
  try {
    auth = await getAuthContext(supabase);
  } catch (e) {
    if (e instanceof AuthError || e instanceof NoAgencyError) redirect("/login");
    throw e;
  }

  const displayUser = {
    id: auth.userId,
    name: auth.fullName ?? auth.email ?? undefined,
    email: auth.email ?? undefined,
  };

  return (
    <AppLayout
      fullHeight
      user={displayUser}
      role={auth.role}
      permissions={auth.permissions}
    >
      <Prefetch />
      {children}
    </AppLayout>
  );
}
