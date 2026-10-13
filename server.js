import express from "express";
import rateLimit from "express-rate-limit";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later." }
});
app.use(limiter);

const telemetry = {
  totalRequests: 0,
  mcpToolCalls: 0,
  mcpToolCallsBasic: 0,
  mcpToolCallsDynamic: 0,
  mcpToolCallsStructured: 0,
  x402ChallengesIssued: 0,
  uniqueSessions: new Set()
};

let lastAlertedRevenue = 0;

app.use((req, res, next) => {
  telemetry.totalRequests++;
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  if (clientIp) telemetry.uniqueSessions.add(clientIp);
  next();
});

app.get("/", (req, res) => {
  res.json({
    name: "x402-scraper-api",
    version: "3.5.0",
    status: "online",
    docs: "https://github.com/ihen404/x402-scraper-api"
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/.well-known/mcp/server-card.json", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json({
    schemaVersion: "1.0",
    serverInfo: {
      name: "x402-scraper-api",
      version: "3.5.0",
      description: "Multi-tiered web scraping MCP server with automated x402 micro-payments on Base Mainnet ($0.01 - $0.15 USDC).",
      homepage: "https://github.com/ihen404/x402-scraper-api"
    },
    transport: {
      type: "streamable-http",
      endpoint: "https://x402-scraper-api-production-67a4.up.railway.app/mcp"
    },
    capabilities: { tools: true },
    tools: [
      {
        name: "scrape_basic",
        description: "Fast DOM parsing and clean Markdown extraction from static HTML. [x402 Protocol: $0.01 USDC on Base]",
        inputSchema: {
          type: "object",
          properties: { url: { type: "string", description: "Target URL to scrape" } },
          required: ["url"]
        },
        outputSchema: {
          type: "object",
          properties: { success: { type: "boolean" }, content: { type: "string" }, url: { type: "string" } }
        },
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
      },
      {
        name: "scrape_dynamic",
        description: "Renders JavaScript-heavy dynamic web pages using headless browser simulation. [x402 Protocol: $0.05 USDC on Base]",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "Target URL to render and scrape" },
            waitForMs: { type: "number", description: "Delay in ms (default: 2000)" }
          },
          required: ["url"]
        },
        outputSchema: {
          type: "object",
          properties: { success: { type: "boolean" }, content: { type: "string" }, url: { type: "string" } }
        },
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
      },
      {
        name: "scrape_structured",
        description: "Scrapes a web page and parses raw content directly into a requested JSON schema format. [x402 Protocol: $0.15 USDC on Base]",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "Target URL to extract structured data from" },
            jsonSchema: { type: "object", description: "Target JSON Schema object for extraction" }
          },
          required: ["url", "jsonSchema"]
        },
        outputSchema: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            extractedData: { type: "object" },
            url: { type: "string" }
          }
        },
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
      }
    ]
  });
});

app.get("/telemetry", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const basic = telemetry.mcpToolCallsBasic || 0;
  const dynamic = telemetry.mcpToolCallsDynamic || 0;
  const structured = telemetry.mcpToolCallsStructured || 0;
  const totalCalls = telemetry.mcpToolCalls || 0;
  const untracked = Math.max(0, totalCalls - (basic + dynamic + structured));
  const totalRevNum = (basic * 0.01) + (dynamic * 0.05) + (structured * 0.15) + (untracked * 0.01);

  return res.json({
    status: "healthy",
    uptimeSeconds: Math.floor(process.uptime()),
    metrics: {
      totalRequests: telemetry.totalRequests,
      mcpToolCalls: { basic, dynamic, structured, total: totalCalls },
      x402ChallengesIssued: telemetry.x402ChallengesIssued,
      estimatedDailyVelocity: Math.round((totalCalls / (process.uptime() || 1)) * 86400),
      activeUniqueSessions: telemetry.uniqueSessions.size,
      estimatedRevenueUsdc: "$" + totalRevNum.toFixed(2)
    },
    serverInfo: {
      name: "x402-scraper-api",
      version: "3.5.0",
      environment: process.env.NODE_ENV || "production"
    }
  });
});

async function sendEmailReport(subject, isDaily = false) {
  const apiKey = process.env.RESEND_API_KEY;
  const alertEmail = process.env.ALERT_EMAIL || "ikehentrel@gmail.com";
  if (!apiKey) return;

  const basicCalls = telemetry.mcpToolCallsBasic || 0;
  const dynamicCalls = telemetry.mcpToolCallsDynamic || 0;
  const structuredCalls = telemetry.mcpToolCallsStructured || 0;
  const totalCalls = telemetry.mcpToolCalls || 0;
  const untrackedCalls = Math.max(0, totalCalls - (basicCalls + dynamicCalls + structuredCalls));
  const totalRev = ((basicCalls * 0.01) + (dynamicCalls * 0.05) + (structuredCalls * 0.15) + (untrackedCalls * 0.01)).toFixed(2);

  const htmlBody = `<div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2 style="color: #0052FF;">📊 x402 Scraper API ${isDaily ? "Daily Performance Report" : "Revenue Milestone"}</h2>
    <p>Automated telemetry report for <b>Base Mainnet</b>:</p>
    <table style="width: 100%; max-width: 500px; border-collapse: collapse;">
      <tr style="background: #f4f4f4;"><th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Metric</th><th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Value</th></tr>
      <tr><td style="padding: 10px; border: 1px solid #ddd;"><b>Total Estimated Revenue</b></td><td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #28a745;"><b>$${totalRev} USDC</b></td></tr>
      <tr><td style="padding: 10px; border: 1px solid #ddd;">Total Requests</td><td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${telemetry.totalRequests}</td></tr>
      <tr><td style="padding: 10px; border: 1px solid #ddd;">MCP Tool Invocations</td><td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${totalCalls}</td></tr>
      <tr><td style="padding: 10px; border: 1px solid #ddd;">• Basic ($0.01)</td><td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${basicCalls}</td></tr>
      <tr><td style="padding: 10px; border: 1px solid #ddd;">• Dynamic ($0.05)</td><td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${dynamicCalls}</td></tr>
      <tr><td style="padding: 10px; border: 1px solid #ddd;">• Structured ($0.15)</td><td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${structuredCalls}</td></tr>
    </table>
    <br/><p><a href="https://x402-scraper-api-production-67a4.up.railway.app/telemetry" style="background: #0052FF; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">View Telemetry Dashboard</a></p>
  </div>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "x402 Scraper API <onboarding@resend.dev>", to: alertEmail, subject, html: htmlBody })
    });
    console.log("[Email Dispatch] Report sent to " + alertEmail);
  } catch (err) {
    console.error("[Email Error]", err);
  }
}

setInterval(() => {
  sendEmailReport("📈 Daily Analytics Report: x402 Scraper API", true);
}, 24 * 60 * 60 * 1000);

setInterval(() => {
  fetch("https://x402-scraper-api-production-67a4.up.railway.app/health").catch(() => {});
}, 4 * 60 * 1000);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Server] x402-scraper-api listening on 0.0.0.0:${PORT}`);
});
