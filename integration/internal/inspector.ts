import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { readFile, unlink, writeFile } from 'fs/promises'
import { OpenAI } from 'openai'

export function createTempDirectory(dir: string): void {
  execSync(`mkdir -p ${dir}`, { stdio: 'inherit' })
}

export async function downloadYouTubeAudio(
  videoUrl: string,
  outputDir: string,
): Promise<string> {
  const audioPath = `${outputDir}/audio.mp3`

  if (!existsSync(audioPath)) {
    console.log('Downloading audio...')
    execSync(
      `yt-dlp "${videoUrl}" --extract-audio --audio-format mp3 --audio-quality 0 --postprocessor-args "-t 300" -o "${outputDir}/%(title)s.%(ext)s"`,
      { stdio: 'inherit' },
    )

    const files = execSync(`ls ${outputDir}/*.mp3`, { encoding: 'utf-8' })
      .trim()
      .split('\n')
    if (files.length > 0) {
      execSync(`mv "${files[0]}" "${audioPath}"`)
    }
  } else {
    console.log('Audio file already exists, skipping download')
  }

  return audioPath
}

export async function downloadYouTubeSubtitles(
  videoUrl: string,
  outputDir: string,
): Promise<string | null> {
  const subtitlePath = `${outputDir}/subtitle.vtt`

  if (existsSync(subtitlePath)) {
    console.log('Subtitle file already exists, skipping download')
    return subtitlePath
  }

  console.log('Downloading subtitles...')
  try {
    execSync(
      `yt-dlp "${videoUrl}" --write-subs --sub-lang en --sub-format vtt --skip-download -o "${outputDir}/%(title)s.%(ext)s"`,
      { stdio: 'inherit' },
    )

    const subFiles = execSync(`ls ${outputDir}/*.vtt 2>/dev/null || echo ""`, {
      encoding: 'utf-8',
    }).trim()
    if (subFiles) {
      const subFileList = subFiles.split('\n').filter((f) => f)
      if (subFileList.length > 0) {
        execSync(`mv "${subFileList[0]}" "${subtitlePath}"`)
        return subtitlePath
      }
    }
  } catch (error) {
    console.warn('Failed to download subtitles:', error)
  }

  return null
}

export async function transcribeAudioWithOpenAI(
  audioPath: string,
  openaiClient: OpenAI,
  transcriptPath: string,
): Promise<string> {
  if (existsSync(transcriptPath)) {
    console.log('Transcript file already exists, loading from file')
    return await readFile(transcriptPath, 'utf-8')
  }

  console.log('Transcribing audio with OpenAI...')
  try {
    const audioBuffer = await readFile(audioPath)
    const audioFile = new File([audioBuffer], 'audio.mp3', {
      type: 'audio/mpeg',
    })

    const transcription = await openaiClient.audio.transcriptions.create({
      file: audioFile,
      model: 'gpt-4o-mini-transcribe',
      response_format: 'text',
    })

    await writeFile(transcriptPath, transcription, 'utf-8')
    console.log('Transcription saved to:', transcriptPath)
    return transcription
  } catch (error) {
    console.error('Failed to transcribe audio:', error)
    return ''
  }
}

export async function cleanupFiles(
  paths: string[],
  removeDir?: string,
): Promise<void> {
  try {
    for (const path of paths) {
      if (existsSync(path)) {
        await unlink(path).catch(console.error)
      }
    }
    if (removeDir) {
      execSync(`rmdir ${removeDir} 2>/dev/null || true`)
    }
  } catch (error) {
    console.error('Error cleaning up files:', error)
  }
}

export async function writeFileToTemp(
  content: string | Buffer,
  filename: string,
): Promise<string> {
  const tempDir = './temp'
  const filePath = `${tempDir}/${filename}`

  createTempDirectory(tempDir)
  await writeFile(filePath, content)

  return filePath
}
