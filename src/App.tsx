import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Camera,
  Check,
  ChevronDown,
  Clock3,
  Compass,
  Copy,
  Dumbbell,
  Download,
  FileText,
  Flame,
  Footprints,
  Globe2,
  GraduationCap,
  Hammer,
  Heart,
  History,
  House,
  Leaf,
  LibraryBig,
  LockKeyhole,
  Medal,
  Menu,
  MessageCircle,
  Music2,
  Palette,
  Pencil,
  Plus,
  Repeat2,
  RotateCcw,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  UploadCloud,
  UserRound,
  Utensils,
  X,
  Zap,
} from 'lucide-react'
import './App.css'

type StatKey = 'STR' | 'CUL' | 'ENV' | 'CHA' | 'TAL' | 'INT'
type View = 'home' | 'character' | 'explore' | 'goals' | 'chronicle' | 'settings'
type Language = 'zh' | 'en'
type FontChoice = 'noto' | 'zcool' | 'pixel' | 'system'
type DailyEnergy = 'low' | 'normal' | 'high'

type DailyBoardState = {
  date: string
  energy: DailyEnergy
  reroll: number
}

type DailyRecommendation = {
  challenge: Challenge
  role: 'quick' | 'growth' | 'free'
  reason: string
}

const viewPaths: Record<View, string> = {
  home: '/',
  character: '/character',
  explore: '/quests',
  goals: '/my-quests',
  chronicle: '/chronicle',
  settings: '/settings',
}

function readBrowserRoute(): { view: View; challengeId: string | null } {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path.startsWith('/quests/')) return { view: 'explore', challengeId: decodeURIComponent(path.slice('/quests/'.length)) }
  if (path === '/character') return { view: 'character', challengeId: null }
  if (path === '/quests') return { view: 'explore', challengeId: null }
  if (path === '/my-quests') return { view: 'goals', challengeId: null }
  if (path === '/chronicle') return { view: 'chronicle', challengeId: null }
  if (path === '/settings') return { view: 'settings', challengeId: null }
  return { view: 'home', challengeId: null }
}

type Challenge = {
  id: string
  title: string
  titleOriginal: string
  category: string
  categoryOriginal: string
  level: number
  tier: number
  tierName: string
  xp: number
  cadence: string
  stats: { key: StatKey; points: number }[]
  source: string
  custom?: boolean
  description?: string
  completionPrompt?: string
  estimatedMinutes?: number
  energyDemand?: DailyEnergy
  contexts?: string[]
}

type Completion = {
  id: string
  challengeId: string
  note: string
  completedAt: string
  attachments?: Attachment[]
}

type Attachment = {
  pathname: string
  name: string
  contentType: string
  size: number
}

type SaveState = {
  activeIds: string[]
  favoriteIds: string[]
  hiddenIds: string[]
  customChallenges: Challenge[]
  dailyBoard: DailyBoardState
  completions: Completion[]
}

type AppSettings = {
  language: Language
  font: FontChoice
}

type BootstrapData = {
  initialized: boolean
  challenges: Challenge[]
  save: SaveState
  settings: AppSettings
}

const STORAGE_KEY = 'lvluplife-save-v1'
const ACCESS_KEY_STORAGE = 'lvluplife-access-key-v1'
const emptySave: SaveState = {
  activeIds: [],
  favoriteIds: [],
  hiddenIds: [],
  customChallenges: [],
  dailyBoard: { date: '', energy: 'normal', reroll: 0 },
  completions: [],
}
const defaultSettings: AppSettings = { language: 'zh', font: 'noto' }

const LanguageContext = createContext<Language>('zh')
const AccessKeyContext = createContext('')

function useLanguage() {
  const language = useContext(LanguageContext)
  return {
    language,
    text: (zh: string, en: string) => language === 'zh' ? zh : en,
    title: (challenge: Challenge) => language === 'zh' ? challenge.title : challenge.titleOriginal,
    category: (challenge: Challenge) => language === 'zh' ? challenge.category : challenge.categoryOriginal,
  }
}

function useAccessKey() {
  return useContext(AccessKeyContext)
}

const tierLabels: Record<string, string> = { 轻松一胜: 'Quick Win', 支线任务: 'Side Quest', 进阶挑战: 'Advanced Challenge', 史诗任务: 'Epic Quest' }
const cadenceLabels: Record<string, string> = { 每日: 'Daily', 每周: 'Weekly', 每月: 'Monthly', 每年: 'Yearly', 终身一次: 'Once in a Lifetime' }
const statLabelsEn: Record<StatKey, string> = { STR: 'Strength', CUL: 'Culture', ENV: 'Environment', CHA: 'Charisma', TAL: 'Talent', INT: 'Intelligence' }

const statDescriptions: Record<StatKey, { zh: string; en: string; examplesZh: string; examplesEn: string }> = {
  STR: { zh: '力量代表身体素质、健康习惯、耐力与实际行动能力。', en: 'Strength represents physical fitness, healthy habits, endurance, and the ability to act.', examplesZh: '健身、运动、睡眠、饮食与健康挑战', examplesEn: 'Fitness, sports, sleep, nutrition, and health quests' },
  CUL: { zh: '文化代表阅读积累、艺术修养、写作表达与审美体验。', en: 'Culture represents reading, artistic literacy, written expression, and aesthetic experience.', examplesZh: '阅读、经典书单、艺术、音乐与写作挑战', examplesEn: 'Reading, classic books, art, music, and writing quests' },
  ENV: { zh: '环境代表你对生活空间、自然环境与公共世界作出的改善。', en: 'Environment represents improvements you make to your space, nature, and the shared world.', examplesZh: '家务、手作、户外、环保与公益挑战', examplesEn: 'Household, DIY, outdoors, sustainability, and service quests' },
  CHA: { zh: '魅力代表沟通、关系经营、善意表达与社会连接能力。', en: 'Charisma represents communication, relationships, kindness, and social connection.', examplesZh: '社交、旅行、善意、人际关系与表达挑战', examplesEn: 'Social, travel, kindness, relationship, and communication quests' },
  TAL: { zh: '才能代表经过练习形成的技能、创造力与完成复杂作品的能力。', en: 'Talent represents practiced skills, creativity, and the ability to produce meaningful work.', examplesZh: '摄影、烹饪、音乐、创作与手作挑战', examplesEn: 'Photography, cooking, music, creative, and craft quests' },
  INT: { zh: '智慧代表学习、思考、解决问题与理解世界的能力。', en: 'Intelligence represents learning, reasoning, problem solving, and understanding the world.', examplesZh: '学习、研究、心智成长与知识型挑战', examplesEn: 'Learning, research, mental growth, and knowledge quests' },
}

const statMeta: Record<StatKey, { icon: LucideIcon; color: string }> = {
  STR: { icon: Dumbbell, color: '#ff837a' },
  CUL: { icon: BookOpen, color: '#75b7ff' },
  ENV: { icon: Leaf, color: '#68cf88' },
  CHA: { icon: MessageCircle, color: '#ed8ecb' },
  TAL: { icon: Hammer, color: '#f0bd63' },
  INT: { icon: GraduationCap, color: '#a997ff' },
}

const categoryMeta: Record<string, { icon: LucideIcon; color: string; short: string; labelEn: string; shortEn: string }> = {
  艺术与创意: { icon: Palette, color: '#f38bba', short: '艺术', labelEn: 'Arts & Creativity', shortEn: 'Arts' },
  音乐: { icon: Music2, color: '#a997ff', short: '音乐', labelEn: 'Music', shortEn: 'Music' },
  摄影: { icon: Camera, color: '#72d6d0', short: '摄影', labelEn: 'Photography', shortEn: 'Photo' },
  写作: { icon: ScrollText, color: '#e4a66d', short: '写作', labelEn: 'Writing', shortEn: 'Writing' },
  事业与财务: { icon: BriefcaseBusiness, color: '#f2c561', short: '事业', labelEn: 'Career & Finances', shortEn: 'Career' },
  健身与健康: { icon: Dumbbell, color: '#ff837a', short: '健康', labelEn: 'Fitness & Health', shortEn: 'Health' },
  运动: { icon: Medal, color: '#ff9f59', short: '运动', labelEn: 'Sports', shortEn: 'Sports' },
  美食与烹饪: { icon: Utensils, color: '#f0bd63', short: '烹饪', labelEn: 'Food & Cooking', shortEn: 'Cooking' },
  家务与手作: { icon: Hammer, color: '#99c879', short: '家务', labelEn: 'Household & DIY', shortEn: 'DIY' },
  善意与公益: { icon: Heart, color: '#ff7993', short: '公益', labelEn: 'Humanity', shortEn: 'Humanity' },
  心智与情绪: { icon: Sparkles, color: '#c49aff', short: '心智', labelEn: 'Mental & Emotional', shortEn: 'Mental' },
  户外: { icon: Leaf, color: '#68cf88', short: '户外', labelEn: 'Outdoors', shortEn: 'Outdoors' },
  阅读: { icon: BookOpen, color: '#75b7ff', short: '阅读', labelEn: 'Reading', shortEn: 'Reading' },
  经典书单: { icon: LibraryBig, color: '#6fa5e8', short: '书单', labelEn: 'Classic Reading List', shortEn: 'Book List' },
  学习与成长: { icon: GraduationCap, color: '#83b5ff', short: '学习', labelEn: 'Learning & Growth', shortEn: 'Learning' },
  社交: { icon: MessageCircle, color: '#ed8ecb', short: '社交', labelEn: 'Social', shortEn: 'Social' },
  旅行: { icon: Compass, color: '#57c7b1', short: '旅行', labelEn: 'Travel', shortEn: 'Travel' },
  一生必去: { icon: Globe2, color: '#4eb7d7', short: '远方', labelEn: 'Must-Visit Places', shortEn: 'Places' },
}

const statLabels: Record<StatKey, string> = {
  STR: '力量',
  CUL: '文化',
  ENV: '环境',
  CHA: '魅力',
  TAL: '才能',
  INT: '智慧',
}

const cadenceDays: Record<string, number> = { 每日: 1, 每周: 7, 每月: 30, 每年: 365, 终身一次: Number.POSITIVE_INFINITY }

function getCooldownLabel(challenge: Challenge, completions: Completion[], language: Language = 'zh') {
  const latest = completions.find((item) => item.challengeId === challenge.id)
  if (!latest) return ''
  const days = cadenceDays[challenge.cadence]
  if (!days) return ''
  if (!Number.isFinite(days)) return language === 'zh' ? '已完成终身成就' : 'Lifetime achievement completed'
  const readyAt = new Date(latest.completedAt).getTime() + days * 86400000
  const remaining = readyAt - Date.now()
  if (remaining <= 0) return ''
  const hours = Math.ceil(remaining / 3600000)
  if (language === 'en') return hours < 24 ? `Repeat in ${hours}h` : `Repeat in ${Math.ceil(hours / 24)}d`
  return hours < 24 ? `${hours} 小时后可再次完成` : `${Math.ceil(hours / 24)} 天后可再次完成`
}

const cadenceDescriptions: Record<string, string> = {
  每日: '完成后等待 1 天，即可再次领取奖励。',
  每周: '完成后等待 7 天，即可再次领取奖励。',
  每月: '完成后等待 30 天，即可再次领取奖励。',
  每年: '完成后等待 365 天，即可再次领取奖励。',
  终身一次: '这是人生清单成就，只能领取一次奖励。',
}

const cadenceDescriptionsEn: Record<string, string> = {
  每日: 'Wait 1 day after completion to earn the reward again.',
  每周: 'Wait 7 days after completion to earn the reward again.',
  每月: 'Wait 30 days after completion to earn the reward again.',
  每年: 'Wait 365 days after completion to earn the reward again.',
  终身一次: 'This is a life-list achievement and can reward you only once.',
}

const attachmentTypes = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain', 'text/markdown', 'application/zip',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
])

function getAttachmentContentType(file: File) {
  if (file.type) return file.type
  const extension = file.name.split('.').pop()?.toLowerCase()
  return ({ md: 'text/markdown', txt: 'text/plain', pdf: 'application/pdf', zip: 'application/zip' } as Record<string, string>)[extension ?? ''] ?? ''
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function loadSave(): SaveState {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value ? { ...emptySave, ...JSON.parse(value) } : emptySave
  } catch {
    return emptySave
  }
}

function getLevel(totalXp: number) {
  let level = 1
  let carriedXp = totalXp
  let needed = 500
  while (carriedXp >= needed) {
    carriedXp -= needed
    level += 1
    needed = 500 + (level - 1) * 180
  }
  return { level, carriedXp, needed, percent: Math.round((carriedXp / needed) * 100) }
}

function getStreak(completions: Completion[]) {
  const days = new Set(completions.map((item) => item.completedAt.slice(0, 10)))
  let cursor = new Date()
  if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function getTodayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function stableHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619)
  return hash >>> 0
}

function getQuestEstimate(challenge: Challenge) {
  return challenge.estimatedMinutes ?? [0, 20, 45, 90, 150][challenge.tier] ?? 45
}

function getQuestEnergy(challenge: Challenge): DailyEnergy {
  return challenge.energyDemand ?? (challenge.tier <= 1 ? 'low' : challenge.tier >= 4 ? 'high' : 'normal')
}

function App() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [save, setSave] = useState<SaveState>(emptySave)
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [ready, setReady] = useState(false)
  const [bootstrapError, setBootstrapError] = useState('')
  const bootstrapStarted = useRef('')
  const [accessKey, setAccessKey] = useState(() => localStorage.getItem(ACCESS_KEY_STORAGE) ?? '')
  const [accessKeyDraft, setAccessKeyDraft] = useState('')
  const [accessError, setAccessError] = useState('')
  const [view, setView] = useState<View>(() => readBrowserRoute().view)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('全部任务')
  const [showSealed, setShowSealed] = useState(false)
  const [selected, setSelected] = useState<Challenge | null>(null)
  const [detailChallengeId, setDetailChallengeId] = useState<string | null>(() => readBrowserRoute().challengeId)
  const [undoTarget, setUndoTarget] = useState<{ completion: Completion; challenge: Challenge } | null>(null)
  const [note, setNote] = useState('')
  const [reward, setReward] = useState<{ challenge: Challenge; levelUp: boolean; unlockedCount: number } | null>(null)
  const [mobileNav, setMobileNav] = useState(false)
  const [energyHelp, setEnergyHelp] = useState(false)
  const [customEditor, setCustomEditor] = useState<Challenge | 'new' | null>(null)

  useEffect(() => {
    if (!accessKey || bootstrapStarted.current === accessKey) return
    bootstrapStarted.current = accessKey
    setBootstrapError('')
    void (async () => {
      try {
        const response = await fetch('/api/bootstrap', { headers: { Authorization: `Bearer ${accessKey}` } })
        if (response.status === 401) {
          localStorage.removeItem(ACCESS_KEY_STORAGE)
          setAccessKey('')
          setAccessError('访问密钥不正确')
          return
        }
        if (!response.ok) throw new Error('Neon 云存档服务不可用')
        const data = (await response.json()) as BootstrapData
        let initialSave = { ...emptySave, ...data.save }
        if (!data.initialized) {
          initialSave = loadSave()
          const migration = await fetch('/api/save', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessKey}` },
            body: JSON.stringify(initialSave),
          })
          if (!migration.ok) throw new Error('旧进度迁移失败')
        }
        localStorage.removeItem(STORAGE_KEY)
        setChallenges(data.challenges)
        setSave(initialSave)
        setSettings(data.settings)
        setAccessError('')
        setReady(true)
      } catch (error) {
        setBootstrapError(error instanceof Error ? error.message : '载入失败')
      }
    })()
  }, [accessKey])

  useEffect(() => {
    if (!ready) return
    const timeout = window.setTimeout(() => {
      void fetch('/api/save', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessKey}` },
        body: JSON.stringify(save),
      })
    }, 120)
    return () => window.clearTimeout(timeout)
  }, [accessKey, ready, save])

  useEffect(() => {
    document.documentElement.dataset.font = settings.font
    document.documentElement.lang = settings.language === 'zh' ? 'zh-CN' : 'en'
    if (!ready) return
    void fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessKey}` },
      body: JSON.stringify(settings),
    })
  }, [accessKey, ready, settings])

  useEffect(() => {
    function syncBrowserRoute() {
      const route = readBrowserRoute()
      setView(route.view)
      setDetailChallengeId(route.challengeId)
      setSelected(null)
      setUndoTarget(null)
      setEnergyHelp(false)
      setMobileNav(false)
      setShowSealed(false)
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('popstate', syncBrowserRoute)
    return () => window.removeEventListener('popstate', syncBrowserRoute)
  }, [])

  const allChallenges = useMemo(() => {
    const originalIds = new Set(challenges.map((item) => item.id))
    return [...challenges, ...save.customChallenges.filter((item) => !originalIds.has(item.id))]
  }, [challenges, save.customChallenges])
  const challengeMap = useMemo(() => new Map(allChallenges.map((item) => [item.id, item])), [allChallenges])
  const detailChallenge = detailChallengeId ? challengeMap.get(detailChallengeId) ?? null : null
  const completedChallenges = save.completions
    .map((completion) => ({ completion, challenge: challengeMap.get(completion.challengeId) }))
    .filter((item): item is { completion: Completion; challenge: Challenge } => Boolean(item.challenge))

  const totalXp = completedChallenges.reduce((sum, item) => sum + item.challenge.xp, 0)
  const level = getLevel(totalXp)
  const streak = getStreak(save.completions)
  const maxEnergy = Math.min(8, 3 + Math.floor((level.level - 1) / 5))
  const recentCompletions = save.completions.filter((item) => Date.now() - new Date(item.completedAt).getTime() < 3600000).length
  const energy = Math.max(0, maxEnergy - recentCompletions)
  const stats = completedChallenges.reduce(
    (result, item) => {
      item.challenge.stats.forEach((stat) => (result[stat.key] += stat.points))
      return result
    },
    { STR: 0, CUL: 0, ENV: 0, CHA: 0, TAL: 0, INT: 0 } as Record<StatKey, number>,
  )

  const unlockedChallenges = allChallenges.filter((item) => item.level <= level.level)
  const recommendationPool = unlockedChallenges.filter((item) => !save.hiddenIds.includes(item.id))
  const availableChallenges = recommendationPool.filter((item) => !getCooldownLabel(item, save.completions, settings.language))
  const dailyPool = availableChallenges.length ? availableChallenges : recommendationPool
  const todayKey = getTodayKey()
  const dailyBoard = save.dailyBoard.date === todayKey ? save.dailyBoard : { date: todayKey, energy: save.dailyBoard.energy, reroll: 0 }
  const featuredQuests = useMemo<DailyRecommendation[]>(() => {
    const recentCategories = save.completions.slice(0, 8).map((item) => challengeMap.get(item.challengeId)?.category).filter(Boolean)
    const lowestValue = Math.min(...Object.values(stats))
    const lowestStats = new Set((Object.entries(stats) as [StatKey, number][]).filter(([, value]) => value === lowestValue).map(([key]) => key))
    const energyRank: Record<DailyEnergy, number> = { low: 1, normal: 2, high: 3 }
    const roles: DailyRecommendation['role'][] = ['quick', 'growth', 'free']
    const selectedIds = new Set<string>()
    return roles.flatMap((role) => {
      const ranked = dailyPool.filter((item) => !selectedIds.has(item.id)).map((challenge) => {
        const estimate = getQuestEstimate(challenge)
        const demand = getQuestEnergy(challenge)
        let score = stableHash(`${dailyBoard.date}:${dailyBoard.reroll}:${role}:${challenge.id}`) % 31
        if (save.activeIds.includes(challenge.id)) score += 42
        if (save.favoriteIds.includes(challenge.id)) score += 25
        if (challenge.custom) score += 12
        if (challenge.stats.some((stat) => lowestStats.has(stat.key))) score += role === 'growth' ? 45 : 14
        score -= recentCategories.filter((category) => category === challenge.category).length * 9
        score -= Math.abs(energyRank[demand] - energyRank[dailyBoard.energy]) * 30
        if (role === 'quick') score += estimate <= (dailyBoard.energy === 'low' ? 30 : 45) ? 55 : -Math.min(50, estimate / 2)
        if (role === 'growth') score += challenge.tier >= 2 && challenge.tier <= (dailyBoard.energy === 'high' ? 4 : 3) ? 34 : 0
        if (role === 'free') score += save.favoriteIds.includes(challenge.id) ? 24 : challenge.custom ? 18 : 0
        return { challenge, score, estimate, demand }
      }).sort((a, b) => b.score - a.score)
      const picked = ranked[0]
      if (!picked) return []
      selectedIds.add(picked.challenge.id)
      const stat = picked.challenge.stats.find((item) => lowestStats.has(item.key))
      let reason = settings.language === 'zh'
        ? `适合${dailyBoard.energy === 'low' ? '低' : dailyBoard.energy === 'high' ? '充沛' : '普通'}精力状态 · 预计 ${picked.estimate} 分钟`
        : `Fits ${dailyBoard.energy} energy · about ${picked.estimate} min`
      if (role === 'growth' && stat) reason = settings.language === 'zh' ? `补足最近较少提升的${statLabels[stat.key]}属性 · 预计 ${picked.estimate} 分钟` : `Builds your lower ${statLabelsEn[stat.key]} stat · about ${picked.estimate} min`
      else if (save.favoriteIds.includes(picked.challenge.id)) reason = settings.language === 'zh' ? `你收藏的任务 · 预计 ${picked.estimate} 分钟` : `A saved quest · about ${picked.estimate} min`
      else if (picked.challenge.custom) reason = settings.language === 'zh' ? `你的个人任务 · 预计 ${picked.estimate} 分钟` : `Your personal quest · about ${picked.estimate} min`
      return [{ challenge: picked.challenge, role, reason }]
    })
  }, [challengeMap, dailyBoard.date, dailyBoard.energy, dailyBoard.reroll, dailyPool, save.activeIds, save.completions, save.favoriteIds, settings.language, stats])

  const visibleChallenges = useMemo(() => {
    const query = search.trim().toLowerCase()
    const categoryPool = allChallenges.filter((item) => category === '全部任务' || item.category === category)
    const visibilityPool = categoryPool.filter((item) => showSealed ? save.hiddenIds.includes(item.id) : !save.hiddenIds.includes(item.id))
    if (query) {
      return visibilityPool.filter(
        (item) => (showSealed || item.level <= level.level) && ([item.title, item.titleOriginal, item.category, item.categoryOriginal].some((value) => value.toLowerCase().includes(query))),
      )
    }
    if (showSealed) return visibilityPool
    const unlocked = visibilityPool.filter((item) => item.level <= level.level)
    if (category === '全部任务') return unlocked
    const nextLocked = visibilityPool.filter((item) => item.level > level.level).sort((a, b) => a.level - b.level).slice(0, 5)
    return [...unlocked, ...nextLocked]
  }, [allChallenges, category, level.level, save.hiddenIds, search, showSealed])

  const selectedCategoryPool = allChallenges.filter((item) => (category === '全部任务' || item.category === category) && !save.hiddenIds.includes(item.id))
  const selectedLockedCount = selectedCategoryPool.filter((item) => item.level > level.level).length
  const hiddenLockedCount = category === '全部任务' ? selectedLockedCount : Math.max(0, selectedLockedCount - 5)

  const activeChallenges = save.activeIds.filter((id) => !save.hiddenIds.includes(id)).map((id) => challengeMap.get(id)).filter(Boolean) as Challenge[]
  const favoriteChallenges = save.favoriteIds.filter((id) => !save.hiddenIds.includes(id)).map((id) => challengeMap.get(id)).filter(Boolean) as Challenge[]

  useEffect(() => {
    if (!ready || !detailChallengeId || detailChallenge) return
    setDetailChallengeId(null)
    window.history.replaceState({ lvluplife: true }, '', viewPaths[view])
  }, [detailChallenge, detailChallengeId, ready, view])

  useEffect(() => {
    if (!ready || save.dailyBoard.date === todayKey) return
    setSave((current) => ({ ...current, dailyBoard: { date: todayKey, energy: current.dailyBoard.energy, reroll: 0 } }))
  }, [ready, save.dailyBoard.date, todayKey])

  function toggleActive(id: string) {
    setSave((current) => ({
      ...current,
      activeIds: current.activeIds.includes(id)
        ? current.activeIds.filter((item) => item !== id)
        : [...current.activeIds, id],
    }))
  }

  function toggleFavorite(id: string) {
    setSave((current) => ({
      ...current,
      favoriteIds: current.favoriteIds.includes(id)
        ? current.favoriteIds.filter((item) => item !== id)
        : [...current.favoriteIds, id],
    }))
  }

  function toggleSealed(id: string) {
    setSave((current) => {
      const sealed = current.hiddenIds.includes(id)
      return {
        ...current,
        activeIds: sealed ? current.activeIds : current.activeIds.filter((item) => item !== id),
        favoriteIds: sealed ? current.favoriteIds : current.favoriteIds.filter((item) => item !== id),
        hiddenIds: sealed ? current.hiddenIds.filter((item) => item !== id) : [...current.hiddenIds, id],
      }
    })
  }

  function saveCustomChallenge(challenge: Challenge) {
    setSave((current) => ({
      ...current,
      customChallenges: current.customChallenges.some((item) => item.id === challenge.id)
        ? current.customChallenges.map((item) => item.id === challenge.id ? challenge : item)
        : [challenge, ...current.customChallenges],
    }))
    setCustomEditor(null)
    openChallenge(challenge)
  }

  function duplicateCustomChallenge(challenge: Challenge) {
    const copy: Challenge = { ...challenge, id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title: `${challenge.title}（副本）`, titleOriginal: `${challenge.titleOriginal} (Copy)`, custom: true, source: 'custom' }
    setSave((current) => ({ ...current, customChallenges: [copy, ...current.customChallenges] }))
    openChallenge(copy)
  }

  function updateDailyEnergy(value: DailyEnergy) {
    setSave((current) => ({ ...current, dailyBoard: { date: todayKey, energy: value, reroll: current.dailyBoard.date === todayKey ? current.dailyBoard.reroll : 0 } }))
  }

  function rerollDailyBoard() {
    setSave((current) => ({ ...current, dailyBoard: { date: todayKey, energy: current.dailyBoard.energy, reroll: (current.dailyBoard.date === todayKey ? current.dailyBoard.reroll : 0) + 1 } }))
  }

  function completeQuest(attachments: Attachment[] = []) {
    if (!selected) return
    if (energy <= 0 || selected.level > level.level || getCooldownLabel(selected, save.completions, settings.language)) return
    const oldLevel = level.level
    const completion: Completion = {
      id: `${selected.id}-${Date.now()}`,
      challengeId: selected.id,
      note: note.trim(),
      completedAt: new Date().toISOString(),
      attachments,
    }
    const newLevel = getLevel(totalXp + selected.xp).level
    setSave((current) => ({
      ...current,
      activeIds: current.activeIds.filter((id) => id !== selected.id),
      completions: [completion, ...current.completions],
    }))
    const unlockedCount = newLevel > oldLevel ? allChallenges.filter((item) => item.level > oldLevel && item.level <= newLevel).length : 0
    setReward({ challenge: selected, levelUp: newLevel > oldLevel, unlockedCount })
    setSelected(null)
    setNote('')
    window.setTimeout(() => setReward(null), 4600)
  }

  function openChallenge(challenge: Challenge) {
    const path = `/quests/${encodeURIComponent(challenge.id)}`
    setDetailChallengeId(challenge.id)
    if (window.location.pathname !== path) window.history.pushState({ lvluplife: true, lvluplifeDetail: true }, '', path)
    window.scrollTo({ top: 0 })
  }

  function closeChallenge() {
    if (window.history.state?.lvluplifeDetail) {
      window.history.back()
      return
    }
    setDetailChallengeId(null)
    window.history.replaceState({ lvluplife: true }, '', viewPaths[view])
    window.scrollTo({ top: 0 })
  }

  function undoCompletion() {
    if (!undoTarget) return
    const attachmentPaths = undoTarget.completion.attachments?.map((item) => item.pathname) ?? []
    if (attachmentPaths.length) {
      void fetch('/api/attachments-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessKey}` },
        body: JSON.stringify({ pathnames: attachmentPaths }),
      })
    }
    setSave((current) => {
      const completions = current.completions.filter((item) => item.id !== undoTarget.completion.id)
      const remainingXp = completions.reduce((sum, item) => sum + (challengeMap.get(item.challengeId)?.xp ?? 0), 0)
      const remainingLevel = getLevel(remainingXp).level
      return {
        ...current,
        activeIds: current.activeIds.filter((id) => (challengeMap.get(id)?.level ?? 1) <= remainingLevel),
        completions,
      }
    })
    setUndoTarget(null)
  }

  function navigate(next: View) {
    setView(next)
    setDetailChallengeId(null)
    setSelected(null)
    setUndoTarget(null)
    setEnergyHelp(false)
    setShowSealed(false)
    setMobileNav(false)
    if (window.location.pathname !== viewPaths[next]) window.history.pushState({ lvluplife: true }, '', viewPaths[next])
    window.scrollTo({ top: 0 })
  }

  function showCharacterPanel() {
    navigate('character')
  }

  function unlockCloudSave() {
    const value = accessKeyDraft.trim()
    if (!value) return
    localStorage.setItem(ACCESS_KEY_STORAGE, value)
    setAccessError('')
    setAccessKey(value)
  }

  if (!accessKey) {
    return <AccessGate error={accessError} value={accessKeyDraft} onChange={setAccessKeyDraft} onSubmit={unlockCloudSave} />
  }

  if (bootstrapError) {
    return <div className="boot-state"><div className="boot-icon"><X /></div><h1>无法连接云存档</h1><p>{bootstrapError}</p><button className="secondary-button" onClick={() => { localStorage.removeItem(ACCESS_KEY_STORAGE); setAccessKey(''); bootstrapStarted.current = '' }}>重新输入访问密钥</button></div>
  }

  if (!ready) {
    return <div className="boot-state"><div className="boot-icon boot-icon--loading"><Zap /></div><h1>正在载入冒险数据</h1><p>连接 Neon 云存档与 538 项挑战……</p></div>
  }

  const mainContent = (() => {
    if (detailChallenge) {
      return (
        <QuestDetailView
          active={save.activeIds.includes(detailChallenge.id)}
          challenge={detailChallenge}
          completions={save.completions}
          favorite={save.favoriteIds.includes(detailChallenge.id)}
          sealed={save.hiddenIds.includes(detailChallenge.id)}
          level={level.level}
          onBack={closeChallenge}
          onComplete={setSelected}
          onDuplicate={duplicateCustomChallenge}
          onEdit={setCustomEditor}
          onFavorite={toggleFavorite}
          onSeal={toggleSealed}
          onStart={toggleActive}
          onUndo={(completion) => setUndoTarget({ completion, challenge: detailChallenge })}
        />
      )
    }

    if (view === 'character') {
      return <CharacterView completedCount={save.completions.length} energy={energy} levelInfo={level} maxEnergy={maxEnergy} stats={stats} streak={streak} totalXp={totalXp} />
    }

    if (view === 'explore') {
      return (
        <ExploreView
          activeIds={save.activeIds}
          category={category}
          completions={save.completions}
          favoriteIds={save.favoriteIds}
          hiddenIds={save.hiddenIds}
          hiddenLockedCount={hiddenLockedCount}
          level={level.level}
          totalChallenges={challenges.length}
          unlockedTotal={challenges.filter((item) => item.level <= level.level).length}
          nextLevel={Math.min(...challenges.filter((item) => item.level > level.level).map((item) => item.level))}
          onCategory={setCategory}
          onComplete={setSelected}
          onCreate={() => setCustomEditor('new')}
          onFavorite={toggleFavorite}
          onSeal={toggleSealed}
          onOpen={openChallenge}
          onStart={toggleActive}
          search={search}
          sealedCount={save.hiddenIds.length}
          setSearch={setSearch}
          showSealed={showSealed}
          onShowSealed={() => setShowSealed((current) => !current)}
          visibleChallenges={visibleChallenges}
        />
      )
    }

    if (view === 'goals') {
      return (
        <CollectionView
          active={activeChallenges}
          favorites={favoriteChallenges}
          activeIds={save.activeIds}
          completions={save.completions}
          favoriteIds={save.favoriteIds}
          onComplete={setSelected}
          onFavorite={toggleFavorite}
          onOpen={openChallenge}
          onStart={toggleActive}
          onExplore={() => navigate('explore')}
        />
      )
    }

    if (view === 'chronicle') {
      return <ChronicleView items={completedChallenges} onOpen={openChallenge} onUndo={(item) => setUndoTarget(item)} />
    }

    if (view === 'settings') {
      return <SettingsView settings={settings} onChange={setSettings} />
    }

    return (
      <HomeView
        activeIds={save.activeIds}
        completed={completedChallenges}
        completions={save.completions}
        favoriteIds={save.favoriteIds}
        dailyBoard={dailyBoard}
        featured={featuredQuests}
        levelInfo={level}
        onComplete={setSelected}
        onDailyEnergy={updateDailyEnergy}
        onFavorite={toggleFavorite}
        onNavigate={navigate}
        onOpen={openChallenge}
        onReroll={rerollDailyBoard}
        onStart={toggleActive}
        unlockedCount={unlockedChallenges.length}
      />
    )
  })()

  const text = (zh: string, en: string) => settings.language === 'zh' ? zh : en
  const cloud = !import.meta.env.DEV

  return (
    <LanguageContext.Provider value={settings.language}>
    <AccessKeyContext.Provider value={accessKey}>
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar--open' : ''}`}>
        <div className="brand" onClick={() => navigate('home')} role="button" tabIndex={0}>
          <span className="brand-mark"><Zap size={19} fill="currentColor" /></span>
          <span>{text('升级', 'LvlUp')}<i>{text('人生', 'Life')}</i></span>
        </div>
        <nav className="main-nav" aria-label={text('主导航', 'Main navigation')}>
          <NavButton active={view === 'home'} icon={House} label={text('营地', 'Camp')} onClick={() => navigate('home')} />
          <NavButton active={view === 'character'} icon={UserRound} label={text('角色面板', 'Character')} onClick={() => navigate('character')} />
          <NavButton active={view === 'explore'} icon={Compass} label={text('任务公会', 'Quest Guild')} onClick={() => navigate('explore')} />
          <NavButton active={view === 'goals'} icon={Target} label={text('我的任务', 'My Quests')} onClick={() => navigate('goals')} badge={save.activeIds.length} />
          <NavButton active={view === 'chronicle'} icon={ScrollText} label={text('冒险日志', 'Chronicle')} onClick={() => navigate('chronicle')} />
          <NavButton active={view === 'settings'} icon={Settings} label={text('设置', 'Settings')} onClick={() => navigate('settings')} />
        </nav>
        <div className="sidebar-spacer" />
        <button className="mini-profile" onClick={showCharacterPanel} title={text('查看角色面板', 'View character sheet')}>
          <div className="avatar"><UserRound size={22} /></div>
          <div><strong>{text('独行冒险者', 'Solo Adventurer')}</strong><span>{text('等级', 'Level')} {level.level}</span></div>
          <ArrowRight className="profile-arrow" size={15} />
        </button>
        <button className="local-note" onClick={() => navigate('settings')}><ShieldCheck size={14} /> {cloud ? text('进度已同步至云端', 'Progress synced to cloud') : text('进度仅保存在本机', 'Progress stays on this device')}<Settings size={12} /></button>
      </aside>

      {mobileNav && <button className="nav-scrim" aria-label={text('关闭菜单', 'Close menu')} onClick={() => setMobileNav(false)} />}

      <main>
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label={text('打开菜单', 'Open menu')}><Menu /></button>
          <button className="topbar-level topbar-action" onClick={showCharacterPanel} title={text('查看角色属性', 'View character stats')}>
            <span>{text('等级', 'Level')} {level.level}</span>
            <div className="xp-track"><i style={{ width: `${level.percent}%` }} /></div>
            <small>{level.carriedXp} / {level.needed} {text('经验', 'XP')}</small>
          </button>
          <div className="top-stats">
            <button className="topbar-action energy-hearts" onClick={() => setEnergyHelp(true)} title={text('查看行动力规则', 'View energy rules')}><span className="topbar-stat-label">{text('行动力', 'Energy')}</span>{Array.from({ length: maxEnergy }, (_, index) => <Heart key={index} size={16} fill={index < energy ? 'currentColor' : 'none'} />)} <strong>{energy}/{maxEnergy}</strong></button>
            <button className="topbar-action" onClick={() => navigate('chronicle')} title={text('查看连续记录', 'View streak history')}><Flame size={17} /> {text('连续', 'Streak')} <strong>{streak}</strong> {text('天', 'days')}</button>
            <button className="topbar-action" onClick={() => navigate('chronicle')} title={text('查看全部完成记录', 'View all completions')}><Trophy size={17} /> {text('完成', 'Done')} <strong>{save.completions.length}</strong> {text('次', 'times')}</button>
          </div>
        </header>
        <div className="page-content">{mainContent}</div>
      </main>

      {selected && (
        <CompletionModal challenge={selected} energy={energy} note={note} onClose={() => setSelected(null)} onNote={setNote} onSubmit={completeQuest} />
      )}

      {customEditor && <CustomQuestModal challenge={customEditor === 'new' ? null : customEditor} currentLevel={level.level} onClose={() => setCustomEditor(null)} onSave={saveCustomChallenge} />}

      {undoTarget && (
        <UndoModal challenge={undoTarget.challenge} onCancel={() => setUndoTarget(null)} onConfirm={undoCompletion} />
      )}

      {energyHelp && <EnergyHelpModal current={energy} max={maxEnergy} onClose={() => setEnergyHelp(false)} />}

      {reward && (
        <div className="reward-toast" role="status">
          <div className="reward-icon"><Sparkles /></div>
          <div>
            <span>{reward.levelUp ? text('等级提升！', 'Level up!') : text('任务完成', 'Quest complete')}</span>
            <strong>{text('获得', 'Earned')} {reward.challenge.xp} {text('经验', 'XP')}{reward.levelUp ? text(` · 解锁 ${reward.unlockedCount} 项新成就`, ` · ${reward.unlockedCount} new achievements unlocked`) : ''}</strong>
          </div>
        </div>
      )}
    </div>
    </AccessKeyContext.Provider>
    </LanguageContext.Provider>
  )
}

function AccessGate({ error, onChange, onSubmit, value }: { error: string; onChange: (value: string) => void; onSubmit: () => void; value: string }) {
  return (
    <main className="access-gate">
      <section className="access-card">
        <div className="access-emblem"><ShieldCheck size={29} /></div>
        <p className="eyebrow">私人冒险存档</p>
        <h1>欢迎回来，冒险者。</h1>
        <p>输入你的个人访问密钥，连接保存在 Neon 中的进度。</p>
        <form onSubmit={(event) => { event.preventDefault(); onSubmit() }}>
          <label><span>访问密钥</span><input type="password" autoComplete="current-password" value={value} onChange={(event) => onChange(event.target.value)} placeholder="输入私人访问密钥" autoFocus /></label>
          {error && <small className="access-error">{error}</small>}
          <button className="primary-button" type="submit">解锁云存档 <ArrowRight size={17} /></button>
        </form>
        <small><ShieldCheck size={13} /> 密钥只保存在当前浏览器，并仅发送到你的 Vercel API。</small>
      </section>
    </main>
  )
}

function NavButton({ active, badge, icon: Icon, label, onClick }: { active: boolean; badge?: number; icon: LucideIcon; label: string; onClick: () => void }) {
  return <button className={active ? 'active' : ''} onClick={onClick}><Icon size={19} /><span>{label}</span>{Boolean(badge) && <b>{badge}</b>}</button>
}

type QuestActions = {
  activeIds: string[]
  completions: Completion[]
  favoriteIds: string[]
  onComplete: (challenge: Challenge) => void
  onFavorite: (id: string) => void
  onOpen: (challenge: Challenge) => void
  onStart: (id: string) => void
}

function HomeView({ activeIds, completed, completions, dailyBoard, favoriteIds, featured, levelInfo, onComplete, onDailyEnergy, onFavorite, onNavigate, onOpen, onReroll, onStart, unlockedCount }: QuestActions & {
  completed: { completion: Completion; challenge: Challenge }[]
  dailyBoard: DailyBoardState
  featured: DailyRecommendation[]
  levelInfo: ReturnType<typeof getLevel>
  onDailyEnergy: (value: DailyEnergy) => void
  onNavigate: (view: View) => void
  onReroll: () => void
  unlockedCount: number
}) {
  const { text } = useLanguage()
  return (
    <>
      <section className="hero-panel">
        <div className="hero-content">
          <p className="eyebrow"><span /> {text('下一步行动', 'Your next move')}</p>
          <h1><span>{text('让今天', 'Make today')}</span><em>{text('算数。', 'count.')}</em></h1>
          <p className="hero-copy">{text('完成一件真实的小事，把现实生活变成看得见的角色成长。', 'Do one real thing and turn everyday life into visible character growth.')}</p>
          <div className="hero-actions"><button className="primary-button" onClick={() => onNavigate('explore')}>{text('领取任务', 'Find a quest')} <ArrowRight size={18} /></button><button className="hero-character-button" onClick={() => onNavigate('character')}><UserRound size={16} /> {text('查看角色', 'Character')}</button></div>
          <div className="hero-badges"><span><Target size={13} /> {text('538 项挑战', '538 challenges')}</span><span><ShieldCheck size={13} /> {text('本地存档', 'Local save')}</span><span><Sparkles size={13} /> {text('真实成长', 'Real growth')}</span></div>
        </div>
        <div className="hero-visual">
          <div className="hero-orbit" aria-hidden="true">
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="pixel-sword"><span>✦</span></div>
            <span className="float-rune rune-one">+{text('经验', 'XP')}</span><span className="float-rune rune-two">{text('升级', 'LEVEL UP')}</span>
          </div>
          <button className="hero-level-card" onClick={() => onNavigate('character')}><span>{text('冒险者状态', 'Adventurer status')}</span><strong>{text('等级', 'Level')} {levelInfo.level}</strong><div><i style={{ width: `${levelInfo.percent}%` }} /></div><small>{levelInfo.carriedXp} / {levelInfo.needed} {text('经验', 'XP')}</small></button>
        </div>
      </section>

      <section className="section-block daily-board">
        <div className="section-heading daily-board-heading"><div><p className="eyebrow">{text('今日冒险板', "Today's adventure board")}</p><h2>{text('按你现在的状态，选一件就好', 'Pick one that fits today')}</h2></div><div className="daily-board-actions"><div className="energy-selector" aria-label={text('今日精力状态', 'Energy today')}>{(['low', 'normal', 'high'] as DailyEnergy[]).map((value) => <button key={value} className={dailyBoard.energy === value ? 'active' : ''} onClick={() => onDailyEnergy(value)}>{text(value === 'low' ? '低精力' : value === 'high' ? '精力充沛' : '普通', value === 'low' ? 'Low' : value === 'high' ? 'High' : 'Normal')}</button>)}</div><button className="reroll-button" onClick={onReroll}><RotateCcw size={14} /> {text('换一批', 'Reroll')}</button><button className="text-button" onClick={() => onNavigate('explore')}>{text(`${unlockedCount} 项已解锁`, `${unlockedCount} unlocked`)} <ArrowRight size={16} /></button></div></div>
        <div className="quest-grid">
          {featured.map((item) => <QuestCard key={item.challenge.id} challenge={item.challenge} completions={completions} featured={item.role === 'growth'} recommendationRole={item.role} recommendationReason={item.reason} active={activeIds.includes(item.challenge.id)} favorite={favoriteIds.includes(item.challenge.id)} onComplete={onComplete} onFavorite={onFavorite} onOpen={onOpen} onStart={onStart} />)}
        </div>
      </section>

      <section className="section-block recent-panel home-recent-panel">
        <div className="section-heading"><div><p className="eyebrow">{text('最近战绩', 'Recent victories')}</p><h2>{text('你的冒险日志', 'Your chronicle')}</h2></div><button className="icon-button" aria-label={text('查看冒险日志', 'View chronicle')} onClick={() => onNavigate('chronicle')}><ArrowRight size={18} /></button></div>
        {completed.length ? completed.slice(0, 3).map((item) => <ActivityItem key={item.completion.id} {...item} onOpen={onOpen} />) : <EmptyState compact icon={Footprints} title={text('故事要从现实开始', 'Your story starts in real life')} text={text('完成一个任务，你的第一条战绩就会出现在这里。', 'Complete a quest and your first victory will appear here.')} />}
      </section>
    </>
  )
}

function CharacterView({ completedCount, energy, levelInfo, maxEnergy, stats, streak, totalXp }: {
  completedCount: number
  energy: number
  levelInfo: ReturnType<typeof getLevel>
  maxEnergy: number
  stats: Record<StatKey, number>
  streak: number
  totalXp: number
}) {
  const { language, text } = useLanguage()
  const [selectedStat, setSelectedStat] = useState<StatKey | null>(null)
  const [levelHelp, setLevelHelp] = useState(false)
  const maxStat = Math.max(1, ...Object.values(stats))
  return (
    <>
      <div className="page-heading"><p className="eyebrow">{text('角色面板', 'Character Sheet')}</p><h1>{text('看见你的', 'See your real')}<em>{text('现实成长。', ' growth.')}</em></h1><p>{text('每一次真实行动都会留下经验、属性与时间线，让成长不再只是模糊的感觉。', 'Every real action leaves XP, attributes, and a timeline behind.')}</p></div>
      <section className="character-summary">
        <button className="character-level-card" onClick={() => setLevelHelp(true)}>
          <span className="character-level-emblem"><UserRound size={30} /></span>
          <span className="character-level-copy"><small>{text('独行冒险者', 'Solo Adventurer')}</small><strong>{text('等级', 'Level')} {levelInfo.level}</strong><em>{totalXp} {text('总经验', 'total XP')}</em></span>
          <span className="character-level-progress"><span><b>{levelInfo.carriedXp}</b> / {levelInfo.needed} {text('经验', 'XP')}</span><i><b style={{ width: `${levelInfo.percent}%` }} /></i><small>{text('点击查看等级计算规则', 'Click to view level rules')}</small></span>
        </button>
        <div className="character-metrics">
          <div><Trophy size={18} /><span>{text('完成记录', 'Completions')}</span><strong>{completedCount}</strong></div>
          <div><Flame size={18} /><span>{text('连续天数', 'Streak')}</span><strong>{streak}</strong></div>
          <div><Heart size={18} /><span>{text('当前行动力', 'Energy')}</span><strong>{energy}/{maxEnergy}</strong></div>
          <div><Sparkles size={18} /><span>{text('最高属性', 'Top attribute')}</span><strong>{maxStat}</strong></div>
        </div>
      </section>
      <section className="section-block stat-panel character-stat-panel">
        <div className="section-heading"><div><p className="eyebrow">{text('六项现实属性', 'Six real-life attributes')}</p><h2>{text('你的成长分布', 'Your growth profile')}</h2></div><button className="level-chip" onClick={() => setLevelHelp(true)}>{text('等级', 'Level')} {levelInfo.level}</button></div>
        <p className="character-stat-intro">{text('属性条以你当前最高属性为基准展示相对分布。点击任意属性可查看含义与对应任务类型。', 'Bars are relative to your current highest attribute. Select one to see what it means and which quests improve it.')}</p>
        <div className="stat-list character-stat-list">
          {(Object.entries(stats) as [StatKey, number][]).map(([key, value]) => (
            (() => { const Icon = statMeta[key].icon; return <button className="stat-row" key={key} onClick={() => setSelectedStat(key)} style={{ '--stat-color': statMeta[key].color } as React.CSSProperties}><span><Icon size={17} /></span><div><strong>{language === 'zh' ? statLabels[key] : statLabelsEn[key]} <small>{text('点击了解', 'Learn more')}</small></strong><i><b style={{ width: `${(value / maxStat) * 100}%` }} /></i></div><em>{value}</em></button> })()
          ))}
        </div>
      </section>
      {selectedStat && <StatHelpModal stat={selectedStat} value={stats[selectedStat]} onClose={() => setSelectedStat(null)} />}
      {levelHelp && <LevelHelpModal levelInfo={levelInfo} totalXp={totalXp} onClose={() => setLevelHelp(false)} />}
    </>
  )
}

function ExploreView({ activeIds, category, completions, favoriteIds, hiddenIds, hiddenLockedCount, level, nextLevel, onCategory, onComplete, onCreate, onFavorite, onOpen, onSeal, onShowSealed, onStart, search, sealedCount, setSearch, showSealed, totalChallenges, unlockedTotal, visibleChallenges }: QuestActions & {
  category: string
  hiddenIds: string[]
  hiddenLockedCount: number
  level: number
  totalChallenges: number
  unlockedTotal: number
  nextLevel: number
  onCategory: (value: string) => void
  onCreate: () => void
  onSeal: (id: string) => void
  onShowSealed: () => void
  search: string
  sealedCount: number
  setSearch: (value: string) => void
  showSealed: boolean
  visibleChallenges: Challenge[]
}) {
  const { language, text } = useLanguage()
  const categories = ['全部任务', ...Object.keys(categoryMeta)]
  return (
    <>
      <div className="page-heading page-heading--actions"><div><p className="eyebrow">{text('任务公会', 'Quest Guild')}</p><h1>{text('寻找下一场', 'Find your next')}<em>{text('胜利。', ' victory.')}</em></h1><p>{text(`完整收录 ${totalChallenges} 项原版挑战，也可以创建只属于你的个人任务。`, `All ${totalChallenges} original challenges, plus personal quests of your own.`)}</p></div><button className="primary-button create-quest-button" onClick={onCreate}><Plus size={17} /> {text('创建任务', 'Create quest')}</button></div>
      <div className="unlock-banner"><div className="unlock-emblem"><LockKeyhole size={22} /></div><div><span>{text('冒险者等级', 'Adventurer level')} {level}</span><strong>{text('已发现', 'Discovered')} {unlockedTotal} / {totalChallenges}</strong></div><div className="unlock-progress"><i style={{ width: `${totalChallenges ? (unlockedTotal / totalChallenges) * 100 : 0}%` }} /></div><small>{text('下一批成就将在等级', 'Next achievements unlock at level')} {Number.isFinite(nextLevel) ? nextLevel : '—'}</small></div>
      <div className="filter-bar">
        <label className="search-field"><Search size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={text('搜索已解锁的任务……', 'Search unlocked quests…')} /></label>
        <label className="select-field"><select value={category} onChange={(event) => onCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item === '全部任务' ? text('全部任务', 'All quests') : language === 'zh' ? item : categoryMeta[item].labelEn}</option>)}</select><ChevronDown size={17} /></label>
      </div>
      <div className="category-strip">
        {categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => onCategory(item)}>{item === '全部任务' ? <Sparkles size={17} /> : (() => { const Icon = categoryMeta[item].icon; return <Icon size={17} /> })()}<span>{item === '全部任务' ? text('全部任务', 'All') : language === 'zh' ? categoryMeta[item].short : categoryMeta[item].shortEn}</span></button>)}
      </div>
      <div className="result-toolbar"><div className="result-meta"><strong>{showSealed ? visibleChallenges.length : visibleChallenges.filter((item) => item.level <= level).length}</strong> {showSealed ? text('项封印任务', 'sealed quests') : text('项可领取任务', 'available quests')} <span>•</span> {showSealed ? text('封印库', 'Sealed vault') : category === '全部任务' ? text('全部任务', 'All quests') : language === 'zh' ? category : categoryMeta[category].labelEn}</div><button className={`sealed-filter ${showSealed ? 'active' : ''}`} onClick={onShowSealed}><LockKeyhole size={14} /> {showSealed ? text('返回任务', 'Back to quests') : text('封印库', 'Sealed vault')} {sealedCount > 0 && <b>{sealedCount}</b>}</button></div>
      {visibleChallenges.length > 0 ? <div className="quest-list">
        {visibleChallenges.slice(0, 80).map((challenge) => !showSealed && challenge.level > level
          ? <LockedQuestRow key={challenge.id} challenge={challenge} />
          : <QuestRow key={challenge.id} challenge={challenge} completions={completions} active={activeIds.includes(challenge.id)} favorite={favoriteIds.includes(challenge.id)} sealed={hiddenIds.includes(challenge.id)} onComplete={onComplete} onFavorite={onFavorite} onOpen={onOpen} onSeal={onSeal} onStart={onStart} />)}
      </div> : showSealed ? <EmptyState compact icon={LockKeyhole} title={text('封印库还是空的', 'The sealed vault is empty')} text={text('在不想再看到的任务详情中选择“封印任务”，它们会收纳在这里。', 'Seal quests you no longer want to see and they will be stored here.')} /> : null}
      {!showSealed && hiddenLockedCount > 0 && !search && <div className="hidden-quests"><LockKeyhole size={17} /><strong>{text(`还有 ${hiddenLockedCount} 项成就隐藏在迷雾中`, `${hiddenLockedCount} achievements remain hidden in the fog`)}</strong><span>{text('继续获得经验并提升等级后，它们才会显露名称。', 'Earn XP and level up to reveal their names.')}</span></div>}
      {visibleChallenges.length > 80 && <p className="result-note">{text('当前显示前 80 项结果，请使用搜索或分类继续缩小范围。', 'Showing the first 80 results. Search or filter to narrow the list.')}</p>}
    </>
  )
}

function CollectionView({ active, activeIds, completions, favoriteIds, favorites, onComplete, onExplore, onFavorite, onOpen, onStart }: QuestActions & { active: Challenge[]; favorites: Challenge[]; onExplore: () => void }) {
  const { text } = useLanguage()
  return (
    <>
      <div className="page-heading"><p className="eyebrow">{text('我的任务', 'My Quests')}</p><h1>{text('正在进行的', 'Adventures in')}<em>{text('冒险。', ' progress.')}</em></h1><p>{text('把真正想做的事留在眼前，等你在现实中完成它。', 'Keep what matters in sight until you make it real.')}</p></div>
      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">{text('进行中', 'In progress')}</p><h2>{text('当前任务', 'Active quests')} <span className="count-pill">{active.length}</span></h2></div></div>
        {active.length ? <div className="quest-list">{active.map((challenge) => <QuestRow key={challenge.id} challenge={challenge} completions={completions} active favorite={favoriteIds.includes(challenge.id)} onComplete={onComplete} onFavorite={onFavorite} onOpen={onOpen} onStart={onStart} />)}</div> : <EmptyState icon={Target} title={text('还没有进行中的任务', 'No active quests yet')} text={text('选一件足够小、但确实对你有意义的事。', 'Choose something small that genuinely matters to you.')} action={text('前往任务公会', 'Visit the quest guild')} onAction={onExplore} />}
      </section>
      <section className="section-block collection-gap">
        <div className="section-heading"><div><p className="eyebrow">{text('任务书签', 'Quest bookmarks')}</p><h2>{text('以后再做', 'Saved for later')} <span className="count-pill">{favorites.length}</span></h2></div></div>
        {favorites.length ? <div className="quest-list">{favorites.map((challenge) => <QuestRow key={challenge.id} challenge={challenge} completions={completions} active={activeIds.includes(challenge.id)} favorite onComplete={onComplete} onFavorite={onFavorite} onOpen={onOpen} onStart={onStart} />)}</div> : <EmptyState compact icon={Star} title={text('书签还是空的', 'No bookmarks yet')} text={text('点击任务上的星标，就能把它留在这里。', 'Use the star on a quest to save it here.')} />}
      </section>
    </>
  )
}

function ChronicleView({ items, onOpen, onUndo }: { items: { completion: Completion; challenge: Challenge }[]; onOpen: (challenge: Challenge) => void; onUndo: (item: { completion: Completion; challenge: Challenge }) => void }) {
  const { text } = useLanguage()
  return (
    <>
      <div className="page-heading"><p className="eyebrow">{text('冒险日志', 'Chronicle')}</p><h1>{text('你认真生活过的', 'Proof that you')}<em>{text('证据。', ' showed up.')}</em></h1><p>{text('只属于你的真实行动、诚实记录与成长轨迹。', 'Your real actions, honest notes, and visible growth.')}</p></div>
      <section className="timeline-panel">
        {items.length ? items.map((item) => <ActivityItem key={item.completion.id} {...item} large onOpen={onOpen} onUndo={() => onUndo(item)} />) : <EmptyState icon={ScrollText} title={text('冒险日志还是空白', 'Your chronicle is blank')} text={text('完成一个任务，写下属于你的第一行记录。', 'Complete a quest and write your first entry.')} />}
      </section>
    </>
  )
}

function QuestCard({ active, challenge, completions, favorite, featured, onComplete, onFavorite, onOpen, onStart, recommendationReason, recommendationRole }: { active: boolean; challenge: Challenge; completions: Completion[]; favorite: boolean; featured?: boolean; onComplete: (challenge: Challenge) => void; onFavorite: (id: string) => void; onOpen: (challenge: Challenge) => void; onStart: (id: string) => void; recommendationReason?: string; recommendationRole?: DailyRecommendation['role'] }) {
  const { language, text, title } = useLanguage()
  const meta = categoryMeta[challenge.category] ?? categoryMeta['学习与成长']
  const Icon = meta.icon
  const cooldown = getCooldownLabel(challenge, completions, language)
  return (
    <article className={`quest-card ${featured ? 'featured' : ''}`} onClick={() => onOpen(challenge)} onKeyDown={(event) => { if (event.key === 'Enter') onOpen(challenge) }} role="button" tabIndex={0} style={{ '--category-color': meta.color } as React.CSSProperties}>
      <div className="quest-card-top"><div className="category-icon"><Icon size={22} /></div><button className={`star-button ${favorite ? 'active' : ''}`} onClick={(event) => { event.stopPropagation(); onFavorite(challenge.id) }} aria-label={text('收藏任务', 'Save quest')}><Star size={18} fill={favorite ? 'currentColor' : 'none'} /></button></div>
      <span className="quest-kind">{recommendationRole ? text(recommendationRole === 'quick' ? '轻松一胜' : recommendationRole === 'growth' ? '成长任务' : '自由选择', recommendationRole === 'quick' ? 'Quick win' : recommendationRole === 'growth' ? 'Growth quest' : 'Free choice') : featured ? text('今日主线', 'Main quest') : language === 'zh' ? meta.short : challenge.categoryOriginal}</span>
      <h3>{title(challenge)}</h3>
      {recommendationReason && <p className="recommendation-reason"><Sparkles size={13} /> {recommendationReason}</p>}
      <div className="quest-rewards"><span><Zap size={14} /> {challenge.xp} {text('经验', 'XP')}</span>{challenge.stats.map((stat) => <span key={stat.key}>{language === 'zh' ? statLabels[stat.key] : statLabelsEn[stat.key]} +{stat.points}</span>)}</div>
      <div className="quest-card-footer"><span>{cooldown || `${language === 'zh' ? challenge.tierName : tierLabels[challenge.tierName]} · ${text('等级', 'Level')} ${challenge.level}`}</span>{cooldown ? <button className="cooldown-button" onClick={(event) => { event.stopPropagation(); onOpen(challenge) }}><LockKeyhole size={14} /> {text('冷却中', 'Cooling down')}</button> : active ? <div className="quest-active-actions"><button className="abandon-button" onClick={(event) => { event.stopPropagation(); onStart(challenge.id) }}><X size={14} /> {text('退回', 'Abandon')}</button><button className="complete-button" onClick={(event) => { event.stopPropagation(); onComplete(challenge) }}><Check size={16} /> {text('完成', 'Complete')}</button></div> : <button className="add-button" onClick={(event) => { event.stopPropagation(); onStart(challenge.id) }}><Plus size={17} /> {text('接取', 'Start')}</button>}</div>
    </article>
  )
}

function QuestRow({ active, challenge, completions, favorite, onComplete, onFavorite, onOpen, onSeal, onStart, sealed = false }: { active: boolean; challenge: Challenge; completions: Completion[]; favorite: boolean; onComplete: (challenge: Challenge) => void; onFavorite: (id: string) => void; onOpen: (challenge: Challenge) => void; onSeal?: (id: string) => void; onStart: (id: string) => void; sealed?: boolean }) {
  const { category, language, text, title } = useLanguage()
  const meta = categoryMeta[challenge.category] ?? categoryMeta['学习与成长']
  const Icon = meta.icon
  const cooldown = getCooldownLabel(challenge, completions, language)
  return (
    <article className={`quest-row ${active ? 'quest-row--active' : ''}`} onClick={() => onOpen(challenge)} onKeyDown={(event) => { if (event.key === 'Enter') onOpen(challenge) }} role="button" tabIndex={0} style={{ '--category-color': meta.color } as React.CSSProperties}>
      <div className="category-icon"><Icon size={21} /></div>
      <div className="quest-row-copy"><span>{category(challenge)} · {language === 'zh' ? challenge.tierName : tierLabels[challenge.tierName]}</span><h3>{title(challenge)}</h3><div className="quest-rewards"><span><Zap size={13} /> {challenge.xp} {text('经验', 'XP')}</span>{challenge.stats.map((stat) => <span key={stat.key}>{language === 'zh' ? statLabels[stat.key] : statLabelsEn[stat.key]} +{stat.points}</span>)}<em>{text('等级', 'Level')} {challenge.level}</em>{cooldown && <em className="cooldown-label">{cooldown}</em>}</div></div>
      <button className={`star-button ${favorite ? 'active' : ''}`} disabled={sealed} onClick={(event) => { event.stopPropagation(); onFavorite(challenge.id) }} aria-label={text('收藏任务', 'Save quest')}><Star size={18} fill={favorite ? 'currentColor' : 'none'} /></button>
      {sealed ? <button className="restore-button" onClick={(event) => { event.stopPropagation(); onSeal?.(challenge.id) }}><RotateCcw size={15} /> {text('解除封印', 'Restore')}</button> : cooldown ? <button className="cooldown-button" onClick={(event) => { event.stopPropagation(); onOpen(challenge) }}><LockKeyhole size={15} /> {text('冷却中', 'Cooldown')}</button> : active ? <div className="quest-active-actions"><button className="abandon-button" onClick={(event) => { event.stopPropagation(); onStart(challenge.id) }}><X size={14} /> {text('退回', 'Abandon')}</button><button className="complete-button" onClick={(event) => { event.stopPropagation(); onComplete(challenge) }}><Check size={16} /> {text('完成', 'Complete')}</button></div> : <button className="row-add-button" onClick={(event) => { event.stopPropagation(); onStart(challenge.id) }}><Plus size={18} /><span>{text('接取任务', 'Start quest')}</span></button>}
    </article>
  )
}

function LockedQuestRow({ challenge }: { challenge: Challenge }) {
  const { text } = useLanguage()
  return (
    <article className="quest-row quest-row--locked" aria-disabled="true">
      <div className="category-icon"><LockKeyhole size={20} /></div>
      <div className="quest-row-copy"><span>{text('未知成就 · 尚未发现', 'Unknown achievement · Undiscovered')}</span><h3>{text('被迷雾遮蔽的任务', 'A quest hidden by the fog')}</h3><div className="quest-rewards"><em>{text(`达到等级 ${challenge.level} 后显露名称与奖励`, `Reach level ${challenge.level} to reveal its name and rewards`)}</em></div></div>
      <div className="lock-runes" aria-hidden="true">???</div>
      <button className="cooldown-button" disabled><LockKeyhole size={15} /> {text('尚未解锁', 'Locked')}</button>
    </article>
  )
}

function QuestDetailView({ active, challenge, completions, favorite, level, onBack, onComplete, onDuplicate, onEdit, onFavorite, onSeal, onStart, onUndo, sealed }: {
  active: boolean
  challenge: Challenge
  completions: Completion[]
  favorite: boolean
  level: number
  onBack: () => void
  onComplete: (challenge: Challenge) => void
  onDuplicate: (challenge: Challenge) => void
  onEdit: (challenge: Challenge) => void
  onFavorite: (id: string) => void
  onSeal: (id: string) => void
  onStart: (id: string) => void
  onUndo: (completion: Completion) => void
  sealed: boolean
}) {
  const { category, language, text, title } = useLanguage()
  const meta = categoryMeta[challenge.category] ?? categoryMeta['学习与成长']
  const Icon = meta.icon
  const cooldown = getCooldownLabel(challenge, completions, language)
  const history = completions.filter((item) => item.challengeId === challenge.id)
  const levelRestricted = challenge.level > level
  const locked = levelRestricted && history.length === 0 && !sealed
  const repeatable = challenge.cadence !== '终身一次'

  return (
    <>
      <button className="detail-back" onClick={onBack}><ArrowLeft size={17} /> {text('返回', 'Back')}</button>
      <section className="quest-detail-hero" style={{ '--category-color': meta.color } as React.CSSProperties}>
        <div className="detail-category-icon"><Icon size={34} /></div>
        <div className="detail-hero-copy">
          <p className="eyebrow">{locked ? text('未知成就', 'Unknown achievement') : `${category(challenge)} · ${language === 'zh' ? challenge.tierName : tierLabels[challenge.tierName]}`}</p>
          <h1>{locked ? text('被迷雾遮蔽的任务', 'A quest hidden by the fog') : title(challenge)}</h1>
          <div className="detail-tags">
            {!locked && <span><Zap size={15} /> {challenge.xp} {text('经验', 'XP')}</span>}
            {!locked && challenge.stats.map((stat) => <span key={stat.key}>{language === 'zh' ? statLabels[stat.key] : statLabelsEn[stat.key]} +{stat.points}</span>)}
            <span>{text('等级', 'Level')} {challenge.level}</span>
            {challenge.custom && <span><UserRound size={14} /> {text('个人任务', 'Personal quest')}</span>}
            {!locked && <span><Clock3 size={14} /> {getQuestEstimate(challenge)} {text('分钟', 'min')}</span>}
          </div>
        </div>
        <div className="detail-actions">
          {challenge.custom && !sealed && <button className="detail-secondary" onClick={() => onEdit(challenge)}><Pencil size={15} /> {text('编辑', 'Edit')}</button>}
          {challenge.custom && !sealed && <button className="detail-secondary" onClick={() => onDuplicate(challenge)}><Copy size={15} /> {text('复制', 'Copy')}</button>}
          {!locked && !sealed && <button className={`detail-favorite ${favorite ? 'active' : ''}`} onClick={() => onFavorite(challenge.id)}><Star size={18} fill={favorite ? 'currentColor' : 'none'} /> {favorite ? text('已收藏', 'Saved') : text('收藏', 'Save')}</button>}
          {!locked && !sealed && <button className="detail-secondary detail-seal" onClick={() => onSeal(challenge.id)}><LockKeyhole size={16} /> {text('封印任务', 'Seal quest')}</button>}
          {sealed ? <button className="primary-button" onClick={() => onSeal(challenge.id)}><RotateCcw size={16} /> {text('解除封印', 'Restore quest')}</button> : locked ? <button className="cooldown-button" disabled><LockKeyhole size={16} /> {text(`等级 ${challenge.level} 解锁`, `Unlocks at level ${challenge.level}`)}</button> : levelRestricted ? <button className="detail-secondary" onClick={() => onUndo(history[0])}><RotateCcw size={16} /> {text('撤销最近完成', 'Undo latest completion')}</button> : cooldown ? <button className="cooldown-button" disabled><LockKeyhole size={16} /> {cooldown}</button> : active ? <><button className="detail-secondary" onClick={() => onStart(challenge.id)}>{text('取消接取', 'Abandon')}</button><button className="primary-button" onClick={() => onComplete(challenge)}><Check size={17} /> {text('记录完成', 'Record completion')}</button></> : <button className="primary-button" onClick={() => onStart(challenge.id)}><Plus size={17} /> {text('接取任务', 'Start quest')}</button>}
        </div>
      </section>

      <div className="quest-detail-grid">
        <section className="detail-panel">
          <div className="detail-panel-heading"><Repeat2 size={19} /><div><span>{text('重复规则', 'Repeat rule')}</span><strong>{language === 'zh' ? challenge.cadence : cadenceLabels[challenge.cadence]}</strong></div></div>
          <p>{locked ? text('达到所需等级后，任务详情与奖励会完整显露。', 'Reach the required level to reveal the full quest and its rewards.') : challenge.description || (language === 'zh' ? cadenceDescriptions[challenge.cadence] : cadenceDescriptionsEn[challenge.cadence])}</p>
          {!locked && <div className={`repeat-status ${repeatable ? 'repeat-status--yes' : ''}`}><Repeat2 size={15} /> {repeatable ? text('这是可循环任务', 'This quest is repeatable') : text('这是终身成就', 'This is a lifetime achievement')}</div>}
          {cooldown && <div className="detail-cooldown"><History size={16} /> {cooldown}</div>}
          {!locked && Boolean(challenge.contexts?.length) && <div className="context-tags">{challenge.contexts?.map((context) => <span key={context}>{context}</span>)}</div>}
        </section>
        <section className="detail-panel">
          <div className="detail-panel-heading"><ShieldCheck size={19} /><div><span>{text('完成标准', 'Completion standard')}</span><strong>{text('由你诚实判断', 'Your honest judgment')}</strong></div></div>
          <p>{challenge.completionPrompt || text('任务只在现实中真正发生后才应记录。你可以在完成时写下过程、结果或这件事对你的意义。', 'Record a quest only after it truly happens in real life. Add a note about the process, result, or why it mattered.')}</p>
          <div className="detail-rule-row"><span>{text('行动力消耗', 'Energy cost')}</span><strong>1</strong></div>
          <div className="detail-rule-row"><span>{text('所需精力', 'Energy demand')}</span><strong>{text(getQuestEnergy(challenge) === 'low' ? '低' : getQuestEnergy(challenge) === 'high' ? '高' : '普通', getQuestEnergy(challenge))}</strong></div>
          <div className="detail-rule-row"><span>{text('历史完成', 'Times completed')}</span><strong>{history.length}</strong></div>
        </section>
      </div>

      <section className="detail-history">
        <div className="section-heading"><div><p className="eyebrow">{text('完成记录', 'Completion history')}</p><h2>{text('这项任务的历史', 'History of this quest')}</h2></div><span className="count-pill">{history.length}</span></div>
        {history.length ? history.map((completion) => <ActivityItem key={completion.id} challenge={challenge} completion={completion} large onUndo={() => onUndo(completion)} />) : <EmptyState compact icon={History} title={text('还没有完成记录', 'No completions yet')} text={text('完成后，你的备注和奖励会保存在这里。', 'Your notes and rewards will appear here after completion.')} />}
      </section>
    </>
  )
}

function ActivityItem({ challenge, completion, large, onOpen, onUndo }: { challenge: Challenge; completion: Completion; large?: boolean; onOpen?: (challenge: Challenge) => void; onUndo?: () => void }) {
  const { language, text, title } = useLanguage()
  const meta = categoryMeta[challenge.category] ?? categoryMeta['学习与成长']
  const Icon = meta.icon
  const date = new Date(completion.completedAt)
  return (
    <article className={`activity-item ${large ? 'activity-item--large' : ''} ${onOpen ? 'activity-item--clickable' : ''}`} onClick={() => onOpen?.(challenge)}>
      <div className="activity-icon" style={{ color: meta.color }}><Icon size={20} /></div>
      <div className="activity-copy"><span>{date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', year: large ? 'numeric' : undefined })}</span><h3>{title(challenge)}</h3>{completion.note && <p>“{completion.note}”</p>}{Boolean(completion.attachments?.length) && <AttachmentList attachments={completion.attachments ?? []} />}<div className="quest-rewards"><span><Zap size={13} /> +{challenge.xp} {text('经验', 'XP')}</span>{challenge.stats.map((stat) => <span key={stat.key}>{language === 'zh' ? statLabels[stat.key] : statLabelsEn[stat.key]} +{stat.points}</span>)}</div></div>
      {large && (onOpen || onUndo) ? <div className="activity-actions">{onOpen && <button onClick={(event) => { event.stopPropagation(); onOpen(challenge) }}>{text('查看任务', 'View quest')}</button>}{onUndo && <button className="undo-link" onClick={(event) => { event.stopPropagation(); onUndo() }}><RotateCcw size={14} /> {text('撤销', 'Undo')}</button>}</div> : <Check className="activity-check" size={18} />}
    </article>
  )
}

function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  return <div className="attachment-list">{attachments.map((attachment) => <AttachmentItem key={attachment.pathname} attachment={attachment} />)}</div>
}

function AttachmentItem({ attachment }: { attachment: Attachment }) {
  const { text } = useLanguage()
  const accessKey = useAccessKey()
  const isImage = attachment.contentType.startsWith('image/')
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(isImage)
  const endpoint = `/api/attachment?pathname=${encodeURIComponent(attachment.pathname)}&name=${encodeURIComponent(attachment.name)}`

  useEffect(() => {
    if (!isImage) return
    let objectUrl = ''
    let active = true
    void fetch(endpoint, { headers: { Authorization: `Bearer ${accessKey}` } })
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load attachment')
        return response.blob()
      })
      .then((blob) => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setPreviewUrl(objectUrl)
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [accessKey, endpoint, isImage])

  async function downloadAttachment(event: React.MouseEvent) {
    event.stopPropagation()
    const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${accessKey}` } })
    if (!response.ok) return
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = attachment.name
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  if (isImage) return (
    <button className="attachment-item attachment-item--image" onClick={downloadAttachment} title={text('下载原图', 'Download original image')}>
      <span className="attachment-image-preview">{previewUrl ? <img src={previewUrl} alt={attachment.name} /> : <span className="attachment-placeholder">{loading ? <UploadCloud size={22} /> : <FileText size={22} />}</span>}</span>
      <span className="attachment-image-caption"><span className="attachment-copy"><strong>{attachment.name}</strong><small>{formatFileSize(attachment.size)}</small></span><Download size={15} /></span>
    </button>
  )

  return (
    <button className="attachment-item" onClick={downloadAttachment} title={text('下载附件', 'Download attachment')}>
      <span className="attachment-placeholder"><FileText size={18} /></span>
      <span className="attachment-copy"><strong>{attachment.name}</strong><small>{formatFileSize(attachment.size)}</small></span>
      <Download size={14} />
    </button>
  )
}

function UndoModal({ challenge, onCancel, onConfirm }: { challenge: Challenge; onCancel: () => void; onConfirm: () => void }) {
  const { text, title } = useLanguage()
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="undo-modal" role="dialog" aria-modal="true" aria-labelledby="undo-title">
        <div className="undo-icon"><RotateCcw size={25} /></div>
        <p className="eyebrow">{text('撤销完成记录', 'Undo completion')}</p>
        <h2 id="undo-title">{text('确定要撤销吗？', 'Undo this completion?')}</h2>
        <h3>{title(challenge)}</h3>
        <p>{text('对应的经验、属性成长和冷却状态会被撤回；如果记录在最近一小时内，消耗的行动力也会立即恢复。', 'XP, stat growth, and cooldown will be reverted. Energy is restored immediately for completions from the last hour.')}</p>
        <div className="undo-actions"><button className="detail-secondary" onClick={onCancel}>{text('保留记录', 'Keep record')}</button><button className="danger-button" onClick={onConfirm}><RotateCcw size={16} /> {text('确认撤销', 'Confirm undo')}</button></div>
      </section>
    </div>
  )
}

function EnergyHelpModal({ current, max, onClose }: { current: number; max: number; onClose: () => void }) {
  const { text } = useLanguage()
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="energy-help-modal" role="dialog" aria-modal="true" aria-labelledby="energy-help-title" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label={text('关闭', 'Close')}><X /></button>
        <div className="energy-help-icon"><Heart size={27} fill="currentColor" /></div>
        <p className="eyebrow">{text('行动力', 'Energy')}</p>
        <h2 id="energy-help-title">{text('这不是生命值', 'This is not health')}</h2>
        <p>{text('每记录一次任务完成，会消耗 1 点行动力，用来限制短时间内连续刷奖励。每小时会自动恢复 1 点。', 'Recording a completion costs 1 energy, preventing rapid reward farming. You recover 1 energy every hour.')}</p>
        <div className="energy-help-status"><span>{text('当前行动力', 'Current energy')}</span><strong>{current} / {max}</strong></div>
        <small>{text('提升等级后，行动力上限也会逐步增加。撤销最近一小时内的完成记录，会立即返还行动力。', 'Your maximum energy grows as you level up. Undoing a completion from the last hour restores its energy immediately.')}</small>
      </section>
    </div>
  )
}

function StatHelpModal({ onClose, stat, value }: { onClose: () => void; stat: StatKey; value: number }) {
  const { language, text } = useLanguage()
  const description = statDescriptions[stat]
  const Icon = statMeta[stat].icon
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="character-help-modal" role="dialog" aria-modal="true" aria-labelledby="stat-help-title" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label={text('关闭', 'Close')}><X /></button>
        <div className="stat-help-badge" style={{ '--stat-color': statMeta[stat].color } as React.CSSProperties}><Icon size={27} /></div>
        <p className="eyebrow">{text('现实属性', 'Real-life attribute')}</p>
        <h2 id="stat-help-title">{language === 'zh' ? statLabels[stat] : statLabelsEn[stat]}</h2>
        <p>{language === 'zh' ? description.zh : description.en}</p>
        <div className="character-help-value"><span>{text('当前属性值', 'Current value')}</span><strong>{value}</strong></div>
        <div className="character-help-examples"><span>{text('常见来源', 'Common sources')}</span><p>{language === 'zh' ? description.examplesZh : description.examplesEn}</p></div>
        <small>{text('任务奖励中的属性点会永久累加；撤销对应的完成记录时，这些属性点也会撤回。', 'Attribute points from quest rewards accumulate permanently and are removed if that completion is undone.')}</small>
      </section>
    </div>
  )
}

function LevelHelpModal({ levelInfo, onClose, totalXp }: { levelInfo: ReturnType<typeof getLevel>; onClose: () => void; totalXp: number }) {
  const { text } = useLanguage()
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="character-help-modal level-help-modal" role="dialog" aria-modal="true" aria-labelledby="level-help-title" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label={text('关闭', 'Close')}><X /></button>
        <div className="level-help-badge"><Zap size={27} /></div>
        <p className="eyebrow">{text('等级与经验', 'Level and XP')}</p>
        <h2 id="level-help-title">{text(`当前等级 ${levelInfo.level}`, `Current level ${levelInfo.level}`)}</h2>
        <div className="level-help-progress"><div><span>{text('本级经验', 'Current level XP')}</span><strong>{levelInfo.carriedXp} / {levelInfo.needed}</strong></div><div className="level-progress-track"><i style={{ width: `${levelInfo.percent}%` }} /></div><small>{levelInfo.percent}%</small></div>
        <div className="level-rule-list">
          <div><span>01</span><p>{text('每个任务有固定经验奖励，记录完成后立即计入总经验。', 'Each quest has a fixed XP reward that is added when you record a completion.')}</p></div>
          <div><span>02</span><p>{text('从等级 1 升到 2 需要 500 经验；之后每一级比前一级多需要 180 经验。', 'Level 1 to 2 requires 500 XP; every following level requires 180 more XP than the previous one.')}</p></div>
          <div><span>03</span><p>{text('升级后会解锁更高等级的任务；撤销完成记录会扣回经验，等级也可能下降。', 'Leveling reveals higher-level quests. Undoing a completion removes its XP and can lower your level.')}</p></div>
        </div>
        <div className="character-help-value"><span>{text('累计总经验', 'Lifetime XP')}</span><strong>{totalXp}</strong></div>
      </section>
    </div>
  )
}

function SettingsView({ settings, onChange }: { settings: AppSettings; onChange: (settings: AppSettings) => void }) {
  const { text } = useLanguage()
  const cloud = !import.meta.env.DEV
  return (
    <>
      <div className="page-heading"><p className="eyebrow">{text('设置', 'Settings')}</p><h1>{text('打造你的', 'Shape your')}<em>{text('冒险界面。', ' adventure UI.')}</em></h1><p>{text('外观、语言与冒险进度会安全保存，并在下次启动时自动恢复。', 'Appearance, language, and progress are saved securely and restored on startup.')}</p></div>
      <section className="settings-panel">
        <div className="setting-copy"><span>{text('界面语言', 'Interface language')}</span><h2>{text('选择显示语言', 'Choose a language')}</h2><p>{text('挑战标题和全部操作界面会一起切换。', 'Challenge titles and interface controls switch together.')}</p></div>
        <div className="setting-options setting-options--two">
          <button className={settings.language === 'zh' ? 'selected' : ''} onClick={() => onChange({ ...settings, language: 'zh' })}><strong>简体中文</strong><span>{text('中文挑战与界面', 'Chinese quests and interface')}</span></button>
          <button className={settings.language === 'en' ? 'selected' : ''} onClick={() => onChange({ ...settings, language: 'en' })}><strong>English</strong><span>Original challenge titles</span></button>
        </div>
      </section>
      <section className="settings-panel">
        <div className="setting-copy"><span>{text('字体', 'Font')}</span><h2>{text('选择界面字体', 'Choose an interface font')}</h2><p>{text('快乐体更有游戏感，思源黑体更适合长时间阅读。', 'ZCOOL feels more playful; Noto is easier for long reading sessions.')}</p></div>
        <div className="setting-options font-options">
          <button className={`font-preview font-preview--noto ${settings.font === 'noto' ? 'selected' : ''}`} onClick={() => onChange({ ...settings, font: 'noto' })}><strong>{text('思源黑体', 'Noto Sans')}</strong><span>{text('清晰、现代、耐读', 'Clear, modern, readable')}</span></button>
          <button className={`font-preview font-preview--zcool ${settings.font === 'zcool' ? 'selected' : ''}`} onClick={() => onChange({ ...settings, font: 'zcool' })}><strong>{text('站酷快乐体', 'ZCOOL KuaiLe')}</strong><span>{text('复古、活泼、游戏感', 'Playful, retro, game-like')}</span></button>
          <button className={`font-preview font-preview--pixel ${settings.font === 'pixel' ? 'selected' : ''}`} onClick={() => onChange({ ...settings, font: 'pixel' })}><strong>{text('像素街机体', 'Pixel Arcade')}</strong><span>{text('方块笔画、复古像素感', 'Blocky, retro pixel style')}</span></button>
          <button className={`font-preview font-preview--system ${settings.font === 'system' ? 'selected' : ''}`} onClick={() => onChange({ ...settings, font: 'system' })}><strong>{text('系统字体', 'System font')}</strong><span>{text('跟随当前设备', 'Follow this device')}</span></button>
        </div>
      </section>
      <section className="database-status"><div><ShieldCheck size={20} /><span>{text('数据存储', 'Data storage')}</span><strong>{cloud ? text('Neon PostgreSQL 云存档', 'Neon PostgreSQL cloud save') : text('SQLite 本地开发数据库', 'Local SQLite development database')}</strong></div><code>{cloud ? 'Vercel + Neon' : 'data/lvluplife.sqlite'}</code></section>
    </>
  )
}

const suggestedContexts = ['在家', '户外', '电脑', '通勤', '跑腿', '社交', '安静环境']

function CustomQuestModal({ challenge, currentLevel, onClose, onSave }: { challenge: Challenge | null; currentLevel: number; onClose: () => void; onSave: (challenge: Challenge) => void }) {
  const { text } = useLanguage()
  const [titleValue, setTitleValue] = useState(challenge?.title ?? '')
  const [description, setDescription] = useState(challenge?.description ?? '')
  const [categoryValue, setCategoryValue] = useState(challenge?.category ?? '学习与成长')
  const [levelValue, setLevelValue] = useState(challenge?.level ?? Math.min(30, currentLevel))
  const [tierValue, setTierValue] = useState(challenge?.tier ?? 1)
  const [xp, setXp] = useState(challenge?.xp ?? 70)
  const [statKey, setStatKey] = useState<StatKey>(challenge?.stats[0]?.key ?? 'INT')
  const [statPoints, setStatPoints] = useState(challenge?.stats[0]?.points ?? 2)
  const [cadence, setCadence] = useState(challenge?.cadence ?? '终身一次')
  const [completionPrompt, setCompletionPrompt] = useState(challenge?.completionPrompt ?? '')
  const [estimatedMinutes, setEstimatedMinutes] = useState(challenge?.estimatedMinutes ?? 30)
  const [energyDemand, setEnergyDemand] = useState<DailyEnergy>(challenge?.energyDemand ?? 'normal')
  const [contexts, setContexts] = useState<string[]>(challenge?.contexts ?? [])
  const [error, setError] = useState('')

  function toggleContext(value: string) {
    setContexts((current) => current.includes(value) ? current.filter((item) => item !== value) : current.length < 8 ? [...current, value] : current)
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const cleanTitle = titleValue.trim()
    if (!cleanTitle) return setError(text('请填写任务名称。', 'Enter a quest title.'))
    const cleanLevel = Math.min(30, Math.max(1, Math.round(levelValue)))
    const cleanPoints = Math.min(cleanLevel * 3, Math.max(1, Math.round(statPoints)))
    const tierNames = ['', '轻松一胜', '支线任务', '进阶挑战', '史诗任务']
    const meta = categoryMeta[categoryValue]
    onSave({
      id: challenge?.id ?? `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: cleanTitle.slice(0, 120),
      titleOriginal: cleanTitle.slice(0, 120),
      category: categoryValue,
      categoryOriginal: meta.labelEn,
      level: cleanLevel,
      tier: Math.min(4, Math.max(1, Math.round(tierValue))),
      tierName: tierNames[Math.min(4, Math.max(1, Math.round(tierValue)))],
      xp: Math.min(1500, Math.max(25, Math.round(xp))),
      cadence,
      stats: [{ key: statKey, points: cleanPoints }],
      source: 'custom',
      custom: true,
      description: description.trim().slice(0, 600),
      completionPrompt: completionPrompt.trim().slice(0, 180),
      estimatedMinutes: Math.min(1440, Math.max(5, Math.round(estimatedMinutes))),
      energyDemand,
      contexts,
    })
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <form className="custom-quest-modal" role="dialog" aria-modal="true" aria-labelledby="custom-quest-title" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <button type="button" className="modal-close" onClick={onClose} aria-label={text('关闭', 'Close')}><X /></button>
        <p className="eyebrow">{challenge ? text('编辑个人任务', 'Edit personal quest') : text('创建个人任务', 'Create personal quest')}</p>
        <h2 id="custom-quest-title">{challenge ? titleValue || text('未命名任务', 'Untitled quest') : text('把现实目标写成任务', 'Turn a real goal into a quest')}</h2>
        <div className="custom-form-grid">
          <label className="field-wide"><span>{text('任务名称', 'Quest title')}</span><input autoFocus value={titleValue} maxLength={120} onChange={(event) => setTitleValue(event.target.value)} placeholder={text('例如：整理本周的学习笔记', 'e.g. Organize this week’s study notes')} /></label>
          <label className="field-wide"><span>{text('任务说明', 'Description')}</span><textarea value={description} maxLength={600} onChange={(event) => setDescription(event.target.value)} placeholder={text('为什么要做、做到什么程度……', 'Why it matters and what done looks like…')} /></label>
          <label><span>{text('分类', 'Category')}</span><select value={categoryValue} onChange={(event) => setCategoryValue(event.target.value)}>{Object.keys(categoryMeta).map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>{text('重复周期', 'Cadence')}</span><select value={cadence} onChange={(event) => setCadence(event.target.value)}>{Object.keys(cadenceDays).map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>{text('建议等级', 'Level')}</span><input type="number" min="1" max="30" value={levelValue} onChange={(event) => setLevelValue(Number(event.target.value))} /></label>
          <label><span>{text('任务稀有度', 'Tier')}</span><select value={tierValue} onChange={(event) => setTierValue(Number(event.target.value))}><option value="1">1 · 轻松一胜</option><option value="2">2 · 支线任务</option><option value="3">3 · 进阶挑战</option><option value="4">4 · 史诗任务</option></select></label>
          <label><span>{text('经验奖励', 'XP reward')}</span><input type="number" min="25" max="1500" step="5" value={xp} onChange={(event) => setXp(Number(event.target.value))} /></label>
          <label><span>{text('主要属性', 'Primary stat')}</span><select value={statKey} onChange={(event) => setStatKey(event.target.value as StatKey)}>{(Object.keys(statLabels) as StatKey[]).map((key) => <option key={key} value={key}>{statLabels[key]}</option>)}</select></label>
          <label><span>{text('属性点', 'Stat points')}</span><input type="number" min="1" max={Math.max(3, levelValue * 3)} value={statPoints} onChange={(event) => setStatPoints(Number(event.target.value))} /><small>{text(`当前等级最多 ${Math.max(3, levelValue * 3)} 点`, `Up to ${Math.max(3, levelValue * 3)} at this level`)}</small></label>
          <label><span>{text('预计时长（分钟）', 'Estimated minutes')}</span><input type="number" min="5" max="1440" step="5" value={estimatedMinutes} onChange={(event) => setEstimatedMinutes(Number(event.target.value))} /></label>
          <fieldset className="field-wide"><legend>{text('所需精力', 'Energy demand')}</legend><div className="form-segmented">{(['low', 'normal', 'high'] as DailyEnergy[]).map((value) => <button type="button" key={value} className={energyDemand === value ? 'active' : ''} onClick={() => setEnergyDemand(value)}>{text(value === 'low' ? '低精力' : value === 'high' ? '高精力' : '普通', value)}</button>)}</div></fieldset>
          <fieldset className="field-wide"><legend>{text('适用情境', 'Contexts')}</legend><div className="context-picker">{suggestedContexts.map((item) => <button type="button" key={item} className={contexts.includes(item) ? 'active' : ''} onClick={() => toggleContext(item)}>{item}</button>)}</div></fieldset>
          <label className="field-wide"><span>{text('完成记录提示', 'Completion prompt')}</span><input value={completionPrompt} maxLength={180} onChange={(event) => setCompletionPrompt(event.target.value)} placeholder={text('例如：上传结果照片，或写下三点复盘', 'e.g. Upload a photo or write three reflections')} /></label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="custom-modal-actions"><button type="button" className="detail-secondary" onClick={onClose}>{text('取消', 'Cancel')}</button><button className="primary-button" type="submit"><Check size={16} /> {challenge ? text('保存修改', 'Save changes') : text('创建任务', 'Create quest')}</button></div>
      </form>
    </div>
  )
}

function CompletionModal({ challenge, energy, note, onClose, onNote, onSubmit }: { challenge: Challenge; energy: number; note: string; onClose: () => void; onNote: (value: string) => void; onSubmit: (attachments: Attachment[]) => void }) {
  const { language, text, title } = useLanguage()
  const accessKey = useAccessKey()
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [fileError, setFileError] = useState('')
  const meta = categoryMeta[challenge.category] ?? categoryMeta['学习与成长']
  const Icon = meta.icon

  function selectFiles(selected: FileList | null) {
    const next = Array.from(selected ?? []).slice(0, 3)
    if (next.some((file) => file.size > 10 * 1024 * 1024)) return setFileError(text('单个附件不能超过 10MB。', 'Each attachment must be 10MB or smaller.'))
    if (next.some((file) => !attachmentTypes.has(getAttachmentContentType(file)))) return setFileError(text('存在不支持的文件类型。', 'One or more file types are not supported.'))
    setFileError('')
    setFiles(next)
  }

  async function submitCompletion() {
    if (energy <= 0 || uploading) return
    setFileError('')
    if (files.length === 0) {
      onSubmit([])
      return
    }
    setUploading(true)
    const attachments: Attachment[] = []
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        const safeName = file.name.replace(/[^\p{L}\p{N}._-]+/gu, '-').slice(-120)
        const blob = await upload(`completions/${challenge.id}/${Date.now()}-${index}-${safeName}`, file, {
          access: 'private',
          handleUploadUrl: '/api/blob-upload',
          headers: { Authorization: `Bearer ${accessKey}` },
          clientPayload: JSON.stringify({ challengeId: challenge.id }),
          contentType: getAttachmentContentType(file),
          onUploadProgress: ({ percentage }) => setUploadProgress(Math.round(((index + percentage / 100) / files.length) * 100)),
        })
        attachments.push({ pathname: blob.pathname, name: file.name, contentType: getAttachmentContentType(file), size: file.size })
      }
      onSubmit(attachments)
    } catch (error) {
      console.error(error)
      if (attachments.length) {
        void fetch('/api/attachments-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessKey}` },
          body: JSON.stringify({ pathnames: attachments.map((item) => item.pathname) }),
        })
      }
      setFileError(text('附件上传失败，请重试。', 'Attachment upload failed. Please try again.'))
      setUploading(false)
      setUploadProgress(0)
    }
  }
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="completion-modal" role="dialog" aria-modal="true" aria-labelledby="completion-title">
        <button className="modal-close" disabled={uploading} onClick={onClose} aria-label={text('关闭', 'Close')}><X /></button>
        <div className="completion-badge" style={{ color: meta.color }}><Icon size={30} /></div>
        <p className="eyebrow">{text('完成任务', 'Complete quest')}</p>
        <h2 id="completion-title">{title(challenge)}</h2>
        <p className="completion-prompt">{challenge.completionPrompt || text('记录下这次现实中的胜利，给未来的自己留一份证据。', 'Record this real-life victory as proof for your future self.')}</p>
        <label><span>{text('记录现实中的细节', 'Record the real-life details')} <small>{text('选填', 'optional')}</small></span><textarea autoFocus value={note} onChange={(event) => onNote(event.target.value)} placeholder={challenge.completionPrompt || text('发生了什么？为什么这件事对你有意义？', 'What happened, and why did it matter?')} maxLength={280} /><small>{note.length}/280</small></label>
        <div className="attachment-field">
          <div><span>{text('图片或附件', 'Photos or attachments')} <small>{text('选填，最多 3 个', 'optional, up to 3')}</small></span><em>{text('支持图片、PDF、Office、文本和 ZIP，单个不超过 10MB。', 'Images, PDF, Office, text, and ZIP up to 10MB each.')}</em></div>
          <label className="attachment-picker"><UploadCloud size={18} /><span>{text('选择文件', 'Choose files')}</span><input type="file" multiple accept="image/*,.pdf,.txt,.md,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip" onChange={(event) => selectFiles(event.target.files)} /></label>
          {files.length > 0 && <div className="selected-files">{files.map((file) => <div key={`${file.name}-${file.size}`}><FileText size={14} /><span>{file.name}</span><small>{formatFileSize(file.size)}</small></div>)}</div>}
          {uploading && <div className="upload-progress"><i style={{ width: `${uploadProgress}%` }} /><span>{text(`正在上传 ${uploadProgress}%`, `Uploading ${uploadProgress}%`)}</span></div>}
          {fileError && <small className="attachment-error">{fileError}</small>}
        </div>
        <div className="modal-reward"><div><Zap size={18} /> <strong>+{challenge.xp} {text('经验', 'XP')}</strong></div>{challenge.stats.map((stat) => <span key={stat.key}>{language === 'zh' ? statLabels[stat.key] : statLabelsEn[stat.key]} +{stat.points}</span>)}</div>
        <button className="primary-button claim-button" disabled={energy <= 0 || uploading} onClick={submitCompletion}><Check size={18} /> {uploading ? text('正在上传附件…', 'Uploading attachments…') : energy > 0 ? text('确认完成', 'Confirm completion') : text('行动力不足', 'Not enough energy')}</button>
        <p className="honor-note"><ShieldCheck size={14} /> {text('荣誉规则：只有现实中真正完成，才能领取奖励。', 'Honor rule: only claim rewards for things you truly completed.')}</p>
      </section>
    </div>
  )
}

function EmptyState({ action, compact, icon: Icon, onAction, text, title }: { action?: string; compact?: boolean; icon: LucideIcon; onAction?: () => void; text: string; title: string }) {
  return <div className={`empty-state ${compact ? 'empty-state--compact' : ''}`}><div><Icon /></div><h3>{title}</h3><p>{text}</p>{action && <button className="secondary-button" onClick={onAction}>{action} <ArrowRight size={16} /></button>}</div>
}

export default App
