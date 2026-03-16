import HomePageClient from "@/components/home-page-client"
import { BACKEND_URL } from "@/lib/config"

// Fetch data on the server during build or user request natively in Next.js Server Components
async function fetchInitialData() {
  try {
    // During Next.js static build phase, external APIs might hang or fail. 
    // We add a strict 5000ms timeout to ensure the build completes safely.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const [itemsRes, recentRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/items`, { 
        next: { revalidate: 60 },
        signal: controller.signal
      }).catch(err => { console.warn("Items fetch failed:", err.message); return null; }),
      fetch(`${BACKEND_URL}/api/items?sort=createdAt&order=desc&limit=10`, { 
        next: { revalidate: 60 },
        signal: controller.signal
      }).catch(err => { console.warn("Recent items fetch failed:", err.message); return null; })
    ])
    
    clearTimeout(timeoutId);

    const itemsData = itemsRes?.ok ? await itemsRes.json() : []
    const recentData = recentRes?.ok ? await recentRes.json() : []

    const allItems = Array.isArray(itemsData) ? itemsData : (itemsData?.items || itemsData?.data || [])
    const recentItems = Array.isArray(recentData) ? recentData : (recentData?.items || recentData?.data || [])

    return { allItems, recentItems }
  } catch (error) {
    console.warn('⚠️ SSR data fetch bypassed:', error)
    return { allItems: [], recentItems: [] }
  }
}

export default async function HomePage() {
  // This executes entirely on the Vercel server, never in the user's browser
  const { allItems, recentItems } = await fetchInitialData()

  // We pass the pre-fetched data directly into the interactive Client component
  return (
    <HomePageClient 
      initialAllItems={allItems} 
      initialRecentItems={recentItems} 
    />
  )
}
