import { cn } from "cn";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCard1Props {
  title: string;
  value: string;
  unit: string;
  description: string | null;
  className?: string;
}

const StatsCard1 = ({ title, value, unit, description, className }: StatsCard1Props) => {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tabular-nums">{value}</span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
};

export { StatsCard1 };
