"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo } from "react";

const platforms = [
  { name: "TikTok", color: "oklch(0.60 0.22 280)", key: "tiktok" },
  { name: "Instagram", color: "oklch(0.65 0.20 200)", key: "instagram" },
  { name: "YouTube", color: "oklch(0.75 0.15 85)", key: "youtube" },
  { name: "Facebook", color: "oklch(0.70 0.18 160)", key: "facebook" },
];

interface PlatformChartsProps {
  data: {
    platformBreakdown: Record<string, number>;
    isLoading: boolean;
  };
}

export function PlatformCharts({ data }: PlatformChartsProps) {
  const { platformBreakdown, isLoading } = data;

  const chartData = useMemo(() => {
    // Generate 7 time points throughout the day
    const times = [
      "00:00",
      "04:00",
      "08:00",
      "12:00",
      "16:00",
      "20:00",
      "23:59",
    ];

    return times.map((time, index) => {
      // Simulate distribution throughout the day (peak at midday)
      const multiplier =
        index === 3 ? 1 : index === 4 ? 0.9 : index === 2 ? 0.7 : 0.5;

      return {
        time,
        tiktok: Math.floor(((platformBreakdown.tiktok || 0) * multiplier) / 7),
        instagram: 0,
        youtube: 0,
        facebook: 0,
      };
    });
  }, [platformBreakdown]);

  const platformsWithCounts = [
    {
      name: "TikTok",
      color: "oklch(0.60 0.22 280)",
      key: "tiktok",
      count: isLoading
        ? "..."
        : (platformBreakdown.tiktok || 0).toLocaleString(),
    },
  ];

  return (
    <Card className="bg-card py-5 border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-card-foreground">
          Comments Over Time
        </CardTitle>
        <div className="flex flex-wrap gap-4 mt-4">
          {platformsWithCounts.map((platform) => (
            <div key={platform.name} className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: platform.color }}
              />
              <span className="text-xs text-muted-foreground">
                {platform.name}
              </span>
              <span className="text-xs font-medium text-card-foreground">
                {platform.count}
              </span>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Loading chart data...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="tiktok" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="oklch(0.60 0.22 280)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="oklch(0.60 0.22 280)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                stroke="oklch(0.60 0 0)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="oklch(0.60 0 0)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  value > 1000 ? `${(value / 1000).toFixed(1)}k` : value
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.16 0 0)",
                  border: "1px solid oklch(0.24 0 0)",
                  borderRadius: "8px",
                }}
              />
              <Area
                type="monotone"
                dataKey="tiktok"
                stroke="oklch(0.60 0.22 280)"
                fill="url(#tiktok)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
