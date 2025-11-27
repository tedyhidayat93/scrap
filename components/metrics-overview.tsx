"use client";

import React, { ForwardRefExoticComponent, RefAttributes } from "react";
import { LucideProps } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowDown,
  ArrowUp,
  MessageSquare,
  Users,
  Bot,
  UserCheck,
  MessageCircleCode as MessageCircleCheck,
  Heart,
  Share2,
  Bookmark,
  Calendar,
} from "lucide-react";

interface MetricsOverviewProps {
  data: {
    totalComments: number;
    comments: Array<any>;
    realComments: number;
    botComments: number;
    uniqueUsersList: Array<any>;
    uniqueUsers: number;
    isLoading: boolean;
    videoStats?: {
      likes: number;
      shares: number;
      saves: number;
      views: number;
      createdAt: number | null;
    } | null;
    queryType?: string;
    videosAnalyzed?: number;
  };
}

type Trend = "up" | "down" | "neutral";

interface Metric {
  title: string;
  value: string;
  change: string;
  trend: Trend;
  icon: ForwardRefExoticComponent<Omit<LucideProps, "ref">> &
    RefAttributes<SVGSVGElement>;
  hideChange?: boolean;
}

export function MetricsOverview({ data }: MetricsOverviewProps) {
  const {
    totalComments,
    realComments,
    botComments,
    comments,
    uniqueUsers,
    uniqueUsersList,
    isLoading,
    videoStats,
    queryType,
    videosAnalyzed,
  } = data;

  const totalRealAccounts = uniqueUsersList.filter((c) => !c.isBot).length;
  const totalBotAccounts = uniqueUsersList.filter((c) => c.isBot).length;
  const totalAllAccounts = totalRealAccounts + totalBotAccounts;

  const totalAllRealComments = comments.filter((c) => !c.isBot).length;
  const totalAllBotComments = comments.filter((c) => c.isBot).length;
  const totalAllComments = totalAllRealComments + totalAllBotComments;

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calculate metrics
  const botPercentage = totalComments > 0 ? (botComments / totalComments) * 100 : 0;
  const realPercentage = totalComments > 0 ? (realComments / totalComments) * 100 : 0;
  
  const baseMetrics: Metric[] = [
    {
      title: "Total Comments",
      value: isLoading ? "..." : totalAllComments.toLocaleString(),
      change: "",
      trend: "up",
      icon: MessageSquare,
    },
    {
      title: "Real Comments",
      value: isLoading ? "..." : totalAllRealComments.toLocaleString(),
      change: ``,
      trend: realPercentage > 50 ? "up" : "down",
      icon: MessageCircleCheck,
    },
    {
      title: "Bot Comments",
      value: isLoading ? "..." : totalAllBotComments.toLocaleString(),
      change: ``,
      trend: realPercentage > 50 ? "up" : "down",
      icon: MessageCircleCheck,
    },
    {
      title: "Total Users",
      value: isLoading ? "..." : totalAllAccounts.toLocaleString(),
      change: "",
      trend: "up",
      icon: Users,
    },
    {
      title: "Bot Accounts",
      value: isLoading ? "..." : totalBotAccounts.toLocaleString(),
      change: ``,
      trend: botPercentage > 50 ? "up" : "down",
      icon: Bot,
    },
    {
      title: "Real Accounts",
      value: isLoading ? "..." : totalRealAccounts.toLocaleString(),
      change: ``,
      trend: totalRealAccounts > botComments ? "up" : "down",
      icon: UserCheck,
    },
  ];

  const keywordMetrics =
    queryType === "keyword"
      ? [
          {
            title: "Total Videos Crawled",
            value: isLoading ? "..." : (videosAnalyzed || 0).toLocaleString(),
            change: "",
            trend: "neutral",
            icon: MessageSquare,
            hideChange: true,
          },
        ]
      : [];

  const videoMetrics =
    queryType === "video" && videoStats
      ? [
          {
            title: "Total Likes",
            value: isLoading ? "..." : videoStats.likes.toLocaleString(),
            change: "+8.3%",
            trend: "up",
            icon: Heart,
          },
          {
            title: "Total Shares",
            value: isLoading ? "..." : videoStats.shares.toLocaleString(),
            change: "+6.7%",
            trend: "up",
            icon: Share2,
          },
          {
            title: "Total Saves",
            value: isLoading ? "..." : videoStats.saves.toLocaleString(),
            change: "+4.2%",
            trend: "up",
            icon: Bookmark,
          },
          {
            title: "Video Created",
            value: isLoading ? "..." : formatDate(videoStats.createdAt),
            change: "",
            trend: "up",
            icon: Calendar,
            hideChange: true,
          },
        ]
      : [];

  const metrics = [...baseMetrics, ...keywordMetrics, ...videoMetrics];

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const TrendIcon = metric.trend === "up" ? ArrowUp : ArrowDown;
        return (
          <Card key={metric.title} className="bg-card pt-5 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                {!metric.hideChange && (
                  <div
                    className={`flex items-center gap-1 text-xs font-medium ${
                      metric.trend === "up"
                        ? "text-chart-4"
                        : metric.trend === "down"
                        ? "text-chart-5"
                        : "text-muted-foreground"
                    }`}
                  >
                    {metric.trend !== "neutral" && (
                      <TrendIcon className="h-3 w-3" />
                    )}
                    {metric.change}
                  </div>
                )}
              </div>
              <div className="mt-3">
                <div className="text-xl font-semibold text-card-foreground">
                  {metric.value}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {metric.title}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
