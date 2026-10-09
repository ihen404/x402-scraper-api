import { X402ScraperClient } from './client.mjs';

async function runTest() {
  const client = new X402ScraperClient({ paymentToken: 'valid-test-token' });

  console.log('Testing single scrape via client SDK...');
  try {
    const singleResult = await client.scrape('https://example.com');
    console.log('Single Scrape Result:', singleResult);
  } catch (err) {
    console.error('Single Scrape Error:', err.message);
  }

  console.log('\nTesting batch scrape via client SDK...');
  try {
    const batchResult = await client.batchScrape(['https://example.com/1', 'https://example.com/2']);
    console.log('Batch Scrape Result:', batchResult);
  } catch (err) {
    console.error('Batch Scrape Error:', err.message);
  }

  console.log('\nTesting 402 payment failure handling...');
  const unpaidClient = new X402ScraperClient({ paymentToken: 'invalid-forced-test' });
  try {
    await unpaidClient.scrape('https://example.com');
  } catch (err) {
    console.log('Caught Expected 402 Error Successfully:', err.message);
  }
}

runTest();
