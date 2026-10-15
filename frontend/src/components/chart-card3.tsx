import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { cn } from "cn";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export type ChartCard3Datum = {
  label: string;
  value: number;
  fill: string;
};

interface ChartCard3Props {
  title: string;
  description: string;
  valueLabel: string;
  data: ChartCard3Datum[];
  footer: string[];
  className?: string;
}

const ChartCard3 = ({ title, description, valueLabel, data, footer, className }: ChartCard3Props) => {
  const chartConfig = {
    value: {
      label: valueLabel,
    },
  } satisfies ChartConfig;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" dataKey="value" axisLine={false} tickLine={false} fontSize={12} />
            <YAxis
              type="category"
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              width={150}
              fontSize={12}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-1 text-sm text-muted-foreground">
        {footer.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </CardFooter>
    </Card>
  );
};

export { ChartCard3 };
