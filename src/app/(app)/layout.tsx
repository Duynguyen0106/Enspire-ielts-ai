import { requireUser } from "@/lib/auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          name: user.profile?.displayName ?? user.name,
          email: user.email,
          image: user.image,
        }}
      />
      <SidebarInset className="min-h-svh bg-[linear-gradient(180deg,#f7fbf9_0%,#ffffff_28%)]">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
