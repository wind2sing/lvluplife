import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const challengesPath = new URL('../src/data/challenges.json', import.meta.url)
const outputPath = new URL('../data/challenges-zh.json', import.meta.url)
const challenges = JSON.parse(readFileSync(challengesPath, 'utf8'))
const translations = existsSync(outputPath) ? JSON.parse(readFileSync(outputPath, 'utf8')) : {}
const pending = challenges.filter((challenge) => !translations[challenge.id])

let cursor = 0
let completed = 0

const persist = () => {
  const ordered = Object.fromEntries(challenges.filter((item) => translations[item.id]).map((item) => [item.id, translations[item.id]]))
  writeFileSync(outputPath, `${JSON.stringify(ordered, null, 2)}\n`)
}

async function translate(text) {
  const url = new URL('https://translate.googleapis.com/translate_a/single')
  url.searchParams.set('client', 'gtx')
  url.searchParams.set('sl', 'en')
  url.searchParams.set('tl', 'zh-CN')
  url.searchParams.set('dt', 't')
  url.searchParams.set('q', text)

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      const result = data[0].map((part) => part[0]).join('').trim()
      if (!result) throw new Error('Empty translation')
      return result
    } catch (error) {
      if (attempt === 4) throw error
      await new Promise((resolve) => setTimeout(resolve, attempt * 800))
    }
  }
}

async function worker() {
  while (cursor < pending.length) {
    const challenge = pending[cursor]
    cursor += 1
    translations[challenge.id] = await translate(challenge.titleOriginal ?? challenge.title)
    completed += 1
    if (completed % 25 === 0) {
      persist()
      console.log(`Translated ${completed}/${pending.length}`)
    }
  }
}

await Promise.all(Array.from({ length: 8 }, () => worker()))
persist()
console.log(`Chinese challenge translations ready: ${Object.keys(translations).length}`)
