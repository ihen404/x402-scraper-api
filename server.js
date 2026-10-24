import express from "express";
import cors from "cors";

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
app.post("/mcp", (req, res) => {
  const paymentSignature = req.headers["payment-signature"];

  // If payment signature is missing, return HTTP 402 Payment Required with Bazaar metadata
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

  // Handle paid JSON-RPC execution
  res.json({ jsonrpc: "2.0", result: { status: "success" }, id: req.body.id || 1 });
});

// Dynamic PORT binding required for Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 [x402 Gateway] Server running on port ${PORT}`);
});
