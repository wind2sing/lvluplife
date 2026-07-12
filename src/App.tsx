import { useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Camera,
  Check,
  ChevronDown,
  Compass,
  Dumbbell,
  Flame,
  Footprints,
  Globe2,
  GraduationCap,
  Hammer,
  Heart,
  House,
  Leaf,
  LibraryBig,
  LockKeyhole,
  Medal,
  Menu,
  MessageCircle,
  Music2,
  Palette,
  Plus,
  ScrollText,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  UserRound,
  Utensils,
  X,
  Zap,
} from 'lucide-react'
import challengeData from './data/challenges.json'
import './App.css'

type StatKey = 'STR' | 'CUL' | 'ENV' | 'CHA' | 'TAL' | 'INT'
type View = 'home' | 'explore' | 'goals' | 'chronicle'

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
}

type Completion = {
  id: string
  challengeId: string
  note: string
  completedAt: string
}

type SaveState = {
  activeIds: string[]
  favoriteIds: string[]
  completions: Completion[]
}

const challenges = challengeData as Challenge[]
const STORAGE_KEY = 'lvluplife-save-v1'
const emptySave: SaveState = { activeIds: [], favoriteIds: [], completions: [] }

const categoryMeta: Record<string, { icon: LucideIcon; color: string; short: string }> = {
  艺术与创意: { icon: Palette, color: '#f38bba', short: '艺术' },
  音乐: { icon: Music2, color: '#a997ff', short: '音乐' },
  摄影: { icon: Camera, color: '#72d6d0', short: '摄影' },
  写作: { icon: ScrollText, color: '#e4a66d', short: '写作' },
  事业与财务: { icon: BriefcaseBusiness, color: '#f2c561', short: '事业' },
  健身与健康: { icon: Dumbbell, color: '#ff837a', short: '健康' },
  运动: { icon: Medal, color: '#ff9f59', short: '运动' },
  美食与烹饪: { icon: Utensils, color: '#f0bd63', short: '烹饪' },
  家务与手作: { icon: Hammer, color: '#99c879', short: '家务' },
  善意与公益: { icon: Heart, color: '#ff7993', short: '公益' },
  心智与情绪: { icon: Sparkles, color: '#c49aff', short: '心智' },
  户外: { icon: Leaf, color: '#68cf88', short: '户外' },
  阅读: { icon: BookOpen, color: '#75b7ff', short: '阅读' },
  经典书单: { icon: LibraryBig, color: '#6fa5e8', short: '书单' },
  学习与成长: { icon: GraduationCap, color: '#83b5ff', short: '学习' },
  社交: { icon: MessageCircle, color: '#ed8ecb', short: '社交' },
  旅行: { icon: Compass, color: '#57c7b1', short: '旅行' },
  一生必去: { icon: Globe2, color: '#4eb7d7', short: '远方' },
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

function getCooldownLabel(challenge: Challenge, completions: Completion[]) {
  const latest = completions.find((item) => item.challengeId === challenge.id)
  if (!latest) return ''
  const days = cadenceDays[challenge.cadence]
  if (!days) return ''
  if (!Number.isFinite(days)) return '已完成终身成就'
  const readyAt = new Date(latest.completedAt).getTime() + days * 86400000
  const remaining = readyAt - Date.now()
  if (remaining <= 0) return ''
  const hours = Math.ceil(remaining / 3600000)
  return hours < 24 ? `${hours} 小时后可再次完成` : `${Math.ceil(hours / 24)} 天后可再次完成`
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

function App() {
  const [save, setSave] = useState<SaveState>(loadSave)
  const [view, setView] = useState<View>('home')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('全部任务')
  const [selected, setSelected] = useState<Challenge | null>(null)
  const [note, setNote] = useState('')
  const [reward, setReward] = useState<{ challenge: Challenge; levelUp: boolean; unlockedCount: number } | null>(null)
  const [mobileNav, setMobileNav] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save))
  }, [save])

  const challengeMap = useMemo(() => new Map(challenges.map((item) => [item.id, item])), [])
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

  const unlockedChallenges = challenges.filter((item) => item.level <= level.level)
  const availableChallenges = unlockedChallenges.filter((item) => !getCooldownLabel(item, save.completions))
  const dailyPool = availableChallenges.length ? availableChallenges : unlockedChallenges
  const dayIndex = Math.floor(Date.now() / 86400000) % dailyPool.length
  const featuredQuests = [dailyPool[dayIndex], dailyPool[(dayIndex + 17) % dailyPool.length], dailyPool[(dayIndex + 41) % dailyPool.length]].filter(
    (item, index, items) => item && items.findIndex((candidate) => candidate.id === item.id) === index,
  )

  const visibleChallenges = useMemo(() => {
    const query = search.trim().toLowerCase()
    const categoryPool = challenges.filter((item) => category === '全部任务' || item.category === category)
    if (query) {
      return categoryPool.filter(
        (item) => item.level <= level.level && (item.title.toLowerCase().includes(query) || item.category.toLowerCase().includes(query)),
      )
    }
    const unlocked = categoryPool.filter((item) => item.level <= level.level)
    if (category === '全部任务') return unlocked
    const nextLocked = categoryPool.filter((item) => item.level > level.level).sort((a, b) => a.level - b.level).slice(0, 5)
    return [...unlocked, ...nextLocked]
  }, [category, level.level, search])

  const selectedCategoryPool = challenges.filter((item) => category === '全部任务' || item.category === category)
  const selectedLockedCount = selectedCategoryPool.filter((item) => item.level > level.level).length
  const hiddenLockedCount = category === '全部任务' ? selectedLockedCount : Math.max(0, selectedLockedCount - 5)

  const activeChallenges = save.activeIds.map((id) => challengeMap.get(id)).filter(Boolean) as Challenge[]
  const favoriteChallenges = save.favoriteIds.map((id) => challengeMap.get(id)).filter(Boolean) as Challenge[]

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

  function completeQuest() {
    if (!selected) return
    if (energy <= 0 || selected.level > level.level || getCooldownLabel(selected, save.completions)) return
    const oldLevel = level.level
    const completion: Completion = {
      id: `${selected.id}-${Date.now()}`,
      challengeId: selected.id,
      note: note.trim(),
      completedAt: new Date().toISOString(),
    }
    const newLevel = getLevel(totalXp + selected.xp).level
    setSave((current) => ({
      ...current,
      activeIds: current.activeIds.filter((id) => id !== selected.id),
      completions: [completion, ...current.completions],
    }))
    const unlockedCount = newLevel > oldLevel ? challenges.filter((item) => item.level > oldLevel && item.level <= newLevel).length : 0
    setReward({ challenge: selected, levelUp: newLevel > oldLevel, unlockedCount })
    setSelected(null)
    setNote('')
    window.setTimeout(() => setReward(null), 4600)
  }

  function navigate(next: View) {
    setView(next)
    setMobileNav(false)
    window.scrollTo({ top: 0 })
  }

  const mainContent = (() => {
    if (view === 'explore') {
      return (
        <ExploreView
          activeIds={save.activeIds}
          category={category}
          completions={save.completions}
          favoriteIds={save.favoriteIds}
          hiddenLockedCount={hiddenLockedCount}
          level={level.level}
          onCategory={setCategory}
          onComplete={setSelected}
          onFavorite={toggleFavorite}
          onStart={toggleActive}
          search={search}
          setSearch={setSearch}
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
          onStart={toggleActive}
          onExplore={() => navigate('explore')}
        />
      )
    }

    if (view === 'chronicle') {
      return <ChronicleView items={completedChallenges} />
    }

    return (
      <HomeView
        activeIds={save.activeIds}
        completed={completedChallenges}
        completions={save.completions}
        favoriteIds={save.favoriteIds}
        featured={featuredQuests}
        level={level.level}
        onComplete={setSelected}
        onFavorite={toggleFavorite}
        onNavigate={navigate}
        onStart={toggleActive}
        stats={stats}
        unlockedCount={unlockedChallenges.length}
      />
    )
  })()

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar--open' : ''}`}>
        <div className="brand" onClick={() => navigate('home')} role="button" tabIndex={0}>
          <span className="brand-mark"><Zap size={19} fill="currentColor" /></span>
          <span>升级<i>人生</i></span>
        </div>
        <nav className="main-nav" aria-label="主导航">
          <NavButton active={view === 'home'} icon={House} label="营地" onClick={() => navigate('home')} />
          <NavButton active={view === 'explore'} icon={Compass} label="任务公会" onClick={() => navigate('explore')} />
          <NavButton active={view === 'goals'} icon={Target} label="我的任务" onClick={() => navigate('goals')} badge={save.activeIds.length} />
          <NavButton active={view === 'chronicle'} icon={ScrollText} label="冒险日志" onClick={() => navigate('chronicle')} />
        </nav>
        <div className="sidebar-spacer" />
        <div className="mini-profile">
          <div className="avatar"><UserRound size={22} /></div>
          <div><strong>独行冒险者</strong><span>等级 {level.level}</span></div>
        </div>
        <p className="local-note"><ShieldCheck size={14} /> 进度仅保存在本机</p>
      </aside>

      {mobileNav && <button className="nav-scrim" aria-label="关闭菜单" onClick={() => setMobileNav(false)} />}

      <main>
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="打开菜单"><Menu /></button>
          <div className="topbar-level">
            <span>等级 {level.level}</span>
            <div className="xp-track"><i style={{ width: `${level.percent}%` }} /></div>
            <small>{level.carriedXp} / {level.needed} 经验</small>
          </div>
          <div className="top-stats">
            <span className="energy-hearts" title="每小时恢复 1 点行动力">{Array.from({ length: maxEnergy }, (_, index) => <Heart key={index} size={16} fill={index < energy ? 'currentColor' : 'none'} />)} <strong>{energy}/{maxEnergy}</strong></span>
            <span><Flame size={17} /> 连续 <strong>{streak}</strong> 天</span>
            <span><Trophy size={17} /> 完成 <strong>{save.completions.length}</strong> 次</span>
          </div>
        </header>
        <div className="page-content">{mainContent}</div>
      </main>

      {selected && (
        <CompletionModal challenge={selected} energy={energy} note={note} onClose={() => setSelected(null)} onNote={setNote} onSubmit={completeQuest} />
      )}

      {reward && (
        <div className="reward-toast" role="status">
          <div className="reward-icon"><Sparkles /></div>
          <div>
            <span>{reward.levelUp ? '等级提升！' : '任务完成'}</span>
            <strong>获得 {reward.challenge.xp} 经验{reward.levelUp ? ` · 解锁 ${reward.unlockedCount} 项新成就` : ''}</strong>
          </div>
        </div>
      )}
    </div>
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
  onStart: (id: string) => void
}

function HomeView({ activeIds, completed, completions, favoriteIds, featured, level, onComplete, onFavorite, onNavigate, onStart, stats, unlockedCount }: QuestActions & {
  completed: { completion: Completion; challenge: Challenge }[]
  featured: Challenge[]
  level: number
  onNavigate: (view: View) => void
  stats: Record<StatKey, number>
  unlockedCount: number
}) {
  const topStat = (Object.entries(stats) as [StatKey, number][]).sort((a, b) => b[1] - a[1])[0]
  return (
    <>
      <section className="hero-panel">
        <div>
          <p className="eyebrow"><span /> 下一步行动</p>
          <h1>让今天<br /><em>算数。</em></h1>
          <p className="hero-copy">完成一件真实的小事，把现实生活变成看得见的角色成长。</p>
          <button className="primary-button" onClick={() => onNavigate('explore')}>领取任务 <ArrowRight size={18} /></button>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="pixel-sword"><span>✦</span></div>
          <span className="float-rune rune-one">+经验</span><span className="float-rune rune-two">升级</span>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">今日委托</p><h2>选择你的冒险</h2></div><button className="text-button" onClick={() => onNavigate('explore')}>查看已解锁的 {unlockedCount} 项 <ArrowRight size={16} /></button></div>
        <div className="quest-grid">
          {featured.map((challenge, index) => <QuestCard key={challenge.id} challenge={challenge} completions={completions} featured={index === 0} active={activeIds.includes(challenge.id)} favorite={favoriteIds.includes(challenge.id)} onComplete={onComplete} onFavorite={onFavorite} onStart={onStart} />)}
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="section-block stat-panel">
          <div className="section-heading"><div><p className="eyebrow">角色面板</p><h2>你的现实属性</h2></div><span className="level-chip">等级 {level}</span></div>
          <div className="stat-list">
            {(Object.entries(stats) as [StatKey, number][]).map(([key, value]) => (
              <div className="stat-row" key={key}><span>{statLabels[key].slice(0, 1)}</span><div><strong>{statLabels[key]}</strong><i><b style={{ width: `${Math.min(100, topStat[1] ? (value / topStat[1]) * 100 : 0)}%` }} /></i></div><em>{value}</em></div>
            ))}
          </div>
        </section>

        <section className="section-block recent-panel">
          <div className="section-heading"><div><p className="eyebrow">最近战绩</p><h2>你的冒险日志</h2></div><button className="icon-button" aria-label="查看冒险日志" onClick={() => onNavigate('chronicle')}><ArrowRight size={18} /></button></div>
          {completed.length ? completed.slice(0, 3).map((item) => <ActivityItem key={item.completion.id} {...item} />) : <EmptyState compact icon={Footprints} title="故事要从现实开始" text="完成一个任务，你的第一条战绩就会出现在这里。" />}
        </section>
      </div>
    </>
  )
}

function ExploreView({ activeIds, category, completions, favoriteIds, hiddenLockedCount, level, onCategory, onComplete, onFavorite, onStart, search, setSearch, visibleChallenges }: QuestActions & {
  category: string
  hiddenLockedCount: number
  level: number
  onCategory: (value: string) => void
  search: string
  setSearch: (value: string) => void
  visibleChallenges: Challenge[]
}) {
  const categories = ['全部任务', ...Object.keys(categoryMeta)]
  const unlockedTotal = challenges.filter((item) => item.level <= level).length
  const nextLevel = Math.min(...challenges.filter((item) => item.level > level).map((item) => item.level))
  return (
    <>
      <div className="page-heading"><p className="eyebrow">任务公会</p><h1>寻找下一场<em>胜利。</em></h1><p>完整收录 538 项原版挑战。提升等级，逐步发现更困难、更稀有的现实成就。</p></div>
      <div className="unlock-banner"><div className="unlock-emblem"><LockKeyhole size={22} /></div><div><span>冒险者等级 {level}</span><strong>已发现 {unlockedTotal} / 538 项成就</strong></div><div className="unlock-progress"><i style={{ width: `${(unlockedTotal / challenges.length) * 100}%` }} /></div><small>下一批成就将在等级 {Number.isFinite(nextLevel) ? nextLevel : '—'} 解锁</small></div>
      <div className="filter-bar">
        <label className="search-field"><Search size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索已解锁的任务……" /></label>
        <label className="select-field"><select value={category} onChange={(event) => onCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={17} /></label>
      </div>
      <div className="category-strip">
        {categories.slice(0, 9).map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => onCategory(item)}>{item === '全部任务' ? <Sparkles size={17} /> : (() => { const Icon = categoryMeta[item].icon; return <Icon size={17} /> })()}<span>{item === '全部任务' ? item : categoryMeta[item].short}</span></button>)}
      </div>
      <div className="result-meta"><strong>{visibleChallenges.filter((item) => item.level <= level).length}</strong> 项可领取任务 <span>•</span> {category}</div>
      <div className="quest-list">
        {visibleChallenges.slice(0, 80).map((challenge) => challenge.level > level
          ? <LockedQuestRow key={challenge.id} level={challenge.level} />
          : <QuestRow key={challenge.id} challenge={challenge} completions={completions} active={activeIds.includes(challenge.id)} favorite={favoriteIds.includes(challenge.id)} onComplete={onComplete} onFavorite={onFavorite} onStart={onStart} />)}
      </div>
      {hiddenLockedCount > 0 && !search && <div className="hidden-quests"><LockKeyhole size={17} /><strong>还有 {hiddenLockedCount} 项成就隐藏在迷雾中</strong><span>继续获得经验并提升等级后，它们才会显露名称。</span></div>}
      {visibleChallenges.length > 80 && <p className="result-note">当前显示前 80 项结果，请使用搜索或分类继续缩小范围。</p>}
    </>
  )
}

function CollectionView({ active, activeIds, completions, favoriteIds, favorites, onComplete, onExplore, onFavorite, onStart }: QuestActions & { active: Challenge[]; favorites: Challenge[]; onExplore: () => void }) {
  return (
    <>
      <div className="page-heading"><p className="eyebrow">我的任务</p><h1>正在进行的<em>冒险。</em></h1><p>把真正想做的事留在眼前，等你在现实中完成它。</p></div>
      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">进行中</p><h2>当前任务 <span className="count-pill">{active.length}</span></h2></div></div>
        {active.length ? <div className="quest-list">{active.map((challenge) => <QuestRow key={challenge.id} challenge={challenge} completions={completions} active favorite={favoriteIds.includes(challenge.id)} onComplete={onComplete} onFavorite={onFavorite} onStart={onStart} />)}</div> : <EmptyState icon={Target} title="还没有进行中的任务" text="选一件足够小、但确实对你有意义的事。" action="前往任务公会" onAction={onExplore} />}
      </section>
      <section className="section-block collection-gap">
        <div className="section-heading"><div><p className="eyebrow">任务书签</p><h2>以后再做 <span className="count-pill">{favorites.length}</span></h2></div></div>
        {favorites.length ? <div className="quest-list">{favorites.map((challenge) => <QuestRow key={challenge.id} challenge={challenge} completions={completions} active={activeIds.includes(challenge.id)} favorite onComplete={onComplete} onFavorite={onFavorite} onStart={onStart} />)}</div> : <EmptyState compact icon={Star} title="书签还是空的" text="点击任务上的星标，就能把它留在这里。" />}
      </section>
    </>
  )
}

function ChronicleView({ items }: { items: { completion: Completion; challenge: Challenge }[] }) {
  return (
    <>
      <div className="page-heading"><p className="eyebrow">冒险日志</p><h1>你认真生活过的<em>证据。</em></h1><p>只属于你的真实行动、诚实记录与成长轨迹。</p></div>
      <section className="timeline-panel">
        {items.length ? items.map((item) => <ActivityItem key={item.completion.id} {...item} large />) : <EmptyState icon={ScrollText} title="冒险日志还是空白" text="完成一个任务，写下属于你的第一行记录。" />}
      </section>
    </>
  )
}

function QuestCard({ active, challenge, completions, favorite, featured, onComplete, onFavorite, onStart }: { active: boolean; challenge: Challenge; completions: Completion[]; favorite: boolean; featured?: boolean; onComplete: (challenge: Challenge) => void; onFavorite: (id: string) => void; onStart: (id: string) => void }) {
  const meta = categoryMeta[challenge.category]
  const Icon = meta.icon
  const cooldown = getCooldownLabel(challenge, completions)
  return (
    <article className={`quest-card ${featured ? 'featured' : ''}`} style={{ '--category-color': meta.color } as React.CSSProperties}>
      <div className="quest-card-top"><div className="category-icon"><Icon size={22} /></div><button className={`star-button ${favorite ? 'active' : ''}`} onClick={() => onFavorite(challenge.id)} aria-label="收藏任务"><Star size={18} fill={favorite ? 'currentColor' : 'none'} /></button></div>
      <span className="quest-kind">{featured ? '今日主线' : meta.short}</span>
      <h3>{challenge.title}</h3>
      <div className="quest-rewards"><span><Zap size={14} /> {challenge.xp} 经验</span>{challenge.stats.map((stat) => <span key={stat.key}>{statLabels[stat.key]} +{stat.points}</span>)}</div>
      <div className="quest-card-footer"><span>{cooldown || `${challenge.tierName} · 等级 ${challenge.level}`}</span>{cooldown ? <button className="cooldown-button" disabled><LockKeyhole size={14} /> 冷却中</button> : active ? <button className="complete-button" onClick={() => onComplete(challenge)}><Check size={16} /> 完成</button> : <button className="add-button" onClick={() => onStart(challenge.id)}><Plus size={17} /> 接取</button>}</div>
    </article>
  )
}

function QuestRow({ active, challenge, completions, favorite, onComplete, onFavorite, onStart }: { active: boolean; challenge: Challenge; completions: Completion[]; favorite: boolean; onComplete: (challenge: Challenge) => void; onFavorite: (id: string) => void; onStart: (id: string) => void }) {
  const meta = categoryMeta[challenge.category]
  const Icon = meta.icon
  const cooldown = getCooldownLabel(challenge, completions)
  return (
    <article className={`quest-row ${active ? 'quest-row--active' : ''}`} style={{ '--category-color': meta.color } as React.CSSProperties}>
      <div className="category-icon"><Icon size={21} /></div>
      <div className="quest-row-copy"><span>{challenge.category} · {challenge.tierName}</span><h3>{challenge.title}</h3><div className="quest-rewards"><span><Zap size={13} /> {challenge.xp} 经验</span>{challenge.stats.map((stat) => <span key={stat.key}>{statLabels[stat.key]} +{stat.points}</span>)}<em>等级 {challenge.level}</em>{cooldown && <em className="cooldown-label">{cooldown}</em>}</div></div>
      <button className={`star-button ${favorite ? 'active' : ''}`} onClick={() => onFavorite(challenge.id)} aria-label="收藏任务"><Star size={18} fill={favorite ? 'currentColor' : 'none'} /></button>
      {cooldown ? <button className="cooldown-button" disabled><LockKeyhole size={15} /> 冷却中</button> : active ? <button className="complete-button" onClick={() => onComplete(challenge)}><Check size={16} /> 完成</button> : <button className="row-add-button" onClick={() => onStart(challenge.id)}><Plus size={18} /><span>接取任务</span></button>}
    </article>
  )
}

function LockedQuestRow({ level }: { level: number }) {
  return (
    <article className="quest-row quest-row--locked">
      <div className="category-icon"><LockKeyhole size={20} /></div>
      <div className="quest-row-copy"><span>未知成就 · 尚未发现</span><h3>被迷雾遮蔽的任务</h3><div className="quest-rewards"><em>达到等级 {level} 后显露名称与奖励</em></div></div>
      <div className="lock-runes" aria-hidden="true">???</div>
      <button className="cooldown-button" disabled><LockKeyhole size={15} /> 未解锁</button>
    </article>
  )
}

function ActivityItem({ challenge, completion, large }: { challenge: Challenge; completion: Completion; large?: boolean }) {
  const meta = categoryMeta[challenge.category]
  const Icon = meta.icon
  const date = new Date(completion.completedAt)
  return (
    <article className={`activity-item ${large ? 'activity-item--large' : ''}`}>
      <div className="activity-icon" style={{ color: meta.color }}><Icon size={20} /></div>
      <div className="activity-copy"><span>{date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', year: large ? 'numeric' : undefined })}</span><h3>{challenge.title}</h3>{completion.note && <p>“{completion.note}”</p>}<div className="quest-rewards"><span><Zap size={13} /> +{challenge.xp} 经验</span>{challenge.stats.map((stat) => <span key={stat.key}>{statLabels[stat.key]} +{stat.points}</span>)}</div></div>
      <Check className="activity-check" size={18} />
    </article>
  )
}

function CompletionModal({ challenge, energy, note, onClose, onNote, onSubmit }: { challenge: Challenge; energy: number; note: string; onClose: () => void; onNote: (value: string) => void; onSubmit: () => void }) {
  const meta = categoryMeta[challenge.category]
  const Icon = meta.icon
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="completion-modal" role="dialog" aria-modal="true" aria-labelledby="completion-title">
        <button className="modal-close" onClick={onClose} aria-label="关闭"><X /></button>
        <div className="completion-badge" style={{ color: meta.color }}><Icon size={30} /></div>
        <p className="eyebrow">领取真实奖励</p>
        <h2 id="completion-title">你真的做到了吗？</h2>
        <h3>{challenge.title}</h3>
        <label><span>记录现实中的细节 <small>选填</small></span><textarea autoFocus value={note} onChange={(event) => onNote(event.target.value)} placeholder="发生了什么？为什么这件事对你有意义？" maxLength={280} /><small>{note.length}/280</small></label>
        <div className="modal-reward"><div><Zap size={18} /> <strong>+{challenge.xp} 经验</strong></div>{challenge.stats.map((stat) => <span key={stat.key}>{statLabels[stat.key]} +{stat.points}</span>)}</div>
        <button className="primary-button claim-button" disabled={energy <= 0} onClick={onSubmit}><Check size={18} /> {energy > 0 ? '确认完成' : '行动力不足'}</button>
        <p className="honor-note"><ShieldCheck size={14} /> 荣誉规则：只有现实中真正完成，才能领取奖励。</p>
      </section>
    </div>
  )
}

function EmptyState({ action, compact, icon: Icon, onAction, text, title }: { action?: string; compact?: boolean; icon: LucideIcon; onAction?: () => void; text: string; title: string }) {
  return <div className={`empty-state ${compact ? 'empty-state--compact' : ''}`}><div><Icon /></div><h3>{title}</h3><p>{text}</p>{action && <button className="secondary-button" onClick={onAction}>{action} <ArrowRight size={16} /></button>}</div>
}

export default App
