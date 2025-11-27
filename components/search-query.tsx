"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Loader2, User, Video, Hash } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PLATFORMS } from "@/constant/global";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlatformType } from "@/interfaces/global";
import TerminalPreloader from "./preloader";


interface SearchQueryProps {
  onSearch: (
    query: string,
    targetData: number,
    platform: PlatformType,
    type: "username" | "video" | "keyword",
    latestOnly?: boolean
  ) => void;
  currentQuery: string;
  queryType: "username" | "video" | "keyword";
  isLoading?: boolean;
  setFormValues?: (values: {
    query: string;
    queryType: "username" | "video" | "keyword";
    platform: PlatformType;
    latestOnly: boolean;
    targetData: number;
  }) => void;
}

export function SearchQuery({
  onSearch,
  currentQuery,
  queryType,
  isLoading,
  setFormValues,
}: SearchQueryProps) {
  const [inputValue, setInputValue] = useState("");
  const [targetDataValue, setTargetDataValue] = useState(10);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>("tiktok");
  const [latestOnly, setLatestOnly] = useState(false);

  useEffect(() => {
    if (currentQuery) {
      setInputValue(currentQuery);
    }
  }, [currentQuery, queryType]);

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
      onSearch(inputValue.trim(), Number(targetDataValue), selectedPlatform, type, latestOnly);

      if (setFormValues) {
        setFormValues({
          query: inputValue.trim(),
          targetData: Number(targetDataValue),
          platform: selectedPlatform,
          queryType: type,
          latestOnly,
        });
      }
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
          <span className="text-muted-foreground text-nowrap">Analyzing video: </span>
          <span className="font-semibold text-foreground line-clamp-1 truncate">
            {currentQuery}
          </span>
        </div>
      );
    }

    if (queryType === "keyword") {
      return (
        <div className="text-sm bg-muted/50 p-4 rounded-md flex items-center gap-2">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground text-nowrap">Analyzing keyword: </span>
          <span className="font-semibold text-foreground line-clamp-1">{currentQuery}</span>
        </div>
      );
    }

    const displayUsername = currentQuery.startsWith("@")
      ? currentQuery
      : `@${currentQuery}`;
    return (
      <div className="text-sm bg-muted/50 p-4 rounded-md flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground text-nowrap">Analyzing user: </span>
        <span className="font-semibold text-foreground line-clamp-1">{displayUsername}</span>
      </div>
    );
  };

  return (
    <Card className="p-6 bg-card card-glow border-border">
      <div className="space-y-5">
        <div>
          <h2 className="text-lg text-glow-intense font-semibold text-card-foreground">
            Search
          </h2>
          <p className="text-xs text-muted-foreground">
            Select a platform and enter a keyword, username, or video URL to analyze comments
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <TerminalPreloader />
            <div className="text-center text-sm text-muted-foreground">
              Analyzing data, please wait...
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <div className="border border-cyan-800/90 hover:border-cyan-700">
                  <Select 
                    value={selectedPlatform} 
                    onValueChange={(value: PlatformType) => setSelectedPlatform(value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select Platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <option.icon className="w-4 h-4" />
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetData">Target Data</Label>
                <Input
                  placeholder=""
                  value={targetDataValue}
                  type="number"
                  onChange={(e) => setTargetDataValue(Number(e.target.value))}
                  className="flex-1 border border-cyan-800/90 hover:border-cyan-700"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2 w-full">
                <Label htmlFor="platform">Value</Label>
                <Input
                  placeholder="e.g., #election, @charlidamelio, or video URL..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 border border-cyan-800/90 hover:border-cyan-700"
                  disabled={isLoading}
                />
              </div>
              <Button
                onClick={handleSearch}
                className={
                  !inputValue.trim() || !inputValue || isLoading
                    ? "mt-5.5 opacity-50 effect-hover cursor-not-allowed"
                    : "mt-5.5"
                }
                disabled={isLoading || !inputValue.trim()}
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

            {/* <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md group">
              <Switch
                id="latest-only"
                checked={latestOnly}
                onCheckedChange={setLatestOnly}
                disabled={isLoading}
                className={`border group-hover:border-cyan-900 border-cyan-900/50 ${isLoading ? 'opacity-50' : ''}`}
              />
              <Label htmlFor="latest-only" className="text-sm cursor-pointer">
                Latest video only (analyze only the most recent video)
              </Label>
            </div> */}
          </>
        )}

        {currentQuery ? (
          getDisplayText()
        ) : (
          <div className="text-xs text-muted-foreground bg-muted/50 p-4 rounded-md">
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
