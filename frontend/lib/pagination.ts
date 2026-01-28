import { useState, useEffect } from 'react'

// Pagination utilities and hooks
export interface PaginationState {
  page: number
  limit: number
  total: number
  hasMore: boolean
  loading: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

export class PaginationManager<T> {
  private state: PaginationState = {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: true,
    loading: false
  }
  
  private data: T[] = []
  private callbacks: Set<Function> = new Set()

  constructor(limit = 20) {
    this.state.limit = limit
  }

  // Get current state
  getState() {
    return { ...this.state, data: [...this.data] }
  }

  // Subscribe to state changes
  subscribe(callback: Function): () => void {
    this.callbacks.add(callback)
    return () => {
      this.callbacks.delete(callback)
    }
  }

  // Notify subscribers
  private notify() {
    this.callbacks.forEach(callback => {
      try {
        callback(this.getState())
      } catch (error) {
        console.error('Pagination callback error:', error)
      }
    })
  }

  // Load page
  async loadPage(page: number, fetchFn: (page: number, limit: number) => Promise<PaginatedResponse<T>>) {
    if (this.state.loading) return

    this.state.loading = true
    this.notify()

    try {
      const response = await fetchFn(page, this.state.limit)
      
      if (page === 1) {
        // First page - replace data
        this.data = response.data
      } else {
        // Subsequent pages - append data
        this.data.push(...response.data)
      }

      this.state = {
        page: response.pagination.page,
        limit: response.pagination.limit,
        total: response.pagination.total,
        hasMore: response.pagination.hasMore,
        loading: false
      }
    } catch (error) {
      this.state.loading = false
      console.error('Failed to load page:', error)
      throw error
    }

    this.notify()
  }

  // Load next page
  async loadNext(fetchFn: (page: number, limit: number) => Promise<PaginatedResponse<T>>) {
    if (!this.state.hasMore || this.state.loading) return
    await this.loadPage(this.state.page + 1, fetchFn)
  }

  // Refresh (reload first page)
  async refresh(fetchFn: (page: number, limit: number) => Promise<PaginatedResponse<T>>) {
    await this.loadPage(1, fetchFn)
  }

  // Reset state
  reset() {
    this.state = {
      page: 1,
      limit: this.state.limit,
      total: 0,
      hasMore: true,
      loading: false
    }
    this.data = []
    this.notify()
  }
}

// React hook for pagination
export function usePagination<T>(limit = 20) {
  const [manager] = useState(() => new PaginationManager<T>(limit))
  const [state, setState] = useState(manager.getState())

  useEffect(() => {
    const unsubscribe = manager.subscribe(setState)
    return unsubscribe
  }, [manager])

  return {
    ...state,
    loadPage: (page: number, fetchFn: any) => manager.loadPage(page, fetchFn),
    loadNext: (fetchFn: any) => manager.loadNext(fetchFn),
    refresh: (fetchFn: any) => manager.refresh(fetchFn),
    reset: () => manager.reset()
  }
}

// Infinite scroll hook
export function useInfiniteScroll(callback: Function, threshold = 100) {
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - threshold) {
        callback()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [callback, threshold])
}