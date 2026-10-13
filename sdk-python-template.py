import requests

class X402ScraperClient:
    def __init__(self, api_key: str, base_url: str = "https://x402-scraper-api-production-67a4.up.railway.app"):
        self.api_key = api_key
        self.base_url = base_url

    def extract(self, url: str, format: str = "markdown", ref_wallet: str = None) -> dict:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["X-Api-Key"] = self.api_key
        if ref_wallet:
            headers["ref"] = ref_wallet

        response = requests.post(
            f"{self.base_url}/api/extract",
            json={"url": url, "format": format},
            headers=headers
        )

        if response.status_code == 402:
            data = response.json()
            raise Exception(f"X402_PAYMENT_REQUIRED: Deposit required at {data.get('depositEndpoint')}. Payout address: {data.get('payoutAddress')}")
        
        if not response.ok:
            raise Exception(f"X402_ERROR: {response.json().get('error', response.reason)}")

        return response.json()

    def transfer_credits(self, recipient_api_key: str, amount_usdc: float) -> dict:
        response = requests.post(
            f"{self.base_url}/api/credits/transfer",
            json={"recipientApiKey": recipient_api_key, "amountUSDC": amount_usdc},
            headers={"Content-Type": "application/json", "X-Api-Key": self.api_key}
        )
        return response.json()

    def post_bounty(self, target_url: str, reward_usdc: float) -> dict:
        response = requests.post(
            f"{self.base_url}/api/bounties",
            json={"targetUrl": target_url, "rewardUSDC": reward_usdc},
            headers={"Content-Type": "application/json", "X-Api-Key": self.api_key}
        )
        return response.json()
