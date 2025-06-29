/**
 * 生成代理媒体文件的 URL，用于绕过 CORS 问题
 * 支持两种格式：
 * 1. /api/proxy-media?url=https://example.com/file.mp4
 * 2. /proxy/https/example.com/file.mp4
 */
export function createProxyMediaUrl(
  originalUrl: string,
  usePathProxy = true,
): string {
  // 如果是本地文件（以 / 开头），直接返回
  if (originalUrl.startsWith('/')) {
    return originalUrl
  }

  if (usePathProxy) {
    // 使用路径代理格式：/proxy/https/example.com/file.mp4
    const url = new URL(originalUrl)
    const protocol = url.protocol.replace(':', '') // https 或 http
    const domain = url.hostname
    const port = url.port ? `:${url.port}` : ''
    const path = url.pathname + url.search + url.hash

    return `/proxy/${protocol}/${domain}${port}${path}`
  } else {
    // 使用查询参数格式：/api/proxy-media?url=...
    const proxyUrl = new URL('/api/proxy-media', window.location.origin)
    proxyUrl.searchParams.set('url', originalUrl)
    return proxyUrl.toString()
  }
}

/**
 * 检查 URL 是否需要代理
 */
export function needsProxy(url: string): boolean {
  // 本地文件不需要代理
  if (url.startsWith('/')) {
    return false
  }

  // 同域名不需要代理
  if (url.startsWith(window.location.origin)) {
    return false
  }

  // 其他外部 URL 需要代理
  return true
}

/**
 * 智能处理媒体 URL，自动决定是否使用代理
 */
export function getMediaUrl(originalUrl: string): string {
  if (needsProxy(originalUrl)) {
    return createProxyMediaUrl(originalUrl)
  }
  return originalUrl
}
