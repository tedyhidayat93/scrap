"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Video, Heart, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";
import Pagination from "@/components/ui/pagination";

interface RecentVideosProps {
  data: {
    videos?: any[];
    isLoading: boolean;
  };
}

export function RecentVideos({ data }: RecentVideosProps) {
  const { videos = [], isLoading } = data;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  if (isLoading) {
    return (
      <Card className="bg-card py-5 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-card-foreground flex items-center gap-2">
            <Video className="w-4 h-4" />
            Recent Videos Analyzed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Loading videos...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!videos || videos.length === 0) {
    return null;
  }

  const total = videos.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const displayVideos = videos.slice(startIndex, endIndex);

  function getThumbnail(video: any): string {
    if (!video) return "/placeholder.svg";

    const coverObj = video?.video?.cover ?? video?.cover;

    if (coverObj && typeof coverObj === "object") {
      const urlList = coverObj.url_list ?? coverObj.urlList ?? coverObj.urls;

      if (Array.isArray(urlList) && urlList.length > 0) {
        // 1. Cari URL yang bukan HEIC dan bukan URL template yang bermasalah
        const safeUrl = urlList.find(
          (url: string) =>
            url &&
            !url.includes(".heic") &&
            !url.includes("tplv-tiktokx-dmt-logoccm")
        );

        if (safeUrl) return safeUrl;

        // 2. Jika tidak ada, pakai index 0 (lebih aman daripada index 1)
        if (urlList[0]) return urlList[0];
      }

      // Jika ada properti url/uri langsung
      if (coverObj.url) return coverObj.url;
      if (coverObj.uri) return coverObj.uri;
    }

    // 2) jika coverObj string
    if (typeof coverObj === "string" && coverObj.trim() !== "") {
      return coverObj;
    }

    return "/placeholder.svg";
  }

  return (
    <Card className="bg-card border-border pb-0">
      <CardHeader className="py-4 pb-3">
        <CardTitle className="text-base font-semibold text-card-foreground flex items-center gap-2">
          <Video className="w-4 h-4" />
          Recent Videos Analyzed ({displayVideos.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="gap-5 flex flex-col justify-between">
        <div
          className={`grid ${
            displayVideos.length === 1 ? "grid-cols-2" : "md:grid-cols-3"
          } gap-1 max-h-lvh w-full overflow-y-auto`}
        >
          {displayVideos.map((video, idx) => {
            const stats = video.stats || video.statistics || {};
            const author = video.author || {};
            const videoId = video.aweme_id || video.id;
            const authorName = author.unique_id || author.nickname || "Unknown";

            const thumbnail = getThumbnail(video);
            const thumbnailSrc =
              typeof thumbnail === "string" && /^https?:\/\//i.test(thumbnail)
                ? `/api/image-proxy?url=${encodeURIComponent(thumbnail)}`
                : thumbnail;

            return (
              <a
                key={videoId || idx}
                href={`https://www.tiktok.com/@${authorName}/video/${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-2 p-3 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 hover:border-primary/50 transition-all"
              >
                <div className="aspect-9/16 rounded-md bg-muted overflow-hidden relative max-h-52">
                  <img
                    src={thumbnailSrc}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  {/* {thumbnail ? (
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video  className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )} */}
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                    {video.video?.duration || "0:00"}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-card-foreground line-clamp-2 leading-tight">
                    {video.desc || "No description"}
                  </p>
                  <p className="text-xs text-muted-foreground">@{authorName}</p>
                  <div className="flex items-center gap-3 text-[8px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="w-2 h-2" />
                      {stats.diggCount || stats.digg_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-2 h-2" />
                      {stats.commentCount || stats.comment_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 className="w-2 h-2" />
                      {stats.shareCount || stats.share_count || 0}
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
        {total > 6 && (
          <Pagination
            page={page}
            onPageChange={(p: number) => setPage(p)}
            totalItems={total}
            pageSize={pageSize}
            onPageSizeChange={(s: number) => {
              setPageSize(s);
              setPage(1);
            }}
            pageSizeOptions={[5, 10, 25, 50]}
          />
        )}
      </CardContent>
    </Card>
  );
}
