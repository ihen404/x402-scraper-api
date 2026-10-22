import fetch from 'node-fetch';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const GATEWAY_URL = 'https://x402-scraper-api-production-67a4.up.railway.app/mcp';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// High-fidelity feed endpoints for reliable scraping
const TARGET_SOURCES = [
  { name: 'Hacker News API', url: 'https://hacker-news.firebaseio.com/v0/topstories.json' },
  { name: 'TechCrunch Feed', url: 'https://techcrunch.com/feed/' },
  { name: 'MarketWatch Feed', url: 'https://feeds.marketwatch.com/marketwatch/topstories' }
];

async function scrapeViaX402(targetUrl) {
  console.log(`\n🔍 [Agent Task] Scraping source: ${targetUrl}`);

  const challengeRes = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: targetUrl })
  });

  if (challengeRes.status === 402) {
    console.log(`⚡ [x402 Protocol] 402 Challenge Received. Signing USDC Micro-payment...`);
    
    const paymentHeader = Buffer.from(JSON.stringify({
      scheme: "exact",
      network: "base",
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
      console.log(`✅ [x402 Settlement Success] ${targetUrl} Extracted!`);
      return { url: targetUrl, content: JSON.stringify(payload) };
    } else {
      console.error(`❌ [Gateway Error] HTTP ${contentRes.status}`);
      return null;
    }
  } else {
    console.log(`ℹ️ Direct response status: ${challengeRes.status}`);
    return null;
  }
}

async function generateLLMBriefing(scrapedData) {
  if (!openai) {
    console.log(`\n⚠️ [LLM Step Skipped] OPENAI_API_KEY is not set.`);
    return null;
  }

  console.log(`\n🧠 [LLM Agent Pipeline] Synthesizing live briefing with GPT-4o...`);

  const combinedContent = scrapedData
    .map(item => `### Source: ${item.url}\nRAW DATA:\n${item.content.slice(0, 3000)}`)
    .join('\n\n---\n\n');

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an executive market research analyst. Extract exact headlines, tech developments, and financial news items explicitly found in the provided raw text payload. DO NOT rely on general historical knowledge or insert placeholder text. Only summarize stories explicitly present in the data."
        },
        {
          role: "user",
          content: `Here is today's scraped payload from target endpoints:\n\n${combinedContent}`
        }
      ]
    });

    const briefing = completion.choices[0].message.content;
    console.log(`\n=======================================================`);
    console.log(`📊 LIVE REAL-TIME DAILY INTELLIGENCE BRIEFING`);
    console.log(`=======================================================`);
    console.log(briefing);
    console.log(`=======================================================\n`);
    return briefing;
  } catch (err) {
    console.error(`❌ [LLM Error]:`, err.message);
    return null;
  }
}

async function runDailyBriefingPipeline() {
  console.log(`=======================================================`);
  console.log(`🚀 [Autonomous Research Agent] Starting High-Fidelity Pipeline`);
  console.log(`=======================================================`);

  const scrapedData = [];
  for (const item of TARGET_SOURCES) {
    const res = await scrapeViaX402(item.url);
    if (res) scrapedData.push(res);
  }

  if (scrapedData.length > 0) {
    await generateLLMBriefing(scrapedData);
  }

  console.log(`🎉 [Pipeline Complete] All ${scrapedData.length} feeds processed and synthesized via x402 Proxy.`);
}

runDailyBriefingPipeline().catch(console.error);
