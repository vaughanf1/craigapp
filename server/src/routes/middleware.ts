import type { Context, Next } from 'hono'
import { userForToken } from '../lib/auth.ts'
import type { User } from '../lib/repo.ts'

export type Env = { Variables: { user: User; token: string } }

export async function requireUser(c: Context<Env>, next: Next) {
  const header = c.req.header('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const user = token ? userForToken(token) : null
  if (!user) return c.json({ error: 'unauthorised' }, 401)
  c.set('user', user)
  c.set('token', token)
  await next()
}

export function requireProfile(c: Context<Env>): User & { profile: NonNullable<User['profile']> } {
  const user = c.get('user')
  if (!user.profile) throw new HttpError(409, 'Complete onboarding first')
  return user as User & { profile: NonNullable<User['profile']> }
}

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}
