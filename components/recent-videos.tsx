"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Video, Heart, MessageCircle, Share2 } from "lucide-react"

interface RecentVideosProps {
  data: {
    videos?: any[]
    isLoading: boolean
  }
}

export function RecentVideos({ data }: RecentVideosProps) {
  const { videos = [], isLoading } = data

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-card-foreground flex items-center gap-2">
            <Video className="w-4 h-4" />
            Recent Videos Analyzed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-sm text-muted-foreground">Loading videos...</div>
        </CardContent>
      </Card>
    )
  }

  if (!videos || videos.length === 0) {
    return null
  }

  const displayVideos = videos.slice(0, 10)

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-card-foreground flex items-center gap-2">
          <Video className="w-4 h-4" />
          Recent Videos Analyzed ({displayVideos.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {displayVideos.map((video, idx) => {
            const stats = video.stats || video.statistics || {}
            const author = video.author || {}
            const videoId = video.aweme_id || video.id
            const authorName = author.unique_id || author.nickname || "Unknown"

            return (
              <a
                key={videoId || idx}
                href={`https://www.tiktok.com/@${authorName}/video/${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-2 p-3 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 hover:border-primary/50 transition-all"
              >
                <div className="aspect-[9/16] rounded-md bg-muted overflow-hidden relative">
                  {video.video?.cover ? (
                    <img
                      src={video.video.cover || "/placeholder.svg"}
                      alt="Video thumbnail"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
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
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
