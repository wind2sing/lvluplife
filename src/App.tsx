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
  category: string
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
  'Arts & Creativity': { icon: Palette, color: '#f38bba', short: 'Arts' },
  Music: { icon: Music2, color: '#a997ff', short: 'Music' },
  Photography: { icon: Camera, color: '#72d6d0', short: 'Photo' },
  Writing: { icon: ScrollText, color: '#e4a66d', short: 'Writing' },
  'Career & Finances': { icon: BriefcaseBusiness, color: '#f2c561', short: 'Career' },
  'Fitness & Health': { icon: Dumbbell, color: '#ff837a', short: 'Fitness' },
  Sports: { icon: Medal, color: '#ff9f59', short: 'Sports' },
  'Food & Cooking': { icon: Utensils, color: '#f0bd63', short: 'Food' },
  'Household & DIY': { icon: Hammer, color: '#99c879', short: 'DIY' },
  Humanity: { icon: Heart, color: '#ff7993', short: 'Humanity' },
  Mental: { icon: Sparkles, color: '#c49aff', short: 'Mental' },
  Outdoors: { icon: Leaf, color: '#68cf88', short: 'Outdoors' },
  Reading: { icon: BookOpen, color: '#75b7ff', short: 'Reading' },
  'Top 150': { icon: LibraryBig, color: '#6fa5e8', short: 'Top books' },
  'School & Learning': { icon: GraduationCap, color: '#83b5ff', short: 'Learning' },
  Social: { icon: MessageCircle, color: '#ed8ecb', short: 'Social' },
  Travel: { icon: Compass, color: '#57c7b1', short: 'Travel' },
  Destinations: { icon: Globe2, color: '#4eb7d7', short: 'Places' },
}

const statLabels: Record<StatKey, string> = {
  STR: 'Strength',
  CUL: 'Culture',
  ENV: 'Environment',
  CHA: 'Charisma',
  TAL: 'Talent',
  INT: 'Intellect',
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
  const [category, setCategory] = useState('All quests')
  const [selected, setSelected] = useState<Challenge | null>(null)
  const [note, setNote] = useState('')
  const [reward, setReward] = useState<{ challenge: Challenge; levelUp: boolean } | null>(null)
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
  const stats = completedChallenges.reduce(
    (result, item) => {
      item.challenge.stats.forEach((stat) => (result[stat.key] += stat.points))
      return result
    },
    { STR: 0, CUL: 0, ENV: 0, CHA: 0, TAL: 0, INT: 0 } as Record<StatKey, number>,
  )

  const dayIndex = Math.floor(Date.now() / 86400000) % challenges.length
  const dailyQuest = challenges[dayIndex]
  const featuredQuests = [dailyQuest, challenges[(dayIndex + 137) % challenges.length], challenges[(dayIndex + 311) % challenges.length]]

  const visibleChallenges = useMemo(() => {
    const query = search.trim().toLowerCase()
    return challenges.filter((item) => {
      const categoryMatch = category === 'All quests' || item.category === category
      const searchMatch = !query || item.title.toLowerCase().includes(query) || item.category.toLowerCase().includes(query)
      return categoryMatch && searchMatch
    })
  }, [category, search])

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
    setReward({ challenge: selected, levelUp: newLevel > oldLevel })
    setSelected(null)
    setNote('')
    window.setTimeout(() => setReward(null), 4600)
  }

  function navigate(next: View) {
    setView(next)
    setMobileNav(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const mainContent = (() => {
    if (view === 'explore') {
      return (
        <ExploreView
          activeIds={save.activeIds}
          category={category}
          favoriteIds={save.favoriteIds}
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
        favoriteIds={save.favoriteIds}
        featured={featuredQuests}
        level={level.level}
        onComplete={setSelected}
        onFavorite={toggleFavorite}
        onNavigate={navigate}
        onStart={toggleActive}
        stats={stats}
      />
    )
  })()

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar--open' : ''}`}>
        <div className="brand" onClick={() => navigate('home')} role="button" tabIndex={0}>
          <span className="brand-mark"><Zap size={19} fill="currentColor" /></span>
          <span>LVL UP <i>LIFE</i></span>
        </div>
        <nav className="main-nav" aria-label="Main navigation">
          <NavButton active={view === 'home'} icon={House} label="Camp" onClick={() => navigate('home')} />
          <NavButton active={view === 'explore'} icon={Compass} label="Quest board" onClick={() => navigate('explore')} />
          <NavButton active={view === 'goals'} icon={Target} label="My quests" onClick={() => navigate('goals')} badge={save.activeIds.length} />
          <NavButton active={view === 'chronicle'} icon={ScrollText} label="Chronicle" onClick={() => navigate('chronicle')} />
        </nav>
        <div className="sidebar-spacer" />
        <div className="mini-profile">
          <div className="avatar"><UserRound size={22} /></div>
          <div><strong>Solo adventurer</strong><span>Level {level.level}</span></div>
        </div>
        <p className="local-note"><ShieldCheck size={14} /> Saved only on this device</p>
      </aside>

      {mobileNav && <button className="nav-scrim" aria-label="Close menu" onClick={() => setMobileNav(false)} />}

      <main>
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu /></button>
          <div className="topbar-level">
            <span>LVL {level.level}</span>
            <div className="xp-track"><i style={{ width: `${level.percent}%` }} /></div>
            <small>{level.carriedXp} / {level.needed} XP</small>
          </div>
          <div className="top-stats">
            <span><Flame size={17} /> <strong>{streak}</strong> day streak</span>
            <span><Trophy size={17} /> <strong>{save.completions.length}</strong> wins</span>
          </div>
        </header>
        <div className="page-content">{mainContent}</div>
      </main>

      {selected && (
        <CompletionModal challenge={selected} note={note} onClose={() => setSelected(null)} onNote={setNote} onSubmit={completeQuest} />
      )}

      {reward && (
        <div className="reward-toast" role="status">
          <div className="reward-icon"><Sparkles /></div>
          <div>
            <span>{reward.levelUp ? 'LEVEL UP!' : 'QUEST COMPLETE'}</span>
            <strong>+{reward.challenge.xp} XP earned</strong>
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
  favoriteIds: string[]
  onComplete: (challenge: Challenge) => void
  onFavorite: (id: string) => void
  onStart: (id: string) => void
}

function HomeView({ activeIds, completed, favoriteIds, featured, level, onComplete, onFavorite, onNavigate, onStart, stats }: QuestActions & {
  completed: { completion: Completion; challenge: Challenge }[]
  featured: Challenge[]
  level: number
  onNavigate: (view: View) => void
  stats: Record<StatKey, number>
}) {
  const topStat = (Object.entries(stats) as [StatKey, number][]).sort((a, b) => b[1] - a[1])[0]
  return (
    <>
      <section className="hero-panel">
        <div>
          <p className="eyebrow"><span /> YOUR NEXT MOVE</p>
          <h1>Make today<br /><em>count.</em></h1>
          <p className="hero-copy">Turn one real-world action into visible progress. Small wins still earn XP.</p>
          <button className="primary-button" onClick={() => onNavigate('explore')}>Find a quest <ArrowRight size={18} /></button>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="pixel-sword"><span>✦</span></div>
          <span className="float-rune rune-one">+XP</span><span className="float-rune rune-two">LVL</span>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">DAILY QUESTS</p><h2>Choose your adventure</h2></div><button className="text-button" onClick={() => onNavigate('explore')}>View all 538 <ArrowRight size={16} /></button></div>
        <div className="quest-grid">
          {featured.map((challenge, index) => <QuestCard key={challenge.id} challenge={challenge} featured={index === 0} active={activeIds.includes(challenge.id)} favorite={favoriteIds.includes(challenge.id)} onComplete={onComplete} onFavorite={onFavorite} onStart={onStart} />)}
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="section-block stat-panel">
          <div className="section-heading"><div><p className="eyebrow">CHARACTER SHEET</p><h2>Your real-life build</h2></div><span className="level-chip">LVL {level}</span></div>
          <div className="stat-list">
            {(Object.entries(stats) as [StatKey, number][]).map(([key, value]) => (
              <div className="stat-row" key={key}><span>{key}</span><div><strong>{statLabels[key]}</strong><i><b style={{ width: `${Math.min(100, topStat[1] ? (value / topStat[1]) * 100 : 0)}%` }} /></i></div><em>{value}</em></div>
            ))}
          </div>
        </section>

        <section className="section-block recent-panel">
          <div className="section-heading"><div><p className="eyebrow">RECENT WINS</p><h2>Your chronicle</h2></div><button className="icon-button" onClick={() => onNavigate('chronicle')}><ArrowRight size={18} /></button></div>
          {completed.length ? completed.slice(0, 3).map((item) => <ActivityItem key={item.completion.id} {...item} />) : <EmptyState compact icon={Footprints} title="Your story starts outside" text="Complete a quest and your first win will appear here." />}
        </section>
      </div>
    </>
  )
}

function ExploreView({ activeIds, category, favoriteIds, onCategory, onComplete, onFavorite, onStart, search, setSearch, visibleChallenges }: QuestActions & {
  category: string
  onCategory: (value: string) => void
  search: string
  setSearch: (value: string) => void
  visibleChallenges: Challenge[]
}) {
  const categories = ['All quests', ...Object.keys(categoryMeta)]
  return (
    <>
      <div className="page-heading"><p className="eyebrow">QUEST BOARD</p><h1>Find your next <em>win.</em></h1><p>538 original LvlUpLife challenges, restored and ready for a new run.</p></div>
      <div className="filter-bar">
        <label className="search-field"><Search size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search quests..." /></label>
        <label className="select-field"><select value={category} onChange={(event) => onCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={17} /></label>
      </div>
      <div className="category-strip">
        {categories.slice(0, 9).map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => onCategory(item)}>{item === 'All quests' ? <Sparkles size={17} /> : (() => { const Icon = categoryMeta[item].icon; return <Icon size={17} /> })()}<span>{item === 'All quests' ? item : categoryMeta[item].short}</span></button>)}
      </div>
      <div className="result-meta"><strong>{visibleChallenges.length}</strong> quests found <span>•</span> {category}</div>
      <div className="quest-list">
        {visibleChallenges.slice(0, 80).map((challenge) => <QuestRow key={challenge.id} challenge={challenge} active={activeIds.includes(challenge.id)} favorite={favoriteIds.includes(challenge.id)} onComplete={onComplete} onFavorite={onFavorite} onStart={onStart} />)}
      </div>
      {visibleChallenges.length > 80 && <p className="result-note">Showing the first 80 matches. Use search or a category to narrow the complete library.</p>}
    </>
  )
}

function CollectionView({ active, activeIds, favoriteIds, favorites, onComplete, onExplore, onFavorite, onStart }: QuestActions & { active: Challenge[]; favorites: Challenge[]; onExplore: () => void }) {
  return (
    <>
      <div className="page-heading"><p className="eyebrow">MY QUESTS</p><h1>Your active <em>journey.</em></h1><p>Keep the next meaningful action close. Finish it when reality catches up.</p></div>
      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">IN PROGRESS</p><h2>Active quests <span className="count-pill">{active.length}</span></h2></div></div>
        {active.length ? <div className="quest-list">{active.map((challenge) => <QuestRow key={challenge.id} challenge={challenge} active favorite={favoriteIds.includes(challenge.id)} onComplete={onComplete} onFavorite={onFavorite} onStart={onStart} />)}</div> : <EmptyState icon={Target} title="No active quests yet" text="Pick something small enough to do, but real enough to matter." action="Browse quest board" onAction={onExplore} />}
      </section>
      <section className="section-block collection-gap">
        <div className="section-heading"><div><p className="eyebrow">BOOKMARKS</p><h2>Saved for later <span className="count-pill">{favorites.length}</span></h2></div></div>
        {favorites.length ? <div className="quest-list">{favorites.map((challenge) => <QuestRow key={challenge.id} challenge={challenge} active={activeIds.includes(challenge.id)} favorite onComplete={onComplete} onFavorite={onFavorite} onStart={onStart} />)}</div> : <EmptyState compact icon={Star} title="Your shortlist is empty" text="Use the star on any quest to keep it here." />}
      </section>
    </>
  )
}

function ChronicleView({ items }: { items: { completion: Completion; challenge: Challenge }[] }) {
  return (
    <>
      <div className="page-heading"><p className="eyebrow">CHRONICLE</p><h1>Proof that you <em>showed up.</em></h1><p>Your private record of real actions, honest notes, and earned progress.</p></div>
      <section className="timeline-panel">
        {items.length ? items.map((item) => <ActivityItem key={item.completion.id} {...item} large />) : <EmptyState icon={ScrollText} title="No chapters written yet" text="Complete a quest to write the first line of your chronicle." />}
      </section>
    </>
  )
}

function QuestCard({ active, challenge, favorite, featured, onComplete, onFavorite, onStart }: { active: boolean; challenge: Challenge; favorite: boolean; featured?: boolean; onComplete: (challenge: Challenge) => void; onFavorite: (id: string) => void; onStart: (id: string) => void }) {
  const meta = categoryMeta[challenge.category]
  const Icon = meta.icon
  return (
    <article className={`quest-card ${featured ? 'featured' : ''}`} style={{ '--category-color': meta.color } as React.CSSProperties}>
      <div className="quest-card-top"><div className="category-icon"><Icon size={22} /></div><button className={`star-button ${favorite ? 'active' : ''}`} onClick={() => onFavorite(challenge.id)} aria-label="Save quest"><Star size={18} fill={favorite ? 'currentColor' : 'none'} /></button></div>
      <span className="quest-kind">{featured ? 'TODAY\'S QUEST' : meta.short.toUpperCase()}</span>
      <h3>{challenge.title}</h3>
      <div className="quest-rewards"><span><Zap size={14} /> {challenge.xp} XP</span>{challenge.stats.map((stat) => <span key={stat.key}>{stat.key} +{stat.points}</span>)}</div>
      <div className="quest-card-footer"><span>{challenge.tierName} · LVL {challenge.level}</span>{active ? <button className="complete-button" onClick={() => onComplete(challenge)}><Check size={16} /> Complete</button> : <button className="add-button" onClick={() => onStart(challenge.id)}><Plus size={17} /> Add quest</button>}</div>
    </article>
  )
}

function QuestRow({ active, challenge, favorite, onComplete, onFavorite, onStart }: { active: boolean; challenge: Challenge; favorite: boolean; onComplete: (challenge: Challenge) => void; onFavorite: (id: string) => void; onStart: (id: string) => void }) {
  const meta = categoryMeta[challenge.category]
  const Icon = meta.icon
  return (
    <article className="quest-row" style={{ '--category-color': meta.color } as React.CSSProperties}>
      <div className="category-icon"><Icon size={21} /></div>
      <div className="quest-row-copy"><span>{challenge.category} · {challenge.tierName}</span><h3>{challenge.title}</h3><div className="quest-rewards"><span><Zap size={13} /> {challenge.xp} XP</span>{challenge.stats.map((stat) => <span key={stat.key}>{stat.key} +{stat.points}</span>)}<em>LVL {challenge.level}</em></div></div>
      <button className={`star-button ${favorite ? 'active' : ''}`} onClick={() => onFavorite(challenge.id)} aria-label="Save quest"><Star size={18} fill={favorite ? 'currentColor' : 'none'} /></button>
      {active ? <button className="complete-button" onClick={() => onComplete(challenge)}><Check size={16} /> Complete</button> : <button className="row-add-button" onClick={() => onStart(challenge.id)}><Plus size={18} /><span>Add quest</span></button>}
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
      <div className="activity-copy"><span>{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: large ? 'numeric' : undefined })}</span><h3>{challenge.title}</h3>{completion.note && <p>“{completion.note}”</p>}<div className="quest-rewards"><span><Zap size={13} /> +{challenge.xp} XP</span>{challenge.stats.map((stat) => <span key={stat.key}>{stat.key} +{stat.points}</span>)}</div></div>
      <Check className="activity-check" size={18} />
    </article>
  )
}

function CompletionModal({ challenge, note, onClose, onNote, onSubmit }: { challenge: Challenge; note: string; onClose: () => void; onNote: (value: string) => void; onSubmit: () => void }) {
  const meta = categoryMeta[challenge.category]
  const Icon = meta.icon
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="completion-modal" role="dialog" aria-modal="true" aria-labelledby="completion-title">
        <button className="modal-close" onClick={onClose} aria-label="Close"><X /></button>
        <div className="completion-badge" style={{ color: meta.color }}><Icon size={30} /></div>
        <p className="eyebrow">CLAIM YOUR REWARD</p>
        <h2 id="completion-title">Did you do it?</h2>
        <h3>{challenge.title}</h3>
        <label><span>Add a note from real life <small>optional</small></span><textarea autoFocus value={note} onChange={(event) => onNote(event.target.value)} placeholder="What happened? What made this count?" maxLength={280} /><small>{note.length}/280</small></label>
        <div className="modal-reward"><div><Zap size={18} /> <strong>+{challenge.xp} XP</strong></div>{challenge.stats.map((stat) => <span key={stat.key}>{stat.key} +{stat.points}</span>)}</div>
        <button className="primary-button claim-button" onClick={onSubmit}><Check size={18} /> Mark complete</button>
        <p className="honor-note"><ShieldCheck size={14} /> Honor system: only claim what really happened.</p>
      </section>
    </div>
  )
}

function EmptyState({ action, compact, icon: Icon, onAction, text, title }: { action?: string; compact?: boolean; icon: LucideIcon; onAction?: () => void; text: string; title: string }) {
  return <div className={`empty-state ${compact ? 'empty-state--compact' : ''}`}><div><Icon /></div><h3>{title}</h3><p>{text}</p>{action && <button className="secondary-button" onClick={onAction}>{action} <ArrowRight size={16} /></button>}</div>
}

export default App
