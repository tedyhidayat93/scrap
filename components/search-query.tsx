"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Loader2, User, Video, Hash } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface SearchQueryProps {
  onSearch: (
    query: string,
    type: "username" | "video" | "keyword",
    latestOnly?: boolean
  ) => void;
  currentQuery: string;
  queryType: "username" | "video" | "keyword";
  isLoading?: boolean;
}

export function SearchQuery({
  onSearch,
  currentQuery,
  queryType,
  isLoading,
}: SearchQueryProps) {
  const [inputValue, setInputValue] = useState("");
  const [latestOnly, setLatestOnly] = useState(false);

  const detectQueryType = (input: string): "username" | "video" | "keyword" => {
    if (input.includes("tiktok.com") && input.includes("/video/")) {
      return "video";
    }
    if (input.startsWith("@")) {
      return "username";
    }
    if (input.startsWith("#")) {
      return "keyword";
    }
    return "keyword";
  };

  const handleSearch = () => {
    if (inputValue.trim()) {
      const type = detectQueryType(inputValue.trim());
      onSearch(inputValue.trim(), type, latestOnly);
      setInputValue("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleSearch();
    }
  };

  const getDisplayText = () => {
    if (!currentQuery) return null;

    if (queryType === "video") {
      return (
        <div className="text-sm bg-muted/50 p-4 rounded-md flex items-center gap-2">
          <Video className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Analyzing video: </span>
          <span className="font-semibold text-foreground truncate">
            {currentQuery}
          </span>
        </div>
      );
    }

    if (queryType === "keyword") {
      return (
        <div className="text-sm bg-muted/50 p-4 rounded-md flex items-center gap-2">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Analyzing keyword: </span>
          <span className="font-semibold text-foreground">{currentQuery}</span>
        </div>
      );
    }

    const displayUsername = currentQuery.startsWith("@")
      ? currentQuery
      : `@${currentQuery}`;
    return (
      <div className="text-sm bg-muted/50 p-4 rounded-md flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Analyzing user: </span>
        <span className="font-semibold text-foreground">{displayUsername}</span>
      </div>
    );
  };

  return (
    <Card className="p-6 bg-card border-border">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground mb-1">
            TikTok Analysis
          </h2>
          <p className="text-sm text-muted-foreground">
            Enter a keyword, username, or video URL to analyze comments
          </p>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="e.g., #election, @charlidamelio, or video URL..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 border border-cyan-900/50"
            disabled={isLoading}
          />
          <Button
            onClick={handleSearch}
            disabled={!inputValue.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Analyze
              </>
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
          <Switch
            id="latest-only"
            checked={latestOnly}
            onCheckedChange={setLatestOnly}
            disabled={isLoading}
            className="border border-cyan-900/50"
          />
          <Label htmlFor="latest-only" className="text-sm cursor-pointer">
            Latest video only (analyze only the most recent video)
          </Label>
        </div>

        {currentQuery ? (
          getDisplayText()
        ) : (
          <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-md">
            <div className="space-y-2">
              <p className="font-medium">Supported formats:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Keyword/Hashtag: #election or election</li>
                <li>Username: @charlidamelio</li>
                <li>
                  Video URL:
                  https://www.tiktok.com/@user/video/7563193719487319304
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
