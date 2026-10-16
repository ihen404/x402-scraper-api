async function testPaidScraper() {
  const endpoint = 'http://127.0.0.1:8080/';
  
  console.log('Sending paid request with x-payment-proof...');
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-payment-proof': 'simulated_valid_tx_hash_base_0x123456789'
      },
      body: JSON.stringify({ 
        method: 'tools/call',
        params: { name: 'scrape_proof', arguments: { url: 'https://news.ycombinator.com' } },
        id: 1 
      })
    });

    console.log(`HTTP Status: ${response.status} ${response.statusText}`);
    const data = await response.json();
    console.log('\n[Response Received]:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testPaidScraper();
