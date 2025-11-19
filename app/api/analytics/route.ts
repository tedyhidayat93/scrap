import { NextResponse } from "next/server"

const API_KEY = "5vwUK17XqufRgNt9ejs1synjC2w2"
const BASE_URL = "https://api.scrapecreators.com"

// Fetch profile data from different platforms
async function fetchTikTokProfile(username: string) {
  try {
    const response = await fetch(`${BASE_URL}/v1/tiktok/profile?username=${username}`, {
      headers: {
        "x-api-key": API_KEY,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("[v0] TikTok profile error:", error)
    return null
  }
}

async function fetchInstagramProfile(username: string) {
  try {
    const response = await fetch(`${BASE_URL}/v1/instagram/profile?username=${username}`, {
      headers: {
        "x-api-key": API_KEY,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("[v0] Instagram profile error:", error)
    return null
  }
}

async function fetchYouTubeChannel(channelId: string) {
  try {
    const response = await fetch(`${BASE_URL}/v1/youtube/channel?channel_id=${channelId}`, {
      headers: {
        "x-api-key": API_KEY,
      },
    })
    return await response.json()
  } catch (error) {
    console.error("[v0] YouTube channel error:", error)
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  // Example usernames - in production, these would come from user settings
  const profiles = {
    tiktok: searchParams.get("tiktok") || "charlidamelio",
    instagram: searchParams.get("instagram") || "instagram",
    youtube: searchParams.get("youtube") || "UC-lHJZR3Gqxm24_Vd_AJ5Yw", // PewDiePie
  }

  try {
    const [tiktokData, instagramData, youtubeData] = await Promise.all([
      fetchTikTokProfile(profiles.tiktok),
      fetchInstagramProfile(profiles.instagram),
      fetchYouTubeChannel(profiles.youtube),
    ])

    // Calculate aggregated metrics
    const totalUsers =
      (tiktokData?.follower_count || 0) + (instagramData?.follower_count || 0) + (youtubeData?.subscriber_count || 0)

    const totalEngagement =
      (tiktokData?.heart_count || 0) +
      (instagramData?.media_count || 0) * 1000 + // Estimate
      (youtubeData?.view_count || 0) / 100 // Normalize

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalEngagement,
        platforms: {
          tiktok: {
            followers: tiktokData?.follower_count || 0,
            following: tiktokData?.following_count || 0,
            videos: tiktokData?.video_count || 0,
            likes: tiktokData?.heart_count || 0,
          },
          instagram: {
            followers: instagramData?.follower_count || 0,
            following: instagramData?.following_count || 0,
            posts: instagramData?.media_count || 0,
          },
          youtube: {
            subscribers: youtubeData?.subscriber_count || 0,
            videos: youtubeData?.video_count || 0,
            views: youtubeData?.view_count || 0,
          },
        },
      },
    })
  } catch (error) {
    console.error("[v0] Analytics API error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch analytics" }, { status: 500 })
  }
}
