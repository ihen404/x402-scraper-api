import NodeCache from 'node-cache';
import fetch from 'node-fetch';

// In-memory cache with 15-minute TTL (900 seconds)
const scrapeCache = new NodeCache({ stdTTL: 900, checkperiod: 120 });

export function getCachedResult(url) {
  return scrapeCache.get(url);
}

export function setCachedResult(url, data) {
  return scrapeCache.set(url, data);
}

// Process referral affiliate rebate (10% fee-split logging / routing)
export function processAffiliateRebate(refWallet, feePaidUSDC) {
  if (!refWallet) return null;
  const rebateUSDC = feePaidUSDC * 0.10;
  // In production, queue EIP-3009 transfer authorization or credit ledger update for refWallet
  console.log(`[Affiliate] Routing 10% rebate (${rebateUSDC} USDC) to affiliate wallet: ${refWallet}`);
  return { refWallet, rebateUSDC };
}

// Webhook dispatcher with Exponential Backoff Retry Logic
export async function sendWebhookWithRetry(callbackUrl, payload, maxRetries = 3) {
  let attempt = 0;
  let delay = 1000; // start with 1s

  while (attempt < maxRetries) {
    try {
      attempt++;
      const response = await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log(`[Webhook] Successfully delivered to ${callbackUrl} on attempt ${attempt}`);
        return { success: true, attempt };
      }
      throw new Error(`HTTP Error: ${response.status}`);
    } catch (err) {
      console.warn(`[Webhook] Attempt ${attempt} failed for ${callbackUrl}: ${err.message}`);
      if (attempt >= maxRetries) {
        return { success: false, error: err.message, attempts: attempt };
      }
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // exponential backoff (1s -> 2s -> 4s)
    }
  }
}
