import { NextResponse } from "next/server"

/* ===============================
    TYPE DEFINITIONS
================================ */

// ScrapeCreators standard pagination response
interface PaginationResponse<T> {
  comments?: T[]
  data?: T[]
  items?: T[]
  has_more?: boolean
  hasMore?: boolean
  cursor?: number | string
  next_cursor?: number | string
  nextCursor?: number | string
}

// Universal comment type (TikTok / IG / YouTube)
interface BaseComment {
  id?: string
  text?: string
  comment_text?: string
  username?: string
  create_time?: number
  like_count?: number
  profile_image?: string
  [key: string]: unknown
}

// Comment after processing (sentiment + bot flag)
interface ProcessedComment extends BaseComment {
  platform: "tiktok" | "instagram" | "youtube"
  isBot: boolean
  sentiment: "positive" | "negative" | "neutral"
}

/* ===============================
    ENV + CONSTANTS
================================ */

const API_KEY = process.env.SCRAPECREATORS_KEY!
const BASE_URL = "https://api.scrapecreators.com"

/* ===============================
    GENERIC PAGINATION FETCHER
================================ */

async function fetchAllWithCursor<T>(
  url: string,
  cursorParam = "cursor",
  limit = 500
): Promise<T[]> {
  let cursor: number | string = 0
  let hasMore = true
  const results: T[] = []

  while (hasMore && results.length < limit) {
    const apiUrl = `${url}&${cursorParam}=${cursor}`

    const response = await fetch(apiUrl, {
      headers: { "x-api-key": API_KEY },
    })

    const data: PaginationResponse<T> = await response.json()

    const items: T[] = data.comments || data.data || data.items || []
    results.push(...items)

    cursor =
      data.cursor ||
      data.next_cursor ||
      data.nextCursor ||
      0

    hasMore =
      data.has_more ??
      data.hasMore ??
      false

    await new Promise((r) => setTimeout(r, 250)) // prevent rate limit
  }

  return results
}

/* ===============================
    PLATFORM FETCHERS
================================ */

export function fetchTikTokComments(id: string) {
  const URL = `${BASE_URL}/v1/tiktok/video/comments?video_id=${id}&count=50`
  return fetchAllWithCursor<BaseComment>(URL)
}

export function fetchInstagramComments(id: string) {
  const URL = `${BASE_URL}/v1/instagram/post/comments?post_id=${id}&count=50`
  return fetchAllWithCursor<BaseComment>(URL)
}

export function fetchYouTubeComments(id: string) {
  const URL = `${BASE_URL}/v1/youtube/video/comments?video_id=${id}&count=50`
  return fetchAllWithCursor<BaseComment>(URL)
}

/* ===============================
    BOT DETECTION
================================ */

function detectBots(comments: BaseComment[]): (BaseComment & { isBot: boolean })[] {
  return comments.map((c) => {
    const text = (c.text ?? c.comment_text ?? "").toLowerCase()
    const short = text.length < 4
    const spam =
      /follow me|promo|free|visit my/i.test(text)

    return { ...c, isBot: short || spam }
  })
}

/* ===============================
    SENTIMENT
================================ */

function analyzeSentiment(
  text: string
): "positive" | "negative" | "neutral" {
  const t = text.toLowerCase()

  if (/(good|love|great|amazing|best|wow)/.test(t)) return "positive"
  if (/(bad|hate|worst|awful|angry|terrible)/.test(t)) return "negative"

  return "neutral"
}

/* ===============================
    MAIN API HANDLER
================================ */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const platform = (searchParams.get("platform") || "all") as
    | "all"
    | "tiktok"
    | "instagram"
    | "youtube"

  const ids = {
    tiktok: searchParams.get("tiktokId") || "7234567890123456789",
    instagram: searchParams.get("instagramId") || "3234567890123456789",
    youtube: searchParams.get("youtubeId") || "dQw4w9WgXcQ",
  }

  try {
    const tasks: Promise<BaseComment[]>[] = []

    if (platform === "all" || platform === "tiktok")
      tasks.push(fetchTikTokComments(ids.tiktok))

    if (platform === "all" || platform === "instagram")
      tasks.push(fetchInstagramComments(ids.instagram))

    if (platform === "all" || platform === "youtube")
      tasks.push(fetchYouTubeComments(ids.youtube))

    const results = await Promise.all(tasks)
    const flattened: BaseComment[] = results.flat()

    // Add platform information
    const enriched: ProcessedComment[] = flattened.map((c) => {
      const platform =
        c["aweme_id"] ? "tiktok" :
        c["post_id"] ? "instagram" :
        "youtube"

      return {
        ...c,
        platform,
        isBot: false,
        sentiment: "neutral",
      }
    })

    // Bot detection + sentiment
    const withBots = detectBots(enriched)
    const processed: ProcessedComment[] = withBots.map((c) => ({
      ...c,
      sentiment: analyzeSentiment(c.text || c.comment_text || ""),
    }))

    return NextResponse.json({
      success: true,
      total: processed.length,
      comments: processed,
      summary: {
        bots: processed.filter((c) => c.isBot).length,
        real: processed.filter((c) => !c.isBot).length,
        sentiment: {
          positive: processed.filter((c) => c.sentiment === "positive").length,
          negative: processed.filter((c) => c.sentiment === "negative").length,
          neutral: processed.filter((c) => c.sentiment === "neutral").length,
        },
        platform: {
          tiktok: processed.filter((c) => c.platform === "tiktok").length,
          instagram: processed.filter((c) => c.platform === "instagram").length,
          youtube: processed.filter((c) => c.platform === "youtube").length,
        },
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
