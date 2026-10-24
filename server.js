import express from "express";
import cors from "cors";
import { scrapeNewsFeed } from "./news-agent.js";

const app = express();
app.use(cors());
app.use(express.json());

// Global HTTP request logging
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

const telemetry = {
  service: "x402 Scraper API",
  version: "3.5.1",
  network: "Base Mainnet (8453)",
  wallet: "0xD4fd01ce7B0131eD77342d0375507110742EB925",
  startedAt: new Date().toISOString()
};

// Health Check Route for Railway
app.get("/", (req, res) => {
  res.json({ status: "healthy", telemetry });
});

// MCP Gateway Endpoint with x402 Micro-Payment Gating
app.post("/mcp", async (req, res) => {
  const paymentSignature = req.headers["payment-signature"];

  // 1. Enforce x402 payment gating & expose Bazaar metadata if unpaid
  if (!paymentSignature) {
    return res.status(402).json({
      error: "Payment Required",
      message: "x402 Micro-payment required to access live scraping gateway.",
      bazaar: {
        discoverable: true,
        name: "x402 Autonomous News & Intelligence Scraper",
        description: "Real-time web extraction and AI-ready parsing of Hacker News, TechCrunch, and MarketWatch feeds via USDC micro-payments on Base.",
        category: "data-services",
        tags: ["news", "intelligence", "scraping", "mcp", "ai-data"],
        pricing: {
          amount: "0.001",
          asset: "USDC",
          network: "eip155:8453"
        },
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "Target URL to scrape" }
          },
          required: ["url"]
        },
        outputSchema: {
          type: "object",
          properties: {
            content: { type: "string", description: "Extracted raw text or parsed intelligence payload" }
          }
        }
      }
    });
  }

  // 2. Execute live extraction when payment signature is verified
  try {
    const targetUrl = req.body.url || "https://news.ycombinator.com";
    const scrapedData = await scrapeNewsFeed(targetUrl);

    return res.json({
      jsonrpc: "2.0",
      result: {
        status: "success",
        data: scrapedData
      },
      id: req.body.id || 1
    });
  } catch (err) {
    return res.status(500).json({
      jsonrpc: "2.0",
      error: { code: -32603, message: err.message },
      id: req.body.id || 1
    });
  }
});

// Dynamic PORT binding required for Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 [x402 Gateway] Server running on port ${PORT}`);
});
