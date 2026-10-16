import { X402ScraperClient } from './sdk-template.js';

async function runSDKTest() {
  console.log("[SDK Test] Initializing client simulation...");
  
  // 1. Perform a test deposit via curl or direct fetch to get a live key
  const depositRes = await fetch("https://x402-scraper-api-production-67a4.up.railway.app/api/credits/deposit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      walletAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      txHash: `0xTEST_SDK_${Date.now()}`,
      amountUSDC: 5.00
    })
  });
  const depositData = await depositRes.json();
  console.log("[SDK Test] Deposit successful. Key:", depositData.apiKey);

  const client = new X402ScraperClient({
    apiKey: depositData.apiKey,
    baseUrl: "https://x402-scraper-api-production-67a4.up.railway.app"
  });

  // 2. Test Sanitized Extraction
  console.log("[SDK Test] Executing prompt-sanitized extraction...");
  const extractResult = await client.extract({
    url: "https://example.com",
    format: "sanitized"
  });
  console.log("[SDK Test] Extraction Result:", JSON.stringify(extractResult, null, 2));

  // 3. Test Micro-Bounty Escrow
  console.log("[SDK Test] Posting micro-bounty task...");
  const bountyResult = await client.postBounty({
    targetUrl: "https://example.com/api-docs",
    rewardUSDC: 0.10
  });
  console.log("[SDK Test] Bounty Escrow Result:", bountyResult);
}

runSDKTest().catch(err => console.error("[SDK Test] Failed:", err));
