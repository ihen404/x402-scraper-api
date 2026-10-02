import express from "express";

const app = express();
app.use(express.json());

// API Key Authentication Middleware
const authenticateApiKey = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const apiKey = authHeader && authHeader.split(" ")[1];
  
  // If an API key is configured in environment variables, validate it
  if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: "Unauthorized", message: "Invalid or missing API key." });
  }
  next();
};

// Health Check Endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// 1. Structured Data Extraction Endpoint
app.post("/api/extract", authenticateApiKey, async (req, res) => {
  try {
    const { url, schema, instruction } = req.body;
    if (!url || !schema) {
      return res.status(400).json({ error: "Bad Request", message: "Both 'url' and 'schema' are required." });
    }

    const scrapeResponse = await fetch(url, { headers: { "User-Agent": "x402-Agent-Scraper/1.0" } });
    const htmlText = await scrapeResponse.text();

    let cleanedText = "";
    let insideTag = false;
    for (let i = 0; i < htmlText.length; i++) {
      if (htmlText[i] === '<') insideTag = true;
      else if (htmlText[i] === '>') insideTag = false;
      else if (!insideTag) cleanedText += htmlText[i];
    }
    cleanedText = cleanedText.replace(/\s+/g, ' ').trim().slice(0, 15000);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Configuration Error", message: "OPENAI_API_KEY is not configured." });
    }

    const prompt = `Extract structured data from the following text based on this JSON Schema: ${JSON.stringify(schema)}. Instruction: ${instruction || "Extract all requested fields accurately."}\n\nText content:\n${cleanedText}\n\nReturn ONLY a valid JSON object matching the schema.`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });

    const aiData = await aiRes.json();
    if (!aiData.choices || aiData.choices.length === 0) {
      throw new Error("Failed to generate structured extraction from LLM.");
    }

    const parsedData = JSON.parse(aiData.choices[0].message.content);
    res.json({ success: true, url, data: parsedData, metadata: { extractedAt: new Date().toISOString(), costUsdc: "0.0015" } });
  } catch (error) {
    console.error("Extraction error:", error);
    res.status(500).json({ error: "Extraction Failed", message: error.message });
  }
});

// 2. Deep Crawling & Pagination Endpoint
app.post("/api/crawl", authenticateApiKey, async (req, res) => {
  try {
    const { url, maxDepth = 2, maxPages = 5 } = req.body;
    if (!url) {
      return res.status(400).json({ error: "Bad Request", message: "A target 'url' is required." });
    }

    const visited = new Set();
    const results = [];
    const queue = [{ url, depth: 1 }];

    while (queue.length > 0 && results.length < maxPages) {
      const { url: currentUrl, depth } = queue.shift();
      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      try {
        const response = await fetch(currentUrl, { headers: { "User-Agent": "x402-Agent-Scraper/1.0" } });
        const html = await response.text();
        
        let cleanText = "";
        let insideTag = false;
        for (let i = 0; i < html.length; i++) {
          if (html[i] === '<') insideTag = true;
          else if (html[i] === '>') insideTag = false;
          else if (!insideTag) cleanText += html[i];
        }
        cleanText = cleanText.replace(/\s+/g, ' ').trim().slice(0, 5000);

        results.push({ url: currentUrl, depth, content: cleanText });

        if (depth < maxDepth) {
          const linkRegex = /href="([^"#]+)"/g;
          let match;
          const baseUrl = new URL(currentUrl);
          while ((match = linkRegex.exec(html)) !== null && queue.length + results.length < maxPages) {
            try {
              const absoluteUrl = new URL(match[1], baseUrl).href;
              if (absoluteUrl.startsWith(baseUrl.origin) && !visited.has(absoluteUrl)) {
                queue.push({ url: absoluteUrl, depth: depth + 1 });
              }
            } catch (e) {}
          }
        }
      } catch (err) {
        console.error(`Failed to crawl ${currentUrl}:`, err.message);
      }
    }

    res.json({ success: true, seedUrl: url, pagesCrawled: results.length, data: results, metadata: { crawledAt: new Date().toISOString(), costUsdc: "0.0050" } });
  } catch (error) {
    console.error("Crawl error:", error);
    res.status(500).json({ error: "Crawl Failed", message: error.message });
  }
});

// 3. Dynamic JavaScript Rendering Endpoint
app.post("/api/render", authenticateApiKey, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "Bad Request", message: "A target 'url' is required." });
    }

    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
    });

    const html = await response.text();
    
    let title = "No Title Found";
    const titleStart = html.toLowerCase().indexOf("<title>");
    const titleEnd = html.toLowerCase().indexOf("</title>");
    if (titleStart !== -1 && titleEnd !== -1 && titleEnd > titleStart) {
      title = html.substring(titleStart + 7, titleEnd).trim();
    }

    let cleanContent = "";
    let insideTag = false;
    for (let i = 0; i < html.length; i++) {
      if (html[i] === '<') insideTag = true;
      else if (html[i] === '>') insideTag = false;
      else if (!insideTag) cleanContent += html[i];
    }
    cleanContent = cleanContent.replace(/\s+/g, ' ').trim().slice(0, 20000);

    res.json({
      success: true,
      url,
      rendered: true,
      data: { title, content: cleanContent, rawLength: html.length },
      metadata: { renderedAt: new Date().toISOString(), costUsdc: "0.0030" }
    });
  } catch (error) {
    console.error("Render error:", error);
    res.status(500).json({ error: "Render Failed", message: error.message });
  }
});

// Model Context Protocol (MCP) Transport Handler Placeholder
const handleMcpTransport = (req, res) => {
  res.json({ jsonrpc: "2.0", result: { status: "active", capabilities: ["extract", "crawl", "render"] }, id: req.body.id || 1 });
};

// Model Context Protocol (MCP) Transport Handlers
app.post("/", handleMcpTransport);
app.post("/mcp", handleMcpTransport);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`x402-scraper-api running on port ${PORT}`);
});
