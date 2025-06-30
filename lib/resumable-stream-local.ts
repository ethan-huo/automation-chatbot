import type { Publisher, Subscriber } from 'resumable-stream'

type PubSub = Publisher & Subscriber

export const createInMemoryPubSub = (): PubSub => {
  const data = new Map<string, string | number>()

  const subscriptions = new Map<string, ((message: string) => void)[]>()

  return {
    connect: async () => {},

    publish: async (channel, message) => {
      const callbacks = subscriptions.get(channel) || []

      for (const callback of callbacks)
        try {
          callback(message)
        } catch {}
    },
    subscribe: async (channel, callback) => {
      const callbacks = subscriptions.get(channel) || []

      callbacks.push(callback)

      subscriptions.set(channel, callbacks)
    },

    unsubscribe: async (channel) => subscriptions.delete(channel),

    set: async (key, value) => data.set(key, value),

    get: async (key) => data.get(key) || null,

    incr: async (key) => {
      const rawValue = data.get(key) || 0

      const value = Number(rawValue)

      if (Number.isNaN(value))
        throw new Error('ERR value is not an integer or out of range')

      const newValue = value + 1

      data.set(key, newValue)

      return newValue
    },
  }
}

