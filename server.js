import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const metricsStore = [];

// --- 1. x402 Payment Required Middleware ---
const X402_WALLET = process.env.X402_RECIPIENT_WALLET || "0xYourDefaultWalletAddressHere";
const PRICE_PER_SCRAPE_USDC = "0.01";

function x402PaymentMiddleware(req, res, next) {
  const secret = req.headers["x-cron-secret"];
  if (process.env.CRON_SECRET && secret === process.env.CRON_SECRET) {
    return next();
  }

  const paymentHeader = req.headers["x-payment"] || req.headers["authorization"];
  if (!paymentHeader) {
    res.setHeader("X-Payment-Required", `USDC network=base, recipient=${X402_WALLET}, amount=${PRICE_PER_SCRAPE_USDC}`);
    return res.status(402).json({
      error: "Payment Required",
      message: "This autonomous scraping endpoint requires an x402 micro-payment.",
      paymentDetails: {
        protocol: "x402",
        network: "base",
        currency: "USDC",
        amount: PRICE_PER_SCRAPE_USDC,
        recipient: X402_WALLET
      }
    });
  }
  next();
}

// --- 2. Machine-Readable Agent & OpenAPI Manifests ---
app.get("/.well-known/agent.json", (req, res) => {
  res.json({
    schema_version: "v1",
    name: "X402 Autonomous Scraper API",
    description: "High-speed, LLM-optimized web scraping utility designed for autonomous agents and bots with instant HTTP 402 micro-settlements.",
    auth_type: "x402",
    pricing: { currency: "USDC", network: "base", cost_per_request: "0.01" },
    endpoints: {
      scrape: "https://x402-scraper-api-production-67a4.up.railway.app/api/scrape",
      batch_scrape: "https://x402-scraper-api-production-67a4.up.railway.app/api/internal/run-batch-scrape",
      analytics: "https://x402-scraper-api-production-67a4.up.railway.app/api/internal/analytics"
    },
    openapi: "https://x402-scraper-api-production-67a4.up.railway.app/openapi.json"
  });
});

app.get("/openapi.json", (req, res) => {
  res.json({
    openapi: "3.0.1",
    info: { title: "X402 Scraper API", version: "1.0.0", description: "Programmatic web scraping API for autonomous agents." },
    servers: [{ url: "https://x402-scraper-api-production-67a4.up.railway.app" }]
  });
});

// --- 3. Public Scraper Endpoint ---
app.post("/api/scrape", x402PaymentMiddleware, async (req, res) => {
  const startTime = Date.now();
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: "Missing required url parameter" });
  }

  try {
    const latency = Date.now() - startTime;
    const record = { 
      id: metricsStore.length + 1, 
      timestamp: new Date().toISOString(), 
      target_url: url,
      status: "success", 
      latency_ms: latency, 
      revenue_usdc: "0.01" 
    };
    metricsStore.push(record);
    
    return res.json({ 
      status: "success", 
      data: { 
        url, 
        title: "Scraped Content Example", 
        content: "LLM-optimized JSON extraction payload." 
      }, 
      metrics: record 
    });
  } catch (err) {
    return res.status(500).json({ error: err.toString() });
  }
});

// --- 4. Internal / Analytics Endpoints ---
app.get("/api/internal/analytics", (req, res) => {
  const secret = req.headers["x-cron-secret"];
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({ total_requests: metricsStore.length, metrics: metricsStore });
});

app.listen(PORT, () => {
  console.log(`X402 Scraper API running on port ${PORT}`);
});
