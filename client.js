/**
 * X402 Autonomous Agent Client SDK
 * Allows AI agents and bots to programmatically discover, pay, and scrape via x402.
 */
import fetch from "node-fetch";

class X402AgentClient {
  constructor(baseUrl = "https://x402-scraper-api-production-67a4.up.railway.app") {
    this.baseUrl = baseUrl;
  }

  async discover() {
    const res = await fetch(`${this.baseUrl}/.well-known/agent.json`);
    return await res.json();
  }

  async scrape(url, options = {}) {
    const endpoint = options.structured ? `${this.baseUrl}/api/extract/structured` : `${this.baseUrl}/api/scrape`;
    const payload = { url, render_js: options.renderJs || false };

    // 1. Initial request to trigger 402 payment challenge if not pre-paid
    let res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.status === 402) {
      const invoiceHeader = res.headers.get("x-payment-required");
      console.log(`[x402 Client] Received Payment Challenge: ${invoiceHeader}`);
      
      // In an autonomous loop, agent signs USDC transaction on Base here:
      // const txHash = await wallet.signAndSendUSDC(recipient, amount);
      const simulatedTxHash = "0xbase_payment_proof_" + Math.random().toString(36).substring(2, 12);

      // 2. Retry request with cryptographic payment proof header
      res = await fetch(endpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${simulatedTxHash}`,
          "X-Payment": simulatedTxHash
        },
        body: JSON.stringify(payload)
      });
    }

    return await res.json();
  }
}

// Example Agent execution flow
(async () => {
  const client = new X402AgentClient();
  console.log("Discovering agent capabilities...");
  const manifest = await client.discover();
  console.log("Discovered Manifest:", manifest.name);

  console.log("\nExecuting paid structured data extraction...");
  const result = await client.scrape("https://example.com/financials", { structured: true });
  console.log("Scrape Result:", JSON.stringify(result, null, 2));
})();
