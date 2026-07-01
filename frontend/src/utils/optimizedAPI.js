import axios from 'axios'
import { performanceMonitor } from './performanceUtils'

/**
 * Optimized API client with caching, request deduplication, and performance monitoring
 */
class OptimizedAPIClient {
  constructor(baseURL) {
    this.baseURL = baseURL
    this.cache = new Map()
    this.pendingRequests = new Map()
    this.requestQueue = []
    this.isProcessingQueue = false
    this.maxConcurrentRequests = 6
    this.activeRequests = 0
    
    // Create axios instance with optimized defaults
    this.client = axios.create({
      baseURL,
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    // Add request interceptor for performance monitoring
    this.client.interceptors.request.use(
      (config) => {
        const key = `api_${config.method}_${config.url}`
        performanceMonitor.startTiming(key)
        config.metadata = { startTime: Date.now(), key }
        return config
      },
      (error) => Promise.reject(error)
    )
    
    // Add response interceptor for performance monitoring
    this.client.interceptors.response.use(
      (response) => {
        if (response.config.metadata) {
          performanceMonitor.endTiming(response.config.metadata.key)
        }
        return response
      },
      (error) => {
        if (error.config?.metadata) {
          performanceMonitor.endTiming(error.config.metadata.key)
        }
        return Promise.reject(error)
      }
    )
  }

  /**
   * Generate cache key for request
   */
  getCacheKey(method, url, params, data) {
    const key = `${method.toLowerCase()}_${url}`
    if (params) key += `_${JSON.stringify(params)}`
    if (data) key += `_${JSON.stringify(data)}`
    return key
  }

  /**
   * Check if response is cacheable
   */
  isCacheable(method, url) {
    // Only cache GET requests for specific endpoints
    if (method.toLowerCase() !== 'get') return false
    
    const cacheableEndpoints = [
      '/menu',
      '/settings',
      '/tables',
      '/subscription/status',
      '/public/pricing'
    ]
    
    return cacheableEndpoints.some(endpoint => url.includes(endpoint))
  }

  /**
   * Get cached response if available and not expired
   */
  getCachedResponse(cacheKey, maxAge = 5 * 60 * 1000) { // 5 minutes default
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < maxAge) {
      return cached.data
    }
    return null
  }

  /**
   * Cache response
   */
  setCachedResponse(cacheKey, data) {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    })
    
    // Limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
  }

  /**
   * Process request queue
   */
  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return
    
    this.isProcessingQueue = true
    
    while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
      const { resolve, reject, config } = this.requestQueue.shift()
      this.activeRequests++
      
      try {
        const response = await this.client(config)
        resolve(response)
      } catch (error) {
        reject(error)
      } finally {
        this.activeRequests--
      }
    }
    
    this.isProcessingQueue = false
    
    // Continue processing if there are more requests
    if (this.requestQueue.length > 0) {
      setTimeout(() => this.processQueue(), 10)
    }
  }

  /**
   * Make optimized request
   */
  async request(config) {
    const { method = 'get', url, params, data, cache = true, maxAge } = config
    const cacheKey = this.getCacheKey(method, url, params, data)
    
    // Check cache first
    if (cache && this.isCacheable(method, url)) {
      const cached = this.getCachedResponse(cacheKey, maxAge)
      if (cached) {
        return { data: cached, fromCache: true }
      }
    }
    
    // Check for pending identical request
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)
    }
    
    // Create request promise
    const requestPromise = new Promise((resolve, reject) => {
      const requestConfig = {
        method,
        url,
        params,
        data,
        ...config
      }
      
      // Add to queue if at capacity, otherwise execute immediately
      if (this.activeRequests >= this.maxConcurrentRequests) {
        this.requestQueue.push({ resolve, reject, config: requestConfig })
        this.processQueue()
      } else {
        this.activeRequests++
        this.client(requestConfig)
          .then(response => {
            // Cache successful GET responses
            if (cache && this.isCacheable(method, url) && response.status === 200) {
              this.setCachedResponse(cacheKey, response.data)
            }
            resolve(response)
          })
          .catch(reject)
          .finally(() => {
            this.activeRequests--
            this.pendingRequests.delete(cacheKey)
          })
      }
    })
    
    this.pendingRequests.set(cacheKey, requestPromise)
    return requestPromise
  }

  /**
   * Convenience methods
   */
  get(url, config = {}) {
    return this.request({ method: 'get', url, ...config })
  }

  post(url, data, config = {}) {
    return this.request({ method: 'post', url, data, ...config })
  }

  put(url, data, config = {}) {
    return this.request({ method: 'put', url, data, ...config })
  }

  delete(url, config = {}) {
    return this.request({ method: 'delete', url, ...config })
  }

  /**
   * Batch requests
   */
  async batch(requests, options = {}) {
    const { maxConcurrent = 3, delayBetweenBatches = 100 } = options
    const results = []
    
    for (let i = 0; i < requests.length; i += maxConcurrent) {
      const batch = requests.slice(i, i + maxConcurrent)
      const batchPromises = batch.map(request => this.request(request))
      
      try {
        const batchResults = await Promise.allSettled(batchPromises)
        results.push(...batchResults)
        
        // Delay between batches to prevent overwhelming server
        if (i + maxConcurrent < requests.length && delayBetweenBatches > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
        }
      } catch (error) {
        console.error('Batch request error:', error)
      }
    }
    
    return results
  }

  /**
   * Clear cache
   */
  clearCache(pattern) {
    if (pattern) {
      for (const [key] of this.cache) {
        if (key.includes(pattern)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
  }

  /**
   * Prefetch resources
   */
  async prefetch(urls) {
    const prefetchPromises = urls.map(url => 
      this.get(url, { cache: true, maxAge: 10 * 60 * 1000 }) // Cache for 10 minutes
        .catch(error => console.warn(`Prefetch failed for ${url}:`, error))
    )
    
    return Promise.allSettled(prefetchPromises)
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      activeRequests: this.activeRequests,
      queueLength: this.requestQueue.length,
      pendingRequests: this.pendingRequests.size
    }
  }
}

// Create and export optimized API instance
export const optimizedAPI = new OptimizedAPIClient(process.env.REACT_APP_API_URL || (window.location.origin + '/api'))

/**
 * Hook for using optimized API calls in React components
 */
export const useOptimizedAPI = () => {
  return {
    get: optimizedAPI.get.bind(optimizedAPI),
    post: optimizedAPI.post.bind(optimizedAPI),
    put: optimizedAPI.put.bind(optimizedAPI),
    delete: optimizedAPI.delete.bind(optimizedAPI),
    batch: optimizedAPI.batch.bind(optimizedAPI),
    clearCache: optimizedAPI.clearCache.bind(optimizedAPI),
    prefetch: optimizedAPI.prefetch.bind(optimizedAPI),
    getCacheStats: optimizedAPI.getCacheStats.bind(optimizedAPI)
  }
}

/**
 * Retry failed requests with exponential backoff
 */
export const withRetry = (apiCall, maxRetries = 3, baseDelay = 1000) => {
  return async (...args) => {
    let lastError
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall(...args)
      } catch (error) {
        lastError = error
        
        // Don't retry on client errors (4xx)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          throw error
        }
        
        // Don't retry on last attempt
        if (attempt === maxRetries) {
          throw error
        }
        
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError
  }
}

export default optimizedAPI