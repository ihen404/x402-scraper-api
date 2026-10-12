import { v4 as uuidv4 } from 'uuid';

const creditVault = new Map();

export function createCreditAccount(walletAddress, initialDepositUSDC) {
  const apiKey = `x402_key_${uuidv4().replace(/-/g, '')}`;
  creditVault.set(apiKey, {
    walletAddress,
    balanceUSDC: parseFloat(initialDepositUSDC),
    createdAt: new Date().toISOString()
  });
  return { apiKey, balanceUSDC: initialDepositUSDC };
}

export function verifyAndDeductCredit(apiKey, costUSDC) {
  const account = creditVault.get(apiKey);
  if (!account) return { valid: false, reason: "Invalid API key" };
  if (account.balanceUSDC < costUSDC) {
    return { valid: false, reason: "Insufficient balance", balanceUSDC: account.balanceUSDC };
  }

  account.balanceUSDC -= costUSDC;
  return { valid: true, remainingBalanceUSDC: account.balanceUSDC };
}

export function getAccountBalance(apiKey) {
  return creditVault.get(apiKey) || null;
}
