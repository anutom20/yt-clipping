# YouTube Clipping Server

A Node.js server for creating and managing YouTube live stream clips with timestamped links.

## Features

- Express.js REST API for YouTube live stream clip generation
- Automatically fetches currently live streams for a YouTube channel
- Generates timestamped links to specific moments in the live stream
- Modern ES6 JavaScript syntax

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- YouTube API Key (for YouTube data access)

## Installation

1. Clone this repository
```bash
git clone https://github.com/yourusername/yt-clipping.git
cd yt-clipping
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
- Copy the `.env.example` file to `.env`
- Fill in your YouTube API Key

## Usage

### Starting the server

```bash
# Start in production mode
npm start

# Start in development mode with auto-reload
npm run dev
```

### API Endpoints

- `GET /`: Server status
- `POST /api/clip`: Generate a timestamped link to a YouTube live stream
  - Request Body:
    ```json
    {
      "channelId": "YOUR_YOUTUBE_CHANNEL_ID",
      "offsetSeconds": 50
    }
    ```
  - Response:
    ```json
    {
      "message": "Timestamped URL generated successfully",
      "details": {
        "videoId": "LIVE_STREAM_VIDEO_ID",
        "channelId": "YOUR_YOUTUBE_CHANNEL_ID",
        "videoTitle": "Live Stream Title",
        "streamStartTime": "2023-04-18T12:34:56Z",
        "currentTimestamp": 3600,
        "offsetApplied": 50,
        "timestampedUrl": "https://www.youtube.com/watch?v=LIVE_STREAM_VIDEO_ID&t=3600"
      }
    }
    ```

### How It Works

1. The server queries the YouTube API to find the current live stream for the provided channel ID
2. It retrieves detailed information about the live stream, including when it started
3. Based on the current time and stream start time, it calculates a timestamp that is X seconds (default 50) in the past
4. It generates a YouTube URL with this timestamp that can be directly accessed in a browser

## License

ISC 