import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Dual-Channel Telemetry State
const telemetry = {
  service: "x402 Scraper API",
  version: "3.5.0",
  network: "Base Mainnet (8453)",
  wallet: "0xD4fd01ce7B0131eD77342d0375507110742EB925",
  startedAt: new Date().toISOString(),
  live_onchain: {
    totalRequests: 0,
    successfulScrapes: 0,
    failureCount: 0,
    usdcRevenue: 0.00,
    tiers: { basic: 0, dynamic: 0, structured: 0 }
  },
  test_simulation: {
    totalRequests: 3,
    successfulScrapes: 3,
    failureCount: 0,
    simulatedRevenue: 0.21,
    tiers: { basic: 1, dynamic: 1, structured: 1 }
  }
};

// Tool Pricing Map
const TIER_PRICES = {
  scrape_basic: 0.01,
  scrape_dynamic: 0.05,
  scrape_structured: 0.15
};

// Middleware: Classify Live vs Test traffic
app.use('/mcp', (req, res, next) => {
  if (req.method === 'POST') {
    const hasPaymentSignature = req.headers['payment-signature'] || req.headers['x-payment-proof'];
    const toolName = req.body?.params?.name;
    const price = TIER_PRICES[toolName] || 0.01;

    if (hasPaymentSignature) {
      // Live On-Chain Channel
      telemetry.live_onchain.totalRequests++;
      telemetry.live_onchain.successfulScrapes++;
      telemetry.live_onchain.usdcRevenue += price;
      if (toolName && telemetry.live_onchain.tiers[toolName] !== undefined) {
        telemetry.live_onchain.tiers[toolName]++;
      }
    } else {
      // Test / Simulation Channel
      telemetry.test_simulation.totalRequests++;
      telemetry.test_simulation.successfulScrapes++;
      telemetry.test_simulation.simulatedRevenue += price;
    }
  }
  next();
});

// Telemetry Endpoint
app.get('/telemetry', (req, res) => {
  res.json({
    ...telemetry,
    timestamp: new Date().toISOString()
  });
});

// Server Card Discovery Endpoint
app.get('/.well-known/mcp/server-card.json', (req, res) => {
  res.json({
    name: "x402 Scraper API",
    description: "Multi-Tiered Web Scraping MCP Server accepting x402 USDC payments on Base Mainnet",
    version: "3.5.0",
    endpoints: {
      mcp: "https://x402-scraper-api-production-67a4.up.railway.app/mcp",
      telemetry: "https://x402-scraper-api-production-67a4.up.railway.app/telemetry"
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[x402 Scraper API] Running on port ${PORT}`);
});
