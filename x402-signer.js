import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

/**
 * Executes a USDC microtransaction on Base to fulfill an x402 challenge,
 * returning the resulting transaction hash as a payment proof.
 */
export async function signX402Payment(paymentDetails, privateKey) {
  const account = privateKeyToAccount(privateKey);
  const client = createWalletClient({
    account,
    chain: base,
    transport: http()
  });

  console.log(`[Agent Wallet] Signing $${paymentDetails.price_usd} USDC payment on Base for recipient ${paymentDetails.payment_address}...`);

  // USDC contract address on Base mainnet
  const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

  // Execute ERC-20 transfer or use EIP-3009 authorization
  const hash = await client.writeContract({
    address: USDC_ADDRESS,
    abi: [{
      name: 'transfer',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' }
      ],
      outputs: [{ name: '', type: 'bool' }]
    }],
    functionName: 'transfer',
    args: [
      paymentDetails.payment_address,
      BigInt(Math.floor(parseFloat(paymentDetails.price_usd) * 1_000_000)) // USDC has 6 decimals
    ]
  });

  console.log(`[Agent Wallet] Payment broadcasted! TxHash: ${hash}`);
  return hash;
}
