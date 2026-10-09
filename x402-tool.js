/**
 * x402 Scraper Tool Wrapper for Autonomous Agents
 * Automatically handles the 402 handshake and payment proof submission.
 */
export async function scrapeWithX402(targetUrl, paymentSignerCallback) {
  const ENDPOINT = 'https://x402-scraper-api-production-67a4.up.railway.app/api/scrape';

  // 1. Initial request to trigger 402 and get payment details
  const initialRes = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: targetUrl })
  });

  if (initialRes.status !== 402) {
    return await initialRes.json();
  }

  const paymentDetails = await initialRes.json();
  console.log(`[x402 Agent] Payment required: ${paymentDetails.x402.price_usd} USDC on Base.`);

  // 2. Execute payment via agent wallet signer callback
  const txHash = await paymentSignerCallback(paymentDetails.x402);

  // 3. Retry request with payment proof header
  const paidRes = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-402-payment-proof': txHash
    },
    body: JSON.stringify({ url: targetUrl })
  });

  return await paidRes.json();
}
