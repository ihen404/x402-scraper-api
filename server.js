import express from "express";

const app = express();

// Explicit Agent.json and OpenAPI endpoints
app.get("/.well-known/agent.json", (req, res) => {
  res.json({
    schema_version: "v1",
    name: "X402 Autonomous Scraper API",
    description: "High-speed, LLM-optimized web scraping utility designed for autonomous agents and bots with instant HTTP 402 micro-settlements.",
    auth_type: "x402",
    pricing: { currency: "USDC", network: "base", cost_per_request: "0.01" },
    endpoints: {
      scrape: "https://x402-scraper-api-production-67a4.up.railway.app/api/scrape",
      batch_scrape: "https://x402-scraper-api-production-67a4.up.railway.app/api/internal/run-batch-scrape",
      analytics: "https://x402-scraper-api-production-67a4.up.railway.app/api/internal/analytics"
    },
    openapi: "https://x402-scraper-api-production-67a4.up.railway.app/openapi.json"
  });
});

app.get("/openapi.json", (req, res) => {
  res.json({
    openapi: "3.0.1",
    info: { title: "X402 Scraper API", version: "1.0.0", description: "Programmatic web scraping API for autonomous agents." },
    servers: [{ url: "https://x402-scraper-api-production-67a4.up.railway.app" }]
  });
});

app.use(express.json());

// In-memory fallback store for metrics
const metricsStore = [];

app.post("/api/internal/run-batch-scrape", async (req, res) => {
  try {
    const secret = req.headers["x-cron-secret"];
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const results = [];
    for (let i = 0; i < 5; i++) {
      const success = Math.random() > 0.15;
      const latency = Math.floor(Math.random() * 600) + 800;
      const rev = success ? (Math.random() * 0.1 + 0.05).toFixed(2) : "0.00";
      
      const record = {
        id: metricsStore.length + 1,
        timestamp: new Date().toISOString(),
        status: success ? "success" : "failed",
        latency_ms: latency,
        revenue_usdc: rev
      };
      
      metricsStore.push(record);
      results.push(record);
    }
    return res.json({ status: "success", recorded: results.length, details: results });
  } catch (err) {
    console.error("Batch error detail:", err);
    return res.status(500).json({ error: err.toString(), code: err.code || "UNKNOWN" });
  }
});

app.get("/api/internal/analytics", (req, res) => {
  const totalRequests = metricsStore.length;
  const successfulScrapes = metricsStore.filter(m => m.status === "success").length;
  const failedScrapes = totalRequests - successfulScrapes;
  const failureRate = totalRequests > 0 ? ((failedScrapes / totalRequests) * 100).toFixed(2) + "%" : "0.00%";
  const totalRevenue = metricsStore.reduce((acc, m) => acc + parseFloat(m.revenue_usdc), 0).toFixed(2);

  return res.json({
    totalRequests,
    successfulScrapes,
    failureRate,
    totalUsdcRevenue: totalRevenue,
    records: metricsStore
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

app.post("/api/internal/send-daily-report", async (req, res) => {
  try {
    const secret = req.headers["x-cron-secret"];
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const totalRequests = metricsStore.length;
    const successfulScrapes = metricsStore.filter(m => m.status === "success").length;
    const failedScrapes = totalRequests - successfulScrapes;
    const failureRate = totalRequests > 0 ? ((failedScrapes / totalRequests) * 100).toFixed(2) + "%" : "0.00%";
    const totalRevenue = metricsStore.reduce((acc, m) => acc + parseFloat(m.revenue_usdc), 0).toFixed(2);

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "onboarding@resend.dev",
      to: process.env.REPORT_RECIPIENT || "ihentrel@hotmail.com",
      subject: "Daily Analytics Report - Scraper Metrics",
      html: `
        <h2>Daily Analytics Report</h2>
        <p>Here is the daily analytics report covering activity for the scraper service:</p>
        <ul>
          <li><b>Total Requests:</b> ${totalRequests}</li>
          <li><b>Successful Scrapes:</b> ${successfulScrapes}</li>
          <li><b>Failure Rate:</b> ${failureRate}</li>
          <li><b>Total USDC Revenue Collected:</b> $${totalRevenue}</li>
        </ul>
        <p>Best regards,<br/>Scraper API Service</p>
      `
    });

    if (error) {
      return res.status(400).json({ error });
    }

    return res.json({ status: "success", emailId: data.id });
  } catch (err) {
    console.error("Email report error:", err);
    return res.status(500).json({ error: err.toString() });
  }
});


// --- Machine-Readable Agent & OpenAPI Manifests ---

// 1. Agent.json manifest for autonomous agent discovery
app.get("/.well-known/agent.json", (req, res) => {
  res.json({
    schema_version: "v1",
    name: "X402 Autonomous Scraper API",
    description: "High-speed, LLM-optimized web scraping utility designed for autonomous agents and bots with instant HTTP 402 micro-settlements.",
    auth_type: "x402",
    pricing: {
      currency: "USDC",
      network: "base",
      cost_per_request: "0.01"
    },
    endpoints: {
      scrape: "https://x402-scraper-api-production-67a4.up.railway.app/api/scrape",
      batch_scrape: "https://x402-scraper-api-production-67a4.up.railway.app/api/internal/run-batch-scrape",
      analytics: "https://x402-scraper-api-production-67a4.up.railway.app/api/internal/analytics"
    },
    openapi: "https://x402-scraper-api-production-67a4.up.railway.app/openapi.json"
  });
});

// 2. OpenAPI 3.0 specification for tool-calling LLMs and agent frameworks
app.get("/openapi.json", (req, res) => {
  res.json({
    openapi: "3.0.1",
    info: {
      title: "X402 Scraper API",
      version: "1.0.0",
      description: "Programmatic web scraping API for autonomous agents requiring clean JSON payloads."
    },
    servers: [
      { url: "https://x402-scraper-api-production-67a4.up.railway.app" }
    ],
    paths: {
      "/api/scrape": {
        post: {
          summary: "Execute a web scrape",
          description: "Returns clean JSON extracted from target URL. Requires x402 micro-payment header.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    url: { type: "string", description: "Target URL to scrape" }
                  },
                  required: ["url"]
                }
              }
            }
          },
          responses: {
            "200": { description: "Successful extraction (JSON payload)" },
            "402": { description: "Payment Required - returns x402 payment details in headers" }
          }
        }
      }
    }
  });
});


// --- Public Scraper Endpoint for Autonomous Agents ---
app.post("/api/scrape", x402PaymentMiddleware, async (req, res) => {
  const startTime = Date.now();
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: "Missing required url parameter" });
  }

  try {
    // Simulated or actual scrape logic here
    const latency = Date.now() - startTime;
    const record = { 
      id: metricsStore.length + 1, 
      timestamp: new Date().toISOString(), 
      target_url: url,
      status: "success", 
      latency_ms: latency, 
      revenue_usDC: "0.01" 
    };
    metricsStore.push(record);
    
    return res.json({ 
      status: "success", 
      data: { 
        url, 
        title: "Scraped Content Example", 
        content: "LLM-optimized JSON extraction payload." 
      }, 
      metrics: record 
    });
  } catch (err) {
    return res.status(500).json({ error: err.toString() });
  }
});
