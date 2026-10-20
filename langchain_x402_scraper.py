import requests
from langchain.tools import tool

GATEWAY_URL = "https://x402-scraper-api-production-67a4.up.railway.app/scrape"

@tool
def x402_web_scraper(url: str) -> str:
    """Scrapes any web page and converts it to clean LLM-ready Markdown using x402 USDC payments."""
    payload = {"url": url}
    try:
        response = requests.post(GATEWAY_URL, json=payload, timeout=15)
        if response.status_code == 200:
            return response.json().get("markdown", "No content returned.")
        elif response.status_code == 402:
            return f"Payment Required (x402 Challenge): {response.headers.get('PAYMENT-REQUIRED')}"
        else:
            return f"Error: Received status code {response.status_code}"
    except Exception as e:
        return f"Failed to execute x402 scrape: {str(e)}"
