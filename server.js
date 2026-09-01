const express = require('express');
const puppeteer = require('puppeteer-core');
const TurndownService = require('turndown');
const x402Pkg = require('@ihentrel/x402-express');

// Resolve function regardless of export format (default vs named vs root)
const x402Middleware = typeof x402Pkg === 'function' 
  ? x402Pkg 
  : (x402Pkg.x402Middleware || x402Pkg.default);

const app = express();
app.use(express.json());

const walletAddress = process.env.PAYMENT_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000';
const port = process.env.PORT || 8080;

// Health Check Routes
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'x402 Scraper API is active' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Middleware Handler
const handleX402 = (req, res, next) => {
  try {
    if (typeof x402Middleware !== 'function') {
      throw new Error(`Resolved x402Middleware is type '${typeof x402Middleware}'`);
    }

    const middleware = x402Middleware({
      payTo: walletAddress,
      price: '0.02',
      asset: 'USDC',
      network: 'base',
      chainId: 8453
    });
    return middleware(req, res, next);
  } catch (err) {
    console.error('x402 execution error:', err.message);
    return res.status(500).json({ error: 'x402 Middleware Error', details: err.message });
  }
};

// Main Endpoint
app.post('/api/scrape', handleX402, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  let browser;
  try {
    const chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
    browser = await puppeteer.launch({
      executablePath: chromiumPath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const html = await page.content();

    const turndownService = new TurndownService();
    const markdown = turndownService.turndown(html);

    res.json({ success: true, url, markdown });
  } catch (err) {
    res.status(500).json({ error: 'Scraping failed', details: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.path, method: req.method });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
