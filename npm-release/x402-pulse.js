// x402 Pulse - Automated Telemetry & Protocol Intelligence
class X402Pulse {
  constructor(config = {}) {
    this.endpoint = config.endpoint || "https://x402-scraper-api-production-67a4.up.railway.app/";
  }

  async checkHealth() {
    try {
      const start = Date.now();
      const res = await fetch(this.endpoint);
      const data = await res.json();
      const latency = Date.now() - start;
      
      console.log(`[x402-pulse] Status: ${data.status} | Latency: ${latency}ms | Service: ${data.service}`);
      return { online: true, latency, data };
    } catch (err) {
      console.error("[x402-pulse] Health check failed:", err.message);
      return { online: false, error: err.message };
    }
  }
}

export default X402Pulse;
