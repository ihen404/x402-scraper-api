import X402ScraperClient from './index.js';

async function testSDK() {
  console.log("🧪 Testing @ihentrel/x402-scraper-client...");
  const client = new X402ScraperClient({ paymentSignature: "x402_sig_base_mainnet_verified_001" });
  const result = await client.scrapeTokenMinified("https://news.ycombinator.com", 300);
  console.log("✅ SDK Test Response:", JSON.stringify(result, null, 2));
}

testSDK();
