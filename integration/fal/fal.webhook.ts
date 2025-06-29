import type { Context } from 'hono'
import { type } from 'arktype'

export const FalWebhookPayloadSchema = type
  .scope({
    Base: { request_id: 'string', gateway_request_id: 'string' },
    OkPayload: {
      images: [
        {
          url: 'string',
          content_type: 'string',
          file_name: 'string',
          file_size: 'number',
          width: 'number',
          height: 'number',
        },
      ],
      seed: 'number',
    },
    ErrorPayload: {
      detail: [
        {
          loc: 'string[]',
          msg: 'string',
          type: 'string',
        },
      ],
    },
    OkData: {
      status: '"OK"',
      'payload?': 'OkPayload | null',
      'payload_error?': 'string',
    },
    Ok: 'Base & OkData',
    ErrorData: {
      status: '"ERROR"',
      error: 'string',
      payload: 'ErrorPayload',
    },
    Error: 'Base & ErrorData',
    Export: 'Ok | Error',
  })
  .export().Export

export type FalWebhookPayload = typeof FalWebhookPayloadSchema.infer
export function createFalWebhookHandler(
  handler: (payload: FalWebhookPayload) => Promise<void>,
) {
  return async (c: Context) => {
    const payload = await c.req.json()
    const validatedPayload = FalWebhookPayloadSchema.assert(payload)

    try {
      await handler(validatedPayload)
      return c.json({ success: true })
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500,
      )
    }
  }
}
