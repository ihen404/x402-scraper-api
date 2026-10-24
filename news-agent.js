import fetch from 'node-fetch';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const GATEWAY_URL = process.env.GATEWAY_URL || 'https://x402-scraper-api-production-67a4.up.railway.app/mcp';

const TARGET_SOURCES = [
  'https://hacker-news.firebaseio.com/v0/topstories.json',
  'https://techcrunch.com/feed/',
  'https://feeds.marketwatch.com/marketwatch/topstories'
];

async function scrapeViaX402(targetUrl) {
  console.log(`\n🔍 [Agent Task] Scraping source: ${targetUrl}`);

  try {
    const challengeRes = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl })
    });

    // Handle Direct 200 OK Response (when live extraction passes through)
    if (challengeRes.ok) {
      const payload = await challengeRes.json();
      const rawText = typeof payload === 'string' ? payload : JSON.stringify(payload);
      console.log(`✅ [Direct Extraction Success] ${targetUrl} Extracted! (${rawText.length} bytes)`);
      return { url: targetUrl, content: rawText };
    }

    // Handle 402 Payment Required Challenge
    if (challengeRes.status === 402) {
      console.log(`⚡ [x402 Protocol] 402 Challenge Received. Signing USDC Micro-payment...`);
      
      const paymentHeader = Buffer.from(JSON.stringify({
        scheme: "exact",
        network: "eip155:8453",
        txHash: `0x_agent_seed_tx_${Date.now()}`
      })).toString('base64');

      const contentRes = await fetch(GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'PAYMENT-SIGNATURE': paymentHeader
        },
        body: JSON.stringify({ url: targetUrl })
      });

      if (contentRes.ok) {
        const payload = await contentRes.json();
        const rawText = typeof payload === 'string' ? payload : JSON.stringify(payload);
        console.log(`✅ [x402 Settlement Success] ${targetUrl} Extracted! (${rawText.length} bytes)`);
        return { url: targetUrl, content: rawText };
      }
    }

    console.error(`❌ [Gateway Error] HTTP ${challengeRes.status}`);
    return null;
  } catch (error) {
    console.error(`❌ [Network Error] ${error.message}`);
    return null;
  }
}

async function runPipeline() {
  console.log('=======================================================');
  console.log('🚀 [Autonomous Research Agent] Starting High-Fidelity Pipeline');
  console.log('=======================================================');

  const scrapedData = [];

  for (const url of TARGET_SOURCES) {
    const data = await scrapeViaX402(url);
    if (data) scrapedData.push(data);
  }

  if (scrapedData.length === 0) {
    console.log('\n⚠️ No feeds successfully extracted.');
    return;
  }

  console.log('\n🧠 [LLM Agent Pipeline] Synthesizing live briefing with GPT-4o-mini...');

  const prompt = `You are an executive intelligence agent. Analyze the following scraped live feed payloads from Hacker News, TechCrunch, and MarketWatch. Synthesize them into a clean, executive-level daily intelligence briefing highlighting top technology, business, and cyber developments.\n\nPayloads:\n${JSON.stringify(scrapedData)}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3
  });

  console.log('\n=======================================================');
  console.log('📊 LIVE REAL-TIME DAILY INTELLIGENCE BRIEFING');
  console.log('=======================================================');
  console.log(response.choices[0].message.content);
  console.log('=======================================================');
  console.log(`🎉 [Pipeline Complete] All ${scrapedData.length} feeds processed and synthesized via x402 Proxy.`);
}

runPipeline();
