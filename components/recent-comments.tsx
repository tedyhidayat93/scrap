"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import Pagination from "@/components/ui/pagination";
import { Loader2 } from "lucide-react";

const sentimentColors = {
  positive: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  neutral: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  negative: "bg-chart-5/10 text-chart-5 border-chart-5/20",
};

function formatTimeAgo(timestamp: string | number): string {
  const now = Date.now();
  const time =
    typeof timestamp === "string"
      ? new Date(timestamp).getTime()
      : timestamp * 1000;
  const diff = now - time;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

interface RecentCommentsProps {
  data: {
    comments: any[];
    isLoading: boolean;
    handle: string;
  };
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
}

export function RecentComments({
  data,
  onLoadMore,
  isLoadingMore,
  hasMore,
}: RecentCommentsProps) {
  const { comments, isLoading, handle } = data;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const total = comments.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const pageComments = comments.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <Card className="bg-card py-5 border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-card-foreground">
            Recent Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading comments...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card py-5 border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-card-foreground">
          Recent Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pageComments.map((comment: any, index: number) => {
            const commentText = comment.text || "No comment text";
            const userName =
              comment.user?.unique_id ||
              comment.user?.nickname ||
              `User ${index + 1}`;
            const userAvatar =
              comment.user?.avatar_thumb?.url_list?.[0] || "/placeholder.svg";
            const sentiment = comment.sentiment || "neutral";
            const timestamp = comment.create_time || Date.now();

            return (
              <div
                key={comment.cid || index}
                className="flex gap-4 p-4 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={userAvatar || "/placeholder.svg"}
                    alt={userName}
                  />
                  <AvatarFallback>
                    {userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-card-foreground">
                        {userName}
                      </span>
                      <Badge
                        variant="secondary"
                        className="bg-chart-1 text-primary-foreground"
                      >
                        TikTok
                      </Badge>
                      {comment.isBot && (
                        <Badge
                          variant="outline"
                          className="bg-destructive/10 text-destructive border-destructive/20"
                        >
                          Bot
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-card-foreground leading-relaxed">
                    {commentText}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        sentiment === "positive"
                          ? "bg-chart-4/10 text-chart-4 border-chart-4/20"
                          : sentiment === "negative"
                          ? "bg-chart-5/10 text-chart-5 border-chart-5/20"
                          : "bg-chart-3/10 text-chart-3 border-chart-3/20"
                      }
                    >
                      {sentiment}
                    </Badge>
                    {comment.digg_count > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ❤️ {comment.digg_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {comments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {handle
                ? "No comments found for this user"
                : "Enter a TikTok username to see comments"}
            </div>
          )}
          {/* Pagination controls (reusable) */}
          {comments.length > 0 && (
            <div className="pt-4">
              <Pagination
                page={page}
                onPageChange={(p) => setPage(p)}
                totalItems={total}
                pageSize={pageSize}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setPage(1);
                }}
                pageSizeOptions={[5, 10, 25, 50]}
              />

              {/* {hasMore && onLoadMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={onLoadMore}
                    disabled={isLoadingMore}
                    variant="outline"
                    size="lg"
                    className="w-full bg-transparent"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading More Comments...
                      </>
                    ) : (
                      "Load More Comments"
                    )}
                  </Button>
                </div>
              )} */}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
