"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ThumbsDown,
  User,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CounterNarrativeCommentsProps {
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

// Keywords that indicate disagreement or counter-arguments
const COUNTER_INDICATORS = new Set([
  "wrong",
  "disagree",
  "false",
  "fake",
  "lie",
  "lying",
  "misleading",
  "incorrect",
  "untrue",
  "nonsense",
  "bullshit",
  "nope",
  "never",
  "doubt",
  "questionable",
  "suspicious",
  "scam",
  "fraud",
  "propaganda",
  "biased",
  "manipulation",
  "manipulate",
  "deceive",
  "deceptive",
  "misinformation",
  "disinformation",
  "actually",
  "reality",
  "truth",
  "fact",
  "prove",
  "evidence",
  "source",
  "citation",
  "research",
  "study",
  "opposite",
  "contrary",
  "however",
  "although",
  "despite",
  "unfortunately",
  "sadly",
  "problem",
  "issue",
  "concern",
  "worry",
  "dangerous",
  "harmful",
  "damage",
  "negative",
  "bad",
  "terrible",
  "awful",
  "worst",
]);

export function CounterNarrativeComments({
  data,
}: CounterNarrativeCommentsProps) {
  const { comments, isLoading, handle } = data;
  const [aiCounterData, setAiCounterData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeWithAI = async () => {
    if (comments.length === 0) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze-counter-narratives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comments,
          mainNarrative: "The dominant opinion in the comments",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze counter-narratives");
      }

      const result = await response.json();
      setAiCounterData(result);
    } catch (err) {
      console.error("[v0] Error analyzing counter-narratives:", err);
      setError("Failed to analyze counter-narratives with AI");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-analyze when comments are loaded
  useEffect(() => {
    if (comments.length > 0 && !aiCounterData && !isAnalyzing) {
      analyzeWithAI();
    }
  }, [comments.length]);

  const counterPercentage =
    aiCounterData?.summary?.percentage?.toFixed(1) || "0";

  return (
    <Card className="bg-card py-5 border-border">
      <CardHeader>
        <div className="flex items-start gap-4 justify-between">
          <div className="lg:max-w-96">
            <CardTitle className="text-lg font-semibold text-card-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-chart-5" />
              AI Counter-Narrative Detection
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              AI-powered detection of comments that contradict the majority
            </p>
          </div>
          <div className="flex items-end flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={analyzeWithAI}
              disabled={isAnalyzing || comments.length === 0}
            >
              <RefreshCw
                className={`h-4 w-4 ${isAnalyzing ? "animate-spin" : ""}`}
              />
              {aiCounterData ? "Re-analyze" : "Analyze"}
            </Button>
            {aiCounterData && (
              <Badge
                variant="outline"
                className="bg-chart-5/10 text-chart-5 border-chart-5/20"
              >
                {aiCounterData.counterComments?.length || 0} comments (
                {counterPercentage}%)
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
                ? "AI is analyzing counter-narratives..."
                : "Loading comments..."}
            </div>
          </div>
        ) : error ? (
          <div className="text-sm text-destructive text-center py-8">
            {error}
          </div>
        ) : !aiCounterData || aiCounterData.counterComments?.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            {handle
              ? "No significant counter-narrative comments detected"
              : "Enter a username or video URL to analyze counter-narratives"}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="p-3 rounded-lg bg-chart-5/5 border border-chart-5/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-chart-5 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-card-foreground">
                    {aiCounterData.summary.totalCounter} comments (
                    {counterPercentage}% of total) express disagreement
                  </p>
                  {aiCounterData.summary.mainObjections &&
                    aiCounterData.summary.mainObjections.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Common objections:
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {aiCounterData.summary.mainObjections.map(
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

            {/* Counter Comments List */}
            <div className="space-y-3">
              {aiCounterData.counterComments.map(
                (comment: any, index: number) => (
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
                            {comment.user?.nickname || comment.user?.unique_id || "-"}
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
                            className="bg-chart-5/10 text-chart-5 border-chart-5/20 text-xs"
                          >
                            Counter {comment.counterScore}/10
                          </Badge>
                        </div>
                        <p className="text-sm text-card-foreground mb-2 leading-relaxed">
                          {comment.text}
                        </p>
                        {comment.counterReason && (
                          <p className="text-xs text-muted-foreground italic mb-2 p-2 bg-muted/50 rounded">
                            Why it counters: {comment.counterReason}
                            <br />
                            <br />
                            Counter Narative: <i>"{comment.word}"</i>
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <ThumbsDown className="h-3 w-3" />
                            {comment.digg_count || 0} likes
                          </span>
                          {comment.create_time && (
                            <span>
                              {formatDistanceToNow(
                                new Date(comment.create_time * 1000),
                                { addSuffix: true }
                              )}
                            </span>
                          )}
                          {comment.counterKeywords &&
                            comment.counterKeywords.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {comment.counterKeywords.map(
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
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
