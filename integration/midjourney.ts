import { type } from 'arktype'

const discordImaginechema = type({
  prompt: 'string',

  'images?': 'string.url[]',
  'iw?': 'number',

  oref: 'string.url',
  'ow?': 'number',

  sref: 'string.url',
  'sw?': 'number',

  cref: 'string.url',
  'cw?': 'number',
})

type DiscordImagine = typeof discordImaginechema.infer

export function buildDiscordImaginePrompt(opts: DiscordImagine) {
  const images = (opts.images || []).join(' ')

  const params = []

  if (opts.oref) params.push(`--oref ${opts.oref}`)
  if (opts.ow) params.push(`--ow ${opts.ow}`)
  if (opts.sref) params.push(`--sref ${opts.sref}`)
  if (opts.sw) params.push(`--sw ${opts.sw}`)

  if (opts.cref) params.push(`--cref ${opts.cref}`)
  if (opts.cw) params.push(`--cw ${opts.cw}`)

  return `${images} ${opts.prompt} ${params.join(' ')}`
}
