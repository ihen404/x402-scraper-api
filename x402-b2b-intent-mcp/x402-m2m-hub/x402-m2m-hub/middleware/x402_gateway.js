import { Connection, PublicKey } from '@solana/web3.js';
import { ethers } from 'ethers';

const TREASURY_BASE = process.env.TREASURY_BASE_ADDRESS || "0xYourBaseTreasuryWalletAddressHere";
const TREASURY_SOL = process.env.TREASURY_SOL_ADDRESS || "YourSolanaTreasuryWalletAddressHere";

const baseProvider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL || "https://mainnet.base.org");
const solanaConnection = new Connection(process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com");

const activePasses = new Map();

export function x402PaymentGate(serviceTierConfig) {
  return async (req, res, next) => {
    const chain = req.headers['x-402-chain'] || 'base';
    const paymentSignature = req.headers['x-payment-signature'];
    const passToken = req.headers['x-agent-pass'];

    if (passToken && activePasses.has(passToken)) {
      const expiry = activePasses.get(passToken);
      if (Date.now() < expiry) {
        req.agentSession = { type: 'pass', chain };
        return next();
      } else {
        activePasses.delete(passToken);
      }
    }

    const requiredAmountUSDC = serviceTierConfig[req.path] || 0.01;

    if (!paymentSignature) {
      return res.status(402).json({
        error: "Payment Required",
        protocol: "x402",
        accepted_chains: ["base", "solana"],
        payment_details: {
          token: "USDC",
          amount: requiredAmountUSDC,
          base: {
            network: "eip155:8453",
            pay_to: TREASURY_BASE,
            usdc_contract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
          },
          solana: {
            network: "solana:mainnet",
            pay_to: TREASURY_SOL,
            usdc_mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
          }
        },
        instruction: "Send exact USDC amount to the designated chain address and attach transaction hash in header 'X-Payment-Signature'."
      });
    }

    try {
      let verified = false;

      if (chain === 'base') {
        const tx = await baseProvider.getTransaction(paymentSignature);
        if (tx && tx.to && tx.to.toLowerCase() === TREASURY_BASE.toLowerCase()) {
          verified = true;
        }
      } else if (chain === 'solana') {
        const txStatus = await solanaConnection.getSignatureStatus(paymentSignature);
        if (txStatus && txStatus.value && !txStatus.value.err) {
          verified = true;
        }
      }

      if (!verified) {
        return res.status(402).json({ error: "Invalid payment signature or transaction not confirmed." });
      }

      req.agentSession = { type: 'spot', chain, signature: paymentSignature };
      next();
    } catch (err) {
      console.error("Payment verification error:", err);
      return res.status(500).json({ error: "Payment gateway validation failure." });
    }
  };
}

export function registerPass(passToken) {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  activePasses.set(passToken, Date.now() + ONE_DAY);
}
