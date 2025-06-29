import { inspect } from 'node:util'
import { env } from '@/lib/env'
import { firstValueFrom, switchMap } from 'rxjs'

import type { ImagineInput, MidjourneyContext } from './midjourney'
import { fetchTask, imagine, watch } from './midjourney'

const context: MidjourneyContext = {
  apiSecret: env.X_302_API_KEY,
}

const input: ImagineInput = {
  botType: 'MID_JOURNEY',
  prompt:
    'Style_04_Studio_Ghibli, a beautiful, sprawling green hillside under a bright blue sky with big, puffy white clouds, a charmingly dilapidated wooden house sits on the hill, a field of red poppies in the foreground,',
}

async function simple() {
  const result = await firstValueFrom(imagine(input, context))
  console.log(inspect(result, { depth: null }))
}

async function flow() {
  imagine(input, context)
    .pipe(
      switchMap((it) => {
        console.log('job created', inspect(it, { depth: null }))

        return watch({ taskId: it.result || '' }, context)
      }),
    )
    .subscribe((it) => console.log(inspect(it, { depth: null })))
}

const r = await simple()

console.log(inspect(r, { depth: null }))
