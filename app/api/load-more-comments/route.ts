import { NextResponse } from "next/server"

const API_KEY = "5vwUK17XqufRgNt9ejs1synjC2w2"
const BASE_URL = "https://api.scrapecreators.com/v1"

// Detect bots based on comment patterns
function detectBots(comments: any[]) {
  return comments.map((comment) => {
    const text = comment.text || ""
    const isBot =
      text.length < 5 || // Very short comments
      /^[🔥❤️😍👍✨💯]+$/u.test(text) || // Only emojis
      /follow.*back/i.test(text) || // Follow back requests
      /check.*bio/i.test(text) || // Bio spam
      Math.random() < 0.08 // Random 8% for other bot patterns

    return {
      ...comment,
      isBot,
    }
  })
}

// Analyze sentiment
function analyzeSentiment(text: string): "positive" | "negative" | "neutral" {
  const positiveWords = [
    "love",
    "great",
    "awesome",
    "amazing",
    "excellent",
    "good",
    "best",
    "perfect",
    "wonderful",
    "beautiful",
    "nice",
    "cool",
    "fire",
    "lit",
  ]
  const negativeWords = [
    "hate",
    "bad",
    "terrible",
    "awful",
    "worst",
    "horrible",
    "poor",
    "disappointing",
    "trash",
    "cringe",
  ]

  const lowerText = text.toLowerCase()
  const hasPositive = positiveWords.some((word) => lowerText.includes(word))
  const hasNegative = negativeWords.some((word) => lowerText.includes(word))

  if (hasPositive && !hasNegative) return "positive"
  if (hasNegative && !hasPositive) return "negative"
  return "neutral"
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { videoUrl, cursor } = body

    console.log("[v0] Loading more comments for:", videoUrl, "with cursor:", cursor)

    if (!videoUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Video URL is required",
        },
        { status: 400 },
      )
    }

    const url = cursor
      ? `${BASE_URL}/tiktok/video/comments?url=${encodeURIComponent(videoUrl)}&count=100&cursor=${cursor}`
      : `${BASE_URL}/tiktok/video/comments?url=${encodeURIComponent(videoUrl)}&count=100`

    console.log("[v0] Fetching from:", url)

    const response = await fetch(url, {
      headers: {
        "x-api-key": API_KEY,
      },
    })

    const responseText = await response.text()

    if (!response.ok) {
      console.error("[v0] API error:", response.status, responseText)
      return NextResponse.json(
        {
          success: false,
          error: `API error: ${responseText}`,
        },
        { status: response.status },
      )
    }

    const data = JSON.parse(responseText)
    const comments = data.comments || []
    const nextCursor = data.cursor || data.has_more ? data.cursor : null

    console.log("[v0] Fetched", comments.length, "comments. Next cursor:", nextCursor)

    const processedComments = detectBots(comments).map((comment) => ({
      ...comment,
      platform: "tiktok",
      videoUrl: videoUrl,
      sentiment: analyzeSentiment(comment.text || ""),
    }))

    return NextResponse.json({
      success: true,
      data: {
        comments: processedComments,
        cursor: nextCursor,
        hasMore: !!nextCursor,
      },
    })
  } catch (error) {
    console.error("[v0] Load more comments error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load more comments",
      },
      { status: 500 },
    )
  }
}
