"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Download, RefreshCw } from "lucide-react";
import { useTikTokComments } from "@/hooks/use-tiktok-comments";
import { useState } from "react";

interface DashboardHeaderProps {
  username: string;
  type: "username" | "video" | "keyword";
}

export function DashboardHeader({ username, type }: DashboardHeaderProps) {
  const { refresh, videosAnalyzed, totalVideos } = useTikTokComments(
    username,
    type
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-6 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-card-foreground">
              TikTok Comment Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {username
                ? `Analyzing ${videosAnalyzed} of ${totalVideos} videos from @${username}`
                : "Enter a TikTok username to start analyzing"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select defaultValue="7d">
              <SelectTrigger className="w-[140px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || !username}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button variant="outline" size="sm" disabled={!username}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
