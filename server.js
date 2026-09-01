const express = require('express');
const puppeteer = require('puppeteer-core');
const TurndownService = require('turndown');
const x402Module = require('@ihentrel/x402-express');

// Resolve function across common export structures
const x402Middleware = 
  typeof x402Module === 'function' ? x402Module :
  typeof x402Module.x402Middleware === 'function' ? x402Module.x402Middleware :
  typeof x402Module.x402 === 'function' ? x402Module.x402 :
  typeof x402Module.default === 'function' ? x402Module.default : null;

const app = express();
app.use(express.json());

const walletAddress = process.env.PAYMENT_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000';
const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'x402 Scraper API active' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Protected Route Handler
app.post('/api/scrape', (req, res, next) => {
  if (!x402Middleware) {
    console.error('Exports found in @ihentrel/x402-express:', Object.keys(x402Module));
    return res.status(500).json({ 
      error: 'x402 Export Error', 
      exportsDetected: Object.keys(x402Module),
      moduleType: typeof x402Module 
    });
  }

  try {
    const middleware = x402Middleware({
      payTo: walletAddress,
      price: '0.02',
      asset: 'USDC',
      network: 'base',
      chainId: 8453
    });
    return middleware(req, res, next);
  } catch (err) {
    return res.status(500).json({ error: 'x402 Initialization Error', details: err.message });
  }
}, async (req, res) => {
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
  res.status(404).json({ error: 'Route not found', path: req.path, method: req.method });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
