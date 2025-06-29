export function concat(...args: (string | undefined | null)[]): string {
  return args.filter(Boolean).join('')
}

export function tag(name: string, content: string | undefined | null) {
  if (!content) return

  return `<${name}>
${content}
</${name}>`
}
