import { registerOTel } from '@vercel/otel'

export async function register() {
  // await import('./lib/rpc/orpc.server')

  registerOTel({ serviceName: 'ai-chatbot' })
}
