"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle, Shield, AlertCircle, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface AccountRiskAnalysisProps {
  data: {
    comments: any[];
    isLoading: boolean;
  };
}

interface AccountRisk {
  userId: string;
  username: string;
  avatar: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  commentCount: number;
  botProbability: number;
  negativeRatio: number;
  spamIndicators: string[];
  avgCommentLength: number;
}

export function AccountRiskAnalysis({ data }: AccountRiskAnalysisProps) {
  const { comments, isLoading } = data;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  if (isLoading) {
    return (
      <Card className="bg-card py-5 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Account Risk Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-sm text-muted-foreground">
            Analyzing accounts...
          </div>
        </CardContent>
      </Card>
    );
  }

  const accountMap = new Map<string, any[]>();
  comments.forEach((comment) => {
    const userId = comment.user?.unique_id || comment.user?.id || "unknown";
    if (!accountMap.has(userId)) {
      accountMap.set(userId, []);
    }
    accountMap.get(userId)!.push(comment);
  });

  const accountRisks: AccountRisk[] = Array.from(accountMap.entries())
    .map(([userId, userComments]) => {
      const username =
        userComments[0]?.user?.unique_id ||
        userComments[0]?.user?.nickname ||
        "Unknown User";
      const avatar =
        userComments[0]?.user?.avatar_thumb?.url_list?.[0] ||
        "/placeholder.svg";

      // Calculate risk factors
      const commentCount = userComments.length;
      const botProbability =
        userComments.filter((c) => c.isBot).length / commentCount;
      const negativeComments = userComments.filter(
        (c) => c.sentiment === "negative"
      ).length;
      const negativeRatio = negativeComments / commentCount;

      // Calculate average comment length
      const avgCommentLength =
        userComments.reduce((sum, c) => sum + (c.text?.length || 0), 0) /
        commentCount;

      // Detect spam indicators
      const spamIndicators: string[] = [];

      // Very short comments repeatedly
      if (avgCommentLength < 10 && commentCount > 3) {
        spamIndicators.push("Short repetitive comments");
      }

      // High bot probability
      if (botProbability > 0.7) {
        spamIndicators.push("High bot probability");
      }

      // Excessive negative sentiment
      if (negativeRatio > 0.6 && commentCount > 2) {
        spamIndicators.push("Excessive negativity");
      }

      // Too many comments (potential spam)
      if (commentCount > 10) {
        spamIndicators.push("Excessive commenting");
      }

      // Check for repeated text patterns
      const uniqueTexts = new Set(
        userComments.map((c) => c.text?.toLowerCase().trim())
      );
      if (uniqueTexts.size < commentCount * 0.5 && commentCount > 3) {
        spamIndicators.push("Repetitive content");
      }

      // Calculate overall risk score (0-100)
      let riskScore = 0;
      riskScore += botProbability * 30; // Bot probability contributes up to 30 points
      riskScore += negativeRatio * 25; // Negative sentiment contributes up to 25 points
      riskScore += Math.min((commentCount / 20) * 20, 20); // Excessive comments up to 20 points
      riskScore += spamIndicators.length * 5; // Each spam indicator adds 5 points

      // Determine risk level
      let riskLevel: "low" | "medium" | "high" | "critical";
      if (riskScore >= 70) riskLevel = "critical";
      else if (riskScore >= 50) riskLevel = "high";
      else if (riskScore >= 30) riskLevel = "medium";
      else riskLevel = "low";

      return {
        userId,
        username,
        avatar,
        riskScore: Math.min(Math.round(riskScore), 100),
        riskLevel,
        commentCount,
        botProbability: Math.round(botProbability * 100),
        negativeRatio: Math.round(negativeRatio * 100),
        spamIndicators,
        avgCommentLength: Math.round(avgCommentLength),
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore); // Sort by risk score descending

  const riskLevelColors = {
    critical: "bg-red-500/10 text-red-500 border-red-500/20",
    high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    low: "bg-green-500/10 text-green-500 border-green-500/20",
  };

  const riskLevelIcons = {
    critical: AlertTriangle,
    high: AlertCircle,
    medium: TrendingUp,
    low: Shield,
  };

  const criticalCount = accountRisks.filter(
    (a) => a.riskLevel === "critical"
  ).length;
  const highCount = accountRisks.filter((a) => a.riskLevel === "high").length;
  const mediumCount = accountRisks.filter(
    (a) => a.riskLevel === "medium"
  ).length;
  const lowCount = accountRisks.filter((a) => a.riskLevel === "low").length;

  const totalAccounts = accountRisks.length;
  const totalPages = Math.max(1, Math.ceil(totalAccounts / pageSize));
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalAccounts);
  const pageRisks = accountRisks.slice(startIndex, endIndex);

  return (
    <Card className="bg-card py-5 border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Account Risk Analysis
          </CardTitle>
          <div className="flex gap-1.5 text-xs">
            <Badge
              variant="outline"
              className="bg-red-500/10 text-red-500 border-red-500/20 px-2 py-0.5"
            >
              {criticalCount}
            </Badge>
            <Badge
              variant="outline"
              className="bg-orange-500/10 text-orange-500 border-orange-500/20 px-2 py-0.5"
            >
              {highCount}
            </Badge>
            <Badge
              variant="outline"
              className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 px-2 py-0.5"
            >
              {mediumCount}
            </Badge>
            <Badge
              variant="outline"
              className="bg-green-500/10 text-green-500 border-green-500/20 px-2 py-0.5"
            >
              {lowCount}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {accountRisks.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No accounts to analyze
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {pageRisks.map((account) => {
                const Icon = riskLevelIcons[account.riskLevel];
                return (
                  <div
                    key={account.userId}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-12 w-12 ring-2 ring-border">
                      <AvatarImage
                        src={account.avatar || "/placeholder.svg"}
                        alt={account.username}
                      />
                      <AvatarFallback>
                        {account.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center space-y-1 w-full">
                      <p className="text-xs font-medium text-card-foreground truncate">
                        {account.username}
                      </p>
                      <Badge
                        variant="outline"
                        className={`${
                          riskLevelColors[account.riskLevel]
                        } text-xs px-1.5 py-0`}
                      >
                        <Icon className="w-2.5 h-2.5 mr-0.5" />
                        {account.riskScore}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {account.commentCount} comments
                      </p>
                      {account.spamIndicators.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 justify-center">
                          {account.spamIndicators
                            .slice(0, 2)
                            .map((indicator, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-[10px] bg-destructive/10 text-destructive border-destructive/20 px-1 py-0"
                              >
                                {indicator.split(" ")[0]}
                              </Badge>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-4 mt-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Prev
                </Button>
                <div className="text-sm text-muted-foreground">
                  Page {page} / {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
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
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>
              <div className="text-xs text-muted-foreground">
                Total accounts: {accountRisks.length}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
