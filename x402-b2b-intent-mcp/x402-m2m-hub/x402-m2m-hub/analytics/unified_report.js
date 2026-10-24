import fetch from 'node-fetch';

async function generateReport() {
  console.log("📊 [Unified Analytics] Generating Daily M2M Hub Performance Report...");
  try {
    const res = await fetch('http://localhost:3000/api/analytics');
    const data = await res.json();
    console.log("==================================================");
    console.log("📈 UNIFIED M2M HUB PERFORMANCE REPORT");
    console.log("==================================================");
    console.log(JSON.stringify(data, null, 2));
    console.log("==================================================");
    console.log("✅ Report generation complete.");
  } catch (err) {
    console.error("❌ Failed to fetch analytics from hub:", err.message);
  }
}

generateReport();
