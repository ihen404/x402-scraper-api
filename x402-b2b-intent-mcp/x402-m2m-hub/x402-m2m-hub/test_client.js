import fetch from 'node-fetch';

const HUB_URL = 'https://x402-scraper-api-production-67a4.up.railway.app';

async function runSimulation() {
  console.log('🤖 Starting Comprehensive Autonomous Agent Simulation against M2M Hub...\n');

  // 1. Test Quote Endpoint
  console.log('📊 Requesting pricing quote...');
  try {
    const quoteRes = await fetch(`${HUB_URL}/api/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceName: 'sentiment-analysis', payloadSizeKb: 15 })
    });
    console.log('Quote Response:', await quoteRes.json());
  } catch (err) { console.error('Quote Error:', err.message); }

  // 2. Test Sentiment Analysis Endpoint
  console.log('\n💬 Testing Sentiment Analysis endpoint...');
  try {
    const sentimentRes = await fetch(`${HUB_URL}/api/sentiment`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Agent-Pass': 'simulated-agent-token',
        'X-Payment-Signature': '0xfake_base_solana_usdc_sig'
      },
      body: JSON.stringify({ text: 'The M2M agent hub is extremely robust and secure!' })
    });
    console.log('Sentiment Response:', await sentimentRes.json());
  } catch (err) { console.error('Sentiment Error:', err.message); }

  // 3. Test Attestation Endpoint
  console.log('\n🛡️ Fetching Node Attestation & Reputation...');
  try {
    const attestationRes = await fetch(`${HUB_URL}/api/attestation`);
    console.log('Attestation Response:', await attestationRes.json());
  } catch (err) { console.error('Attestation Error:', err.message); }

  // 4. Test Schema Transform
  console.log('\n🔄 Testing Schema Transform...');
  try {
    const schemaTransformRes = await fetch(`${HUB_URL}/api/schema-transform`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { user: 'Agent007', action: 'trade' }, targetSchema: 'standard-v2' })
    });
    console.log('Schema Transform:', await schemaTransformRes.json());
  } catch (err) { console.error('Schema Transform Error:', err.message); }

  // 5. Test Vector Query
  console.log('\n🔍 Testing Vector Query...');
  try {
    const vectorRes = await fetch(`${HUB_URL}/api/vector-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queryVector: [0.12, 0.45, 0.89], topK: 1 })
    });
    console.log('Vector Query:', await vectorRes.json());
  } catch (err) { console.error('Vector Query Error:', err.message); }

  // 6. Test Analytics Route
  console.log('\n📈 Fetching Analytics...');
  try {
    const analyticsRes = await fetch(`${HUB_URL}/api/analytics`);
    console.log('Analytics Route:', await analyticsRes.json());
  } catch (err) { console.error('Analytics Error:', err.message); }

  // 7. Test Prometheus Metrics
  console.log('\n📊 Fetching Prometheus Metrics...');
  try {
    const metricsRes = await fetch(`${HUB_URL}/metrics`);
    const metricsText = await metricsRes.text();
    console.log('Prometheus Metrics (Sample):\n', metricsText.split('\n').slice(0, 6).join('\n'));
  } catch (err) { console.error('Metrics Error:', err.message); }

  console.log('\n✅ Comprehensive autonomous agent simulation completed successfully!');
}

runSimulation().catch(console.error);
