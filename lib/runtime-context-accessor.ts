import { RuntimeContext } from '@mastra/core/di'
import { distill } from 'arktype'

export function createRuntimeContextAccessor<T extends object>(schema: {
  assert: (input: any) => distill.Out<T>
  json: any
}) {
  const schemaJson = schema.json

  return (ctx: RuntimeContext) => {
    function get(): distill.Out<T> {
      const object: any = {}

      if (schemaJson.domain === 'object' && schemaJson.required) {
        for (const field of schemaJson.required) {
          const key = field.key
          object[key] = ctx.get(key)
        }
      }

      const data = schema.assert(object)
      return data
    }

    function assign(input: Partial<T>) {
      for (const [key, value] of Object.entries(input)) {
        ctx.set(key, value)
      }
    }

    return {
      get,
      assign,
    }
  }
}
