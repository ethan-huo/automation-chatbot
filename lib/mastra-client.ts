import { MastraClient } from '@mastra/client-js'

export const mastraClient = new MastraClient({
  baseUrl: process.env.NEXT_PUBLIC_MASTRA_BASE_URL,
})
