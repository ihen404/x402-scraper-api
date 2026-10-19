// Solana Agent Kit Wrapper for x402 Scraper API
// Purpose: Expose scrape capabilities directly to Solana Agent Kit & Eliza framework runners

class X402ScraperSolanaTool {
  constructor(config = {}) {
    this.endpoint = config.endpoint || "https://x402-scraper-api-production-67a4.up.railway.app/mcp";
    this.solanaRecipient = "CYDk1dEVjpCdD9h6F9x1MeVbr51sHRiPPBgefVdXeTvz";
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

    if (res.status === 402) {
      const challenge = await res.json();
      console.log("🛑 HTTP 402 Challenge Received. Solana Payment Requirement:");
      console.log(`   Send 0.01 USDC to: ${challenge.error.payment_requirements.solana.recipient}`);
      return { status: 402, challenge };
    }

    return await res.json();
  }
}

module.exports = X402ScraperSolanaTool;
