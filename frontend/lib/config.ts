// Determine backend URL: use process env for SSR, NEXT_PUBLIC for client, fallback to localhost
export const BACKEND_URL = typeof window === 'undefined'
    ? (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000')
    : (process.env.NEXT_PUBLIC_BACKEND_URL || ''); // Empty string forces relative paths through Next.js proxy on client