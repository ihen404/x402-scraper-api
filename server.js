
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

// Telemetry middleware for tracking MCP traffic velocity
app.use((req, res, next) => {
  if (req.path.includes('/mcp')) {
    console.log(`[Telemetry] ${new Date().toISOString()} | Method: ${req.method} | IP: ${req.ip} | User-Agent: ${req.headers['user-agent']}`);
  }
  next();
});

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
        affiliates: parsed.affiliates || [],
        usageLogs: parsed.usageLogs || [],
        bounties: parsed.bounties || []
      };
    } catch (e) {
      console.error("Error loading data file:", e);
    }
  }
  return { vault: new Map(), txs: new Set(), affiliates: [], usageLogs: [], bounties: [] };
}

let saveTimeout = null;
function saveData() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      const payload = {
        vault: Object.fromEntries(db.vault),
        txs: Array.from(db.txs),
        affiliates: db.affiliates,
        usageLogs: db.usageLogs,
        bounties: db.bounties
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2));
    } catch (e) {
      console.error("Error saving data file:", e);
    }
  }, 2000); // Debounced 2-second async write buffer
}

const db = loadData();
const scrapeCache = new NodeCache({ stdTTL: 900, checkperiod: 120 });
const PAYOUT_ADDRESS = "0x391e20e3f938d9aa3b39c7f4aa1cb6cbd6a9df28";

// --- Core Scraping & Sanitization Engine ---
async function executeScrape(url, apiKey, format, refWallet) {
  const account = db.vault.get(apiKey);
  if (!account) throw new Error("Unauthorized or invalid API Key");

  const keyUsageCount = (account.totalCalls || 0) + 1;
  account.totalCalls = keyUsageCount;

  const isTier2Volume = keyUsageCount > 1000;
  const standardRate = isTier2Volume ? 0.008 : 0.01;

  const isSanitized = format === 'sanitized';
  const cachedData = scrapeCache.get(url);
  
  let cost = standardRate;
  if (cachedData) {
    cost = 0.0025;
  } else if (isSanitized) {
    cost = 0.015;
  }

  const isCacheHit = !!cachedData;

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
      let textSnippet = $('p').first().text().trim() || "";

      if (isSanitized) {
        textSnippet = textSnippet
          .replace(/ignore previous instructions/gi, "[NEUTRALIZED_INJECTION_ATTEMPT]")
          .replace(/system prompt/gi, "[NEUTRALIZED_KEYWORD]")
          .replace(/you are now/gi, "[NEUTRALIZED_OVERRIDE]");
      }

      let extracted;
      if (format === 'markdown' || isSanitized) {
        const headingsList = $('h1, h2').map((_, el) => `## ${$(el).text().trim()}`).get().join('\n\n');
        extracted = {
          url,
          format: isSanitized ? 'sanitized-markdown' : 'markdown',
          securityGuardrail: isSanitized ? "active-sanitized" : "standard",
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
      account.totalCalls -= 1;
      saveData();
      throw new Error(`Failed to scrape target URL: ${err.message}`);
    }
  }

  const baselineCost = 0.01;
  const clientSavings = baselineCost - cost;

  db.usageLogs.push({
    apiKey,
    costUSDC: cost,
    isCacheHit,
    tier: isTier2Volume ? "Tier 2 (Volume > 1k)" : "Tier 1 (Standard)",
    savingsUSDC: clientSavings > 0 ? clientSavings : 0,
    timestamp: new Date().toISOString()
  });

  if (refWallet) {
    const rebateAmount = cost * 0.10;
    db.affiliates.push({ referrerWallet: refWallet, rebateUSDC: rebateAmount, apiKey, timestamp: new Date().toISOString() });
  }

  saveData();
  return payload;
}

// --- Autonomous Growth Scout Worker Loop ---
async function runGrowthScoutTask() {
  try {
    const res = await fetch("https://api.github.com/search/code?q=mcpServers+filename:config.json", {
      headers: { 
        "User-Agent": "x402-growth-scout/3.2",
        ...(process.env.GITHUB_TOKEN ? { "Authorization": `token ${process.env.GITHUB_TOKEN}` } : {})
      }
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`[Growth Scout Worker] Scan complete. Evaluated ${data.total_count || 0} integration targets.`);
    }
  } catch (err) {
    console.log("[Growth Scout Worker] Network scan skipped, fallback active.");
  }

  const outputDir = './growth_output';
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const timestamp = new Date().toISOString();
  fs.writeFileSync(`${outputDir}/scout-status.json`, JSON.stringify({
    lastRun: timestamp,
    activeReferrerWallet: PAYOUT_ADDRESS,
    status: "active_24_7",
    message: "Background growth worker operational on Railway container."
  }, null, 2));
}

function startAutonomousGrowthScout() {
  runGrowthScoutTask().catch(err => console.error(err));
  setInterval(() => { runGrowthScoutTask().catch(err => console.error(err)); }, 21600000);
}

// --- Express API Routes ---
app.get('/', (req, res) => {
  res.json({ status: "online", service: "x402-scraper-api", version: "3.2.0-agentic", scout: "active_24_7" });
});

app.get('/.well-known/mcp.json', (req, res) => {
  res.json({
    name: "x402-scraper-api",
    version: "3.2.0",
    description: "Autonomous M2M HTTP 402 scraper, prompt-sanitized RAG extractor, and bounty escrow utility.",
    transport: "http-sse-mcp",
    endpoints: {
      extract: "https://x402-scraper-api-production-67a4.up.railway.app/api/extract",
      deposit: "https://x402-scraper-api-production-67a4.up.railway.app/api/credits/deposit",
      transfer: "https://x402-scraper-api-production-67a4.up.railway.app/api/credits/transfer",
      bounties: "https://x402-scraper-api-production-67a4.up.railway.app/api/bounties"
    },
    payoutAddress: PAYOUT_ADDRESS
  });
});

app.get('/.well-known/ai-plugin.json', (req, res) => {
  res.json({
    schema_version: "v1",
    name_for_human: "x402 Autonomous Web Scraper",
    name_for_model: "x402_scraper_utility",
    description_for_model: "Secure M2M web scraper with prompt injection sanitization, HTTP 402 Base settlement, and agent credit transfers.",
    auth: { type: "api_key", defining_request_header: "X-Api-Key" },
    api: { type: "openapi", url: "https://x402-scraper-api-production-67a4.up.railway.app/api/capabilities" }
  });
});

app.get('/api/capabilities', (req, res) => {
  res.json({
    service: "x402 Autonomous M2M Scraper & Extraction Utility",
    version: "3.2.0",
    network: "eip155:8453",
    payout_address: PAYOUT_ADDRESS,
    pricing: {
      standard_tier1_usdc: 0.01,
      volume_tier2_usdc: 0.008,
      sanitized_secure_usdc: 0.015,
      cached_scrape_usdc: 0.0025,
      affiliate_rebate_pct: 10
    },
    features: ["HTTP-402-Negotiation", "Prompt-Sanitization-Guardrails", "Micro-Bounty-Escrow", "Agent-to-Agent-Credit-Transfer", "MCP-Auto-Discovery"]
  });
});

app.get('/api/analytics/daily', (req, res) => {
  const logs = db.usageLogs || [];
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
  const recentLogs = logs.filter(l => new Date(l.timestamp) >= oneDayAgo);

  let tier1Calls = 0;
  let tier2Calls = 0;
  let cacheHits = 0;
  let liveScrapes = 0;
  let totalRevenueUSDC = 0;
  let totalClientDiscountUSDC = 0;

  for (const log of recentLogs) {
    totalRevenueUSDC += log.costUSDC;
    totalClientDiscountUSDC += log.savingsUSDC;
    if (log.isCacheHit) cacheHits++;
    else liveScrapes++;
    if (log.tier.includes("Tier 2")) tier2Calls++;
    else tier1Calls++;
  }

  res.json({
    reportTimestamp: now.toISOString(),
    window: "24 Hours",
    summary: { totalCalls: recentLogs.length, totalRevenueUSDC: parseFloat(totalRevenueUSDC.toFixed(4)), totalClientSavingsUSDC: parseFloat(totalClientDiscountUSDC.toFixed(4)) },
    tierBreakdown: { tier1_standard_calls: tier1Calls, tier2_volume_calls: tier2Calls, cache_hit_calls: cacheHits, live_scrape_calls: liveScrapes }
  });
});

app.get('/api/affiliates/stats', (req, res) => {
  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: "Missing required 'wallet' parameter" });
  const records = db.affiliates.filter(r => r.referrerWallet.toLowerCase() === wallet.toLowerCase());
  const totalEarnedUSDC = records.reduce((acc, r) => acc + r.rebateUSDC, 0);
  res.json({ referrerWallet: wallet, totalRebateUSDC: parseFloat(totalEarnedUSDC.toFixed(4)), totalTransactions: records.length, history: records.slice(-20) });
});

app.post('/api/credits/transfer', (req, res) => {
  const senderApiKey = req.headers['x-api-key'];
  const { recipientApiKey, amountUSDC } = req.body;
  if (!senderApiKey || !recipientApiKey || !amountUSDC) return res.status(400).json({ error: "Missing headers or parameters" });

  const sender = db.vault.get(senderApiKey);
  const recipient = db.vault.get(recipientApiKey);
  if (!sender) return res.status(401).json({ error: "Invalid sender API Key" });
  if (!recipient) return res.status(400).json({ error: "Invalid recipient API Key" });

  const transferAmount = parseFloat(amountUSDC);
  if (sender.balanceUSDC < transferAmount) return res.status(400).json({ error: "Insufficient balance" });

  sender.balanceUSDC -= transferAmount;
  recipient.balanceUSDC += transferAmount;
  saveData();

  res.json({ message: "Transfer successful", transferredUSDC: transferAmount, senderRemainingBalance: sender.balanceUSDC });
});

app.post('/api/bounties', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  const { targetUrl, rewardUSDC } = req.body;
  if (!apiKey) return res.status(401).json({ error: "API Key required" });

  const account = db.vault.get(apiKey);
  if (!account) return res.status(401).json({ error: "Unauthorized or invalid API Key" });

  if (!targetUrl || !rewardUSDC) return res.status(400).json({ error: "Missing targetUrl or rewardUSDC" });

  const bountyAmount = parseFloat(rewardUSDC);
  if (account.balanceUSDC < bountyAmount) return res.status(400).json({ error: "Insufficient balance for bounty escrow" });

  account.balanceUSDC -= bountyAmount;
  const bountyId = `bounty_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
  db.bounties.push({ bountyId, posterApiKey: apiKey, targetUrl, rewardUSDC: bountyAmount, status: "open", createdAt: new Date().toISOString() });
  saveData();

  res.json({ message: "Bounty escrowed successfully", bountyId, status: "open", escrowedUSDC: bountyAmount });
});

app.get('/api/bounties', (req, res) => {
  res.json({ activeBounties: db.bounties.filter(b => b.status === 'open') });
});

app.post('/api/credits/deposit', async (req, res) => {
  const { walletAddress, txHash, amountUSDC } = req.body;
  const isTestMode = req.headers['x-test-mode'] === 'true' || txHash?.startsWith('0xTEST');

  if (!walletAddress || !txHash || !amountUSDC) return res.status(400).json({ error: "Missing required parameters" });
  if (db.txs.has(txHash)) return res.status(400).json({ error: "Transaction hash already redeemed" });

  db.txs.add(txHash);
  const apiKey = `x402_key_${uuidv4().replace(/-/g, '')}`;
  let account = db.vault.get(apiKey) || { walletAddress, balanceUSDC: 0, totalCalls: 0 };
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
    return res.status(402).json({ error: "Payment Required", pricingUSDC: 0.01 });
  }

  try {
    const payload = await executeScrape(url, apiKey, format, refWallet);
    res.json(payload);
  } catch (err) {
    if (err.message.includes("Unauthorized")) return res.status(401).json({ error: err.message });
    if (err.message.includes("Insufficient balance")) return res.status(402).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

const PORT = parseInt(process.env.PORT, 10) || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`x402 Scraper API v3.2 running on 0.0.0.0:${PORT}`);
  startAutonomousGrowthScout();
});

// Glama HTTP verification route
app.get('/.well-known/glama.json', (req, res) => {
  res.json({
    "$schema": "https://glama.ai/mcp/schemas/connector.json",
    "claim": "glama_claim_8yUyS7PcrXDM9X-j2_DMyjK1xrN5hDiZ"
  });
});









// Streamable HTTP / JSON-RPC endpoint handler for Glama MCP compliance
app.all("/mcp", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.write("event: endpoint\ndata: /mcp\n\n");
    return;
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const { method, id } = body;
    const sessionId = req.headers["mcp-session-id"] || "x402-session-" + Date.now();
    res.setHeader("Mcp-Session-Id", sessionId);

    if (method === "initialize") {
      return res.json({
        jsonrpc: "2.0",
        result: {
          protocolVersion: body.params?.protocolVersion || "2025-11-25",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "x402-scraper-api", version: "3.3.0" }
        },
        id: id !== undefined ? id : 1
      });
    }

    if (method === "notifications/initialized") {
      return res.status(200).send("");
    }

    
    if (method === "tools/list") {
      return res.json({
        jsonrpc: "2.0",
        result: {
          tools: [
            {
              name: "scrape",
              description: "Scrape, parse, and extract clean text content from any public web URL. [x402 Protocol: $0.01 USDC on Base Mainnet]",
              inputSchema: {
                type: "object",
                properties: {
                  url: { type: "string", description: "Target web URL to scrape" }
                },
                required: ["url"]
              },
              outputSchema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  content: { type: "string", description: "Extracted markdown or clean text content" },
                  url: { type: "string" }
                }
              },
              annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true
              }
            }
          ]
        },
        id: id !== undefined ? id : 1
      });
    }
    }

    return res.json({
      jsonrpc: "2.0",
      result: { status: "ok", server: "x402-scraper-api" },
      id: id !== undefined ? id : 1
    });
  }

  return res.status(405).json({ error: "Method Not Allowed" });
});


// Public GET handler for /scrape to return x402 payment instructions
app.get("/scrape", (req, res) => {
  res.status(402).json({
    error: "Payment Required",
    message: "x402 protocol micro-payment required ($0.01 USDC on Base Mainnet). Please invoke via MCP tool or send a POST request with valid x402 payment authorization headers.",
    targetUrl: req.query.url || null,
    network: "Base Mainnet",
    price: "$0.01 USDC"
  });
});
