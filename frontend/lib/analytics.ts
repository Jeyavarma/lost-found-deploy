// Google Analytics 4 integration
declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

export function initGA() {
  if (!GA_MEASUREMENT_ID) return

  // Load Google Analytics script
  const script1 = document.createElement('script')
  script1.async = true
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  document.head.appendChild(script1)

  // Initialize gtag
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_title: document.title,
    page_location: window.location.href
  })
}

// Track page views
export function trackPageView(url: string, title?: string) {
  if (!GA_MEASUREMENT_ID || !window.gtag) return

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: url,
    page_title: title
  })
}

// Track custom events
export function trackEvent(action: string, category: string, label?: string, value?: number) {
  if (!GA_MEASUREMENT_ID || !window.gtag) return

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value
  })
}

// Predefined event trackers
export const analytics = {
  // Item events
  reportLostItem: () => trackEvent('report_item', 'items', 'lost'),
  reportFoundItem: () => trackEvent('report_item', 'items', 'found'),
  viewItem: (itemId: string) => trackEvent('view_item', 'items', itemId),
  searchItems: (query: string) => trackEvent('search', 'items', query),
  
  // User events
  userLogin: () => trackEvent('login', 'auth'),
  userRegister: () => trackEvent('sign_up', 'auth'),
  userLogout: () => trackEvent('logout', 'auth'),
  
  // Chat events
  startChat: (itemId: string) => trackEvent('start_chat', 'communication', itemId),
  sendMessage: () => trackEvent('send_message', 'communication'),
  
  // Match events
  viewMatch: (matchScore: number) => trackEvent('view_match', 'matching', undefined, matchScore),
  
  // Error tracking
  error: (errorType: string, errorMessage: string) => 
    trackEvent('error', 'system', `${errorType}: ${errorMessage}`)
}