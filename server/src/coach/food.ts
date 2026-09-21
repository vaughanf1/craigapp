import { z } from 'zod'
import { completeJson, type ImageInput } from './llm.ts'
import { getCoach } from '../../shared/coaches.ts'
import type { User } from '../lib/repo.ts'

/**
 * Snap a meal → what's on the plate and roughly how many calories. Honest
 * about uncertainty (a photo can't weigh a portion), and the coach adds one
 * line in their own voice.
 */
const Analysis = z.object({
  items: z.array(z.object({
    label: z.string().describe('Short name, e.g. "Chicken tikka masala"'),
    portion: z.string().describe('Estimated portion, e.g. "large plate, ~350g" or "1 slice"'),
    calories: z.number().int().describe('Best estimate in kcal for that portion'),
    confidence: z.enum(['low', 'medium', 'high']),
  })).describe('Everything visible that would be eaten or drunk. Empty if there is no food in the photo.'),
  totalCalories: z.number().int(),
  isFood: z.boolean().describe('false if the photo does not show food or drink'),
  coachNote: z.string().describe('One sentence in the coach\'s voice: honest, specific, reduce-not-ban, no lecture. Empty if not food.'),
})
export type FoodAnalysis = z.infer<typeof Analysis>

export async function analyseMealPhoto(user: User, image: ImageInput, note: string): Promise<FoodAnalysis> {
  const p = user.profile
  const coach = getCoach(p?.coachId)
  const out = await completeJson({
    schema: Analysis,
    name: 'meal_analysis',
    maxTokens: 2048,
    effort: 'low',
    image,
    system: [
      `You are ${coach.name}, a personal coach in Be More, estimating calories from a photo of a meal for ${p?.name ?? 'the user'}${p?.calorieTarget ? ` (daily target ${p.calorieTarget} kcal)` : ''}. Identify each item, estimate the portion from visual cues (plate size, cutlery, packaging), and give a realistic kcal figure per item — typical restaurant and home portions in the UK. Round to the nearest 10. Be honest about confidence: sauces, oils and hidden ingredients push real numbers up, so lean slightly high rather than flattering. If the user's note names the food or portion, trust it over the picture.`,
    ],
    messages: [{ role: 'user', content: note ? `Photo of what I'm about to eat. Note: ${note}` : "Photo of what I'm about to eat." }],
  })
  if (!out) throw new Error('Could not analyse the photo')
  return out
}
