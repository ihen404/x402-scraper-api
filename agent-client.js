// x402 Scraper API - Agent Client Example
// Demonstrates automatic 402 handling and execution

async function callX402Scraper(toolName = "scrape_basic", urlToScrape = "https://example.com") {
const endpoint = "https://x402-scraper-api-production-67a4.up.railway.app/mcp";

console.log(`🤖 Requesting tool execution: ${toolName} for ${urlToScrape}...`);

// 1. Initial Request (Triggers 402 Payment Challenge)
const res = await fetch(endpoint, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
  jsonrpc: "2.0",
  method: "tools/call",
  params: { name: toolName, arguments: { url: urlToScrape } },
  id: 1
})
});

if (res.status === 402) {
const challenge = await res.json();
console.log("💳 402 Payment Challenge Received:");
console.log(JSON.stringify(challenge.error.payment_requirements, null, 2));
console.log("⚡ Agent signing USDC payment on Base/Solana...");
// Attach signature in PAYMENT-SIGNATURE header for retry execution
} else {
const data = await res.json();
console.log("✅ Scrape Response:", data);
}
}

callX402Scraper("scrape_advanced", "https://news.ycombinator.com");
