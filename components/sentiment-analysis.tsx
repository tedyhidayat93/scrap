"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const sentimentColors = {
  positive: "oklch(0.75 0.15 85)",
  neutral: "oklch(0.70 0.18 160)",
  negative: "oklch(0.60 0.24 25)",
};

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
  "can",
  "her",
  "was",
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

interface SentimentAnalysisProps {
  data: {
    sentimentCounts: { positive: number; neutral: number; negative: number };
    comments: any[];
    isLoading: boolean;
    handle: string;
  };
}

export function SentimentAnalysis({ data }: SentimentAnalysisProps) {
  const { sentimentCounts, comments, isLoading, handle } = data;
  const [aiKeywords, setAiKeywords] = useState<any[]>([]);
  const [loadingKeywords, setLoadingKeywords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const basicKeywords = useMemo(() => {
    if (comments.length === 0) return [];

    const wordFreq = new Map<string, number>();

    comments.forEach((comment) => {
      const text = comment.text?.toLowerCase() || "";
      const words = text.match(/\b[a-z]{3,}\b/g) || [];

      words.forEach((word: any) => {
        if (!STOPWORDS.has(word)) {
          wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        }
      });
    });

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count, category: "general" }));
  }, [comments]);

  const analyzeKeywords = async () => {
    if (comments.length === 0) return;

    setLoadingKeywords(true);
    setError(null);

    try {
      const response = await fetch("/api/extract-keywords", {
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
          setError(result.error || "Failed to extract keywords");
        }
        return;
      }

      if (result.success && result.keywords) {
        setAiKeywords(result.keywords.slice(0, 10));
        setHasAnalyzed(true);
      }
    } catch (error) {
      console.error("[v0] Error fetching AI keywords:", error);
      setError("Failed to analyze keywords. Please try again.");
    } finally {
      setLoadingKeywords(false);
    }
  };

  const sentimentData = useMemo(() => {
    const total =
      sentimentCounts.positive +
      sentimentCounts.neutral +
      sentimentCounts.negative;
    if (total === 0) return [];

    return [
      {
        name: "Positive",
        value: Number(((sentimentCounts.positive / total) * 100).toFixed(1)),
        color: sentimentColors.positive,
      },
      {
        name: "Neutral",
        value: Number(((sentimentCounts.neutral / total) * 100).toFixed(1)),
        color: sentimentColors.neutral,
      },
      {
        name: "Negative",
        value: Number(((sentimentCounts.negative / total) * 100).toFixed(1)),
        color: sentimentColors.negative,
      },
    ];
  }, [sentimentCounts]);

  const displayKeywords =
    hasAnalyzed && aiKeywords.length > 0 ? aiKeywords : basicKeywords;

  return (
    <Card className="bg-card py-5 border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-card-foreground">
            Sentiment Analysis
          </CardTitle>
          {comments.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={analyzeKeywords}
              disabled={loadingKeywords}
            >
              {loadingKeywords ? (
                <RefreshCw className={`h-4 w-4 mr-2 animate-spin`} />
              ) : (
                <Sparkles
                  className={`h-4 w-4 mr-2 ${
                    loadingKeywords ? "animate-pulse" : ""
                  }`}
                />
              )}
              {hasAnalyzed ? "Re-analyze" : "Enhance"} with AI
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Loading sentiment data...
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 mt-4">
                {sentimentData.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-muted-foreground">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-card-foreground">
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-card-foreground mb-3">
                Top Keywords {hasAnalyzed ? "(AI Enhanced)" : "(Basic)"}
              </h4>
              {error && (
                <Alert variant="destructive" className="mb-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2 max-h-84 overflow-y-auto">
                {loadingKeywords ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    Analyzing keywords with AI...
                  </div>
                ) : displayKeywords.length > 0 ? (
                  displayKeywords.map((keyword) => (
                    <div
                      key={keyword.word}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-card-foreground font-medium">
                          {keyword.word}
                        </span>
                        <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                          {keyword.category}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {keyword.count}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    {handle
                      ? "No keywords found"
                      : "Enter a query to see keywords"}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
