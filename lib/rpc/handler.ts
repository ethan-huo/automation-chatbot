import { auth } from '@/app/(auth)/auth'
import { RPCHandler } from '@orpc/server/fetch'

import { router } from './router'

const handler = new RPCHandler(router)

export async function handleRequest(request: Request) {
  const { response } = await handler.handle(request, {
    prefix: '/rpc',
    context: {
      headers: request.headers,
      session: await auth(),
    }, // Provide initial context if needed
  })

  return response ?? new Response('Not found', { status: 404 })
}
