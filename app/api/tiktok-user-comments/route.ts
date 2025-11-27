import { NextResponse } from "next/server";
import { AnyCnameRecord } from "node:dns";

// const BASE_URL = "https://api.scrapecreators.com/v1"
const API_KEY = process.env.TIKTOK_API_KEY!;
const BASE_URL = process.env.SCRAPPER_API_KEY!
const DEFAULT_TARGET_DATA = "10";

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

async function fetchTikTokUserVideos(targetDataFetch:number , handle: string) {
  try {
    const url = `${BASE_URL}/tiktok/profile/videos?handle=${handle}&max=${targetDataFetch}`;
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

async function fetchTikTokVideoComments(targetDataFetch: number, videoUrl: string, cursor?: number) {
  try {
    const url = cursor
      ? `${BASE_URL}/tiktok/video/comments?url=${encodeURIComponent(
          videoUrl
        )}&count=${targetDataFetch}&limit=${targetDataFetch}&cursor=${cursor}`
      : `${BASE_URL}/tiktok/video/comments?url=${encodeURIComponent(
          videoUrl
        )}&count=${targetDataFetch}&limit=${targetDataFetch}`;
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

async function fetchAllComments(targetDataFetch: number, videoUrl: string, max = 100) {
  let cursor: number | undefined = undefined;
  let all: any[] = [];
  let hasMore = true;

  while (hasMore && all.length < max) {
    const res = await fetchTikTokVideoComments(targetDataFetch, videoUrl, cursor);

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

// stream fetch 
async function fetchCommentsStream(
  targetDataFetch: number,
  videoUrl: string,
  callback: (item: any) => void,   // setiap komentar akan dikirim ke UI
  max = 100
) {
  let cursor: number | undefined = undefined;
  let total = 0;
  let hasMore = true;

  while (hasMore && total < max) {
    const res = await fetchTikTokVideoComments(targetDataFetch, videoUrl, cursor);

    if (res.error) break;

    const comments = res.data?.comments || [];

    for (const c of comments) {
      callback(c);         // 🔥 langsung kirim real-time
      total++;
      if (total >= max) break;
    }

    cursor = res.data?.cursor;
    hasMore = res.data?.has_more && !!cursor;

    if (!cursor) break;

    await new Promise((r) => setTimeout(r, 400));
  }

  return true; // selesai
}

// fetch comment with retry
async function fetchWithRetry(fn: Function, args: any[], retry = 3, delay = 1000) {
  for (let attempt = 1; attempt <= retry; attempt++) {
    try {
      return await fn(...args);
    } catch (err) {
      console.error(`Attempt ${attempt} gagal`, err);
      if (attempt === retry) throw err;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

async function fetchAllCommentsWithRetry(videoUrl: string, max: number) {
  let cursor: number | undefined = undefined;
  let all: any[] = [];
  let hasMore = true;

  while (hasMore && all.length < max) {
    // 🔥 pakai retry wrapper
    const res = await fetchWithRetry(fetchTikTokVideoComments, [videoUrl, cursor], 3, 800);

    if (res.error) break;

    const comments = res.data?.comments || [];
    all.push(...comments);

    cursor = res.data?.cursor;
    hasMore = res.data?.has_more && !!cursor;

    if (!cursor) break;

    // jeda antar fetch
    await new Promise((r) => setTimeout(r, 300));
  }

  return all.slice(0, max);
}



async function fetchTikTokVideoInfo(targetDataFetch: number, videoUrl: string) {
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
// function detectBots(comments: any[]) {
//   return comments.map((comment) => {
//     const text = comment.text || "";
//     const isBot =
//       text.length < 5 || // Very short comments
//       /^[🔥❤️😍👍✨💯]+$/u.test(text) || // Only emojis
//       /follow.*back/i.test(text) || // Follow back requests
//       /check.*bio/i.test(text) || // Bio spam
//       Math.random() < 0.08; // Random 8% for other bot patterns

//     return {
//       ...comment,
//       isBot,
//     };
//   });
// }

function detectBots(comments: any[]) {

  // menggunakan multi–layer heuristics seperti:
  // pola spam / emoji-only
  // kecepatan komentar
  // komentar identik berulang
  // akun tanpa foto / default username
  // pengguna terlalu banyak angka
  // kombinasi skor threshold

  // ✔ Tanpa random — menggunakan deteksi logis
  // ✔ Mendeteksi akun dengan username aneh
  // ✔ Mendeteksi komentar-otomatis berulang
  // ✔ Mendeteksi spam phrase terkenal
  // ✔ Mendeteksi emoji-only spam
  // ✔ Mendeteksi akun tanpa foto
  // ✔ Skor sistem → threshold lebih natural
  // ✔ Time-anomaly detection (bot spam cepat)
  const textCounts = new Map<string, number>();

  // Hitung komentar yang identik
  comments.forEach((c) => {
    const t = (c.text || "").trim().toLowerCase();
    textCounts.set(t, (textCounts.get(t) || 0) + 1);
  });

  return comments.map((comment, index) => {
    const text = (comment.text || "").trim();
    const lower = text.toLowerCase();
    const username = comment.username || "";
    let score = 0;

    // 1️⃣ Komentar terlalu pendek
    if (text.length <= 3) score += 2;

    // 2️⃣ Emoji only / heavy emoji spam
    if (/^[\p{Emoji}\s]+$/u.test(text) && text.length <= 8) score += 3;

    // 3️⃣ Spam phrases
    const spamPatterns = [
      /follow.*back/i,
      /check.*bio/i,
      /free.*gift/i,
      /promo/i,
      /giveaway/i,
      /dm.*me/i,
      /click.*link/i,
      /telegram/i,
      /whatsapp/i,
    ];
    if (spamPatterns.some((p) => p.test(text))) score += 3;

    // 4️⃣ Komentar identik berulang di banyak user (automation spam)
    const identicalCount = textCounts.get(lower) || 0;
    if (identicalCount >= 3) score += 2;

    // 5️⃣ Username suspicious (angka banyak, random chars)
    if (/\d{4,}/.test(username)) score += 2; // username123456
    if (/^[a-zA-Z0-9._]{0,}$/.test(username) && username.length < 4) score += 1;

    // 6️⃣ No profile picture or default avatar
    if (
      !comment.profile_image ||
      comment.profile_image.includes("default") ||
      comment.profile_image.includes("avatar")
    ) {
      score += 1;
    }

    // 7️⃣ Time-based anomalies (if timestamps available)
    if (index > 0) {
      const prev = comments[index - 1];
      if (prev.create_time && comment.create_time) {
        const diff = Math.abs(comment.create_time - prev.create_time);
        if (diff < 2) score += 2; // too fast → likely automated
      }
    }

    // 8️⃣ Like count too low
    if ((comment.like_count || 0) === 0 && text.length < 6) score += 1;

    // 9️⃣ Repeated emojis like "🔥🔥🔥🔥"
    if (/([\p{Emoji}])\1{2,}/u.test(text)) score += 2;

    // Final decision threshold
    const isBot = score >= 4;

    return {
      ...comment,
      botScore: score,
      isBot,
    };
  });
}

// Analyze sentiment
function analyzeSentiment(text: string): "positive" | "negative" | "neutral" {
  const positiveWords = [
    // English - core positive
    "love", "like", "great", "awesome", "amazing", "excellent", "good",
    "best", "perfect", "wonderful", "beautiful", "nice", "cool",
    "fire", "lit", "wow", "brilliant", "fantastic", "amazing",
    "magnificent", "superb", "stunning", "legendary", "epic",
    "incredible", "insane", "cute", "adorable", "respect",

    // English - strong praise / hype
    "goat", "goated", "based", "elite", "phenomenal", "top tier",
    "god tier", "beautiful work", "masterpiece", "amazing job",
    "so good", "so nice", "so beautiful", "so cool", "insanely good",
    "absolutely fire", "pure talent", "you killed it", "you nailed it",
    "chef's kiss",

    // Indonesian - core positive
    "bagus", "keren", "mantap", "mantul", "hebat", "keren banget",
    "bagus banget", "baik", "suka", "lancar", "ciamik", "kece",
    "juara", "terbaik", "sempurna", "indah", "cantik", "ganteng",
    "amazing banget", "bagus sih", "oke banget",

    // Indonesian - strong praise / hype
    "gila keren", "gokil", "goks", "mantap jiwa", "keren parah",
    "bagus parah", "sumpah keren", "sumpah bagus", "niat banget",
    "the best", "parah bagusnya", "joss", "joss gandos",
    "keren maksimal", "bagus maksimal", "edan sih", "maknyus",

    // Indonesian slang positive
    "wihh keren", "anjay keren", "anjay bagus", "keren2",
    "auto like", "auto respect", "respect banget", "cihuy",
    "positive vibes", "terthebest", "keren pol", "bagus pol",
    
    // Emoji-based (positive)
    "❤️", "😍", "🔥", "✨", "💯", "👍", "👏", "😁", "🤩", "💖",
    "💕", "💗", "🌟", "🙌", "😎",

    // Praise phrases (English)
    "i love this", "i like this", "this is amazing", "this is great",
    "you did great", "you did amazing", "i'm impressed",
    "love your work", "proud of you", "excellent work",

    // Praise phrases (Indonesia)
    "aku suka ini", "suka banget", "bagus banget sumpah",
    "keren banget sumpah", "keren banget parah",
    "ini bagus banget", "lu keren banget", "kerja bagus",
    "bangga banget", "niat banget sumpah",
  ];

  const negativeWords = [
    // English - strong negative
    "hate", "bad", "terrible", "awful", "worst", "horrible", "poor",
    "disappointing", "trash", "lame", "cringe", "garbage", "pathetic",
    "sucks", "ugly", "fake", "scam", "broken", "useless", "annoying",
    "stupid", "idiot", "dumb", "moron", "loser", "nonsense",
    "worthless", "disgusting", "weak",

    // English - profanity / aggressive insults
    "fuck", "fucking", "fuck off", "shit", "bullshit", "holy shit",
    "piece of shit", "bastard", "asshole", "dick", "dickhead",
    "motherfucker", "son of a bitch", "bitch", "witch", "piss off",
    "jerk", "crap",

    // Indonesian - strong negative
    "buruk", "jelek", "parah", "ampas", "sampah", "mengecewakan",
    "payah", "ngaco", "lemot", "norak", "abal", "hoax",
    "berantakan", "zonk", "ngecewain", "gagal total",

    // Indonesian - kata kasar / penghinaan
    "anjing", "anjir", "anjrit", "bangsat", "tai", "tai banget",
    "kampret", "keparat", "kontol", "memek", "goblok", "goblok banget",
    "tolol", "idiot", "bodoh", "bego", "bego banget", "dungu",
    "setan", "iblis", "gila lu", "brengsek", "laknat",
    "pecundang", "pantek", "babi", "asw", "asu", "jembut",
    "ngentot", "ngentod", "ngentot lu", "tai kucing",
    "sialan", "tai lah", "mampus", "kubunuh", "bunuh", "anj", "babi", "tolol",
    "gblg", "kontol", "gila"  // dipakai dalam konteks figuratif online
  ];


  const lowerText = text.toLowerCase();
  const hasPositive = positiveWords.some((word) => lowerText.includes(word));
  const hasNegative = negativeWords.some((word) => lowerText.includes(word));

  if (hasPositive && !hasNegative) return "positive";
  if (hasNegative && !hasPositive) return "negative";
  return "neutral";
}

async function searchTikTokByKeyword(targetDataFetch: number, keyword: string, cursor?: number) {
  try {
    const cleanKeyword = keyword.startsWith("#")
      ? keyword.substring(1)
      : keyword;
    const url = cursor
      ? `${BASE_URL}/tiktok/search/keyword?query=${encodeURIComponent(
          cleanKeyword
        )}&count=${targetDataFetch}&cursor=${cursor}`
      : `${BASE_URL}/tiktok/search/keyword?query=${encodeURIComponent(
          cleanKeyword
        )}&count=${targetDataFetch}`;
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
  const targetDataFetch = Number.parseInt(searchParams.get("targetData") || DEFAULT_TARGET_DATA);
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
          targetDataFetch,
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

          const commentsResult = await fetchTikTokVideoComments(targetDataFetch, videoUrl);

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

      const videoInfoResult = await fetchTikTokVideoInfo(targetDataFetch, videoUrl);
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

      const commentsResult = await fetchTikTokVideoComments(targetDataFetch, videoUrl);

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
      // const comments = await fetchAllComments(max: number);
      const comments = await fetchAllCommentsWithRetry(videoUrl, targetDataFetch);
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

    const videosResult = await fetchTikTokUserVideos(targetDataFetch, handle);

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

        // const comments = await fetchAllComments(videoUrl, 100);
        const comments = await fetchAllCommentsWithRetry(videoUrl, targetDataFetch);
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
