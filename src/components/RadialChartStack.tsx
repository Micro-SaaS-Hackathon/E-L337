"use client";

import { TrendingUp } from "lucide-react";
import { LabelList, PolarGrid, RadialBar, RadialBarChart } from "recharts";


import { CardFooter } from "@/components/ui/Card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/Chart";

export const description = "A radial chart with a label";

// Accepts team.tech_stack directly and maps to chart segments
export function ChartRadialLabel({ tech_stack }: { tech_stack: any }) {
  // Flatten tech_stack into an array of { label, color } for chart segments
  const stackSegments: { label: string; color: string }[] = [];
  if (tech_stack?.frontend?.framework) {
    stackSegments.push({
      label: tech_stack.frontend.framework,
      color: "bg-blue-500",
    });
  }
  if (
    tech_stack?.frontend?.styling &&
    Array.isArray(tech_stack.frontend.styling)
  ) {
    tech_stack.frontend.styling.forEach((style: string) => {
      stackSegments.push({ label: style, color: "bg-cyan-500" });
    });
  }
  if (tech_stack?.backend?.language) {
    stackSegments.push({
      label: tech_stack.backend.language,
      color: "bg-green-500",
    });
  }
  if (tech_stack?.backend?.framework) {
    stackSegments.push({
      label: tech_stack.backend.framework,
      color: "bg-teal-500",
    });
  }
  if (tech_stack?.backend?.database) {
    stackSegments.push({
      label: tech_stack.backend.database,
      color: "bg-purple-500",
    });
  }
  if (tech_stack?.cloud?.provider) {
    stackSegments.push({
      label: tech_stack.cloud.provider,
      color: "bg-orange-500",
    });
  }
  if (tech_stack?.cloud?.hosting) {
    stackSegments.push({
      label: tech_stack.cloud.hosting,
      color: "bg-yellow-500",
    });
  }

  // Generate chart data dynamically from stackSegments
  const chartData = stackSegments.map((segment, idx) => ({
    browser: segment.label,
    assignedTasks: stackSegments.length - idx,
    fill: `var(--chart-${idx + 1})`,
  }));

  // Generate chart config dynamically from stackSegments
  const chartConfig = stackSegments.reduce(
    (acc: ChartConfig, segment, idx) => {
      acc[segment.label] = {
        label: segment.label,
        color: `var(--chart-${idx + 1})`,
      };
      return acc;
    },
    {
      assignedTasks: { label: "Assigned Tasks" },
    }
  );

  return (
    <div className="pb-0">
      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square max-h-[250px]"
      >
        <RadialBarChart data={chartData} innerRadius={30} outerRadius={100}>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel nameKey="browser" />}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel nameKey="browser" />}
          />
          <PolarGrid gridType="circle" />
          <RadialBar dataKey="assignedTasks">
            <LabelList
              position="insideStart"
              dataKey="browser"
              className="fill-white capitalize mix-blend-luminosity"
              fontSize={11}
            />
          </RadialBar>
        </RadialBarChart>
      </ChartContainer>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none text-accent-foreground font-medium">
          Your tech stack consists of {stackSegments.length} pieces
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Showing assigned tasks for each item in the stack
        </div>
      </CardFooter>
    </div>
  );
}
