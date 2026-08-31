const express = require('express');
const puppeteer = require('puppeteer-core');
const TurndownService = require('turndown');
const { x402Middleware } = require('@ihentrel/x402-express');

const app = express();
app.use(express.json());

const walletAddress = process.env.PAYMENT_WALLET_ADDRESS;
const port = process.env.PORT || 3000;

// Root and Health Check routes for Railway proxy verification
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'x402 Scraper API is active' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Protect the endpoint with x402 payment middleware ($0.02 USDC on Base)
app.use('/api/scrape', x402Middleware({
  payTo: walletAddress,
  price: '0.02',
  asset: 'USDC',
  network: 'base',
  chainId: 8453
}));

app.post('/api/scrape', async (req, res) => {
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

app.listen(port, '0.0.0.0', () => {
  console.log(`x402 Scraper API listening on 0.0.0.0:${port}`);
});
