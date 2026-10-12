import express from 'express';
import NodeCache from 'node-cache';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

const scrapeCache = new NodeCache({ stdTTL: 900, checkperiod: 120 });
const creditVault = new Map();

// --- Root Status Route ---
app.get('/', (req, res) => {
  res.json({ status: "online", service: "x402-scraper-api", version: "1.2.0" });
});

// --- Discovery Endpoint ---
app.get('/api/capabilities', (req, res) => {
  res.json({
    service: "x402 Scraper & Extraction M2M Utility",
    version: "1.2.0",
    network: "eip155:8453",
    payout_address: "0x391e20e3f938d9aa3b39c7f4aa1cb6cbd6a9df28",
    pricing: { standard_scrape_usdc: 0.01, cached_scrape_usdc: 0.0025, affiliate_rebate_pct: 10 },
    caching: { enabled: true, ttl_seconds: 900 }
  });
});

// --- Credits Deposit Endpoint ---
app.post('/api/credits/deposit', (req, res) => {
  const { walletAddress, amountUSDC } = req.body;
  if (!walletAddress || !amountUSDC) return res.status(400).json({ error: "Missing parameters" });
  const apiKey = `x402_key_${uuidv4().replace(/-/g, '')}`;
  creditVault.set(apiKey, { walletAddress, balanceUSDC: parseFloat(amountUSDC) });
  res.json({ message: "Deposit success", apiKey, balanceUSDC: amountUSDC });
});

// --- Core Scrape Endpoint ---
app.post('/api/extract', (req, res) => {
  const { url } = req.body;
  const apiKey = req.headers['x-api-key'];
  const refWallet = req.headers['ref'];

  if (!url) return res.status(400).json({ error: "Missing required 'url' parameter" });

  const cachedData = scrapeCache.get(url);
  if (cachedData) {
    if (apiKey) {
      const acc = creditVault.get(apiKey);
      if (!acc || acc.balanceUSDC < 0.0025) return res.status(402).json({ error: "Insufficient balance" });
      acc.balanceUSDC -= 0.0025;
    }
    return res.json({ source: "cache", costUSDC: 0.0025, data: cachedData });
  }

  if (apiKey) {
    const acc = creditVault.get(apiKey);
    if (!acc || acc.balanceUSDC < 0.01) return res.status(402).json({ error: "Insufficient balance" });
    acc.balanceUSDC -= 0.01;
  }

  const extractedData = { url, title: `Extracted content for ${url}`, timestamp: new Date().toISOString() };
  scrapeCache.set(url, extractedData);
  if (refWallet) console.log(`[Affiliate] Rebate tracked for ${refWallet}`);

  res.json({ source: "live", costUSDC: 0.01, data: extractedData });
});

// --- Catch-all Fallback ---
app.use('*', (req, res) => {
  res.status(404).json({ error: "Route not found", path: req.originalUrl });
});

const PORT = parseInt(process.env.PORT, 10) || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`x402 Scraper API running on 0.0.0.0:${PORT}`);
});
