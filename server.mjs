import express from 'express';
import * as cheerio from 'cheerio';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Production scrape function using fetch + cheerio
async function scrapeUrl(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unneeded element tags
    $('script, style, noscript, nav, header, footer, svg, iframe').remove();

    const title = $('title').text().trim() \vert{}\vert{}$('h1').first().text().trim() || 'No Title Found';
    
    // Extract main text content
    const textContent = $('body')
      .text()
      .replace(/\s+/g, ' ')
      .trim();

    return {
      url,
      title,
      content: textContent.substring(0, 10000), // Cap payload length
      status: response.status
    };
  } catch (error) {
    return {
      url,
      error: error.message
    };
  }
}

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Base route
app.get('/', (req, res) => {
  res.send('x402 Scraper MCP Server is running');
});

// MCP JSON-RPC 2.0 Route Handler
app.all(['/mcp', '/mcp/'], async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const { jsonrpc, id, method, params } = req.body || {};

  if (method === 'initialize') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'x402-scraper', version: '1.0.0' }
      }
    });
  }

  if (method === 'tools/list') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        tools: [
          {
            name: 'scrape',
            description: 'Scrape and extract clean text content from a given web URL',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', description: 'Target URL to scrape' }
              },
              required: ['url']
            }
          }
        ]
      }
    });
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    if (name === 'scrape') {
      const scrapedData = await scrapeUrl(args?.url);
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            { type: 'text', text: JSON.stringify(scrapedData) }
          ]
        }
      });
    }
  }

  res.json({
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: 'Method not found' }
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
