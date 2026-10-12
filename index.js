import express from 'express';
import NodeCache from 'node-cache';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

// In-memory cache & credit store
const scrapeCache = new NodeCache({ stdTTL: 900, checkperiod: 120 });
const creditVault = new Map();

// --- Discovery & A2A Handshake ---
app.get('/api/capabilities', (req, res) => {
  res.json({
    service: "x402 Scraper & Extraction M2M Utility",
    version: "1.2.0",
    network: "eip155:8453",
    payout_address: "0x391e20e3f938d9aa3b39c7f4aa1cb6cbd6a9df28",
    pricing: {
      standard_scrape_usdc: 0.01,
      cached_scrape_usdc: 0.0025,
      affiliate_rebate_pct: 10
    },
    caching: { enabled: true, ttl_seconds: 900 },
    endpoints: {
      openapi_spec: "/api/openapi.json",
      extract_sync: "/api/extract",
      extract_async: "/api/extract/webhook",
      credits_deposit: "/api/credits/deposit"
    }
  });
});

app.get('/api/openapi.json', (req, res) => {
  res.json({
    openapi: "3.1.0",
    info: { title: "x402 Scraper M2M API", version: "1.2.0" },
    servers: [{ url: "https://x402-scraper-api-production-67a4.up.railway.app" }]
  });
});

// --- Pre-Paid Credits ---
app.post('/api/credits/deposit', (req, res) => {
  const { walletAddress, amountUSDC } = req.body;
  if (!walletAddress || !amountUSDC) {
    return res.status(400).json({ error: "Missing walletAddress or amountUSDC" });
  }
  const apiKey = `x402_key_${uuidv4().replace(/-/g, '')}`;
  creditVault.set(apiKey, {
    walletAddress,
    balanceUSDC: parseFloat(amountUSDC),
    createdAt: new Date().toISOString()
  });
  res.json({ message: "Credit account funded successfully", apiKey, balanceUSDC: amountUSDC });
});

// --- Core Scrape Endpoint ---
app.post('/api/extract', async (req, res) => {
  const { url } = req.body;
  const apiKey = req.headers['x-api-key'];
  const refWallet = req.headers['ref'];

  if (!url) return res.status(400).json({ error: "Missing required 'url' parameter" });

  const cachedData = scrapeCache.get(url);
  if (cachedData) {
    if (apiKey) {
      const acc = creditVault.get(apiKey);
      if (!acc || acc.balanceUSDC < 0.0025) return res.status(402).json({ error: "Invalid key or insufficient balance" });
      acc.balanceUSDC -= 0.0025;
    }
    if (refWallet) console.log(`[Affiliate] Rebate routed to ${refWallet}`);
    return res.json({ source: "cache", costUSDC: 0.0025, data: cachedData });
  }

  if (apiKey) {
    const acc = creditVault.get(apiKey);
    if (!acc || acc.balanceUSDC < 0.01) return res.status(402).json({ error: "Invalid key or insufficient balance" });
    acc.balanceUSDC -= 0.01;
  }

  const extractedData = { url, title: `Extracted title for ${url}`, timestamp: new Date().toISOString() };
  scrapeCache.set(url, extractedData);
  if (refWallet) console.log(`[Affiliate] Rebate routed to ${refWallet}`);

  res.json({ source: "live", costUSDC: 0.01, data: extractedData });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`x402 M2M Utility running on port ${PORT}`);
});
