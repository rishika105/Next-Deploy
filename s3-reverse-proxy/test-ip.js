// reverse-proxy/test-ip.js
// Run this to get your public IP for testing

const https = require('https');

console.log('🔍 Fetching your public IP...\n');

https.get('https://api.ipify.org?format=json', (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('✅ Your Public IP:', json.ip);
      console.log('\n📝 To test analytics with real location:');
      console.log('   1. Copy your IP:', json.ip);
      console.log('   2. In server.js, replace the test IP in getClientIp() function');
      console.log('   3. Or add this to your .env file:');
      console.log(`   TEST_IP=${json.ip}`);
      console.log('\n🌍 This will show your actual location in analytics!');
    } catch (err) {
      console.error('Error parsing IP:', err);
    }
  });
}).on('error', (err) => {
  console.error('Error fetching IP:', err);
});