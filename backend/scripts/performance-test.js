const http = require('http');

// Simple performance test
async function performanceTest() {
  console.log('🚀 Running Performance Test...\n');
  
  const baseUrl = process.env.TEST_URL || 'http://localhost:5000';
  const endpoints = [
    '/api/health',
    '/api/items/recent?limit=10',
    '/api/items/events'
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint}...`);
    
    const times = [];
    const errors = [];
    
    // Run 10 requests per endpoint
    for (let i = 0; i < 10; i++) {
      try {
        const start = Date.now();
        
        await new Promise((resolve, reject) => {
          const req = http.get(`${baseUrl}${endpoint}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              const time = Date.now() - start;
              times.push(time);
              resolve();
            });
          });
          
          req.on('error', reject);
          req.setTimeout(5000, () => reject(new Error('Timeout')));
        });
        
      } catch (error) {
        errors.push(error.message);
      }
    }
    
    if (times.length > 0) {
      const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      const min = Math.min(...times);
      const max = Math.max(...times);
      
      results.push({
        endpoint,
        avg,
        min,
        max,
        success: times.length,
        errors: errors.length
      });
      
      console.log(`  ✅ Avg: ${avg}ms, Min: ${min}ms, Max: ${max}ms, Errors: ${errors.length}`);
    } else {
      console.log(`  ❌ All requests failed`);
    }
  }
  
  console.log('\n📊 Performance Test Results:');
  results.forEach(result => {
    const status = result.avg < 500 ? '🟢' : result.avg < 1000 ? '🟡' : '🔴';
    console.log(`${status} ${result.endpoint}: ${result.avg}ms avg (${result.success}/${result.success + result.errors} success)`);
  });
  
  const overallAvg = Math.round(results.reduce((sum, r) => sum + r.avg, 0) / results.length);
  console.log(`\n🎯 Overall Average: ${overallAvg}ms`);
  
  if (overallAvg < 500) {
    console.log('✅ Performance: Excellent');
  } else if (overallAvg < 1000) {
    console.log('⚠️  Performance: Good');
  } else {
    console.log('❌ Performance: Needs improvement');
  }
}

if (require.main === module) {
  performanceTest().catch(console.error);
}

module.exports = { performanceTest };