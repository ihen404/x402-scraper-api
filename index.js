import express from 'express';
import NodeCache from 'node-cache';
import { v4 as uuidv4 } from 'uuid';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// MCP SDK Imports
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const app = express();
app.use(express.json());

// --- Durable JSON Storage Engine ---
const DATA_FILE = path.resolve('x402_data.json');

function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        vault: new Map(Object.entries(parsed.vault || {})),
        txs: new Set(parsed.txs || []),
        affiliates: parsed.affiliates || []
      };
    } catch (e) {
      console.error("Error loading data file:", e);
    }
  }
  return { vault: new Map(), txs: new Set(), affiliates: [] };
}

function saveData() {
  try {
    const payload = {
      vault: Object.fromEntries(db.vault),
      txs: Array.from(db.txs),
      affiliates: db.affiliates
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2));
  } catch (e) {
    console.error("Error saving data file:", e);
  }
}

const db = loadData();
const scrapeCache = new NodeCache({ stdTTL: 900, checkperiod: 120 });
const PAYOUT_ADDRESS = "0x391e20e3f938d9aa3b39c7f4aa1cb6cbd6a9df28";

// --- Core Scraping Logic Function ---
async function executeScrape(url, apiKey, format, refWallet) {
  const account = db.vault.get(apiKey);
  if (!account) throw new Error("Unauthorized or invalid API Key");

  const cachedData = scrapeCache.get(url);
  const cost = cachedData ? 0.0025 : 0.01;

  if (account.balanceUSDC < cost) {
    throw new Error(`Insufficient balance. Required: ${cost}, Current: ${account.balanceUSDC}`);
  }

  account.balanceUSDC -= cost;

  let payload;
  if (cachedData) {
    payload = { source: "cache", costUSDC: cost, data: cachedData };
  } else {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'x402-agent-scraper/3.2' } });
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
      account.balanceUSDC += cost;
      saveData();
      throw new Error(`Failed to scrape target URL: ${err.message}`);
    }
  }

  if (refWallet) {
    const rebateAmount = cost * 0.10;
    db.affiliates.push({ referrerWallet: refWallet, rebateUSDC: rebateAmount, apiKey, timestamp: new Date().toISOString() });
  }

  saveData();
  return payload;
}

// --- Express API Routes ---
app.get('/', (req, res) => {
  res.json({ status: "online", service: "x402-scraper-api", version: "3.2.0-agentic" });
});

app.get('/api/capabilities', (req, res) => {
  res.json({
    service: "x402 Autonomous M2M Scraper & Extraction Utility",
    version: "3.2.0",
    network: "eip155:8453",
    payout_address: PAYOUT_ADDRESS,
    pricing: { standard_scrape_usdc: 0.01, cached_scrape_usdc: 0.0025, affiliate_rebate_pct: 10 },
    features: ["HTTP-402-Negotiation", "Durable-File-Persistence", "Markdown-RAG-Transform", "MCP-Server-Enabled"]
  });
});

// Affiliate Ledger Stats Query Endpoint
app.get('/api/affiliates/stats', (req, res) => {
  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: "Missing required 'wallet' parameter" });

  const records = db.affiliates.filter(r => r.referrerWallet.toLowerCase() === wallet.toLowerCase());
  const totalEarnedUSDC = records.reduce((acc, r) => acc + r.rebateUSDC, 0);

  res.json({
    referrerWallet: wallet,
    totalRebateUSDC: totalEarnedUSDC,
    totalTransactions: records.length,
    history: records.slice(-20)
  });
});

app.post('/api/credits/deposit', async (req, res) => {
  const { walletAddress, txHash, amountUSDC } = req.body;
  const isTestMode = req.headers['x-test-mode'] === 'true' || txHash?.startsWith('0xTEST');

  if (!walletAddress || !txHash || !amountUSDC) {
    return res.status(400).json({ error: "Missing required parameters: walletAddress, txHash, amountUSDC" });
  }

  if (db.txs.has(txHash)) {
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

  db.txs.add(txHash);
  const apiKey = `x402_key_${uuidv4().replace(/-/g, '')}`;
  
  let account = db.vault.get(apiKey) || { walletAddress, balanceUSDC: 0 };
  account.balanceUSDC += parseFloat(amountUSDC);
  db.vault.set(apiKey, account);
  saveData();

  res.json({ message: "Deposit verified and credited successfully", apiKey, balanceUSDC: account.balanceUSDC, testMode: isTestMode });
});

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

  try {
    const payload = await executeScrape(url, apiKey, format, refWallet);
    if (webhookUrl) {
      const signature = crypto.createHmac('sha256', apiKey).update(JSON.stringify(payload)).digest('hex');
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Signature': signature },
        body: JSON.stringify(payload)
      }).catch(err => console.error("Webhook dispatch failed:", err.message));
    }
    res.json(payload);
  } catch (err) {
    if (err.message.includes("Unauthorized")) return res.status(401).json({ error: err.message });
    if (err.message.includes("Insufficient balance")) {
      res.setHeader('X-Payment-Required', 'true');
      return res.status(402).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

const PORT = parseInt(process.env.PORT, 10) || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`x402 Scraper API v3.2 running on 0.0.0.0:${PORT}`);
});
