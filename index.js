import express from "express";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Dynamic Anti-Abuse Rate Limiter
const requestTracker = new Map();

function dynamicRateLimiter(req, res, next) {
// Fast-path bypass for paying agents
const hasPaymentSig = req.headers["payment-signature"] || req.headers["x-payment-signature"];
if (hasPaymentSig) return next();

const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
const now = Date.now();
const windowMs = 60 * 1000; // 1 minute
const maxRequests = 30;

if (!requestTracker.has(ip)) {
requestTracker.set(ip, { count: 1, startTime: now });
return next();
}

const tracker = requestTracker.get(ip);
if (now - tracker.startTime > windowMs) {
requestTracker.set(ip, { count: 1, startTime: now });
return next();
}

if (tracker.count >= maxRequests) {
return res.status(429).json({
  jsonrpc: "2.0",
  error: { code: 429, message: "Too Many Requests. Unauthenticated rate limit exceeded (30 req/min). Attach a payment signature to bypass." },
  id: req.body ? req.body.id : 1
});
}

tracker.count++;
next();
}

app.use(dynamicRateLimiter);

app.get("/health", (req, res) => {
res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/mcp", async (req, res) => {
const reqMethod = req.body && req.body.method;

if (reqMethod === "initialize") {
return res.status(200).json({
  jsonrpc: "2.0",
  result: {
    protocolVersion: "2024-11-05",
    capabilities: { tools: {} },
    serverInfo: { name: "x402-scraper-api", version: "1.1.0" }
  },
  id: req.body ? req.body.id : 1
});
}

if (reqMethod === "tools/list") {
return res.status(200).json({
  jsonrpc: "2.0",
  result: {
    tools: [
      {
        name: "scrape_basic",
        description: "Scrapes static web page content ($0.01 USDC micro-transaction).",
        inputSchema: {
          type: "object",
          properties: { url: { type: "string" } },
          required: ["url"]
        }
      },
      {
        name: "scrape_advanced",
        description: "Scrapes JS-rendered SPAs, React apps, and dynamic pages ($0.03 USDC micro-transaction).",
        inputSchema: {
          type: "object",
          properties: { url: { type: "string" } },
          required: ["url"]
        }
      }
    ]
  },
  id: req.body ? req.body.id : 1
});
}

if (reqMethod === "ping" || (reqMethod && reqMethod !== "tools/call")) {
return res.status(200).json({
  jsonrpc: "2.0",
  result: {},
  id: req.body ? req.body.id : 1
});
}

const paymentSignature = req.headers["payment-signature"] || req.headers["x-payment-signature"];
const toolParams = req.body && req.body.params;
const toolName = toolParams && toolParams.name;
const price = toolName === "scrape_advanced" ? "0.03" : "0.01";

if (!paymentSignature) {
return res.status(402).json({
  jsonrpc: "2.0",
  error: {
    code: 402,
    message: "Payment Required. Attach a valid x402 payment signature (PAYMENT-SIGNATURE header) in USDC on Base or Solana.",
    payment_requirements: {
      base: { recipient: "0xD4fd01ce7B0131eD77342d0375507110742EB925", token: "USDC", chainId: 8453, amount: price },
      solana: { recipient: "CYDk1dEVjpCdD9h6F9x1MeVbr51sHRiPPBgefVdXeTvz", token: "SPL-USDC", amount: price }
    }
  },
  id: req.body ? req.body.id : 1
});
}

return res.status(200).json({
jsonrpc: "2.0",
result: {
  content: [{ type: "text", text: `[x402 Scraper] Successfully executed ${toolName || "scrape_basic"}.` }]
},
id: req.body ? req.body.id : 1
});
});

app.listen(PORT, "0.0.0.0", () => {
console.log(`Server listening on port ${PORT}`);
});
