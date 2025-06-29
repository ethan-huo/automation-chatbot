import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // 从查询参数获取原始 URL
    const url = request.nextUrl.searchParams.get('url')

    if (!url) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 },
      )
    }

    console.log('[Proxy] Fetching from:', url)

    // 获取原始文件
    const response = await fetch(url, {
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
      return NextResponse.json(
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
    })

    // 创建响应，添加 CORS 头
    return new NextResponse(response.body, {
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

// 处理 OPTIONS 请求（CORS 预检）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  })
}
