// Base EVM Agent Wrapper for x402 Scraper API (ES Module)
export default class X402ScraperBaseTool {
  constructor(config = {}) {
    this.endpoint = config.endpoint || "https://x402-scraper-api-production-67a4.up.railway.app/mcp";
    this.baseRecipient = "0xD4fd01ce7B0131eD77342d0375507110742EB925";
    this.chainId = 8453;
  }

  async invoke(url, paymentSignature = null) {
    const headers = { "Content-Type": "application/json" };
    if (paymentSignature) {
      headers["PAYMENT-SIGNATURE"] = paymentSignature;
    }

    const res = await fetch(this.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: { name: "scrape_basic", arguments: { url } },
        id: Date.now()
      })
    });

    const paymentRequiredHeader = res.headers.get("PAYMENT-REQUIRED");

    if (res.status === 402) {
      const challenge = await res.json();
      console.log("🛑 HTTP 402 Challenge Received. Base EVM Payment Requirement:");
      console.log(`   Send 0.01 USDC (Chain ID: ${this.chainId}) to: ${this.baseRecipient}`);
      if (paymentRequiredHeader) {
        console.log(`   PAYMENT-REQUIRED Header (Base64): ${paymentRequiredHeader.substring(0, 30)}...`);
      }
      return { status: 402, challenge, paymentRequiredHeader };
    }

    return await res.json();
  }
}
