import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "./PageHeader";

interface ModuleScaffoldProps {
  title: string;
  description: string;
  phaseLabel: string;
  plannedCapabilities: string[];
}

export function ModuleScaffold({
  title,
  description,
  phaseLabel,
  plannedCapabilities,
}: ModuleScaffoldProps) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              Modul telah terhubung dengan sistem autentikasi &amp; tata letak admin.
            </CardDescription>
          </div>
          <Badge variant="secondary">{phaseLabel}</Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Cakupan fungsi yang akan diaktifkan pada tahap modul ini:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-foreground">
            {plannedCapabilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
