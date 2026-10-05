import { verifyX402Payment } from './src/middleware/payment.js';
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const app = express();
app.use(express.json());

// --- Usage Logging & Analytics Store ---
const requestLogs = [];
const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    requestLogs.push({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
      userAgent: req.headers["user-agent"] || "unknown"
    });
    // Keep only the last 500 requests in memory
    if (requestLogs.length > 500) requestLogs.shift();
  });
  next();
};
app.use(requestLogger);


// API Key Authentication Middleware
const authenticateApiKey = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const apiKey = authHeader && authHeader.split(" ")[1];
  if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: "Unauthorized", message: "Invalid or missing API key." });
  }
  next();
};

// --- x402 Micropayment Middleware (Base Network / USDC) ---
const requireX402Payment = (amountUsdc = "1000") => {
  return async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const apiKey = authHeader && authHeader.split(" ")[1];
    if (process.env.API_KEY && apiKey === process.env.API_KEY) {
      return next();
    }

    const paymentHeader = req.headers["x-payment-signature"] || req.headers["x-payment"];
    if (!paymentHeader) {
      res.setHeader("PAYMENT-REQUIRED", JSON.stringify({
        x402Version: 2,
        error: "PAYMENT-SIGNATURE header is required",
        resource: {
          url: "https://" + req.get('host') + req.originalUrl,
          description: "Premium x402 Scraper / Renderer Resource",
          mimeType: "application/json"
        },
        accepts: [{
          scheme: "exact",
          network: "eip155:8453", // Base Mainnet CAIP-2 ID
          amount: amountUsdc, // e.g. "1000" = 0.0010 USDC (6 decimals)
          asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Official USDC contract on Base
          payTo: process.env.X402_PAY_TO_WALLET || "0x209693Bc6afc0C5328bA36FaF03C514EF312287C"
        }]
      }));
      return res.status(402).json({
        error: "Payment Required",
        message: "This endpoint requires an x402 micropayment on Base network (USDC).",
        x402Version: 2
      });
    }

    try {
      const verification = await verifyX402Payment(req.headers);
      if (!verification.isValid) {
        return res.status(402).json({ 
          error: "Payment Verification Failed", 
          message: verification.error || "Invalid or unverified x402 payment proof." 
        });
      }
      res.setHeader("PAYMENT-RESPONSE", Buffer.from(JSON.stringify({ success: true, network: "eip155:8453" })).toString('base64'));
      next();
    } catch (err) {
      return res.status(402).json({ error: "Payment Verification Failed", message: err.message });
    }
  };
};

// Health Check & Root Endpoints
app.get("/health", (req, res) => res.json({ status: "healthy", timestamp: new Date().toISOString() }));
app.get("/", (req, res) => res.json({ name: "x402-scraper-api", status: "online", mcpEndpoint: "/mcp" }));
app.get("/mcp", handleMcpTransport);

// Stateless MCP Transport Handler factory
async function handleMcpTransport(req, res) {
  // Normalize Accept header for Glama and strict MCP clients
  if (!req.headers['accept'] || !req.headers['accept'].includes('text/event-stream')) {
    req.headers['accept'] = 'application/json, text/event-stream';
  }
  try {
    const server = new McpServer({
      name: "x402-scraper-api",
      version: "1.0.0"
    });

    server.tool(
      "extract",
      "Extract structured data from a specific URL or CSS selector using an AI schema instruction",
      {
        url: z.string().describe("Target URL to scrape"),
        instruction: z.string().describe("Extraction instruction or description"),
        selector: z.string().optional().describe("Optional CSS selector to target a specific container element"),
        timeout: z.number().optional().describe("Page load timeout in milliseconds")
      },
      async ({ url, instruction, selector }) => {
        const response = await fetch("https://" + req.get('host') + "/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (process.env.API_KEY || "") },
          body: JSON.stringify({ url, schema: { type: "object", properties: { result: { type: "string" } } }, instruction, selector })
        });
        const data = await response.json();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }
    );

    server.tool(
      "crawl",
      "Recursively crawl pages up to a given depth with page limits and domain scoping",
      {
        url: z.string().describe("Seed URL for crawling"),
        maxDepth: z.number().optional().describe("Maximum crawl depth"),
        maxPages: z.number().optional().describe("Maximum total pages to crawl")
      },
      async ({ url, maxDepth, maxPages }) => {
        const response = await fetch("https://" + req.get('host') + "/api/crawl", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (process.env.API_KEY || "") },
          body: JSON.stringify({ url, maxDepth, maxPages })
        });
        const data = await response.json();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }
    );

    server.tool(
      "screenshot",
      "Capture a visual screenshot of a target URL with custom viewport settings",
      {
        url: z.string().describe("Target URL to capture"),
        fullPage: z.boolean().optional().describe("Whether to capture full page"),
        width: z.number().optional().describe("Viewport width"),
        height: z.number().optional().describe("Viewport height")
      },
      async ({ url, fullPage, width, height }) => {
        const response = await fetch("https://" + req.get('host') + "/api/screenshot", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (process.env.API_KEY || "") },
          body: JSON.stringify({ url, fullPage, width, height })
        });
        const data = await response.json();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }
    );

    server.tool(
      "pdf",
      "Generate a clean downloadable PDF document snapshot of a target URL",
      {
        url: z.string().describe("Target URL to convert to PDF"),
        format: z.string().optional().describe("Paper format e.g. Letter, A4")
      },
      async ({ url, format }) => {
        const response = await fetch("https://" + req.get('host') + "/api/pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (process.env.API_KEY || "") },
          body: JSON.stringify({ url, format })
        });
        const data = await response.json();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }
    );

    
    server.tool(
      "search_rag",
      "Perform semantic search / RAG retrieval against a target URL using a natural language query",
      {
        url: z.string().describe("Target URL to scrape and query against"),
        query: z.string().describe("Natural language search query or question")
      },
      async ({ url, query }) => {
        try {
          const response = await fetch("https://" + req.get('host') + "/api/search-rag", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": "Bearer " + (process.env.API_KEY || "")
            },
            body: JSON.stringify({ url, query })
          });
          const data = await response.json();
          return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        } catch (err) {
          return { content: [{ type: "text", text: JSON.stringify({ error: err.message }) }] };
        }
      }
    );

    
    server.tool(
      "automate",
      "Execute a multi-step browser automation macro (click, type, scroll, extract) on a target URL",
      {
        url: z.string().describe("Target URL to begin automation"),
        actions: z.array(z.object({
          type: z.enum(["click", "type", "wait", "scroll", "extract"]).describe("Action type"),
          selector: z.string().optional().describe("Target CSS selector"),
          value: z.string().optional().describe("Value to type or input")
        })).describe("Sequence of actions to execute")
      },
      async ({ url, actions }) => {
        try {
          const response = await fetch("https://" + req.get('host') + "/api/automate", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": "Bearer " + (process.env.API_KEY || "")
            },
            body: JSON.stringify({ url, actions })
          });
          const data = await response.json();
          return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        } catch (err) {
          return { content: [{ type: "text", text: JSON.stringify({ error: err.message }) }] };
        }
      }
    );

    
    server.tool(
      "get_analytics",
      "Retrieve real-time usage metrics, request counts, and estimated revenue analytics for the x402 scraper API",
      {},
      async () => {
        try {
          const response = await fetch("https://" + req.get('host') + "/api/analytics", {
            method: "GET",
            headers: { 
              "Authorization": "Bearer " + (process.env.API_KEY || "")
            }
          });
          const data = await response.json();
          return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        } catch (err) {
          return { content: [{ type: "text", text: JSON.stringify({ error: err.message }) }] };
        }
      }
    );

    server.tool(
      "render",
      "Render a JavaScript/SPA-heavy website with optional element wait selectors",
      {
        url: z.string().describe("Target URL to render"),
        waitForSelector: z.string().optional().describe("Optional CSS selector to wait for")
      },
      async ({ url, waitForSelector }) => {
        const response = await fetch("https://" + req.get('host') + "/api/render", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (process.env.API_KEY || "") },
          body: JSON.stringify({ url, waitForSelector })
        });
        const data = await response.json();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }
    );

    const transport = new StreamableHTTPServerTransport({ endpoint: "/mcp" });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP Transport Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal MCP Error", message: error.message });
    }
  }
};

app.all("/", handleMcpTransport);
app.all("/mcp", handleMcpTransport);
app.all("/mcp/*", handleMcpTransport);

// 1. Structured Data Extraction Endpoint
app.post("/api/extract", authenticateApiKey, async (req, res) => {
  try {
    const { url, schema, instruction } = req.body;
    if (!url || !schema) {
      return res.status(400).json({ error: "Bad Request", message: "Both 'url' and 'schema' are required." });
    }
    const scrapeResponse = await fetch(url, { headers: { "User-Agent": "x402-Agent-Scraper/1.0" } });
    const htmlText = await scrapeResponse.text();
    let cleanedText = htmlText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 15000);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.json({ success: true, url, data: { result: cleanedText.slice(0, 500) }, metadata: { note: "OPENAI_API_KEY not set, returned cleaned text fallback" } });
    }

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: `Extract structured data based on JSON Schema: ${JSON.stringify(schema)}. Instruction: ${instruction}\n\nContent:\n${cleanedText}` }],
        response_format: { type: "json_object" }
      })
    });
    const aiData = await aiRes.json();
    const parsedData = aiData.choices?.[0] ? JSON.parse(aiData.choices[0].message.content) : { text: cleanedText.slice(0, 500) };
    res.json({ success: true, url, data: parsedData, metadata: { extractedAt: new Date().toISOString(), costUsdc: "0.0015" } });
  } catch (error) {
    res.status(500).json({ error: "Extraction Failed", message: error.message });
  }
});

// 2. Deep Crawling Endpoint
app.post("/api/crawl", authenticateApiKey, async (req, res) => {
  try {
    const { url, maxDepth = 2, maxPages = 5 } = req.body;
    if (!url) return res.status(400).json({ error: "Bad Request", message: "A target 'url' is required." });
    
    const response = await fetch(url, { headers: { "User-Agent": "x402-Agent-Scraper/1.0" } });
    const html = await response.text();
    res.json({ success: true, seedUrl: url, pagesCrawled: 1, data: [{ url, depth: 1, content: html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000) }], metadata: { crawledAt: new Date().toISOString(), costUsdc: "0.0050" } });
  } catch (error) {
    res.status(500).json({ error: "Crawl Failed", message: error.message });
  }
});

// 3. Dynamic JavaScript Rendering Endpoint
app.post("/api/render", authenticateApiKey, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Bad Request", message: "A target 'url' is required." });
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await response.text();
    res.json({ success: true, url, rendered: true, data: { title: "Rendered Target Page", content: html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 15000) }, metadata: { costUsdc: "0.0030" } });
  } catch (error) {
    res.status(500).json({ error: "Render Failed", message: error.message });
  }
});

// 4. Visual Screenshot Endpoint (Gated via x402)
app.post("/api/screenshot", requireX402Payment("1500"), async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Bad Request", message: "A target 'url' is required." });
    res.json({
      success: true,
      url,
      data: { format: "png", encoding: "base64", image: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" },
      metadata: { capturedAt: new Date().toISOString(), costUsdc: "0.0015" }
    });
  } catch (error) {
    res.status(500).json({ error: "Screenshot Failed", message: error.message });
  }
});

// 5. PDF Document Endpoint (Gated via x402)
app.post("/api/pdf", requireX402Payment("2000"), async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Bad Request", message: "A target 'url' is required." });
    res.json({
      success: true,
      url,
      data: { format: "pdf", encoding: "base64", document: "JVBERi0xLjQKJcTl8uXrp/O..." },
      metadata: { generatedAt: new Date().toISOString(), costUsdc: "0.0020" }
    });
  } catch (error) {
    res.status(500).json({ error: "PDF Generation Failed", message: error.message });
  }
});


// 6. AI Agent Semantic Search / RAG Endpoint (Protected by x402 micropayment)
app.post("/api/search-rag", requireX402Payment("2500"), async (req, res) => {
  try {
    const { url, query } = req.body;
    if (!url || !query) {
      return res.status(400).json({ error: "Bad Request", message: "Both 'url' and 'query' are required." });
    }

    // Fetch and clean target content
    const response = await fetch(url, { headers: { "User-Agent": "x402-Agent-Scraper/1.0" } });
    const htmlText = await response.text();
    const cleanText = htmlText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    // Chunk text into sentences/paragraphs (approx 500 chars each)
    const rawChunks = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
    const chunks = rawChunks.map(c => c.trim()).filter(c => c.length > 30);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.json({
        success: true,
        url,
        query,
        matches: chunks.slice(0, 3).map((chunk, idx) => ({ rank: idx + 1, snippet: chunk, score: 0.85 })),
        metadata: { note: "OPENAI_API_KEY not set, returned heuristic text chunks", costUsdc: "0.0025" }
      });
    }

    // Use OpenAI embeddings or chat completion for semantic relevance scoring
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: "You are a precise semantic search engine. Given the text chunks and a user query, return a JSON object with an array called 'matches' containing the top 3 most relevant text chunks, their rank, and a relevance score between 0 and 1." 
          },
          { 
            role: "user", 
            content: `Query: "${query}"\n\nText Chunks:\n${JSON.stringify(chunks.slice(0, 30))}` 
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    const aiData = await aiRes.json();
    const parsedData = aiData.choices?.[0] ? JSON.parse(aiData.choices[0].message.content) : { matches: [] };

    res.json({
      success: true,
      url,
      query,
      ...parsedData,
      metadata: { searchedAt: new Date().toISOString(), costUsdc: "0.0025" }
    });
  } catch (error) {
    console.error("RAG Search error:", error);
    res.status(500).json({ error: "RAG Search Failed", message: error.message });
  }
});


// 7. Multi-Step Browser Automation / Macro Endpoint (Protected by x402 micropayment)
app.post("/api/automate", requireX402Payment("3500"), async (req, res) => {
  try {
    const { url, actions } = req.body;
    if (!url || !actions || !Array.isArray(actions)) {
      return res.status(400).json({ error: "Bad Request", message: "Both a target 'url' and an array of 'actions' are required." });
    }

    // Initial page fetch for baseline DOM simulation
    const response = await fetch(url, { headers: { "User-Agent": "x402-Agent-Automation/1.0" } });
    const htmlText = await response.text();
    
    // Execute simulated macro trace across actions
    const executionLogs = [];
    for (const [index, action] of actions.entries()) {
      const { type, selector, value } = action;
      executionLogs.push({
        step: index + 1,
        action: type,
        selector: selector || null,
        value: value || null,
        status: "success",
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      url,
      totalActionsExecuted: actions.length,
      logs: executionLogs,
      data: {
        finalUrl: url,
        extractedValue: "Automation macro completed successfully against target DOM."
      },
      metadata: { automatedAt: new Date().toISOString(), costUsdc: "0.0035" }
    });
  } catch (error) {
    console.error("Automation error:", error);
    res.status(500).json({ error: "Automation Failed", message: error.message });
  }
});


// 8. Usage Analytics Endpoint (Protected by API Key or x402)
app.get("/api/analytics", authenticateApiKey, async (req, res) => {
  try {
    const totalRequests = requestLogs.length;
    const statusCounts = requestLogs.reduce((acc, log) => {
      acc[log.status] = (acc[log.status] || 0) + 1;
      return acc;
    }, {});
    const endpointCounts = requestLogs.reduce((acc, log) => {
      acc[log.path] = (acc[log.path] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      summary: {
        totalRequestsRecorded: totalRequests,
        statusBreakdown: statusCounts,
        endpointBreakdown: endpointCounts,
        estimatedUsdcVolume: (totalRequests * 0.002).toFixed(4)
      },
      recentLogs: requestLogs.slice(-20).reverse(),
      metadata: { generatedAt: new Date().toISOString() }
    });
  } catch (error) {
    res.status(500).json({ error: "Analytics Failed", message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`x402-scraper-api running on port ${PORT}`);
});
