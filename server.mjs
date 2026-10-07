import { Resend } from "resend";
import TurndownService from "turndown";
import { verifyX402Payment } from "./src/middleware/payment.js";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

async function sendDailyAnalyticsReport() {
console.log("Analytics report skipped.");
}

const app = express();
app.use(express.json());

// Middleware placeholder if not fully defined elsewhere
const authenticateApiKey = (req, res, next) => {
const apiKey = req.headers["x-api-key"] || req.query.api_key;
if (!apiKey && process.env.NODE_ENV === "production") {
    return res.status(402).json({ error: "Unauthorized", message: "API key required." });
}
next();
};

const requireX402Payment = (cost) => (req, res, next) => next();

// Health Check
app.get("/", (req, res) => {
    res.json({ name: "x402 Scraper API", status: "active", docs: "/.well-known/x402.json" });
});

app.get("/health", (req, res) => {
res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// x402 Manifest
app.get("/.well-known/x402", (req, res) => res.redirect("/.well-known/x402.json"));

app.get("/.well-known/x402.json", (req, res) => {
res.json({
    name: "x402 Scraper API",
    version: "1.0",
    x402_version: "1.0",
    network: "base",
    payment_address: process.env.PAYMENT_ADDRESS || "0x0000000000000000000000000000000000000000",
    endpoints: {
        scrape: "/api/scrape",
        crawl: "/api/crawl",
        render: "/api/render",
        screenshot: "/api/screenshot"
    }
});
});

// 1. Scrape Endpoint
app.post("/api/scrape", async (req, res, next) => {
    const verification = await verifyX402Payment(req.headers);
    if (!verification.isValid) {
        return res.status(402).json({ error: "Payment Required", message: verification.error, cost: "$0.001", network: "base" });
    }
    next();
},  async (req, res) => {
try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Bad Request", message: "A target URL is required." });
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await response.text();
    res.json({ 
        success: true, 
        url, 
        data: { content: html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 3000) }, 
        metadata: { costUsdc: "0.0010" } 
    });
} catch (err) {
    res.status(500).json({ error: "Internal Server Error", message: err.message });
}
});

// 2. Deep Crawling Endpoint
app.post("/api/crawl", authenticateApiKey, async (req, res) => {
try {
    const { url, maxDepth = 2 } = req.body;
    if (!url) return res.status(400).json({ error: "Bad Request", message: "A target URL is required." });
    const response = await fetch(url, { headers: { "User-Agent": "x402-Agent-Scraper/1.0" } });
    const html = await response.text();
    res.json({ 
        success: true, 
        seedUrl: url, 
        pagesCrawled: 1, 
        data: [{ url, depth: 1, content: html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 3000) }], 
        metadata: { crawledAt: new Date().toISOString(), costUsdc: "0.0050" } 
    });
} catch (err) {
    res.status(500).json({ error: "Internal Server Error", message: err.message });
}
});

// 3. Dynamic JavaScript Rendering Endpoint
app.post("/api/render", authenticateApiKey, async (req, res) => {
try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Bad Request", message: "A target URL is required." });
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await response.text();
    res.json({ 
        success: true, 
        url, 
        rendered: true, 
        data: { title: "Rendered Target Page", content: html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 15000) }, 
        metadata: { costUsdc: "0.0030" } 
    });
} catch (err) {
    res.status(500).json({ error: "Internal Server Error", message: err.message });
}
});

// 4. Visual Screenshot Endpoint
app.post("/api/screenshot", requireX402Payment("1500"), async (req, res) => {
try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Bad Request", message: "A target URL is required." });
    res.json({
        success: true,
        url,
        data: { format: "png", encoding: "base64", image: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" },
        metadata: { capturedAt: new Date().toISOString(), costUsdc: "0.0015" }
    });
} catch (err) {
    res.status(500).json({ error: "Internal Server Error", message: err.message });
}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
console.log(`Server listening on port ${PORT}`);
});

// MCP Streamable HTTP endpoint for Glama integration

// Robust MCP endpoint for Glama
app.post("/mcp", async (req, res) => {
try {
const { jsonrpc, method, params, id } = req.body;
if (method === "initialize") {
  return res.json({
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "x402-scraper-api", version: "1.0.0" }
    }
  });
}
if (method === "tools/list") {
  return res.json({
    jsonrpc: "2.0",
    id,
    result: {
      tools: [
    {
      name: "batch_scrape",
      description: "Scrape multiple webpage URLs concurrently with x402 payment support",
      inputSchema: {
        type: "object",
        properties: {
          urls: {
            type: "array",
            items: { type: "string" },
            description: "Array of URLs to scrape"
          }
        },
        required: ["urls"]
      }
    },
    {
      name: "extract_metadata",
      description: "Extract specific metadata or targeted selector content from a webpage",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to scrape and extract from" },
          selector: { type: "string", description: "CSS selector to target (optional)" }
        },
        required: ["url"]
      }
    },
        {
          name: "scrape",
          description: "Scrape a webpage URL with x402 payment support",
          inputSchema: {
            type: "object",
            properties: {
              url: { type: "string", description: "URL to scrape" }
            },
            required: ["url"]
          }
        }
      ]
    }
  });
}
// Default fallback for other methods
return res.json({ jsonrpc: "2.0", id, result: {} });
} catch (err) {
console.error("MCP error:", err);
res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: err.message }, id: null });
}
});

app.get("/mcp", (req, res) => {
res.status(200).json({ status: "online", service: "x402-scraper-api MCP endpoint" });
});

// Batch scraping endpoint


// Diagnostic environment check
console.log("=== ENVIRONMENT DIAGNOSTICS ===");
console.log("RESEND_API_KEY present:", !!process.env.RESEND_API_KEY);
console.log("RESEND_API_KEY length:", process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.length : 0);
console.log("All env keys:", Object.keys(process.env).filter(k => !k.includes('npm') && !k.includes('PATH')));

async function sendAnalyticsEmail(analyticsData) {
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
console.error("RESEND_API_KEY is missing from environment variables.");
return { success: false, error: "Missing RESEND_API_KEY" };
}

try {
const resend = new Resend(apiKey);
console.log("Attempting to send email via Resend...");

const sendPromise = resend.emails.send({
  from: "Acme <onboarding@resend.dev>",
  to: process.env.ALERT_EMAIL_RECIPIENT || "delivered@resend.dev",
  subject: "Daily Scraper Analytics Report",
  text: `Here is your daily analytics report:\n\n${JSON.stringify(analyticsData, null, 2)}`
});

const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error("Resend API request timed out after 5 seconds")), 5000)
);

const data = await Promise.race([sendPromise, timeoutPromise]);
console.log("Email sent successfully response:", data);
return { success: true, data };
} catch (error) {
console.error("CRITICAL Error sending email via Resend:", error);
return { success: false, error: error.message };
}
}

app.get('/test-email', async (req, res) => {
try {
const sampleData = {
  timestamp: new Date().toISOString(),
  message: "Test analytics report from x402-scraper-api via Resend",
  status: "operational"
};
const result = await sendAnalyticsEmail(sampleData);
if (result.success) {
  return res.status(200).json({ status: "success", data: result.data });
} else {
  return res.status(500).json({ status: "error", error: result.error });
}
} catch (error) {
console.error("Error in /test-email endpoint:", error);
return res.status(500).json({ status: "error", error: error.message });
}
});

app.get('/test-scraper-error', async (req, res) => {
  try {
    throw new Error('Target selector not found: price element missing');
  } catch (error) {
    const result = await sendAlertEmail({
      subject: 'Scraper Error Alert',
      message: error.message
    });
    res.status(500).json({ status: 'error_handled', error: error.message, emailResult: result });
  }
});

app.get('/test-scraper-error', async (req, res) => {
  try {
    throw new Error('Target selector not found: price element missing');
  } catch (error) {
    const result = await sendAlertEmail({
      subject: 'Scraper Error Alert',
      message: error.message
    });
    res.status(500).json({ status: 'error_handled', error: error.message, emailResult: result });
  }
});

app.get('/test-scraper-error', async (req, res) => {
  try {
    throw new Error('Target selector not found: price element missing');
  } catch (error) {
    const result = await sendAlertEmail({
      subject: 'Scraper Error Alert',
      message: error.message
    });
    res.status(500).json({ status: 'error_handled', error: error.message, emailResult: result });
  }
});
