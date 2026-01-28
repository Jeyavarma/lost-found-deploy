// Socket.io configuration for Vercel-Render production setup
export const SOCKET_CONFIG = {
  // Production Render backend URL
  serverUrl: process.env.NODE_ENV === 'production' 
    ? 'https://lost-found-79xn.onrender.com'
    : 'http://localhost:5000',
    
  // Socket.io options for cross-domain
  options: {
    transports: ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: true,
    timeout: 20000,
    forceNew: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    maxReconnectionAttempts: 5,
    // CORS for Vercel-Render communication
    withCredentials: false,
    extraHeaders: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  }
}

// Health check for socket connection
export async function checkSocketHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${SOCKET_CONFIG.serverUrl}/health`)
    return response.ok
  } catch {
    return false
  }
}