export class X402ScraperClient {
  constructor(options = {}) {
    this.endpoint = options.endpoint || https://x402-scraper-api-production-67a4.up.railway.app/mcp;
    this.paymentSignature = options.paymentSignature || null;
    this.preferredChain = options.preferredChain || eip155:8453;
  }

  async callTool(name, args = {}) {
    const headers = {
      Content-Type: application/json,
      X-Settlement-Chain: this.preferredChain
    };

    if (this.paymentSignature) {
      headers[Payment-Signature] = this.paymentSignature;
    }

    const response = await fetch(this.endpoint, {
      method: POST,
      headers,
      body: JSON.stringify({
        jsonrpc: 2.0,
        method: tools/call,
        params: { name, arguments: args },
        id: Date.now()
      })
    });

    return await response.json();
  }

  async scrapeTokenMinified(url, maxTokens = 1000) {
    return this.callTool(scrape_token_minified, { url, maxTokens });
  }

  async purchasePass() {
    return this.callTool(purchase_pass, { durationHours: 24, tier: unlimited_swarm });
  }
}

export default X402ScraperClient;