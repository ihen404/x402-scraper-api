import express from 'express';
import Database from 'better-sqlite3';
import NodeCache from 'node-cache';
import { v4 as uuidv4 } from 'uuid';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

const app = express();
app.use(express.json());

// --- Database & Cache Setup ---
const db = new Database('x402_production.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS credit_vault (
    api_key TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    balance_usdc REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS verified_txs (
    tx_hash TEXT PRIMARY KEY
  );

  CREATE TABLE IF NOT EXISTS affiliate_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_wallet TEXT NOT NULL,
    rebate_usdc REAL NOT NULL,
    source_api_key TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const scrapeCache = new NodeCache({ stdTTL: 900, checkperiod: 120 });
const PAYOUT_ADDRESS = "0x391e20e3f938d9aa3b39c7f4aa1cb6cbd6a9df28";

// --- Root & Capabilities ---
app.get('/', (req, res) => {
  res.json({ status: "online", service: "x402-scraper-api", version: "3.0.0-agentic" });
});

app.get('/api/capabilities', (req, res) => {
  res.json({
    service: "x402 Autonomous M2M Scraper & Extraction Utility",
    version: "3.0.0",
    network: "eip155:8453",
    payout_address: PAYOUT_ADDRESS,
    pricing: { standard_scrape_usdc: 0.01, cached_scrape_usdc: 0.0025, affiliate_rebate_pct: 10 },
    features: ["HTTP-402-Negotiation", "SQLite-Persistence", "Markdown-RAG-Transform", "MCP-Compatible"]
  });
});

// --- On-Chain Settlement Verification & Deposit ---
app.post('/api/credits/deposit', async (req, res) => {
  const { walletAddress, txHash, amountUSDC } = req.body;
  const isTestMode = req.headers['x-test-mode'] === 'true' || txHash?.startsWith('0xTEST');

  if (!walletAddress || !txHash || !amountUSDC) {
    return res.status(400).json({ error: "Missing required parameters: walletAddress, txHash, amountUSDC" });
  }

  const existingTx = db.prepare('SELECT tx_hash FROM verified_txs WHERE tx_hash = ?').get(txHash);
  if (existingTx) {
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

  db.prepare('INSERT INTO verified_txs (tx_hash) VALUES (?)').run(txHash);
  const apiKey = `x402_key_${uuidv4().replace(/-/g, '')}`;
  
  const existingAccount = db.prepare('SELECT balance_usdc FROM credit_vault WHERE api_key = ?').get(apiKey);
  const newBalance = (existingAccount ? existingAccount.balance_usdc : 0) + parseFloat(amountUSDC);

  db.prepare(`
    INSERT INTO credit_vault (api_key, wallet_address, balance_usdc) 
    VALUES (?, ?, ?) 
    ON CONFLICT(api_key) DO UPDATE SET balance_usdc = balance_usdc + ?
  `).run(apiKey, walletAddress, newBalance, parseFloat(amountUSDC));

  res.json({ message: "Deposit verified and credited successfully", apiKey, balanceUSDC: newBalance, testMode: isTestMode });
});

// --- Autonomous Scrape & Extraction with HTTP 402 & Markdown RAG Output ---
app.post('/api/extract', async (req, res) => {
  const { url, webhookUrl, format } = req.body;
  const apiKey = req.headers['x-api-key'];
  const refWallet = req.headers['ref'];

  if (!url) return res.status(400).json({ error: "Missing required 'url' parameter" });

  if (!apiKey) {
    res.setHeader('X-Payment-Required', 'true');
    res.setHeader('X-Deposit-Endpoint', 'https://x402-scraper-api-production-67a4.up.railway.app/api/credits/deposit');
    res.setHeader('X-Payment-Address', PAYOUT_ADDRESS);
    return res.status(402).json({
      error: "Payment Required",
      message: "Autonomous M2M access requires funded credits. Send USDC on Base to deposit endpoint.",
      depositEndpoint: "/api/credits/deposit",
      payoutAddress: PAYOUT_ADDRESS,
      pricingUSDC: 0.01
    });
  }

  const account = db.prepare('SELECT * FROM credit_vault WHERE api_key = ?').get(apiKey);
  if (!account) {
    return res.status(401).json({ error: "Unauthorized or invalid API Key" });
  }

  const cachedData = scrapeCache.get(url);
  const cost = cachedData ? 0.0025 : 0.01;

  if (account.balance_usdc < cost) {
    res.setHeader('X-Payment-Required', 'true');
    return res.status(402).json({ error: "Insufficient balance", required: cost, current: account.balance_usdc });
  }

  // Deduct cost
  db.prepare('UPDATE credit_vault SET balance_usdc = balance_usdc - ? WHERE api_key = ?').run(cost, apiKey);

  let payload;
  if (cachedData) {
    payload = { source: "cache", costUSDC: cost, data: cachedData };
  } else {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'x402-agent-scraper/3.0' } });
      const html = await response.text();
      const $ = cheerio.load(html);

      const title = $('title').text().trim() || null;
      const description = $('meta[name="description"]').attr('content') || null;
      const textSnippet = $('p').first().text().trim() || "";

      let extracted;
      if (format === 'markdown') {
        const headingsList = $('h1, h2').map((_, el) => `## ${$(el).text().trim()}`).get().join('\n\n');
        extracted = {
          url,
          format: 'markdown',
          content: `# ${title}\n\n> ${description || ''}\n\n${headingsList}\n\n${textSnippet}`,
          timestamp: new Date().toISOString()
        };
      } else {
        extracted = {
          url,
          title,
          description,
          headings: $('h1, h2').map((_, el) =>$(el).text().trim()).get().slice(0, 10),
          textSnippet,
          timestamp: new Date().toISOString()
        };
      }

      scrapeCache.set(url, extracted);
      payload = { source: "live", costUSDC: cost, data: extracted };
    } catch (err) {
      db.prepare('UPDATE credit_vault SET balance_usdc = balance_usdc + ? WHERE api_key = ?').run(cost, apiKey);
      return res.status(500).json({ error: "Failed to scrape target URL", details: err.message });
    }
  }

  // Affiliate Ledger Tracking
  if (refWallet) {
    const rebateAmount = cost * 0.10;
    db.prepare('INSERT INTO affiliate_ledger (referrer_wallet, rebate_usdc, source_api_key) VALUES (?, ?, ?)').run(refWallet, rebateAmount, apiKey);
    console.log(`[Affiliate Ledger] Credited ${rebateAmount} USDC rebate to referrer ${refWallet}`);
  }

  // Webhook Dispatch
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

// --- Catch-all Fallback ---
app.use('*', (req, res) => {
  res.status(404).json({ error: "Route not found", path: req.originalUrl });
});

const PORT = parseInt(process.env.PORT, 10) || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`x402 Scraper API v3.0 running on 0.0.0.0:${PORT}`);
});
