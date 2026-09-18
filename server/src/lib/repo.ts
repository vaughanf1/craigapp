import { getDb } from './db.ts'
import { uid } from './ids.ts'
import type {
  ActionLog, CheckIn, DaySummary, Delivery, DeliveryKind, FoodEntry, Memory, Schedule, UserProfile, WeighIn,
} from './types.ts'

export interface User {
  id: string
  phone: string
  timezone: string
  profile: UserProfile | null
  createdAt: number
}

type Row = Record<string, unknown>

function toUser(r: Row): User {
  return {
    id: r.id as string,
    phone: r.phone as string,
    timezone: r.timezone as string,
    profile: r.profile_json ? (JSON.parse(r.profile_json as string) as UserProfile) : null,
    createdAt: r.created_at as number,
  }
}

/* ---------- users ---------- */

export function findUserByPhone(phone: string): User | null {
  const r = getDb().prepare('SELECT * FROM users WHERE phone = ?').get(phone) as Row | undefined
  return r ? toUser(r) : null
}

export function findUser(id: string): User | null {
  const r = getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as Row | undefined
  return r ? toUser(r) : null
}

export function createUser(phone: string, timezone: string): User {
  const id = uid(12)
  getDb()
    .prepare('INSERT INTO users (id, phone, timezone, created_at) VALUES (?, ?, ?, ?)')
    .run(id, phone, timezone, Date.now())
  getDb().prepare('INSERT INTO schedules (user_id) VALUES (?)').run(id)
  return findUser(id)!
}

export function saveProfile(userId: string, profile: UserProfile) {
  getDb().prepare('UPDATE users SET profile_json = ? WHERE id = ?').run(JSON.stringify(profile), userId)
}

export function setTimezone(userId: string, timezone: string) {
  getDb().prepare('UPDATE users SET timezone = ? WHERE id = ?').run(timezone, userId)
}

export function deleteUser(userId: string) {
  getDb().prepare('DELETE FROM users WHERE id = ?').run(userId)
}

export function allUsersWithSchedules(): (User & { schedule: Schedule })[] {
  const rows = getDb()
    .prepare('SELECT u.*, s.times_json, s.channels_json, s.enabled FROM users u JOIN schedules s ON s.user_id = u.id WHERE s.enabled = 1')
    .all() as Row[]
  return rows.map((r) => ({ ...toUser(r), schedule: toSchedule(r) }))
}

/* ---------- check-ins & food ---------- */

export function listCheckIns(userId: string): CheckIn[] {
  return (getDb().prepare('SELECT date, went_well, note FROM check_ins WHERE user_id = ? ORDER BY date').all(userId) as Row[])
    .map((r) => ({ date: r.date as string, wentWell: Boolean(r.went_well), note: r.note as string }))
}

export function upsertCheckIn(userId: string, c: CheckIn) {
  getDb()
    .prepare(`INSERT INTO check_ins (user_id, date, went_well, note, created_at) VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(user_id, date) DO UPDATE SET went_well = excluded.went_well, note = excluded.note`)
    .run(userId, c.date, c.wentWell ? 1 : 0, c.note, Date.now())
}

export function listFood(userId: string, sinceTs = 0): FoodEntry[] {
  return (getDb().prepare('SELECT * FROM food_log WHERE user_id = ? AND ts >= ? ORDER BY ts').all(userId, sinceTs) as Row[])
    .map((r) => ({ id: r.id as string, label: r.label as string, calories: r.calories as number, kind: r.kind as FoodEntry['kind'], timestamp: r.ts as number }))
}

export function addFood(userId: string, f: FoodEntry) {
  getDb()
    .prepare('INSERT OR REPLACE INTO food_log (id, user_id, label, calories, kind, ts) VALUES (?, ?, ?, ?, ?, ?)')
    .run(f.id, userId, f.label, f.calories, f.kind, f.timestamp)
}

export function removeFood(userId: string, id: string) {
  getDb().prepare('DELETE FROM food_log WHERE user_id = ? AND id = ?').run(userId, id)
}

/* ---------- progress: weigh-ins & daily actions ---------- */

export function listWeighIns(userId: string): WeighIn[] {
  return (getDb().prepare('SELECT date, kg FROM weigh_ins WHERE user_id = ? ORDER BY date').all(userId) as Row[])
    .map((r) => ({ date: r.date as string, kg: r.kg as number }))
}

export function upsertWeighIn(userId: string, w: WeighIn) {
  getDb()
    .prepare('INSERT INTO weigh_ins (user_id, date, kg) VALUES (?, ?, ?) ON CONFLICT(user_id, date) DO UPDATE SET kg = excluded.kg')
    .run(userId, w.date, w.kg)
}

export function listActionLog(userId: string, sinceDate: string): ActionLog[] {
  return (getDb().prepare('SELECT date, action_id, done FROM action_log WHERE user_id = ? AND date >= ? ORDER BY date').all(userId, sinceDate) as Row[])
    .map((r) => ({ date: r.date as string, actionId: r.action_id as string, done: Boolean(r.done) }))
}

export function setAction(userId: string, a: ActionLog) {
  getDb()
    .prepare('INSERT INTO action_log (user_id, date, action_id, done) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, date, action_id) DO UPDATE SET done = excluded.done')
    .run(userId, a.date, a.actionId, a.done ? 1 : 0)
}

/* ---------- plan reviews (the adaptive re-planning log) ---------- */

export interface PlanReview {
  id: string
  date: string
  trigger: 'weekly' | 'behind' | 'manual'
  decision: 'keep' | 'adjust'
  reason: string
  coachNote: string
  changes: string[]
  explained: boolean
  createdAt: number
}

function toReview(r: Row): PlanReview {
  return {
    id: r.id as string,
    date: r.date as string,
    trigger: r.trigger as PlanReview['trigger'],
    decision: r.decision as PlanReview['decision'],
    reason: r.reason as string,
    coachNote: r.coach_note as string,
    changes: JSON.parse(r.changes_json as string),
    explained: Boolean(r.explained),
    createdAt: r.created_at as number,
  }
}

export function listReviews(userId: string, limit = 10): PlanReview[] {
  return (getDb().prepare('SELECT * FROM plan_reviews WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit) as Row[]).map(toReview)
}

export function hasReview(userId: string, date: string): boolean {
  return Boolean(getDb().prepare('SELECT 1 FROM plan_reviews WHERE user_id = ? AND date = ?').get(userId, date))
}

export function addReview(userId: string, r: Omit<PlanReview, 'id' | 'createdAt' | 'explained'>): PlanReview {
  const id = uid()
  getDb()
    .prepare(`INSERT INTO plan_reviews (id, user_id, date, trigger, decision, reason, coach_note, changes_json, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(user_id, date) DO UPDATE SET trigger = excluded.trigger, decision = excluded.decision, reason = excluded.reason,
                coach_note = excluded.coach_note, changes_json = excluded.changes_json, explained = 0, created_at = excluded.created_at`)
    .run(id, userId, r.date, r.trigger, r.decision, r.reason, r.coachNote, JSON.stringify(r.changes), Date.now())
  return listReviews(userId, 1)[0]
}

/** The latest adjustment the coach hasn't yet told them about */
export function unexplainedReview(userId: string): PlanReview | null {
  const r = getDb().prepare("SELECT * FROM plan_reviews WHERE user_id = ? AND explained = 0 AND decision = 'adjust' ORDER BY created_at DESC LIMIT 1").get(userId) as Row | undefined
  return r ? toReview(r) : null
}

export function markReviewExplained(id: string) {
  getDb().prepare('UPDATE plan_reviews SET explained = 1 WHERE id = ?').run(id)
}

/* ---------- messages ---------- */

export interface StoredMessage {
  id: string
  role: 'user' | 'coach'
  text: string
  channel: string
  ts: number
}

export function addMessage(userId: string, role: 'user' | 'coach', text: string, channel: string): StoredMessage {
  const m = { id: uid(), role, text, channel, ts: Date.now() }
  getDb()
    .prepare('INSERT INTO messages (id, user_id, role, text, channel, ts) VALUES (?, ?, ?, ?, ?, ?)')
    .run(m.id, userId, role, text, channel, m.ts)
  return m
}

export function recentMessages(userId: string, limit = 40): StoredMessage[] {
  const rows = getDb()
    .prepare('SELECT id, role, text, channel, ts FROM messages WHERE user_id = ? ORDER BY ts DESC LIMIT ?')
    .all(userId, limit) as Row[]
  return rows.reverse().map((r) => ({ id: r.id as string, role: r.role as 'user' | 'coach', text: r.text as string, channel: r.channel as string, ts: r.ts as number }))
}

export function unmemorisedMessages(userId: string): StoredMessage[] {
  const rows = getDb()
    .prepare('SELECT id, role, text, channel, ts FROM messages WHERE user_id = ? AND memorised = 0 ORDER BY ts')
    .all(userId) as Row[]
  return rows.map((r) => ({ id: r.id as string, role: r.role as 'user' | 'coach', text: r.text as string, channel: r.channel as string, ts: r.ts as number }))
}

export function markMemorised(ids: string[]) {
  if (!ids.length) return
  const stmt = getDb().prepare('UPDATE messages SET memorised = 1 WHERE id = ?')
  for (const id of ids) stmt.run(id)
}

/* ---------- memories ---------- */

function toMemory(r: Row): Memory {
  return {
    id: r.id as string,
    kind: r.kind as Memory['kind'],
    text: r.text as string,
    importance: r.importance as number,
    source: r.source as string,
    createdAt: r.created_at as number,
    updatedAt: r.updated_at as number,
  }
}

export function listMemories(userId: string): Memory[] {
  return (getDb()
    .prepare('SELECT * FROM memories WHERE user_id = ? AND archived = 0 ORDER BY importance DESC, updated_at DESC')
    .all(userId) as Row[]).map(toMemory)
}

export function addMemory(userId: string, m: Pick<Memory, 'kind' | 'text' | 'importance' | 'source'>): Memory {
  const now = Date.now()
  const id = uid()
  getDb()
    .prepare('INSERT INTO memories (id, user_id, kind, text, importance, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, userId, m.kind, m.text, m.importance, m.source, now, now)
  return { id, ...m, createdAt: now, updatedAt: now }
}

export function updateMemory(userId: string, id: string, text: string, importance: number) {
  getDb()
    .prepare('UPDATE memories SET text = ?, importance = ?, updated_at = ? WHERE id = ? AND user_id = ?')
    .run(text, importance, Date.now(), id, userId)
}

export function archiveMemory(userId: string, id: string) {
  getDb().prepare('UPDATE memories SET archived = 1, updated_at = ? WHERE id = ? AND user_id = ?').run(Date.now(), id, userId)
}

/* ---------- day summaries ---------- */

function toSummary(r: Row): DaySummary {
  return {
    date: r.date as string,
    summary: r.summary as string,
    mood: r.mood as string,
    wins: r.wins as string,
    struggles: r.struggles as string,
    tomorrowFocus: r.tomorrow_focus as string,
    caloriesIn: (r.calories_in as number | null) ?? null,
    caloriesTarget: (r.calories_target as number | null) ?? null,
  }
}

export function listSummaries(userId: string, limit = 14): DaySummary[] {
  const rows = getDb()
    .prepare('SELECT * FROM day_summaries WHERE user_id = ? ORDER BY date DESC LIMIT ?')
    .all(userId, limit) as Row[]
  return rows.reverse().map(toSummary)
}

export function getSummary(userId: string, date: string): DaySummary | null {
  const r = getDb().prepare('SELECT * FROM day_summaries WHERE user_id = ? AND date = ?').get(userId, date) as Row | undefined
  return r ? toSummary(r) : null
}

export function upsertSummary(userId: string, s: DaySummary) {
  getDb()
    .prepare(`INSERT INTO day_summaries (user_id, date, summary, mood, wins, struggles, tomorrow_focus, calories_in, calories_target, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(user_id, date) DO UPDATE SET summary = excluded.summary, mood = excluded.mood, wins = excluded.wins,
                struggles = excluded.struggles, tomorrow_focus = excluded.tomorrow_focus, calories_in = excluded.calories_in,
                calories_target = excluded.calories_target, updated_at = excluded.updated_at`)
    .run(userId, s.date, s.summary, s.mood, s.wins, s.struggles, s.tomorrowFocus, s.caloriesIn, s.caloriesTarget, Date.now())
}

/* ---------- schedules & push ---------- */

function toSchedule(r: Row): Schedule {
  return {
    times: JSON.parse(r.times_json as string),
    channels: JSON.parse(r.channels_json as string),
    enabled: Boolean(r.enabled),
  }
}

export function getSchedule(userId: string): Schedule {
  const r = getDb().prepare('SELECT * FROM schedules WHERE user_id = ?').get(userId) as Row | undefined
  return r ? toSchedule(r) : { times: ['09:00', '19:00'], channels: ['push', 'call'], enabled: true }
}

export function saveSchedule(userId: string, s: Schedule) {
  getDb()
    .prepare(`INSERT INTO schedules (user_id, times_json, channels_json, enabled) VALUES (?, ?, ?, ?)
              ON CONFLICT(user_id) DO UPDATE SET times_json = excluded.times_json, channels_json = excluded.channels_json, enabled = excluded.enabled`)
    .run(userId, JSON.stringify(s.times), JSON.stringify(s.channels), s.enabled ? 1 : 0)
}

export interface PushSub {
  id: string
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export function listPushSubs(userId: string): PushSub[] {
  return (getDb().prepare('SELECT id, endpoint, keys_json FROM push_subscriptions WHERE user_id = ?').all(userId) as Row[])
    .map((r) => ({ id: r.id as string, endpoint: r.endpoint as string, keys: JSON.parse(r.keys_json as string) }))
}

export function addPushSub(userId: string, endpoint: string, keys: PushSub['keys']) {
  getDb()
    .prepare(`INSERT INTO push_subscriptions (id, user_id, endpoint, keys_json, created_at) VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, keys_json = excluded.keys_json`)
    .run(uid(), userId, endpoint, JSON.stringify(keys), Date.now())
}

export function removePushSub(endpoint: string) {
  getDb().prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint)
}

/* ---------- deliveries ---------- */

function toDelivery(r: Row): Delivery {
  return {
    id: r.id as string,
    date: r.date as string,
    slot: r.slot as string,
    kind: r.kind as DeliveryKind,
    brief: r.brief as string,
    channels: JSON.parse(r.channels_json as string),
    status: r.status as string,
    createdAt: r.created_at as number,
    answeredAt: (r.answered_at as number | null) ?? null,
  }
}

export function hasDelivery(userId: string, date: string, slot: string): boolean {
  return Boolean(getDb().prepare('SELECT 1 FROM deliveries WHERE user_id = ? AND date = ? AND slot = ?').get(userId, date, slot))
}

export function createDelivery(userId: string, d: { date: string; slot: string; kind: DeliveryKind; brief: string; channels: string[] }): Delivery {
  const id = uid(10)
  getDb()
    .prepare('INSERT INTO deliveries (id, user_id, date, slot, kind, brief, channels_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, userId, d.date, d.slot, d.kind, d.brief, JSON.stringify(d.channels), Date.now())
  return getDelivery(id)!
}

export function getDelivery(id: string): (Delivery & { userId: string }) | null {
  const r = getDb().prepare('SELECT * FROM deliveries WHERE id = ?').get(id) as Row | undefined
  return r ? { ...toDelivery(r), userId: r.user_id as string } : null
}

export function setDeliveryStatus(id: string, status: string, callSid?: string) {
  getDb()
    .prepare('UPDATE deliveries SET status = ?, call_sid = COALESCE(?, call_sid), answered_at = CASE WHEN ? = \'answered\' THEN ? ELSE answered_at END WHERE id = ?')
    .run(status, callSid ?? null, status, Date.now(), id)
}

export function listDeliveries(userId: string, limit = 20): Delivery[] {
  return (getDb().prepare('SELECT * FROM deliveries WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit) as Row[]).map(toDelivery)
}
