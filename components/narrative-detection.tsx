"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  MessageSquare,
  TrendingUp,
  Users,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface NarrativeDetectionProps {
  data: {
    comments: any[];
    isLoading: boolean;
    handle: string;
  };
}

const STOPWORDS = new Set([
  "that",
  "this",
  "with",
  "from",
  "have",
  "been",
  "were",
  "will",
  "would",
  "could",
  "should",
  "about",
  "which",
  "their",
  "there",
  "where",
  "when",
  "what",
  "your",
  "more",
  "some",
  "than",
  "them",
  "then",
  "these",
  "those",
  "into",
  "just",
  "like",
  "make",
  "only",
  "over",
  "such",
  "take",
  "very",
  "well",
  "also",
  "back",
  "even",
  "good",
  "much",
  "most",
  "many",
  "said",
  "want",
  "does",
  "didn",
  "don",
  "isn",
  "wasn",
  "weren",
  "won",
  "wouldn",
  "hasn",
  "haven",
  "hadn",
  "can",
  "are",
  "was",
  "has",
  "had",
  "did",
  "for",
  "and",
  "but",
  "not",
  "you",
  "all",
  "her",
  "one",
  "our",
  "out",
  "they",
  "know",
  "think",
  "really",
  "gonna",
  "wanna",
  "gotta",
]);

export function NarrativeDetection({ data }: NarrativeDetectionProps) {
  const { comments, isLoading, handle } = data;
  const [aiNarratives, setAiNarratives] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const analyzeWithAI = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze-narratives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError(
            "Rate limit reached. Please try again in a few moments or use paid credits for unlimited access."
          );
        } else {
          setError(result.error || "Failed to analyze narratives");
        }
        return;
      }

      setAiNarratives(result);
    } catch (err) {
      console.error("[v0] Error analyzing narratives:", err);
      setError("Failed to analyze narratives with AI. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="bg-card pt-5 border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-card-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Narrative Detection
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              AI-powered analysis of key discussion themes
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={analyzeWithAI}
            disabled={isAnalyzing || comments.length === 0}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isAnalyzing ? "animate-spin" : ""}`}
            />
            {aiNarratives ? "Re-analyze" : "Analyze"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || isAnalyzing ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              {isAnalyzing
                ? "AI is analyzing narratives..."
                : "Loading comments..."}
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : !aiNarratives ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            {handle
              ? "Click 'Analyze' to detect narratives with AI"
              : "Enter a username or video URL to analyze narratives"}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Main Narrative Highlight */}
            {aiNarratives.mainNarrative && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-card-foreground">
                      Primary Discussion
                    </h3>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      aiNarratives.mainNarrative.sentiment === "positive"
                        ? "bg-chart-4/10 text-chart-4 border-chart-4/20"
                        : aiNarratives.mainNarrative.sentiment === "negative"
                        ? "bg-chart-5/10 text-chart-5 border-chart-5/20"
                        : "bg-chart-3/10 text-chart-3 border-chart-3/20"
                    }
                  >
                    {aiNarratives.mainNarrative.sentiment}
                  </Badge>
                </div>
                <h4 className="text-base font-medium text-card-foreground mb-2">
                  {aiNarratives.mainNarrative.title}
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {aiNarratives.mainNarrative.description}
                </p>
                <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>
                    ~{aiNarratives.mainNarrative.percentage}% of comments
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {aiNarratives.mainNarrative.keywords.map(
                    (keyword: string) => (
                      <Badge
                        key={keyword}
                        variant="secondary"
                        className="text-xs"
                      >
                        {keyword}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Secondary Narratives */}
            {aiNarratives.secondaryNarratives &&
              aiNarratives.secondaryNarratives.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-card-foreground mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Secondary Discussion Themes
                  </h4>
                  <div className="space-y-3">
                    {(() => {
                      const list = aiNarratives.secondaryNarratives || [];
                      const total = list.length;
                      const totalPages = Math.max(
                        1,
                        Math.ceil(total / pageSize)
                      );
                      const start = (page - 1) * pageSize;
                      const end = Math.min(start + pageSize, total);
                      const pageList = list.slice(start, end);

                      return (
                        <>
                          {pageList.map((narrative: any, index: number) => (
                            <div
                              key={start + index}
                              className="p-3 rounded-lg bg-muted/30 border border-border/50"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-card-foreground">
                                      {narrative.topic}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={
                                        narrative.sentiment === "positive"
                                          ? "bg-chart-4/10 text-chart-4 border-chart-4/20"
                                          : narrative.sentiment === "negative"
                                          ? "bg-chart-5/10 text-chart-5 border-chart-5/20"
                                          : "bg-chart-3/10 text-chart-3 border-chart-3/20"
                                      }
                                    >
                                      {narrative.sentiment}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span>
                                      ~{narrative.percentage}% of comments
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {narrative.keywords.map((keyword: string) => (
                                  <Badge
                                    key={keyword}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {keyword}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}

                          {total > pageSize && (
                            <div className="flex items-center justify-between pt-2">
                              <div className="flex items-center gap-2">
                                <button
                                  className="px-2 py-1 text-sm bg-transparent border border-border rounded"
                                  onClick={() =>
                                    setPage((p) => Math.max(1, p - 1))
                                  }
                                  disabled={page === 1}
                                >
                                  Prev
                                </button>
                                <div className="text-sm text-muted-foreground">
                                  Page {page} / {totalPages}
                                </div>
                                <button
                                  className="px-2 py-1 text-sm bg-transparent border border-border rounded"
                                  onClick={() =>
                                    setPage((p) => Math.min(totalPages, p + 1))
                                  }
                                  disabled={page === totalPages}
                                >
                                  Next
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-muted-foreground">
                                  Per page:
                                </label>
                                <select
                                  value={pageSize}
                                  onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setPage(1);
                                  }}
                                  className="text-sm bg-transparent border border-border rounded px-2 py-1"
                                >
                                  <option value={3}>3</option>
                                  <option value={5}>5</option>
                                  <option value={10}>10</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
