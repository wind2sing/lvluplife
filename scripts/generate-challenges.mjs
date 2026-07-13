import { readFileSync, writeFileSync } from 'node:fs'
import { calculateReward, inferQuestEnergy } from '../shared/reward-rules.mjs'

const sourcePath = new URL('../data/original-challenges.txt', import.meta.url)
const outputPath = new URL('../src/data/challenges.json', import.meta.url)
const translationsPath = new URL('../data/challenges-zh.json', import.meta.url)

const translations = JSON.parse(readFileSync(translationsPath, 'utf8'))

const categoryStats = {
  'Arts & Creativity': { zh: '艺术与创意', stats: ['TAL', 'CUL'], seed: [1, 1, 2, 2, 3] },
  Music: { zh: '音乐', stats: ['TAL', 'CUL'], seed: [1, 1, 2, 3, 3] },
  Photography: { zh: '摄影', stats: ['TAL', 'ENV'], seed: [1, 2, 3, 4, 5] },
  Writing: { zh: '写作', stats: ['TAL', 'INT'], seed: [1, 3, 4, 5, 6] },
  'Career & Finances': { zh: '事业与财务', stats: ['INT', 'CHA'], seed: [1, 1, 2, 2, 3] },
  'Fitness & Health': { zh: '健身与健康', stats: ['STR', 'INT'], seed: [1, 1, 2, 2, 3] },
  Sports: { zh: '运动', stats: ['STR', 'TAL'], seed: [10, 11, 11, 12, 12] },
  'Food & Cooking': { zh: '美食与烹饪', stats: ['TAL', 'CHA'], seed: [1, 1, 2, 2, 3] },
  'Household & DIY': { zh: '家务与手作', stats: ['ENV', 'TAL'], seed: [1, 1, 2, 2, 3] },
  Humanity: { zh: '善意与公益', stats: ['CHA', 'CUL'], seed: [1, 1, 2, 2, 3] },
  Mental: { zh: '心智与情绪', stats: ['INT', 'STR'], seed: [1, 1, 2, 2, 3] },
  Outdoors: { zh: '户外', stats: ['ENV', 'STR'], seed: [1, 1, 2, 2, 3] },
  Reading: { zh: '阅读', stats: ['INT', 'CUL'], seed: [1, 2, 3, 4, 4] },
  'Top 150': { zh: '经典书单', stats: ['INT', 'CUL'], seed: [1, 1, 1, 1, 1], divisor: 5 },
  'School & Learning': { zh: '学习与成长', stats: ['INT', 'TAL'], seed: [1, 2, 2, 3, 3] },
  Social: { zh: '社交', stats: ['CHA', 'CUL'], seed: [1, 1, 2, 2, 3] },
  Travel: { zh: '旅行', stats: ['ENV', 'CUL'], seed: [1, 2, 2, 4, 6] },
  Destinations: { zh: '一生必去', stats: ['CUL', 'ENV'], seed: [8, 9, 10, 11, 12] },
}

const categoryFlavor = {
  'Arts & Creativity': {
    zh: ['让灵感雷达全功率运转一次，留意一个平时会错过的细节。', '别等缪斯敲门，先亲手为今天制造一点新鲜感。', '把审美从旁观模式切换成行动模式，看看现实会给你什么回应。'],
    en: ['Power up your inspiration radar and notice one detail you would normally miss.', 'Do not wait for the muse—make a little novelty for today.', 'Switch your sense of beauty from spectator mode to action mode.'],
  },
  Music: {
    zh: ['让耳朵离开自动播放区，认真捕捉一次节奏、旋律或现场的温度。', '把世界的背景音乐调大一点，找到一个值得反复回味的瞬间。', '这次不只是“听见”，试着记住声音带来的情绪和画面。'],
    en: ['Leave autoplay behind and truly catch a rhythm, melody, or the warmth of a live sound.', 'Turn up the world’s soundtrack and find one moment worth replaying.', 'Do more than hear it—notice the feeling or image the sound creates.'],
  },
  Photography: {
    zh: ['把寻常世界装进取景框，主动寻找光线、构图或故事感。', '先别急着按快门，找到真正让你停下脚步的那个画面。', '用镜头完成一次小型侦察：发现别人匆匆走过的视觉线索。'],
    en: ['Frame the ordinary world and hunt for light, composition, or a story.', 'Before pressing the shutter, find the scene that truly makes you stop.', 'Run a tiny visual scouting mission and spot what others hurry past.'],
  },
  Writing: {
    zh: ['把脑海里的雾压缩成文字，至少留下一个只有你能写出的句子。', '先允许初稿不完美；真正的任务，是让空白页面失去统治权。', '让想法从脑内频道正式落地，写出一个可被未来的你重新读懂的版本。'],
    en: ['Compress the fog in your head into words and leave one sentence only you could write.', 'Let the first draft be imperfect; the real quest is defeating the blank page.', 'Move the idea out of your head and into a form your future self can understand.'],
  },
  'Career & Finances': {
    zh: ['这是一次现实装备维护：完成它，让未来的选择多一点余地。', '把一个拖延中的现实事项变成已结算状态，降低后台持续占用。', '不追求一夜暴富，只完成一个能让生活系统更稳的小升级。'],
    en: ['Treat this as real-life gear maintenance and give your future self more options.', 'Turn one delayed practical matter into a settled one and clear some background load.', 'Skip overnight riches; make one small upgrade to a steadier life system.'],
  },
  'Fitness & Health': {
    zh: ['身体是冒险者的长期装备，今天为它完成一次保养或强化。', '不需要英雄式爆发，只要给身体一个明确、诚实的行动信号。', '把注意力从数值焦虑拉回真实感受，完成一次可持续的身体投资。'],
    en: ['Your body is long-term adventuring gear—maintain or strengthen it today.', 'No heroic burst required; give your body one clear and honest action signal.', 'Leave number anxiety behind and make one sustainable investment in your body.'],
  },
  Sports: {
    zh: ['进入竞技支线：专注动作、节奏与临场判断，输赢只是战报的一部分。', '让身体和技巧同时上线，认真打完这次属于现实世界的回合。', '把规则变成乐趣，把汗水变成经验；去完成一场真正参与其中的对局。'],
    en: ['Enter a sporting side quest: focus on movement, rhythm, and decisions; the score is only part of the report.', 'Bring both body and skill online for a real-world round.', 'Turn rules into play and effort into experience by truly joining the game.'],
  },
  'Food & Cooking': {
    zh: ['开启厨房炼金术：认真对待食材、火候或味道中的一个变量。', '别让这一餐只是补充能量，给它增加一点选择、手艺或记忆。', '用味觉完成一次探索，看看简单的食物能不能变成今天的小事件。'],
    en: ['Begin a little kitchen alchemy and pay attention to one variable: ingredient, heat, or flavor.', 'Let this meal be more than fuel by adding choice, craft, or memory.', 'Explore through taste and turn simple food into a small event.'],
  },
  'Household & DIY': {
    zh: ['营地维护委托：修复一个小问题，让日常环境少一点摩擦。', '把生活空间当作基地，完成一次看得见、摸得着的升级。', '今天不讨伐巨龙，先处理那个每天都在悄悄消耗你的细节。'],
    en: ['Camp maintenance quest: fix one small issue and remove a little daily friction.', 'Treat your space as a base and make one visible, tangible upgrade.', 'No dragons today—deal with the detail that quietly drains you every day.'],
  },
  Humanity: {
    zh: ['善意不是被动属性；让它在现实中触发一次，并尊重对方真正需要的方式。', '完成一次不求回报的友善行动，让世界的局部区域稍微亮一点。', '把“我在乎”从想法变成动作，哪怕它只改变了一个很小的瞬间。'],
    en: ['Kindness is not a passive stat—activate it in a way the other person actually needs.', 'Complete one generous action without seeking a reward and brighten a small corner of the world.', 'Turn “I care” from an idea into an action, even for one small moment.'],
  },
  Mental: {
    zh: ['这是一次内在状态检查：不必表现完美，只要诚实地照顾当下的自己。', '为大脑清理一个后台进程，给情绪、注意力或秩序腾出空间。', '把自动驾驶暂停片刻，主动选择一个更适合今天的行动。'],
    en: ['Run an inner status check; perfection is unnecessary, honest care is enough.', 'Clear one background process and make room for emotion, attention, or order.', 'Pause autopilot and choose one action that fits today better.'],
  },
  Outdoors: {
    zh: ['离开室内地图，去读取一次风、光线、植物或地形发来的消息。', '让现实世界刷新视野，完成一次和自然或城市户外的直接接触。', '这是一张没有加载条的开放地图；慢一点，别错过沿途的细节。'],
    en: ['Leave the indoor map and read what wind, light, plants, or terrain are saying.', 'Refresh your view with direct contact with nature or the city outdoors.', 'This open map has no loading bar—slow down and notice the route.'],
  },
  Reading: {
    zh: ['翻开书页，让注意力在另一个人的思想世界里停留一会儿。', '不必追求页数纪录，带回一个观点、一幅画面或一个问题就算满载而归。', '把手机的滚动条换成书页，完成一次更深、更慢的信息探索。'],
    en: ['Open the pages and let your attention stay inside another mind for a while.', 'No page-count record needed; return with one idea, image, or question.', 'Trade the phone scroll for pages and take a slower, deeper information journey.'],
  },
  'Top 150': {
    zh: ['不必竞速通关，留意一个让你停下来思考的段落，并为它留下一句路标。', '把它当作一段跨越时代的对话：读完，也听听自己产生了什么回应。', '允许难懂、走神和重读；真正的成就是完整走过这趟文字远征。'],
    en: ['Do not speedrun it; notice one passage that stops you and leave a note as a trail marker.', 'Treat it as a conversation across time and notice your own response.', 'Allow confusion and rereading—the achievement is completing the whole journey.'],
  },
  'School & Learning': {
    zh: ['开启求知支线：带着一个问题出发，并确保结束时能说出新知道了什么。', '不要只收藏知识入口，真正走进去，带回一个可复述的新发现。', '把“我好像懂了”升级为“我能解释”，完成一次有效学习。'],
    en: ['Begin a learning side quest with one question and return able to name what you learned.', 'Do not merely bookmark the entrance—go in and bring back one discovery.', 'Upgrade “I think I get it” into “I can explain it.”'],
  },
  Social: {
    zh: ['这次任务的关键道具是真诚注意力：听见对方，也让自己真实出现。', '主动跨出社交安全区的一小步，不追求完美表现，只建立一次真实连接。', '关系需要现实中的互动来续航；为一段连接补充一点新鲜能量。'],
    en: ['The key item is sincere attention: hear the other person and show up as yourself.', 'Take one small step beyond your social comfort zone without chasing a perfect performance.', 'Relationships need real interaction—add a little fresh energy to one connection.'],
  },
  Travel: {
    zh: ['把熟悉地图撕开一道口子，去收集一个新路线、新地点或新故事。', '别只抵达目的地，给沿途的意外和细节留一个物品栏位置。', '开启短途远征模式：观察、绕路，并带回一段值得记住的现场感。'],
    en: ['Open a gap in the familiar map and collect a new route, place, or story.', 'Do more than arrive; save inventory space for surprises along the way.', 'Enter expedition mode: observe, detour, and bring back a vivid memory.'],
  },
  Destinations: {
    zh: ['这是一枚远方坐标。抵达时别急着证明来过，先真正看见它、感受它。', '把愿望清单上的地名变成脚下的现实，并为这次远征留下一份私人证据。', '传奇地点不会自动变成传奇回忆；慢下来，为它保存一个属于你的瞬间。'],
    en: ['This is a faraway coordinate. When you arrive, do not rush to prove it—truly see and feel it.', 'Turn a wishlist name into ground beneath your feet and keep private proof of the expedition.', 'A legendary place does not automatically make a legendary memory; save one moment of your own.'],
  },
}

const questRanks = {
  zh: ['新手委托', '支线任务', '进阶远征', '传奇挑战'],
  en: ['Starter quest', 'Side quest', 'Advanced expedition', 'Legendary challenge'],
}

const stableIndex = (value, length) => {
  let hash = 0
  for (const character of value) hash = (hash * 31 + character.codePointAt(0)) >>> 0
  return hash % length
}

const trimSentence = (value) => value.trim().replace(/[。！？.!?]+$/u, '')

const getDescriptions = ({ id, title, titleOriginal, category, tier }) => {
  const flavor = categoryFlavor[category]
  const variant = stableIndex(id, flavor.zh.length)
  const rankIndex = Math.max(0, Math.min(questRanks.zh.length - 1, tier - 1))
  const zhAction = category === 'Top 150' ? `读完${trimSentence(title)}` : trimSentence(title)
  const enAction = category === 'Top 150' ? `Finish reading ${trimSentence(titleOriginal)}` : trimSentence(titleOriginal)
  return {
    description: `${questRanks.zh[rankIndex]} · ${zhAction}。${flavor.zh[variant]}`,
    descriptionOriginal: `${questRanks.en[rankIndex]} — ${enAction}. ${flavor.en[variant]}`,
  }
}

const slugify = (value) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const raw = readFileSync(sourcePath, 'utf8')
  .replace(/^\uFEFF/, '')
  .replace(/\r/g, '')

const categoryItems = new Map()
let currentCategory = ''

for (const rawLine of raw.split('\n')) {
  const line = rawLine.trim()
  if (!line || line === '________________') continue
  if (line.startsWith('* ')) {
    if (!currentCategory) throw new Error(`Challenge without category: ${line}`)
    const items = categoryItems.get(currentCategory) ?? []
    items.push(line.slice(2).trim())
    categoryItems.set(currentCategory, items)
  } else {
    currentCategory = line
  }
}

const getCadence = (title, category, tier) => {
  const value = title.toLowerCase()
  if (/every day|each day|a day|daily|one day/.test(value)) return '每日'
  if (/week|weekly/.test(value)) return '每周'
  if (/month|monthly/.test(value)) return '每月'
  if (/year|annual|birthday|holiday/.test(value)) return '每年'
  if (
    category === 'Destinations' ||
    /graduate|license|passport|move to|quit smoking|never started|visit a country|travel to a different continent/.test(
      value,
    )
  )
    return '终身一次'
  return ['每日', '每周', '每月', '终身一次'][tier - 1]
}

const challenges = []

for (const [category, items] of categoryItems) {
  if (!categoryStats[category]) throw new Error(`Missing category config: ${category}`)
  items.forEach((title, index) => {
    const progress = items.length === 1 ? 0 : index / (items.length - 1)
    const tier = progress < 0.42 ? 1 : progress < 0.72 ? 2 : progress < 0.9 ? 3 : 4
    const config = categoryStats[category]
    const divisor = config.divisor ?? 2
    const projectedLevel = Math.ceil((index + 1) / divisor) + (config.seed[4] - Math.ceil(5 / divisor))
    const level = index < config.seed.length ? config.seed[index] : Math.max(config.seed[4], projectedLevel)
    const cadence = getCadence(title, category, tier)
    const energyDemand = inferQuestEnergy(tier)
    const reward = calculateReward({ level, tier, cadence, energyDemand, primaryStat: config.stats[0], secondaryStat: config.stats[1] })
    const id = `${slugify(category)}-${String(index + 1).padStart(3, '0')}`
    const descriptions = getDescriptions({ id, title: translations[id], titleOriginal: title, category, tier })

    challenges.push({
      id,
      title: translations[id],
      titleOriginal: title,
      ...descriptions,
      category: config.zh,
      categoryOriginal: category,
      level,
      tier: reward.tier,
      tierName: reward.tierName,
      xp: reward.xp,
      cadence,
      stats: reward.stats,
      energyDemand: reward.energyDemand,
      source: 'LvlUpLife 挑战列表备份',
    })
  })
}

writeFileSync(outputPath, `${JSON.stringify(challenges, null, 2)}\n`)
if (challenges.length !== 538 || categoryItems.size !== 18) {
  throw new Error(`Import integrity check failed: ${challenges.length} challenges, ${categoryItems.size} categories`)
}
if (challenges.some((challenge) => !challenge.description || !challenge.descriptionOriginal)) {
  throw new Error('Description integrity check failed: every challenge must include Chinese and English descriptions')
}
if (new Set(challenges.map((challenge) => challenge.description)).size !== challenges.length) {
  throw new Error('Description integrity check failed: Chinese descriptions must be unique')
}
console.log(`Generated ${challenges.length} challenges across ${categoryItems.size} categories.`)
