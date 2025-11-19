import { NextResponse } from "next/server"

const API_KEY = "5vwUK17XqufRgNt9ejs1synjC2w2"
const BASE_URL = "https://api.scrapecreators.com"

interface CommentData {
  platform: string
  comments: any[]
  totalComments: number
  realComments: number
  botComments: number
}

async function fetchTikTokComments(videoId: string) {
  try {
    const response = await fetch(`${BASE_URL}/v1/tiktok/video/comments?video_id=${videoId}&count=50`, {
      headers: {
        "x-api-key": API_KEY,
      },
    })
    const data = await response.json()
    return data.comments || []
  } catch (error) {
    console.error("[v0] TikTok API error:", error)
    return []
  }
}

async function fetchInstagramComments(postId: string) {
  try {
    const response = await fetch(`${BASE_URL}/v1/instagram/post/comments?post_id=${postId}`, {
      headers: {
        "x-api-key": API_KEY,
      },
    })
    const data = await response.json()
    return data.comments || []
  } catch (error) {
    console.error("[v0] Instagram API error:", error)
    return []
  }
}

async function fetchYouTubeComments(videoId: string) {
  try {
    const response = await fetch(`${BASE_URL}/v1/youtube/video/comments?video_id=${videoId}`, {
      headers: {
        "x-api-key": API_KEY,
      },
    })
    const data = await response.json()
    return data.comments || []
  } catch (error) {
    console.error("[v0] YouTube API error:", error)
    return []
  }
}

// Simulate bot detection (in real app, you'd use ML or heuristics)
function detectBots(comments: any[]) {
  return comments.map((comment) => ({
    ...comment,
    isBot: Math.random() < 0.11, // ~11% bot rate based on mock data
  }))
}

// Analyze sentiment (simplified - in production use AI/ML)
function analyzeSentiment(text: string): "positive" | "negative" | "neutral" {
  const positiveWords = ["love", "great", "awesome", "amazing", "excellent", "good", "best", "perfect", "wonderful"]
  const negativeWords = ["hate", "bad", "terrible", "awful", "worst", "horrible", "poor", "disappointing"]

  const lowerText = text.toLowerCase()
  const hasPositive = positiveWords.some((word) => lowerText.includes(word))
  const hasNegative = negativeWords.some((word) => lowerText.includes(word))

  if (hasPositive && !hasNegative) return "positive"
  if (hasNegative && !hasPositive) return "negative"
  return "neutral"
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const platform = searchParams.get("platform") || "all"

  // Example IDs - in production, these would come from user input or database
  const sampleIds = {
    tiktok: "7234567890123456789",
    instagram: "3234567890123456789",
    youtube: "dQw4w9WgXcQ",
  }

  try {
    const allComments: any[] = []

    if (platform === "all" || platform === "tiktok") {
      const tiktokComments = await fetchTikTokComments(sampleIds.tiktok)
      allComments.push(...tiktokComments.map((c: any) => ({ ...c, platform: "tiktok" })))
    }

    if (platform === "all" || platform === "instagram") {
      const instagramComments = await fetchInstagramComments(sampleIds.instagram)
      allComments.push(...instagramComments.map((c: any) => ({ ...c, platform: "instagram" })))
    }

    if (platform === "all" || platform === "youtube") {
      const youtubeComments = await fetchYouTubeComments(sampleIds.youtube)
      allComments.push(...youtubeComments.map((c: any) => ({ ...c, platform: "youtube" })))
    }

    // Process comments
    const processedComments = detectBots(allComments).map((comment) => ({
      ...comment,
      sentiment: analyzeSentiment(comment.text || comment.comment_text || ""),
    }))

    const totalComments = processedComments.length
    const realComments = processedComments.filter((c) => !c.isBot).length
    const botComments = totalComments - realComments

    const sentimentCounts = {
      positive: processedComments.filter((c) => c.sentiment === "positive").length,
      negative: processedComments.filter((c) => c.sentiment === "negative").length,
      neutral: processedComments.filter((c) => c.sentiment === "neutral").length,
    }

    return NextResponse.json({
      success: true,
      data: {
        comments: processedComments.slice(0, 50), // Return first 50 for display
        totalComments,
        realComments,
        botComments,
        sentimentCounts,
        platformBreakdown: {
          tiktok: processedComments.filter((c) => c.platform === "tiktok").length,
          instagram: processedComments.filter((c) => c.platform === "instagram").length,
          youtube: processedComments.filter((c) => c.platform === "youtube").length,
          facebook: 0, // Facebook API requires different approach
        },
      },
    })
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch comments" }, { status: 500 })
  }
}
