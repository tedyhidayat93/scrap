"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect, useCallback } from "react";
import Pagination from "@/components/ui/pagination";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const sentimentOptions = [
  { value: "all", label: "All Sentiments" },
  { value: "positive", label: "😊 Positive" },
  { value: "neutral", label: "😐 Neutral" },
  { value: "negative", label: "😠 Negative" },
];

const accountTypeOptions = [
  { value: "all", label: "All Accounts" },
  { value: "bot", label: "🤖 Bot" },
  { value: "real", label: "👤 Real Account" },
];

// ... [previous imports and formatTimeAgo function]
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
  onSearch?: (params: { username: string; sentiment: string }) => Promise<void>;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
}

export function RecentComments({
  data,
  onSearch,
  onLoadMore,
  isLoadingMore,
  hasMore,
}: RecentCommentsProps) {
  const { comments, isLoading, handle } = data;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSentiment, setSelectedSentiment] = useState("all");
  const [accountType, setAccountType] = useState("all");
  const [isSearching, setIsSearching] = useState(false);




  // Filter comments based on search term, sentiment, and bot status
  const filteredComments = useMemo(() => {
    return comments.filter(comment => {
      const matchesSearch = 
        comment.user?.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comment.user?.unique_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comment.text?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSentiment = 
        selectedSentiment === "all" || 
        comment.sentiment === selectedSentiment;
      
      // Filter by account type (bot/real)
      const isBot = comment.isBot || comment.botScore >= 4;
      const matchesAccountType = 
        accountType === "all" || 
        (accountType === "bot" && isBot) || 
        (accountType === "real" && !isBot);
      
      return matchesSearch && matchesSentiment && matchesAccountType;
    });
  }, [comments, searchTerm, selectedSentiment, accountType]);

  const total = filteredComments.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const pageComments = filteredComments.slice(startIndex, endIndex);

  // Handle search whenever search term or sentiment changes
  const handleSearch = useCallback(() => {
    if (onSearch) {
      setIsSearching(true);
      onSearch({
        username: searchTerm,
        sentiment: selectedSentiment
      }).finally(() => setIsSearching(false));
    }
  }, [onSearch, searchTerm, selectedSentiment]);

  // Trigger search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch();
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [handleSearch]);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedSentiment("all");
    setAccountType("all");
    // No need to call handleSearch here as the state updates will trigger it
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <Card className="bg-card py-5 border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-card-foreground mb-4">
          Recent Comments ({filteredComments.length})
        </CardTitle>
        
        {/* Search and Filter */}
        <div className="space-y-3 mb-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by username or comment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border border-primary/50 hover:border-primary/70 focus:border-primary"
                disabled={isSearching}
              />
            </div>
            <div className="border border-primary/50 hover:border-primary/70 focus:border-primary">
              <Select 
                value={selectedSentiment} 
                onValueChange={setSelectedSentiment}
                disabled={isSearching}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Sentiments" />
                </SelectTrigger>
                <SelectContent>
                  {sentimentOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="border border-primary/50 hover:border-primary/70 focus:border-primary">
              <Select 
                value={accountType}
                onValueChange={setAccountType}
                disabled={isSearching}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Account Type" />
                </SelectTrigger>
                <SelectContent>
                  {accountTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(searchTerm || accountType !== "all" || selectedSentiment !== "all") && (
              <Button
                type="button"
                variant="destructive"
                onClick={resetFilters}
                disabled={isSearching}
              >
                <X className="h-4 w-4 mr-2" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="max-h-[70vh] overflow-y-auto">
        <div className="space-y-4">
          {pageComments.map((comment: any, index: number) => (
            <CommentItem 
              key={index} 
              comment={comment} 
              index={index} 
            />
          ))}
          
          {filteredComments.length === 0 && (
            <div className="text-center py-12 space-y-2">
              <p className="text-muted-foreground">
                {searchTerm || selectedSentiment !== "all" 
                  ? "No comments match your search criteria" 
                  : "No comments available"}
              </p>
              {(searchTerm || selectedSentiment !== "all") && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={resetFilters}
                  className="text-primary"
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-8">
        {filteredComments.length > 0 && (
              <Pagination
                page={page}
                onPageChange={setPage}
                totalItems={total}
                pageSize={pageSize}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
                pageSizeOptions={[5, 10, 25, 50]}
              />
          )}
      </CardFooter>
    </Card>
  );
}

// Extracted Loading State Component
function LoadingState() {
  return (
    <Card className="bg-card py-5 border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-card-foreground">
          Recent Comments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <Loader2 className="mx-auto h-8 w-8 animate-spin mb-2" />
          <p>Loading comments...</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Extracted Comment Item Component
function CommentItem({ comment, index }: { comment: any; index: number }) {
  const commentText = comment.text || "No comment text";
  const nickname = comment.user?.nickname || '-';
  const userName = 
    comment.user?.unique_id ||
    `User ${index + 1}`;
  const userAvatar =
    comment.user?.avatar_thumb?.url_list?.[0] || "/placeholder.svg";
  const sentiment = comment.sentiment || "neutral";
  const timestamp = comment.create_time || Date.now();

  console.log(comment)

  return (
    <div className="flex gap-4 p-4 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors">
      <Avatar className="h-10 w-10">
        <AvatarImage src={userAvatar} alt={userName} />
        <AvatarFallback>{userName.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex flex-col mr-2">
              <span className="text-sm font-bold text-card-foreground">
                {nickname}
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                @{userName}
              </span>
            </div>
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
        <div className="flex items-center gap-2 border-t border-border pt-2 ">
          <Badge
            variant="outline"
            className={
              sentiment === "positive"
                ? "bg-green-600/50 text-chart-4 border-chart-4/20"
                : sentiment === "negative"
                ? "bg-red-600/50 text-chart-5 border-chart-5/20"
                : "bg-chart-3/10 text-chart-3 border-chart-3/20"
            }
          >
            <span style={{textTransform: 'capitalize'}}>
              {sentiment}
            </span>
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
}