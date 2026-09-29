import express from 'express';
import * as cheerio from 'cheerio';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

async function scrapeUrl(url) {
  try {
    if (!url) {
      return { error: 'No URL provided' };
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!res.ok) {
      return { url, error: `HTTP ${res.status}: ${res.statusText}` };
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    $('script, style, noscript, nav, header, footer, svg, iframe').remove();

    const title = $('title').text().trim() \vert{}\vert{}$('h1').first().text().trim() || 'No Title Found';
    const textContent = $('body').text().replace(/\s+/g, ' ').trim();

    return {
      url,
      title,
      content: textContent.substring(0, 5000),
      status: res.status
    };
  } catch (err) {
    return { url, error: err.message };
  }
}

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get('/', (req, res) => {
  res.send('x402 Scraper MCP Server is live');
});

app.all(['/mcp', '/mcp/'], async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
