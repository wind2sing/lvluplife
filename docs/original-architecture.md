# Original LvlUpLife architecture notes

This document records the recoverable product architecture of the original LvlUpLife, based on the public challenge backup and archived pages from 2016–2018.

## Core loop

1. Browse an achievement category.
2. Pick a real-world achievement, or star it as a goal.
3. Do it in real life.
4. Record the completion with optional notes and a photo.
5. Receive XP and one or more of six skill-point types.
6. Publish the completion to a personal activity log and, depending on privacy, the community/friends feed.
7. Level up, unlock harder achievements, and compare progress through profiles and high scores.

The original help page explicitly described the service as an honour system. The product's emotional reward came from attaching a small, visible RPG reward to a truthful real-world action.

## Progression model

- XP determined the player's level.
- Higher levels required more XP and unlocked harder achievements.
- Achievements could repeat once per day, week, month, year, or lifetime.
- Longer cooldowns generally awarded more XP.
- Completing an achievement consumed one energy heart; one heart regenerated each hour.
- New accounts started with three maximum hearts, with capacity increasing through progression.
- Level-up events appeared in the same activity feed as achievement completions.

## Six life stats

| Code | Name | Meaning |
| --- | --- | --- |
| STR | Strength | Physical health and fitness |
| CUL | Culture | Arts, history, traditions, and worldliness |
| ENV | Environment | Home, outdoors, city, country, and surroundings |
| CHA | Charisma | Social skills, communication, and interaction |
| TAL | Talent | Specialized skills and abilities |
| INT | Intellect | Knowledge, education, and research |

Profile stat bars were relative to the player's strongest stat, not an absolute cap.

## Recovered information architecture

Public routes found in the Wayback index and archived navigation:

- `/` — registration plus community achievement feed
- `/category/{slug}` — category list with locked/unlocked achievements
- `/category/goals` — starred achievements
- `/category/{slug}/hidden` and `/all` — hidden/all variants
- `/achievement/{id}/{slug}` — achievement completion/details
- `/achievement/{id}/{slug}/community` — community completions for one achievement
- `/users/{username}` — public player timeline and profile statistics
- `/u/{username}/v/{count}` — older profile activity pagination
- `/highscores` and `/highscores/community` — rankings for time windows and social scope
- `/friends` — friends management/feed scope
- `/notifications` — friend requests and other activity
- `/profile`, `/profile/new` — profile management/onboarding
- `/settings` — account and privacy preferences
- `/help` — rules and how-to-play documentation
- `/feedback` and `/terms` — support/legal

## Categories recovered from the challenge backup

The supplied backup contains 538 challenges across 18 headings: Arts & Creativity, Music, Photography, Writing, Career & Finances, Fitness & Health, Sports, Food & Cooking, Household & DIY, Humanity, Mental, Outdoors, Reading, Top 150, School & Learning, Social, Travel, and Destinations.

The archived website also exposed a `Fun` category and a personal `Goals` category. The supplied backup is treated as canonical for initial imported content; future data work can reconcile additional archived challenges without mutating the source backup.

## Social and profile model

- The home page defaulted to a community achievement feed.
- Friends unlocked a friends-only feed and a friends-only leaderboard.
- Profiles included avatar, level progress, six skill bars, total XP, average XP per day, rank, total completions, unique achievements, completion rate, and time spent at the current level.
- Activity cards included username, date, current level, category icon, challenge title, optional note/photo, XP, and skill gains.
- Private profiles remained visible to accepted friends.

## Custom achievements

Players could add private custom achievements to a category, choose an achievement level, distribute a limited number of skill points, and choose a repeat cadence. The available skill-point budget was three times the achievement level.

## Modernization decisions for this rebuild

- Keep the real-world action → proof/note → immediate reward loop.
- Keep XP, levels, six stats, goals, repeat cadence, an activity chronicle, and custom quests.
- Start local-first with no mandatory registration; persist progress in the browser.
- Show the complete imported library instead of hiding most content, while using recommended levels and difficulty tiers for guidance.
- Keep this build intentionally single-player. Public social features, friends, public rankings, accounts, and server sync are out of scope unless the project direction changes later.

## Sources

- Challenge backup: <https://docs.google.com/document/d/1ji2-rvl26vksrx874wFnt8Ixs-zXcBKL/edit>
- Archived home page: <https://web.archive.org/web/20170604105300/http://lvluplife.com/>
- Archived help page: <https://web.archive.org/web/20160126233355/http://lvluplife.com/help>
- Archived high scores: <https://web.archive.org/web/20160125082506/http://lvluplife.com/highscores>
- Archived public profile: <https://web.archive.org/web/20170606154601/http://lvluplife.com/users/eccsup>
- Wayback CDX route index: <https://web.archive.org/cdx/search/cdx?url=lvluplife.com/*>
