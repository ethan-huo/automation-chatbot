export async function GET(request: Request) {
  try {
    // 重构 URL：/proxy/https/example.com/path -> https://example.com/path
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/').filter(Boolean)
    // 移除 'proxy' 前缀
    const urlParts = pathSegments.slice(1)
    if (!urlParts || urlParts.length < 2) {
      return Response.json(
        { error: 'Invalid URL format. Use /proxy/https/domain.com/path' },
        { status: 400 },
      )
    }

    const protocol = urlParts[0] // https 或 http
    const domain = urlParts[1] // domain.com
    const path = urlParts.slice(2).join('/') // path/to/file

    const targetUrl = `${protocol}://${domain}${path ? '/' + path : ''}`

    console.log('[Proxy] Fetching from:', targetUrl)

    // 获取原始文件
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'MediaProxy/1.0',
      },
    })

    if (!response.ok) {
      console.error(
        '[Proxy] Failed to fetch:',
        response.status,
        response.statusText,
      )
      return Response.json(
        { error: `Failed to fetch: ${response.status}` },
        { status: response.status },
      )
    }

    // 获取内容类型
    const contentType =
      response.headers.get('content-type') || 'application/octet-stream'
    const contentLength = response.headers.get('content-length')

    console.log('[Proxy] Fetched successfully:', {
      contentType,
      contentLength,
      url: targetUrl,
    })

    // 创建响应，添加 CORS 头
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'public, max-age=31536000',
        ...(contentLength && { 'Content-Length': contentLength }),
      },
    })
  } catch (error) {
    console.error('[Proxy] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 处理 OPTIONS 请求（CORS 预检）
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  })
}
