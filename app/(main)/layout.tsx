import { AppLayout } from "@/components/layout/app-layout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppLayout fullHeight>{children}</AppLayout>
    </>
  );
}
