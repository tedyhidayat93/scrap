"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

    // kemungkinan struktur: video.video.cover.url_list (objek kompleks)
    const coverObj = video?.video?.cover ?? video?.cover;

    // 1) jika coverObj adalah object dengan url_list (array)
    if (coverObj && typeof coverObj === "object") {
      const urlList = coverObj.url_list ?? coverObj.urlList ?? coverObj.urls;
      if (Array.isArray(urlList) && urlList.length > 0 && urlList[0]) {
        return urlList[0];
      }

      // some providers store the url directly inside a "uri" or "url" property
      if (coverObj.url) return coverObj.url;
      if (coverObj.uri) return coverObj.uri;
    }

    // 2) jika coverObj adalah string langsung
    if (typeof coverObj === "string" && coverObj.trim() !== "") {
      return coverObj;
    }

    // fallback
    return "/placeholder.svg";
  }

  return (
    <Card className="bg-card py-5 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-card-foreground flex items-center gap-2">
          <Video className="w-4 h-4" />
          Recent Videos Analyzed ({displayVideos.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-2 overflow-y-auto max-h-96">
          {displayVideos.map((video, idx) => {
            const stats = video.stats || video.statistics || {};
            const author = video.author || {};
            const videoId = video.aweme_id || video.id;
            const authorName = author.unique_id || author.nickname || "Unknown";

            const thumbnail = getThumbnail(video);

            return (
              <a
                key={videoId || idx}
                href={`https://www.tiktok.com/@${authorName}/video/${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-2 p-3 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 hover:border-primary/50 transition-all"
              >
                <div className="aspect-9/16 rounded-md bg-muted overflow-hidden relative">
                  <img
                    src={thumbnail}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  {/* {video.video?.cover ? (
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-8 h-8 text-muted-foreground" />
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
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {stats.diggCount || stats.digg_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {stats.commentCount || stats.comment_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 className="w-3 h-3" />
                      {stats.shareCount || stats.share_count || 0}
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
        {total > 0 && (
          <div className="pt-3">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
