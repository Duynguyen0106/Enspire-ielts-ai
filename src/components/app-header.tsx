import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

type AppHeaderProps = {
  title: string;
  currentLevel: number;
};

export function AppHeader({ title, currentLevel }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <div className="flex flex-1 items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
          {title}
        </h1>
        <Badge variant="secondary" className="rounded-md">
          Level {currentLevel}
        </Badge>
      </div>
    </header>
  );
}
