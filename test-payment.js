async function testScraper() {
  const endpoint = 'http://127.0.0.1:8080/';
  
  console.log('Sending request to x402 scraper...');
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://news.ycombinator.com' })
    });

    console.log(`HTTP Status: ${response.status} ${response.statusText}`);

    if (response.status === 402) {
      console.log('\n✅ 402 Payment Required Handled Successfully!');
      const paymentDetails = await response.json();
      console.log('Payment Requirements:', JSON.stringify(paymentDetails, null, 2));
    } else {
      const data = await response.json();
      console.log('\n[Response Received]:', data);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testScraper();
