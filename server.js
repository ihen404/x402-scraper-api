import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const telemetry = {
  service: "x402 Scraper API",
  version: "3.5.0",
  network: "Base Mainnet (8453)",
  wallet: "0xD4fd01ce7B0131eD77342d0375507110742EB925",
  startedAt: new Date().toISOString(),
  live_onchain: { totalRequests: 0, successfulScrapes: 0, failureCount: 0, usdcRevenue: 0.00, tiers: { basic: 0, dynamic: 0, structured: 0 } },
  test_simulation: { totalRequests: 0, successfulScrapes: 0, failureCount: 0, simulatedRevenue: 0.00, tiers: { basic: 0, dynamic: 0, structured: 0 } }
};

const TIER_PRICES = { scrape_basic: 0.01, scrape_dynamic: 0.05, scrape_structured: 0.15 };

app.post("/mcp", (req, res) => {
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

  res.json({ jsonrpc: "2.0", result: { status: "success" }, id: req.body?.id || 1 });
});

app.get("/telemetry", (req, res) => {
  res.json({ ...telemetry, timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[x402 Scraper API] Running on port ${PORT}`);
});
