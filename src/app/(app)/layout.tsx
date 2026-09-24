import { requireUser } from "@/lib/auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export const dynamic = "force-dynamic";

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
      <SidebarInset className="app-shell-bg min-h-svh bg-background/80">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
