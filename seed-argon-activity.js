import { ArgonScraperHarness } from './argon-harness.js';

const harness = new ArgonScraperHarness({
  apiKey: process.env.GEMINI_API_KEY || 'MOCK_ARGON_KEY',
  x402Endpoint: 'https://x402-scraper-api-production-67a4.up.railway.app/mcp'
});

const targetUrls = [
  'https://news.ycombinator.com',
  'https://github.com/trending',
  'https://base.org'
];

async function triggerSyntheticAgentRun() {
  const randomUrl = targetUrls[Math.floor(Math.random() * targetUrls.length)];
  console.log(`[${new Date().toISOString()}] 🤖 Argon Agent Loop: Requesting ${randomUrl}`);

  try {
    const result = await harness.handleToolCall(
      { name: 'x402_scrape_url', args: { url: randomUrl } },
      'PROD_SYNTHETIC_ARGON_LOOP_PROOF'
    );
    console.log(`[${new Date().toISOString()}] ✅ Status:`, result?.result?.status || 'Completed');
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Error:`, err.message);
  }
}

// Run once immediately, then schedule execution
triggerSyntheticAgentRun();

// To run periodically (e.g. every 15 minutes):
if (process.argv.includes('--cron')) {
  console.log('🚀 Argon Synthetic Growth Loop running on a 15-minute interval...');
  setInterval(triggerSyntheticAgentRun, 15 * 60 * 1000);
}
