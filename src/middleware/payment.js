import { verifyPaymentHeader } from '@x402/core';

const PAYOUT_WALLET = "0x391e20e3f938d9aa3b39c7f4aa1cb6cbd6a9df28";
const NETWORK = "eip155:8453"; // Base Mainnet
const USDC_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export async function requireX402Payment(req, res, next) {
  const paymentProof = req.headers['x-payment-proof'] || req.headers['x-payment-signature'];

  if (!paymentProof) {
    // Return HTTP 402 Payment Required with standard x402 challenge envelope
    res.setHeader('PAYMENT-REQUIRED', Buffer.from(JSON.stringify({
      scheme: "exact",
      network: NETWORK,
      token: USDC_CONTRACT,
      payTo: PAYOUT_WALLET,
      cost: "0.01", // USDC per extraction request
      currency: "USDC"
    })).toString('base64'));

    return res.status(402).json({
      error: "Payment Required",
      message: "This M2M endpoint requires a micro-payment of 0.01 USDC on Base Mainnet.",
      payTo: PAYOUT_WALLET,
      network: NETWORK
    });
  }

  try {
    // Verify live on-chain or facilitator-signed payment proof
    const isValid = await verifyPaymentHeader(paymentProof, {
      expectedPayTo: PAYOUT_WALLET,
      expectedNetwork: NETWORK,
      expectedToken: USDC_CONTRACT
    });

    if (!isValid) {
      return res.status(403).json({ error: "Invalid payment authorization or insufficient funds." });
    }

    next();
  } catch (err) {
    return res.status(400).json({ error: "Payment verification failed", details: err.message });
  }
}
