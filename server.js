import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Global request logger
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

const telemetry = {
  service: "x402 Scraper API",
  version: "3.5.1",
  network: "Base Mainnet (8453)",
  wallet: "0xD4fd01ce7B0131eD77342d0375507110742EB925",
  startedAt: new Date().toISOString(),
  live_onchain: { totalRequests: 0, successfulScrapes: 0, failureCount: 0, usdcRevenue: 0.00, tiers: { basic: 0, dynamic: 0, structured: 0 } },
  test_simulation: { totalRequests: 0, successfulScrapes: 0, failureCount: 0, simulatedRevenue: 0.00, tiers: { basic: 0, dynamic: 0, structured: 0 } }
};

const TIER_PRICES = { scrape_basic: 0.01, scrape_dynamic: 0.05, scrape_structured: 0.15 };

app.get("/", (req, res) => {
  res.send("x402 Scraper API is running");
});

app.get("/telemetry", (req, res) => {
  res.json({ ...telemetry, timestamp: new Date().toISOString() });
});

app.post("/app.post("/mcp", (req, res) => {
  const paymentSignature = req.headers["payment-signature"];

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

  res.json({ jsonrpc: "2.0", result: { status: "success" }, id: req.body.id || 1 });
});mcp", (req, res) => {
  try {
    const hasPayment = req.headers["payment-signature"] || req.headers["x-payment-proof"];
    const toolName = req.body?.params?.name || "scrape_basic";
    const price = TIER_PRICES[toolName] || 0.01;
    const key = toolName.replace("scrape_", "");

    if (hasPayment) {
      telemetry.live_onchain.totalRequests++;
      telemetry.live_onchain.successfulScrapes++;
      telemetry.live_onchain.usdcRevenue += price;
      if (telemetry.live_onchain.tiers[key] !== undefined) telemetry.live_onchain.tiers[key]++;
    } else {
      telemetry.test_simulation.totalRequests++;
      telemetry.test_simulation.successfulScrapes++;
      telemetry.test_simulation.simulatedRevenue += price;
      if (telemetry.test_simulation.tiers[key] !== undefined) telemetry.test_simulation.tiers[key]++;
    }

    return res.json({ jsonrpc: "2.0", result: { status: "success" }, id: req.body?.id || 1 });
  } catch (err) {
    console.error("[Error in /mcp]:", err);
    return res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: err.message } });
  }
});

app.get("/", (req, res) => res.json({ status: "online", service: "x402-scraper-api" }));

const PORT = process.env.PORT || 8080;
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 [x402 Gateway] Server running on port ${PORT}`);
});app.listen(PORT, "0.0.0.0", () => {
  console.log(`[x402 Scraper API] Listening on 0.0.0.0:${PORT}`);
});
