
/**
 * X402 Scraper Client for Autonomous Agents
 * Easily plugs into LangChain, CrewAI, or custom Node.js agent loops.
 */
class X402AgentScraper {
  constructor(options = {}) {
    this.endpoint = options.endpoint || "https://x402-scraper-api-production-67a4.up.railway.app/api/scrape";
  }

  async scrapeUrl(url, paymentSignerCallback) {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });

    if (res.status === 402) {
      // Handle x402 Payment Required challenge
      const paymentRequiredHeader = res.headers.get("X-Payment-Required") || res.headers.get("payment-required");
      console.log("x402 Payment Challenge received:", paymentRequiredHeader);
      
      // Autonomous wallet signs transaction via callback, then retries with payment proof
      const paymentProof = await paymentSignerCallback(paymentRequiredHeader);
      
      const paidRes = await fetch(this.endpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Payment": paymentProof 
        },
        body: JSON.stringify({ url })
      });
      return await paidRes.json();
    }

    return await res.json();
  }
}

module.exports = { X402AgentScraper };
