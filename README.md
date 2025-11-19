# Social Media Comment Analysis Dashboard

A real-time dashboard for analyzing comments across TikTok, Instagram, Facebook, and YouTube using the ScrapeCreators API.

## Features

- **Real-time Comment Analysis**: Fetches and analyzes comments from multiple social media platforms
- **Bot Detection**: Automatically identifies and flags potential bot accounts
- **Sentiment Analysis**: Analyzes comment sentiment (positive, neutral, negative)
- **Platform Breakdown**: View comment distribution across different platforms
- **Top Keywords**: Identifies trending keywords in comments
- **Live Metrics**: Track total comments, real comments, users, bot accounts, and real accounts

## API Integration

This dashboard uses the [ScrapeCreators API](https://scrapecreators.com) to fetch social media data.

### API Key Configuration

The API key is configured in the following files:
- `app/api/comments/route.ts`
- `app/api/analytics/route.ts`

Current API key: `5vwUK17XqufRgNt9ejs1synjC2w2`

### Supported Endpoints

- **TikTok**: `/v1/tiktok/video/comments`, `/v1/tiktok/profile`
- **Instagram**: `/v1/instagram/post/comments`, `/v1/instagram/profile`
- **YouTube**: `/v1/youtube/video/comments`, `/v1/youtube/channel`
- **Facebook**: `/v1/facebook/profile`, `/v1/facebook/profile/posts`

### Customization

To analyze specific content, update the sample IDs in `app/api/comments/route.ts`:

\`\`\`typescript
const sampleIds = {
  tiktok: '7234567890123456789',  // Replace with your TikTok video ID
  instagram: '3234567890123456789', // Replace with your Instagram post ID
  youtube: 'dQw4w9WgXcQ',          // Replace with your YouTube video ID
}
\`\`\`

To track specific profiles, update the usernames in `app/api/analytics/route.ts`:

\`\`\`typescript
const profiles = {
  tiktok: 'charlidamelio',    // Replace with TikTok username
  instagram: 'instagram',      // Replace with Instagram username
  youtube: 'UC-lHJZR3Gqxm24_Vd_AJ5Yw', // Replace with YouTube channel ID
}
\`\`\`

## How It Works

1. **Data Fetching**: API routes fetch comments and profile data from ScrapeCreators
2. **Bot Detection**: Simple heuristic-based bot detection (can be enhanced with ML)
3. **Sentiment Analysis**: Keyword-based sentiment analysis (can be enhanced with AI)
4. **Real-time Updates**: SWR hooks automatically refresh data every 30-60 seconds
5. **Manual Refresh**: Click the refresh button to fetch latest data immediately

## Tech Stack

- **Next.js 15** with App Router
- **SWR** for data fetching and caching
- **Recharts** for data visualization
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **ScrapeCreators API** for social media data

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000)

## Notes

- The dashboard automatically refreshes data every 30 seconds for comments and 60 seconds for analytics
- Bot detection is currently simulated (~11% bot rate) - implement your own ML model for production
- Sentiment analysis uses basic keyword matching - consider using AI/ML for better accuracy
- Facebook API integration requires additional setup and may have different authentication requirements
