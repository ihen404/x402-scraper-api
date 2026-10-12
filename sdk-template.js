/**
 * x402 Autonomous M2M Scraper Client SDK
 * Zero-dependency client for AI Agents & Swarms
 */
export class X402ScraperClient {
  constructor({ apiKey, baseUrl = "https://x402-scraper-api-production-67a4.up.railway.app" }) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Execute an extraction with optional prompt sanitization
   */
  async extract({ url, format = "markdown", refWallet }) {
    const headers = {
      "Content-Type": "application/json"
    };

    if (this.apiKey) headers["X-Api-Key"] = this.apiKey;
    if (refWallet) headers["ref"] = refWallet;

    const response = await fetch(`${this.baseUrl}/api/extract`, {
      method: "POST",
      headers,
      body: JSON.stringify({ url, format })
    });

    if (response.status === 402) {
      const paymentDetails = await response.json();
      throw new Error(`X402_PAYMENT_REQUIRED: Deposit required at ${paymentDetails.depositEndpoint}. Payout address: ${paymentDetails.payoutAddress}`);
    }

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`X402_ERROR: ${err.error || response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Transfer credits to another worker agent API key
   */
  async transferCredits({ recipientApiKey, amountUSDC }) {
    const response = await fetch(`${this.baseUrl}/api/credits/transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": this.apiKey
      },
      body: JSON.stringify({ recipientApiKey, amountUSDC })
    });

    return await response.json();
  }

  /**
   * Escrow a micro-bounty for worker agent fulfillment
   */
  async postBounty({ targetUrl, rewardUSDC }) {
    const response = await fetch(`${this.baseUrl}/api/bounties`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": this.apiKey
      },
      body: JSON.stringify({ targetUrl, rewardUSDC })
    });

    return await response.json();
  }
}
