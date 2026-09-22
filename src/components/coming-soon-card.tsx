import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ComingSoonCard({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          {description ?? "Coming soon"}
        </p>
      </CardContent>
    </Card>
  );
}
