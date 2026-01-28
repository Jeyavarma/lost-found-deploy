// Simple test for chat functionality
const testChatEndpoint = async () => {
  const BACKEND_URL = 'http://localhost:5000' // or your backend URL
  
  try {
    // Test without auth first
    const response = await fetch(`${BACKEND_URL}/api/chat/rooms`)
    console.log('No auth test - Status:', response.status)
    
    if (response.status === 401) {
      console.log('✅ Auth required (expected)')
    } else {
      console.log('❌ Auth not required (unexpected)')
    }
    
    // Test with fake item ID
    const itemResponse = await fetch(`${BACKEND_URL}/api/chat/room/test123`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log('Item chat test - Status:', itemResponse.status)
    
    if (itemResponse.status === 401) {
      console.log('✅ Item chat requires auth (expected)')
    } else {
      console.log('❌ Item chat auth issue')
    }
    
  } catch (error) {
    console.error('Test failed:', error.message)
  }
}

// Run test if this file is executed directly
if (typeof window === 'undefined') {
  testChatEndpoint()
}

module.exports = { testChatEndpoint }