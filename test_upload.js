const fs = require('fs');
const path = require('path');

async function runTest() {
  console.log("🚀 Starting Upload Test API...");

  // 1. Create a dummy image
  console.log("📸 Creating dummy image file...");
  const dummyImgPath = path.join(__dirname, 'dummy_test.jpg');
  fs.writeFileSync(dummyImgPath, Buffer.from('R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64'));

  try {
    // 2. Login to get token for user va@mcc.edu.in
    console.log("🔐 Authenticating user va@mcc.edu.in...");
    const loginRes = await fetch("http://localhost:10000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "va@mcc.edu.in", password: "123456789" })
    });
    
    if (!loginRes.ok) throw new Error(`Login failed: ${await loginRes.text()}`);
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log("✅ Authenticated successfully. Token acquired.");

    // 3. Prepare FormData payload mimicking the frontend
    console.log("📦 Preparing exact FormData payload...");
    const formData = new FormData();
    formData.append("status", "lost");
    formData.append("title", "Automated Playwright Test Book");
    formData.append("category", "Books");
    formData.append("description", "A dummy book used for testing Next.js Proxy");
    formData.append("location", "Test Lab");
    formData.append("date", new Date().toISOString().split('T')[0]);
    formData.append("contactName", "Test Engine");
    formData.append("contactEmail", "va@mcc.edu.in");
    
    const fileStats = fs.statSync(dummyImgPath);
    const fileStream = fs.createReadStream(dummyImgPath);
    
    // We construct a Blob from the file buffer to emulate browser FormData
    const fileBuffer = fs.readFileSync(dummyImgPath);
    const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
    formData.append("itemImage", blob, "dummy_test.jpg");

    // 4. Send request to Next.js Proxy (which mirrors report/page.tsx behavior)
    console.log("📡 Sending test payload to Next.js POST /api/proxy-upload...");
    const uploadRes = await fetch("http://localhost:3002/api/proxy-upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
        // Notice we DO NOT set Content-Type, letting fetch generate the multipart boundary automatically
      },
      body: formData
    });

    const responseText = await uploadRes.text();
    console.log(`\n📊 Response Status: ${uploadRes.status}`);
    console.log(`📄 Response Body: ${responseText}\n`);
    
    if (uploadRes.ok) {
      console.log("🎉 SUCCESS: Next.js Proxy correctly forwarded the FormData boundaries to the backend.");
    } else {
      console.log("❌ FAILED: Upload rejected by backend or proxy.");
    }
  } catch (err) {
    console.error("💥 Critical Error during automation script:", err);
  } finally {
    // Cleanup
    if (fs.existsSync(dummyImgPath)) fs.unlinkSync(dummyImgPath);
  }
}

runTest();
