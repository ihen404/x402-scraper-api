import fetch from 'node-fetch';

const GATEWAY_URL = 'https://x402-scraper-api-production-67a4.up.railway.app/mcp';
const TARGET_URL = 'https://news.ycombinator.com';

async function runSwarmCycle() {
  console.log(`🤖 [Swarm Agent] Initiating request to gateway for: ${TARGET_URL}`);
  
  // 1. Initial unauthenticated request
  const initialRes = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: TARGET_URL })
  });

  if (initialRes.status === 402) {
    console.log(`⚡ [x402 Protocol] Received HTTP 402 Payment Challenge.`);
    const data = await initialRes.json();
    console.log(`📋 Payment Requirements:`, JSON.stringify(data.error.payment_requirements, null, 2));

    // Simulate signing an x402 V2 payment payload (Base / USDC)
    console.log(`✍️ [Swarm Agent] Signing USDC micro-payment on Base chain...`);
    const mockSignatureHeader = Buffer.from(JSON.stringify({
      scheme: "exact",
      network: "base",
      txHash: "0x_mock_simulation_tx_hash_for_telemetry_2026"
    })).toString('base64');

    // 2. Retry request with PAYMENT-SIGNATURE header
    console.log(`🚀 [Swarm Agent] Re-issuing request with PAYMENT-SIGNATURE...`);
    const paidRes = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYMENT-SIGNATURE': mockSignatureHeader
      },
      body: JSON.stringify({ url: TARGET_URL })
    });

    const result = await paidRes.json();
    console.log(`✅ [Gateway Response Status]:`, paidRes.status);
    console.log(`📦 [Extracted Payload Sample]:`, JSON.stringify(result).slice(0, 200) + '...');
  } else {
    console.log(`ℹ️ Response received:`, initialRes.status);
  }
}

runSwarmCycle().catch(console.error);
