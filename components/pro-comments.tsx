"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useState, useMemo } from "react"
import { ThumbsUp, User, Sparkles, RefreshCw, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ProCommentsProps {
  data: {
    comments: any[]
    isLoading: boolean
    handle: string
  }
}

export function ProComments({ data }: ProCommentsProps) {
  const { comments, isLoading, handle } = data
  const [aiProData, setAiProData] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  const basicProComments = useMemo(() => {
    if (comments.length === 0) return []

    return comments
      .filter((comment) => comment.sentiment === "positive")
      .slice(0, 10)
      .map((comment) => ({
        ...comment,
        proScore: 7,
        proReason: "Detected as positive sentiment",
      }))
  }, [comments])

  const analyzeWithAI = async () => {
    if (comments.length === 0) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch("/api/analyze-pro-contra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comments,
          type: "pro",
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          setError("Rate limit reached. Please try again in a few moments or use paid credits for unlimited access.")
        } else {
          setError(result.error || "Failed to analyze pro comments")
        }
        return
      }

      setAiProData(result)
    } catch (err) {
      console.error("[v0] Error analyzing pro comments:", err)
      setError("Failed to analyze pro comments with AI. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const displayData = aiProData || {
    proComments: basicProComments,
    summary: {
      totalPro: basicProComments.length,
      percentage: comments.length > 0 ? (basicProComments.length / comments.length) * 100 : 0,
      commonThemes: [],
    },
  }

  const proPercentage = displayData?.summary?.percentage ? displayData.summary.percentage.toFixed(1) : "0"

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-card-foreground flex items-center gap-2">
              <ThumbsUp className="h-5 w-5 text-green-500" />
              Pro Comments {aiProData ? "(AI Enhanced)" : "(Basic)"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Comments supporting the video narrative</p>
          </div>
          <div className="flex items-center gap-2">
            {displayData && (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                {displayData.proComments?.length || 0} comments ({proPercentage}%)
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={analyzeWithAI} disabled={isAnalyzing || comments.length === 0}>
              <Sparkles className={`h-4 w-4 ${isAnalyzing ? "animate-pulse" : ""}`} />
              {aiProData ? "Re-analyze" : "Enhance"} with AI
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || isAnalyzing ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              {isAnalyzing ? "AI is analyzing pro comments..." : "Loading comments..."}
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : !displayData || displayData.proComments?.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            {handle ? "No pro comments detected" : "Enter a query to analyze pro comments"}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-card-foreground">
                    {displayData.summary.totalPro} comments ({proPercentage}% of total) support the video
                  </p>
                  {displayData.summary.commonThemes && displayData.summary.commonThemes.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Common themes:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {displayData.summary.commonThemes.map((theme: string, idx: number) => (
                          <li key={idx}>• {theme}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {(() => {
                const list = displayData.proComments || []
                const total = list.length
                const totalPages = Math.max(1, Math.ceil(total / pageSize))
                const start = (page - 1) * pageSize
                const end = Math.min(start + pageSize, total)
                const pageList = list.slice(start, end)

                return (
                  <>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {pageList.map((comment: any, index: number) => (
                <div key={comment.cid || index} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={comment.user?.avatar_thumb?.url_list?.[0] || "/placeholder.svg"}
                        alt={comment.user?.nickname}
                      />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-card-foreground truncate">
                          {comment.user?.nickname || "Anonymous"}
                        </span>
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                          Pro {comment.proScore}/10
                        </Badge>
                      </div>
                      <p className="text-sm text-card-foreground mb-2 leading-relaxed">{comment.text}</p>
                      {comment.proReason && (
                        <p className="text-xs text-muted-foreground italic mb-2 p-2 bg-muted/50 rounded">
                          Why it's pro: {comment.proReason}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          {comment.digg_count || 0} likes
                        </span>
                        {comment.create_time && !isNaN(comment.create_time) && (
                          <span>{new Date(comment.create_time * 1000).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                      ))}
                    </div>

                    { (displayData.proComments?.length || 0) > pageSize && (
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                          <button
                            className="px-2 py-1 text-sm bg-transparent border border-border rounded"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                          >
                            Prev
                          </button>
                          <div className="text-sm text-muted-foreground">Page {page} / {totalPages}</div>
                          <button
                            className="px-2 py-1 text-sm bg-transparent border border-border rounded"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                          >
                            Next
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-muted-foreground">Per page:</label>
                          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }} className="text-sm bg-transparent border border-border rounded px-2 py-1">
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
