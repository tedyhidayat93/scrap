import { NextResponse } from "next/server";

// const BASE_URL = "https://api.scrapecreators.com/v1"
const API_KEY = process.env.TIKTOK_API_KEY!;
const BASE_URL = "https://api.scrapecreators.com/v1";
const MAX_COMMENTS = 100000; //100.000 comments target fetch

function parseTikTokUrl(
  url: string
): { username: string; videoId: string } | null {
  try {
    const regex = /tiktok\.com\/@([^/]+)\/video\/(\d+)/;
    const match = url.match(regex);
    if (match) {
      return {
        username: match[1],
        videoId: match[2],
      };
    }
    return null;
  } catch {
    return null;
  }
}

function cleanUsername(input: string): string {
  return input.startsWith("@") ? input.substring(1) : input;
}

async function fetchTikTokUserVideos(handle: string) {
  try {
    const url = `${BASE_URL}/tiktok/profile/videos?handle=${handle}&amount=100`;
    console.log("[v0] Fetching videos from:", url);

    const response = await fetch(url, {
      headers: {
        "x-api-key": API_KEY,
      },
    });

    console.log("[v0] Videos API Response Status:", response.status);

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        "[v0] TikTok videos API error:",
        response.status,
        responseText
      );
      return { error: responseText, status: response.status };
    }

    try {
      const data = JSON.parse(responseText);
      console.log("[v0] TikTok videos found:", data.aweme_list?.length || 0);
      return { data, error: null };
    } catch (parseError) {
      console.error(
        "[v0] Failed to parse JSON response:",
        responseText.substring(0, 100)
      );
      return {
        error: `Invalid JSON response: ${responseText.substring(0, 100)}`,
        status: 500,
      };
    }
  } catch (error) {
    console.error("[v0] TikTok videos fetch error:", error);
    return { error: String(error), status: 500 };
  }
}

async function fetchTikTokVideoComments(videoUrl: string, cursor?: number) {
  try {
    const url = cursor
      ? `${BASE_URL}/tiktok/video/comments?url=${encodeURIComponent(
          videoUrl
        )}&count=100&limit=100&cursor=${cursor}`
      : `${BASE_URL}/tiktok/video/comments?url=${encodeURIComponent(
          videoUrl
        )}&count=100&limit=100`;
    console.log("[v0] Fetching comments from:", url);

    const response = await fetch(url, {
      headers: {
        "x-api-key": API_KEY,
      },
    });

    console.log("[v0] Comments API Response Status:", response.status);

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        "[v0] TikTok comments API error:",
        response.status,
        responseText
      );
      return { error: responseText, status: response.status };
    }

    try {
      const data = JSON.parse(responseText);
      console.log("[v0] Comments count:", data.comments?.length || 0);
      console.log("[v0] Cursor from API:", data.cursor);
      return { data, error: null };
    } catch (parseError) {
      console.error(
        "[v0] Failed to parse JSON response:",
        responseText.substring(0, 100)
      );
      return {
        error: `Invalid JSON response: ${responseText.substring(0, 100)}`,
        status: 500,
      };
    }
  } catch (error) {
    console.error("[v0] TikTok comments fetch error:", error);
    return { error: String(error), status: 500 };
  }
}

async function fetchAllComments(videoUrl: string, max = MAX_COMMENTS) {
  let cursor: number | undefined = undefined;
  let all: any[] = [];
  let hasMore = true;

  while (hasMore && all.length < max) {
    const res = await fetchTikTokVideoComments(videoUrl, cursor);

    if (res.error) break;

    const comments = res.data?.comments || [];
    all.push(...comments);

    cursor = res.data?.cursor;
    hasMore = res.data?.has_more && !!cursor;

    // kalau tidak ada next cursor → stop
    if (!cursor) break;

    await new Promise((r) => setTimeout(r, 500));
  }

  return all.slice(0, max);
}

async function fetchTikTokVideoInfo(videoUrl: string) {
  try {
    const url = `${BASE_URL}/tiktok/video?url=${encodeURIComponent(videoUrl)}`;
    console.log("[v0] Fetching video info from:", url);

    const response = await fetch(url, {
      headers: {
        "x-api-key": API_KEY,
      },
    });

    console.log("[v0] Video Info API Response Status:", response.status);

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        "[v0] TikTok video info API error:",
        response.status,
        responseText
      );
      return { error: responseText, status: response.status };
    }

    try {
      const data = JSON.parse(responseText);
      console.log("[v0] Video info fetched successfully");
      return { data, error: null };
    } catch (parseError) {
      console.error(
        "[v0] Failed to parse JSON response:",
        responseText.substring(0, 100)
      );
      return {
        error: `Invalid JSON response: ${responseText.substring(0, 100)}`,
        status: 500,
      };
    }
  } catch (error) {
    console.error("[v0] TikTok video info fetch error:", error);
    return { error: String(error), status: 500 };
  }
}

// Detect bots based on comment patterns
function detectBots(comments: any[]) {
  return comments.map((comment) => {
    const text = comment.text || "";
    const isBot =
      text.length < 5 || // Very short comments
      /^[🔥❤️😍👍✨💯]+$/u.test(text) || // Only emojis
      /follow.*back/i.test(text) || // Follow back requests
      /check.*bio/i.test(text) || // Bio spam
      Math.random() < 0.08; // Random 8% for other bot patterns

    return {
      ...comment,
      isBot,
    };
  });
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
  ];
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
  ];

  const lowerText = text.toLowerCase();
  const hasPositive = positiveWords.some((word) => lowerText.includes(word));
  const hasNegative = negativeWords.some((word) => lowerText.includes(word));

  if (hasPositive && !hasNegative) return "positive";
  if (hasNegative && !hasPositive) return "negative";
  return "neutral";
}

async function searchTikTokByKeyword(keyword: string, cursor?: number) {
  try {
    const cleanKeyword = keyword.startsWith("#")
      ? keyword.substring(1)
      : keyword;
    const url = cursor
      ? `${BASE_URL}/tiktok/search/keyword?query=${encodeURIComponent(
          cleanKeyword
        )}&count=30&cursor=${cursor}`
      : `${BASE_URL}/tiktok/search/keyword?query=${encodeURIComponent(
          cleanKeyword
        )}&count=30`;
    console.log("[v0] Searching TikTok by keyword:", url);

    const response = await fetch(url, {
      headers: {
        "x-api-key": API_KEY,
      },
    });

    console.log("[v0] Search API Response Status:", response.status);

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        "[v0] TikTok search API error:",
        response.status,
        responseText
      );
      return { error: responseText, status: response.status };
    }

    try {
      const data = JSON.parse(responseText);
      console.log("[v0] Response keys:", Object.keys(data));

      console.log("[v0] aweme_list exists:", !!data.aweme_list);
      console.log("[v0] aweme_list type:", typeof data.aweme_list);
      console.log("[v0] aweme_list is array:", Array.isArray(data.aweme_list));

      console.log("[v0] search_item_list exists:", !!data.search_item_list);
      console.log("[v0] search_item_list type:", typeof data.search_item_list);
      console.log(
        "[v0] search_item_list is array:",
        Array.isArray(data.search_item_list)
      );

      if (data.search_item_list && Array.isArray(data.search_item_list)) {
        console.log(
          "[v0] search_item_list length:",
          data.search_item_list.length
        );
        if (data.search_item_list.length > 0) {
          console.log(
            "[v0] First search_item keys:",
            Object.keys(data.search_item_list[0])
          );
          console.log(
            "[v0] First search_item sample:",
            JSON.stringify(data.search_item_list[0]).substring(0, 200)
          );
        }
      }

      if (data.aweme_list && typeof data.aweme_list === "object") {
        console.log("[v0] aweme_list keys:", Object.keys(data.aweme_list));
        console.log(
          "[v0] aweme_list sample:",
          JSON.stringify(data.aweme_list).substring(0, 200)
        );
      }

      return { data, error: null };
    } catch (parseError) {
      console.error(
        "[v0] Failed to parse JSON response:",
        responseText.substring(0, 100)
      );
      return {
        error: `Invalid JSON response: ${responseText.substring(0, 100)}`,
        status: 500,
      };
    }
  } catch (error) {
    console.error("[v0] TikTok search error:", error);
    return { error: String(error), status: 500 };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const type = searchParams.get("type") || "username";
  const cursor = searchParams.get("cursor")
    ? Number.parseInt(searchParams.get("cursor")!)
    : undefined;
  const latestOnly = searchParams.get("latestOnly") === "true";

  console.log("[v0] ========== NEW REQUEST ==========");
  console.log("[v0] Query:", query);
  console.log("[v0] Type:", type);
  console.log("[v0] Cursor:", cursor);
  console.log("[v0] Latest Only:", latestOnly);

  if (!query) {
    return NextResponse.json(
      {
        success: false,
        error: "Query parameter is required",
      },
      { status: 400 }
    );
  }

  if (type !== "username" && type !== "video" && type !== "keyword") {
    return NextResponse.json(
      {
        success: false,
        error:
          "Invalid type parameter. Must be 'username', 'video', or 'keyword'",
      },
      { status: 400 }
    );
  }

  try {
    if (type === "keyword") {
      const keyword = query.startsWith("#") ? query.substring(1) : query;
      console.log("[v0] Analyzing keyword:", keyword);

      const allVideos: any[] = [];
      let currentCursor: number | undefined = undefined;
      let pageCount = 0;
      const maxPages = latestOnly ? 1 : 4;

      while (
        pageCount < maxPages &&
        allVideos.length < (latestOnly ? 1 : 100)
      ) {
        const searchResult = await searchTikTokByKeyword(
          keyword,
          currentCursor
        );

        if (searchResult.error) {
          console.error("[v0] Search error:", searchResult.error);
          break;
        }

        const searchItems = searchResult.data?.search_item_list || [];
        const videos = searchItems
          .filter((item: any) => item.aweme_info)
          .map((item: any) => item.aweme_info);

        console.log(
          "[v0] Page",
          pageCount + 1,
          "- Videos found:",
          videos.length
        );

        if (videos.length === 0) {
          break;
        }

        allVideos.push(...videos);

        if (latestOnly) {
          break;
        }

        currentCursor = searchResult.data?.cursor;
        pageCount++;

        if (!searchResult.data?.has_more || !currentCursor) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      console.log("[v0] Total videos collected from search:", allVideos.length);

      if (allVideos.length === 0) {
        return NextResponse.json({
          success: false,
          error: "No videos found for this keyword",
          debug: {
            keyword: keyword,
            message:
              "The API returned successfully but no videos were found. Try a different keyword.",
          },
        });
      }

      const videosToAnalyze = latestOnly
        ? allVideos.slice(0, 1)
        : allVideos.slice(0, 100);
      const allComments: any[] = [];
      let successfulVideos = 0;
      let failedVideos = 0;

      for (const video of videosToAnalyze) {
        try {
          const videoId = video.aweme_id;
          const author = video.author?.unique_id || "unknown";
          const videoUrl = `https://www.tiktok.com/@${author}/video/${videoId}`;
          console.log("[v0] Fetching comments for video:", videoUrl);

          const commentsResult = await fetchTikTokVideoComments(videoUrl);

          if (!commentsResult.error && commentsResult.data?.comments) {
            allComments.push(
              ...commentsResult.data.comments.map((c: any) => ({
                ...c,
                platform: "tiktok",
                videoId: videoId,
                videoUrl: videoUrl,
              }))
            );
            successfulVideos++;
            console.log(
              "[v0] Successfully fetched comments from video:",
              videoUrl
            );
          } else {
            failedVideos++;
            console.log(
              "[v0] Failed to fetch comments from video:",
              videoUrl,
              "Error:",
              commentsResult.error
            );
          }
        } catch (videoError) {
          failedVideos++;
          console.error(
            "[v0] Unexpected error fetching video comments:",
            videoError
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log("[v0] Total comments collected:", allComments.length);
      console.log(
        "[v0] Successful videos:",
        successfulVideos,
        "Failed videos:",
        failedVideos
      );

      if (allComments.length === 0) {
        return NextResponse.json({
          success: false,
          error: "Failed to fetch comments from any videos",
          debug: {
            keyword: keyword,
            videosAttempted: videosToAnalyze.length,
            successfulVideos,
            failedVideos,
            message:
              "All video comment fetches failed. Try a different keyword.",
          },
        });
      }

      const processedComments = detectBots(allComments).map((comment) => ({
        ...comment,
        sentiment: analyzeSentiment(comment.text || ""),
      }));

      const totalComments = processedComments.length;
      const realComments = processedComments.filter((c) => !c.isBot).length;
      const botComments = totalComments - realComments;

      const sentimentCounts = {
        positive: processedComments.filter((c) => c.sentiment === "positive")
          .length,
        negative: processedComments.filter((c) => c.sentiment === "negative")
          .length,
        neutral: processedComments.filter((c) => c.sentiment === "neutral")
          .length,
      };

      const uniqueUsers = new Set(
        processedComments.map((c) => c.user?.unique_id || c.user?.id)
      ).size;

      return NextResponse.json({
        success: true,
        data: {
          keyword,
          videosAnalyzed: successfulVideos,
          totalVideos: allVideos.length,
          comments: processedComments.slice(0, 100),
          totalComments,
          realComments,
          botComments,
          uniqueUsers,
          sentimentCounts,
          platformBreakdown: {
            tiktok: totalComments,
            instagram: 0,
            youtube: 0,
            facebook: 0,
          },
          queryType: "keyword",
          videos: videosToAnalyze,
          cursor: null,
          hasMore: false,
        },
      });
    }

    if (type === "video") {
      const parsedUrl = parseTikTokUrl(query);
      if (!parsedUrl) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid TikTok video URL format",
          },
          { status: 400 }
        );
      }

      const { username, videoId } = parsedUrl;
      const videoUrl = query;
      console.log("[v0] Analyzing single video:", videoUrl);

      const videoInfoResult = await fetchTikTokVideoInfo(videoUrl);
      let videoStats = null;

      if (!videoInfoResult.error && videoInfoResult.data) {
        const videoData = videoInfoResult.data;
        const stats = videoData.itemInfo?.itemStruct?.stats;
        const createTime = videoData.itemInfo?.itemStruct?.createTime;

        videoStats = {
          likes: stats?.diggCount || 0,
          shares: stats?.shareCount || 0,
          saves: Number.parseInt(stats?.collectCount) || 0,
          views: stats?.playCount || 0,
          createdAt: createTime || null,
        };
        console.log("[v0] Video stats:", videoStats);
      }

      const commentsResult = await fetchTikTokVideoComments(videoUrl);

      if (commentsResult.error) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to fetch comments from video",
            debug: {
              apiError: commentsResult.error,
              status: commentsResult.status,
            },
          },
          { status: commentsResult.status || 500 }
        );
      }

      // const comments = commentsResult.data?.comments || [];
      const comments = await fetchAllComments(videoUrl, 100);
      const cursor = commentsResult.data?.cursor || null;
      const hasMore = commentsResult.data?.has_more || !!cursor;

      console.log("[v0] Initial cursor:", cursor, "Has more:", hasMore);

      const processedComments = detectBots(comments).map((comment) => ({
        ...comment,
        platform: "tiktok",
        videoId: videoId,
        videoUrl: videoUrl,
        sentiment: analyzeSentiment(comment.text || ""),
      }));

      const totalComments = processedComments.length;
      const realComments = processedComments.filter((c) => !c.isBot).length;
      const botComments = totalComments - realComments;

      const sentimentCounts = {
        positive: processedComments.filter((c) => c.sentiment === "positive")
          .length,
        negative: processedComments.filter((c) => c.sentiment === "negative")
          .length,
        neutral: processedComments.filter((c) => c.sentiment === "neutral")
          .length,
      };

      const uniqueUsers = new Set(
        processedComments.map((c) => c.user?.unique_id || c.user?.id)
      ).size;

      return NextResponse.json({
        success: true,
        data: {
          handle: username,
          videosAnalyzed: 1,
          totalVideos: 1,
          comments: processedComments,
          totalComments,
          realComments,
          botComments,
          uniqueUsers,
          sentimentCounts,
          platformBreakdown: {
            tiktok: totalComments,
            instagram: 0,
            youtube: 0,
            facebook: 0,
          },
          queryType: "video",
          videoUrl,
          cursor,
          hasMore,
          videoStats,
          videos: videoInfoResult.data?.itemInfo?.itemStruct
            ? [videoInfoResult.data.itemInfo.itemStruct]
            : [],
        },
      });
    }

    const handle = cleanUsername(query);
    console.log("[v0] Analyzing user:", handle);

    const videosResult = await fetchTikTokUserVideos(handle);

    if (videosResult.error) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch videos from ScrapeCreators API",
          debug: {
            apiError: videosResult.error,
            status: videosResult.status,
            handle: handle,
          },
        },
        { status: videosResult.status || 500 }
      );
    }

    const videos = videosResult.data?.aweme_list || [];
    console.log("[v0] Videos found:", videos.length);

    if (videos.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No videos found for this user",
        debug: {
          handle: handle,
          message:
            "The API returned successfully but no videos were found. Check if the handle is correct.",
        },
      });
    }

    const videosToAnalyze = latestOnly
      ? videos.slice(0, 1)
      : videos.slice(0, 100);
    const allComments: any[] = [];
    let successfulVideos = 0;
    let failedVideos = 0;

    for (const video of videosToAnalyze) {
      try {
        const videoId = video.aweme_id;
        const videoUrl = `https://www.tiktok.com/@${handle}/video/${videoId}`;
        console.log("[v0] Fetching comments for video:", videoUrl);

        const comments = await fetchAllComments(videoUrl, 100);
        allComments.push(
          ...comments.map((c) => ({
            ...c,
            videoId,
            videoUrl,
            platform: "tiktok",
          }))
        );
      } catch (videoError) {
        failedVideos++;
        console.error(
          "[v0] Unexpected error fetching video comments:",
          videoError
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("[v0] Total comments collected:", allComments.length);
    console.log(
      "[v0] Successful videos:",
      successfulVideos,
      "Failed videos:",
      failedVideos
    );

    if (allComments.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Failed to fetch comments from any videos",
        debug: {
          handle: handle,
          videosAttempted: videosToAnalyze.length,
          successfulVideos,
          failedVideos,
          message:
            "All video comment fetches failed. The videos might be private or the API might be rate limiting.",
        },
      });
    }

    const processedComments = detectBots(allComments).map((comment) => ({
      ...comment,
      sentiment: analyzeSentiment(comment.text || ""),
    }));

    const totalComments = processedComments.length;
    const realComments = processedComments.filter((c) => !c.isBot).length;
    const botComments = totalComments - realComments;

    const sentimentCounts = {
      positive: processedComments.filter((c) => c.sentiment === "positive")
        .length,
      negative: processedComments.filter((c) => c.sentiment === "negative")
        .length,
      neutral: processedComments.filter((c) => c.sentiment === "neutral")
        .length,
    };

    const uniqueUsers = new Set(
      processedComments.map((c) => c.user?.unique_id || c.user?.id)
    ).size;

    return NextResponse.json({
      success: true,
      data: {
        handle,
        videosAnalyzed: successfulVideos,
        totalVideos: videos.length,
        comments: processedComments.slice(0, 100),
        totalComments,
        realComments,
        botComments,
        uniqueUsers,
        sentimentCounts,
        platformBreakdown: {
          tiktok: totalComments,
          instagram: 0,
          youtube: 0,
          facebook: 0,
        },
        queryType: "username",
        videos: videosToAnalyze,
      },
    });
  } catch (error) {
    console.error("[v0] TikTok API error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch comments",
      },
      { status: 500 }
    );
  }
}
