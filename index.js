import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import { Client, GatewayIntentBits } from "discord.js";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Discord client
const discordClient = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// YouTube API functions
const getLatestLiveStreamForChannel = async (channelId, apiKey) => {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channelId}&eventType=live&type=video&key=${apiKey}`
    );

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error("No live streams found for this channel");
    }

    return response.data.items[0].id.videoId;
  } catch (error) {
    console.error("Error fetching live stream:", error.message);
    throw new Error("Failed to fetch live stream data");
  }
};

const getLiveStreamDetails = async (videoId, apiKey) => {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id=${videoId}&key=${apiKey}`
    );

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error("No details found for this video");
    }

    return response.data.items[0];
  } catch (error) {
    console.error("Error fetching video details:", error.message);
    throw new Error("Failed to fetch video details");
  }
};

const generateTimestampedUrl = (
  videoId,
  actualStartTime,
  offsetSeconds = 50
) => {
  // Parse the actualStartTime from ISO 8601 format
  const streamStartTime = new Date(actualStartTime);
  const currentTime = new Date();

  // Calculate seconds elapsed since stream started
  const secondsElapsed = Math.floor((currentTime - streamStartTime) / 1000);

  // Apply the offset (default 50 seconds before current time)
  const timestampSeconds = Math.max(0, secondsElapsed - offsetSeconds);

  // Generate the URL with timestamp
  return `https://youtu.be/${videoId}?t=${timestampSeconds}`;
};

// Helper function to retry fetching the Discord channel up to 3 times
async function fetchDiscordChannelWithRetry(
  discordClient,
  discordChannelId,
  maxRetries = 3,
  delayMs = 500
) {
  let attempt = 0;
  let channel = null;
  while (attempt < maxRetries) {
    try {
      channel = await discordClient.channels.fetch(discordChannelId);
    } catch (err) {
      // Log error but continue retrying
      console.warn(
        `Attempt ${attempt + 1} to fetch Discord channel failed:`,
        err.message
      );
    }
    if (channel) break;
    attempt++;
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return channel;
}

// API Routes
app.get("/", (req, res) => {
  res.json({ message: "YouTube Clipping Server is running" });
});

// Route for creating clips via API
app.get("/api/clip", async (req, res) => {
  try {
    const { youtubeChannelId, offsetSeconds, title, discordChannelId, user } =
      req.query;
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!youtubeChannelId) {
      return res.status(400).json({ error: "youtubeChannelId is required" });
    }

    if (!user) {
      return res.status(400).json({ error: "user is required" });
    }

    if (!discordChannelId) {
      return res.status(400).json({ error: "discordChannelId is required" });
    }

    if (!apiKey) {
      return res.status(500).json({ error: "YouTube API key not configured" });
    }

    // Step 1: Get the latest live stream video ID for the channel
    const videoId = await getLatestLiveStreamForChannel(
      youtubeChannelId,
      apiKey
    );

    // Step 2: Get the details of the live stream
    const videoDetails = await getLiveStreamDetails(videoId, apiKey);

    // Step 3: Generate a timestamped URL
    const actualStartTime = videoDetails?.liveStreamingDetails?.actualStartTime;
    const offset = offsetSeconds || process.env.OFFSET_SECONDS; // Default to 50 seconds if not specified
    const timestampedUrl = generateTimestampedUrl(
      videoId,
      actualStartTime,
      offset
    );

    // Send the URL to the Discord channel
    const channel = await fetchDiscordChannelWithRetry(
      discordClient,
      discordChannelId
    );
    console.log(channel);
    if (channel && channel.isTextBased()) {
      await channel.send(
        `**${
          title ?? "No title"
        } | **Clipped by **${user}**\n\n<${timestampedUrl}>\n delayed by ${offset} seconds\n\n`
      );
      res.send(
        `'${title}' clipped by **${user}** generated and sent to Discord successfully`
      );
      return;
    }
    res.send(
      `There was a problem generating the clip. Sometimes this happens , Please try again`
    );
  } catch (error) {
    console.error("Error creating clip:", error.message);
    res
      .status(500)
      .json({ error: error.message || "Failed to process request" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

discordClient.login(process.env.DISCORD_BOT_TOKEN);
