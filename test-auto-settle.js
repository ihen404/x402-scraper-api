const { createWalletClient, http, parseUnits } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { base } = require('viem/chains');

// Base Mainnet USDC Contract Address
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Minimal ERC-20 ABI for transfer
const erc20Abi = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }
];

async function runAutoSettlement() {
  const endpoint = 'https://x402-scraper-api-production-67a4.up.railway.app/api/scrape';
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    console.error('❌ Missing PRIVATE_KEY in environment variables.');
    console.log('Run with: PRIVATE_KEY=0xYourPrivateKey node test-auto-settle.js');
    return;
  }

  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
  const client = createWalletClient({
    account,
    chain: base,
    transport: http()
  });

  console.log(`1. Requesting endpoint with wallet: ${account.address}`);
  let response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://news.ycombinator.com' })
  });

  if (response.status === 402) {
    const paymentRequirements = await response.json();
    const { payTo, price } = paymentRequirements.accepts;

    console.log(`2. Received 402. Settling ${price} USDC to ${payTo} on Base...`);

    // Parse USDC amount (6 decimals)
    const amount = parseUnits(price, 6);

    // Send USDC transaction on Base
    const txHash = await client.writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [payTo, amount]
    });

    console.log(`3. Payment sent! Tx Hash: ${txHash}`);
    console.log('4. Retrying API request with payment proof...');

    // Resend request with transaction hash proof
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment': txHash,
        'X-Payment-TxHash': txHash
      },
      body: JSON.stringify({ url: 'https://news.ycombinator.com' })
    });

    const data = await response.json();
    console.log('\n✅ Scraper Data Output:', JSON.stringify(data, null, 2));
  } else {
    const data = await response.json();
    console.log('Response:', data);
  }
}

runAutoSettlement().catch(console.error);
