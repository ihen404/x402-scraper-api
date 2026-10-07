export class X402ScraperClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'https://x402-scraper-api-production-67a4.up.railway.app';
    this.paymentToken = options.paymentToken || 'valid-test-token';
  }

  async scrape(url) {
    const res = await fetch(`${this.baseUrl}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-payment': this.paymentToken
      },
      body: JSON.stringify({ url })
    });

    if (res.status === 402) {
      const requirements = res.headers.get('payment-required');
      throw new Error(`402 Payment Required. Details: ${requirements}`);
    }

    return await res.json();
  }

  async batchScrape(urls) {
    const res = await fetch(`${this.baseUrl}/api/scrape/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-payment': this.paymentToken
      },
      body: JSON.stringify({ urls })
    });

    if (res.status === 402) {
      const requirements = res.headers.get('payment-required');
      throw new Error(`402 Payment Required. Details: ${requirements}`);
    }

    return await res.json();
  }
}
