"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import {
  ThumbsDown,
  User,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Pagination from "@/components/ui/pagination";

interface ContraCommentsProps {
  data: {
    comments: any[];
    isLoading: boolean;
    handle: string;
  };
}

export function ContraComments({ data }: ContraCommentsProps) {
  const { comments, isLoading, handle } = data;
  const [aiContraData, setAiContraData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const basicContraComments = useMemo(() => {
    if (comments.length === 0) return [];

    return comments
      .filter((comment) => comment.sentiment === "negative")
      .slice(0, 10)
      .map((comment) => ({
        ...comment,
        contraScore: 7,
        contraReason: "Detected as negative sentiment",
      }));
  }, [comments]);

  const analyzeWithAI = async () => {
    if (comments.length === 0) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze-pro-contra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comments,
          type: "contra",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError(
            "Rate limit reached. Please try again in a few moments or use paid credits for unlimited access."
          );
        } else {
          setError(result.error || "Failed to analyze contra comments");
        }
        return;
      }

      setAiContraData(result);
    } catch (err) {
      console.error("[v0] Error analyzing contra comments:", err);
      setError("Failed to analyze contra comments with AI. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const displayData = aiContraData || {
    contraComments: basicContraComments,
    summary: {
      totalContra: basicContraComments.length,
      percentage:
        comments.length > 0
          ? (basicContraComments.length / comments.length) * 100
          : 0,
      commonObjections: [],
    },
  };

  const contraPercentage = displayData?.summary?.percentage
    ? displayData.summary.percentage.toFixed(1)
    : "0";

  return (
    <Card className="bg-card py-5 border-border">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-card-foreground flex items-center gap-2">
              <ThumbsDown className="h-5 w-5 text-red-500" />
              Contra Comments {aiContraData ? "(AI Enhanced)" : "(Basic)"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Comments opposing the video narrative
            </p>
          </div>
          <div className="flex items-end flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={analyzeWithAI}
              disabled={isAnalyzing || comments.length === 0}
            >
              <Sparkles
                className={`h-4 w-4 ${isAnalyzing ? "animate-pulse" : ""}`}
              />
              {aiContraData ? "Re-analyze" : "Enhance"} with AI
            </Button>
            {displayData && (
              <Badge
                variant="outline"
                className="bg-red-500/10 text-red-500 border-red-500/20"
              >
                {displayData.contraComments?.length || 0} comments (
                {contraPercentage}%)
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || isAnalyzing ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              {isAnalyzing
                ? "AI is analyzing contra comments..."
                : "Loading comments..."}
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : !displayData || displayData.contraComments?.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            {handle
              ? "No contra comments detected"
              : "Enter a query to analyze contra comments"}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-card-foreground">
                    {displayData.summary.totalContra} comments (
                    {contraPercentage}% of total) oppose the video
                  </p>
                  {displayData.summary.commonObjections &&
                    displayData.summary.commonObjections.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Common objections:
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {displayData.summary.commonObjections.map(
                            (objection: string, idx: number) => (
                              <li key={idx}>• {objection}</li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {(() => {
                const list = displayData.contraComments || [];
                const total = list.length;
                const start = (page - 1) * pageSize;
                const end = Math.min(start + pageSize, total);
                const pageList = list.slice(start, end);

                return (
                  <>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {pageList.map((comment: any, index: number) => (
                        <div
                          key={comment.cid || index}
                          className="p-4 rounded-lg bg-muted/30 border border-border/50"
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage
                                src={
                                  comment.user?.avatar_thumb?.url_list?.[0] ||
                                  "/placeholder.svg"
                                }
                                alt={comment.user?.nickname}
                              />
                              <AvatarFallback>
                                <User className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {/* <span className="font-medium text-sm text-card-foreground truncate">
                                  {comment.user?.nickname || "Anonymous"}
                                </span> */}
                                <div className="flex flex-col mr-2">
                                  <span className="text-sm font-bold text-card-foreground">
                                    {comment.user?.nickname}
                                  </span>
                                  <span className="text-xs font-normal text-muted-foreground">
                                    @{comment.user?.unique_id}
                                  </span>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="bg-red-500/10 text-red-500 border-red-500/20 text-xs"
                                >
                                  Contra {comment.contraScore}/10
                                </Badge>
                              </div>
                              <p className="text-sm text-card-foreground mb-2 leading-relaxed">
                                {comment.text}
                              </p>
                              {comment.contraReason && (
                                <p className="text-xs text-muted-foreground italic mb-2 p-2 bg-muted/50 rounded">
                                  Why it's contra: {comment.contraReason}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <ThumbsDown className="h-3 w-3" />
                                  {comment.digg_count || 0} likes
                                </span>
                                {comment.create_time &&
                                  !isNaN(comment.create_time) && (
                                    <span>
                                      {new Date(
                                        comment.create_time * 1000
                                      ).toLocaleDateString()}
                                    </span>
                                  )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {total > pageSize && (
                      <div className="flex items-center justify-between pt-2">
                        <Pagination
                          page={page}
                          onPageChange={(p) => setPage(p)}
                          totalItems={total}
                          pageSize={pageSize}
                          onPageSizeChange={(s) => {
                            setPageSize(s);
                            setPage(1);
                          }}
                          pageSizeOptions={[5, 10, 20]}
                        />
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
