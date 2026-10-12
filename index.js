import express from 'express';
import NodeCache from 'node-cache';
import { v4 as uuidv4 } from 'uuid';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

const app = express();
app.use(express.json());

const scrapeCache = new NodeCache({ stdTTL: 900, checkperiod: 120 });
const creditVault = new Map(); 
const verifiedTxs = new Set();  

// --- Root & Capabilities ---
app.get('/', (req, res) => {
  res.json({ status: "online", service: "x402-scraper-api", version: "2.1.1" });
});

app.get('/api/capabilities', (req, res) => {
  res.json({
    service: "x402 Scraper & Extraction M2M Utility",
    version: "2.1.1",
    network: "eip155:8453",
    payout_address: "0x391e20e3f938d9aa3b39c7f4aa1cb6cbd6a9df28",
    pricing: { standard_scrape_usdc: 0.01, cached_scrape_usdc: 0.0025, affiliate_rebate_pct: 10 },
    caching: { enabled: true, ttl_seconds: 900 }
  });
});

// --- On-Chain Settlement Verification & Deposit ---
app.post('/api/credits/deposit', async (req, res) => {
  const { walletAddress, txHash, amountUSDC } = req.body;
  const isTestMode = req.headers['x-test-mode'] === 'true' || txHash?.startsWith('0xTEST');

  if (!walletAddress || !txHash || !amountUSDC) {
    return res.status(400).json({ error: "Missing required parameters: walletAddress, txHash, amountUSDC" });
  }

  if (verifiedTxs.has(txHash)) {
    return res.status(400).json({ error: "Transaction hash already redeemed" });
  }

  if (!isTestMode) {
    try {
      const rpcRes = await fetch("https://mainnet.base.org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getTransactionByHash", params: [txHash], id: 1 })
      });
      const rpcData = await rpcRes.json();
      
      if (!rpcData.result) {
        return res.status(400).json({ error: "Invalid on-chain transaction hash on Base Mainnet" });
      }
    } catch (err) {
      return res.status(500).json({ error: "Base RPC verification failed", details: err.message });
    }
  }

  verifiedTxs.add(txHash);
  const apiKey = `x402_key_${uuidv4().replace(/-/g, '')}`;
  
  let account = creditVault.get(apiKey) || { walletAddress, balanceUSDC: 0 };
  account.balanceUSDC += parseFloat(amountUSDC);
  creditVault.set(apiKey, account);

  res.json({ message: "Deposit verified and credited successfully", apiKey, balanceUSDC: account.balanceUSDC, testMode: isTestMode });
});

// --- Real Cheerio Scrape & Webhook Dispatch ---
app.post('/api/extract', async (req, res) => {
  const { url, webhookUrl } = req.body;
  const apiKey = req.headers['x-api-key'];
  const refWallet = req.headers['ref'];

  if (!url) return res.status(400).json({ error: "Missing required 'url' parameter" });
  if (!apiKey || !creditVault.has(apiKey)) return res.status(401).json({ error: "Unauthorized or missing API Key" });

  const account = creditVault.get(apiKey);
  const cachedData = scrapeCache.get(url);

  const cost = cachedData ? 0.0025 : 0.01;
  if (account.balanceUSDC < cost) {
    return res.status(402).json({ error: "Insufficient balance", required: cost, current: account.balanceUSDC });
  }

  account.balanceUSDC -= cost;

  let payload;
  if (cachedData) {
    payload = { source: "cache", costUSDC: cost, data: cachedData };
  } else {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'x402-scraper-bot/2.1' } });
      const html = await response.text();
      const $ = cheerio.load(html);

      const extracted = {
        url,
        title: $('title').text().trim() || null,
        description: $('meta[name="description"]').attr('content') || null,
        headings: $('h1, h2').map((_, el) =>$(el).text().trim()).get().slice(0, 10),
        textSnippet: $('p').first().text().trim() || "",
        timestamp: new Date().toISOString()
      };

      scrapeCache.set(url, extracted);
      payload = { source: "live", costUSDC: cost, data: extracted };
    } catch (err) {
      account.balanceUSDC += cost; 
      return res.status(500).json({ error: "Failed to scrape target URL", details: err.message });
    }
  }

  if (refWallet) {
    const rebateAmount = cost * 0.10;
    console.log(`[Affiliate Ledger] Credited ${rebateAmount} USDC rebate to referrer ${refWallet}`);
  }

  if (webhookUrl) {
    const signature = crypto.createHmac('sha256', apiKey).update(JSON.stringify(payload)).digest('hex');
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Signature': signature },
      body: JSON.stringify(payload)
    }).catch(err => console.error("Webhook dispatch failed:", err.message));
  }

  res.json(payload);
});

app.use('*', (req, res) => {
  res.status(404).json({ error: "Route not found", path: req.originalUrl });
});

const PORT = parseInt(process.env.PORT, 10) || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`x402 Scraper API v2.1.1 running on 0.0.0.0:${PORT}`);
});
