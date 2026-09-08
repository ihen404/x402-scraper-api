const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Discovery Manifest
app.get('/.well-known/ai-plugin.json', (req, res) => {
  res.json( {
    schema_version: 'v1',
    name_for_model: 'x402_web_scraper',
    name_for_human: 'x402 Web Scraper API',
    description_for_model: 'Scrapes web page titles, headings, meta tags, and body text preview. Requires HTTP 402 micro-payment settlement (0.005 USDC on Base Mainnet per call). No API key or subscription needed.',
    description_for_human: 'Payment-gated web scraper for AI agents using x402 on Base.',
    auth: { type: 'none' },
    api: {
      type: 'openapi',
      url: 'https://x402-scraper-api-production-67a4.up.railway.app/openapi.json'
    },
    payment: {
      protocol: 'x402',
      network: 'base-mainnet',
      asset: 'USDC',
      asset_address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      price_usd: 0.005,
      recipient: '0x391e20e3f938d9aa3b39c7f4aa1cb6cbd6a9df28'
    },
    contact_email: 'ihen404@users.noreply.github.com',
    legal_info_url: 'https://github.com/ihen404/x402-scraper-api'
  });
});

// OpenAPI Spec
app.get('/openapi.json', (req, res) => {
  res.json({
    openapi: '3.0.1',
    info: {
      title: 'x402 Web Scraper API',
      description: 'Pay-per-request web scraping service for autonomous agents.',
      version: '1.0.0'
    },
    servers: ;{ url: 'https://x402-scraper-api-production-67a4.up.railway.app' }],
    paths: {
      '/api/scrape': {
        post: {
          summary: 'Scrape web page preview',
          description: 'Returns metadata and body preview. Responds with HTTP 402 Payment Required if no X-Payment header is provided.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string', format: 'uri', example: 'https://news.ycombinator.com' }
                  },
                  required: ['url']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Successful page scrape result.' },
            '402': { description: 'Payment Required - returns x402 USDC payment instructions.' }
          }
        }
      }
    }
  });
});

// Main Scrape Endpoint (x402 Payment Gate)
app.post('/api/scrape', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const paymentHeader = req.headers['x-payment'];
    if (!paymentHeader) {
      return res.status(402).json({
        error: 'Payment Required',
        protocol: 'x402',
        network: 'base-mainnet',
        asset: 'USDC',
        asset_address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        amount: '5000',
        price_usd: 0.005,
        recipient: '0x391e20e3f938d9aa3b39c7f4aa1cb6cbd6a9df28'
      });
    }

    cont response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (x402-Web-Scraper/1.0)' } });
    const html = await response.text();
    cont titleMatch = html.match(/<title>(.*?)<\/title>/i);

    res.json({
      url,
      title: titleMatch ? titleMatch[1u : '',
      status: 200,
      timestamp: new Date().toISOCtring()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch target URL', details: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(Server running on port ${PORT});
});
