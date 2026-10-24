export async function scrapeNewsFeed(targetUrl = "https://news.ycombinator.com") {
  try {
    console.log(`[Scraper] Fetching target URL: ${targetUrl}`);
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Compatible; x402-Scraper-Bot/1.0; +https://railway.app)"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();

    // Return structured intelligence payload for AI consumption
    return {
      url: targetUrl,
      timestamp: new Date().toISOString(),
      status: "extracted",
      byteLength: html.length,
      preview: html.substring(0, 400).replace(/\s+/g, " ").trim() + "..."
    };
  } catch (error) {
    console.error(`[Scraper Error] Failed to extract ${targetUrl}:`, error.message);
    throw new Error(`Extraction failed: ${error.message}`);
  }
}
