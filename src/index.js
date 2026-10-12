import express from 'express';
import discoveryRouter from './routes/discovery.js';
import { createCreditAccount, verifyAndDeductCredit } from './services/creditsService.js';
import { getCachedResult, setCachedResult, processAffiliateRebate, sendWebhookWithRetry } from './services/utilityService.js';

const app = express();
app.use(express.json());

// Mount Discovery & A2A Handshake routes
app.use('/api', discoveryRouter);

// Pre-paid credit account creation endpoint
app.post('/api/credits/deposit', (req, res) => {
  const { walletAddress, amountUSDC } = req.body;
  if (!walletAddress || !amountUSDC) {
    return res.status(400).json({ error: "Missing walletAddress or amountUSDC" });
  }
  const account = createCreditAccount(walletAddress, amountUSDC);
  res.json({ message: "Credit account funded successfully", ...account });
});

// Core Scrape Endpoint with Caching, Referrals, and Credit Deduction
app.post('/api/extract', async (req, res) => {
  const { url } = req.body;
  const apiKey = req.headers['x-api-key'];
  const refWallet = req.headers['ref'];

  if (!url) {
    return res.status(400).json({ error: "Missing required 'url' parameter" });
  }

  const standardCost = 0.01;
  const cachedCost = 0.0025;

  // 1. Check Caching Layer
  const cachedData = getCachedResult(url);
  if (cachedData) {
    const cost = cachedCost;
    if (apiKey) {
      const deduction = verifyAndDeductCredit(apiKey, cost);
      if (!deduction.valid) return res.status(402).json({ error: deduction.reason });
    }
    processAffiliateRebate(refWallet, cost);
    return res.json({ source: "cache", costUSDC: cost, data: cachedData });
  }

  // 2. Handle Payment/Credits for Fresh Scrape
  if (apiKey) {
    const deduction = verifyAndDeductCredit(apiKey, standardCost);
    if (!deduction.valid) return res.status(402).json({ error: deduction.reason });
  }

  // Perform mock/live extraction
  const extractedData = {
    url,
    title: `Extracted title for ${url}`,
    timestamp: new Date().toISOString()
  };

  // Save to cache
  setCachedResult(url, extractedData);

  // Process affiliate rebate
  processAffiliateRebate(refWallet, standardCost);

  res.json({ source: "live", costUSDC: standardCost, data: extractedData });
});

// Async Webhook Endpoint with Retry Logic
app.post('/api/extract/webhook', async (req, res) => {
  const { url, callbackUrl } = req.body;
  if (!url || !callbackUrl) {
    return res.status(400).json({ error: "Missing 'url' or 'callbackUrl'" });
  }

  // Acknowledge immediately
  res.json({ status: "processing", message: "Extraction queued. Results will be delivered via webhook with exponential backoff." });

  // Simulate background scrape and dispatch
  setTimeout(async () => {
    const result = { url, extractedAt: new Date().toISOString(), content: "Async scraped payload..." };
    await sendWebhookWithRetry(callbackUrl, result);
  }, 500);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`x402 M2M Utility running on port ${PORT}`);
});
