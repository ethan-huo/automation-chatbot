
export function parseJsonResponse<T>(schema: { assert: (data: unknown) => T }) {
  return async (response: Response) => {
    if (!response.ok) {
      if (import.meta.env.DEV) {
        const text = await response.text()
        console.error(
          `API request failed: ${response.status} ${response.statusText}\n<response>\n${text}</response>`,
        )
      }
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`,
      )
    }
    const data = await response.json()
    return schema.assert(data)
  }
}
