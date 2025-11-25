"use client";

import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, XCircle, Search } from "lucide-react";

interface CrawlingLogProps {
  logs: Array<{
    timestamp: string;
    type: "info" | "success" | "error" | "warning";
    message: string;
  }>;
  isActive: boolean;
}

export function CrawlingLog({ logs, isActive }: CrawlingLogProps) {
  if (logs.length === 0 && !isActive) return null;

  return (
    <Card className="border-border bg-card backdrop-blur">
      <div className="p-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          {isActive ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
          <h3 className="font-semibold text-sm">Crawling Log</h3>
          {isActive && (
            <span className="text-xs text-muted-foreground">(Active)</span>
          )}
        </div>
      </div>
      <ScrollArea className="h-[200px]">
        <div className="p-4 space-y-2 font-mono text-xs">
          {logs.map((log, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="text-muted-foreground shrink-0">
                {log.timestamp}
              </span>
              {log.type === "success" && (
                <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
              )}
              {log.type === "error" && (
                <XCircle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
              )}
              {log.type === "info" && <div className="h-3 w-3 shrink-0" />}
              <span
                className={
                  log.type === "error"
                    ? "text-red-400"
                    : log.type === "success"
                    ? "text-green-400"
                    : log.type === "warning"
                    ? "text-yellow-400"
                    : "text-foreground/70"
                }
              >
                {log.message}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
