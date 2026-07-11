/**
 * Parse a spoken/typed meal description into food entries with calorie
 * estimates — "two slices of toast and a latte" → [toast ×2, latte ×1].
 * Estimates are approximate by design; the UI says so.
 */

interface FoodDef {
  /** canonical label */
  label: string
  /** words/phrases that identify this food (longest match wins) */
  match: string[]
  calories: number
}

const FOOD_DB: FoodDef[] = [
  { label: 'Slice of toast with butter', match: ['toast'], calories: 130 },
  { label: 'Slice of bread', match: ['slice of bread', 'bread'], calories: 100 },
  { label: 'Bowl of porridge', match: ['porridge', 'oatmeal', 'oats'], calories: 250 },
  { label: 'Bowl of cereal', match: ['cereal', 'cornflakes', 'muesli', 'granola'], calories: 280 },
  { label: 'Egg', match: ['boiled egg', 'fried egg', 'poached egg', 'scrambled egg', 'egg'], calories: 90 },
  { label: 'Bacon rasher', match: ['rasher', 'bacon'], calories: 90 },
  { label: 'Sausage', match: ['sausage'], calories: 130 },
  { label: 'Full English breakfast', match: ['full english', 'fry up', 'fry-up'], calories: 850 },
  { label: 'Banana', match: ['banana'], calories: 105 },
  { label: 'Apple', match: ['apple'], calories: 95 },
  { label: 'Orange', match: ['orange'], calories: 65 },
  { label: 'Yoghurt', match: ['yoghurt', 'yogurt'], calories: 120 },
  { label: 'Sandwich', match: ['sandwich'], calories: 400 },
  { label: 'Chicken salad', match: ['chicken salad'], calories: 350 },
  { label: 'Salad', match: ['salad'], calories: 200 },
  { label: 'Soup', match: ['soup'], calories: 220 },
  { label: 'Jacket potato with beans', match: ['jacket potato', 'baked potato'], calories: 450 },
  { label: 'Chips (portion)', match: ['chips', 'fries'], calories: 400 },
  { label: 'Fish & chips', match: ['fish and chips', 'fish & chips'], calories: 900 },
  { label: 'Burger', match: ['cheeseburger', 'burger'], calories: 550 },
  { label: 'Pizza (half a 12-inch)', match: ['pizza'], calories: 600 },
  { label: 'Spaghetti bolognese', match: ['spaghetti bolognese', 'spag bol', 'bolognese'], calories: 600 },
  { label: 'Pasta (bowl)', match: ['pasta', 'spaghetti'], calories: 450 },
  { label: 'Curry & rice', match: ['curry'], calories: 700 },
  { label: 'Rice (portion)', match: ['rice'], calories: 200 },
  { label: 'Roast dinner', match: ['roast dinner', 'sunday roast', 'roast'], calories: 800 },
  { label: 'Steak', match: ['steak'], calories: 450 },
  { label: 'Chicken breast', match: ['chicken breast', 'grilled chicken', 'chicken'], calories: 220 },
  { label: 'Fish fillet', match: ['salmon', 'cod', 'fish'], calories: 230 },
  { label: 'Chocolate bar', match: ['chocolate bar', 'chocolate'], calories: 230 },
  { label: 'Biscuit', match: ['biscuits', 'biscuit', 'cookie'], calories: 75 },
  { label: 'Packet of crisps', match: ['crisps', 'chips packet'], calories: 180 },
  { label: 'Slice of cake', match: ['cake'], calories: 350 },
  { label: 'Doughnut', match: ['doughnut', 'donut'], calories: 250 },
  { label: 'Ice cream (scoop)', match: ['ice cream'], calories: 140 },
  { label: 'Cup of tea with milk', match: ['cup of tea', 'tea'], calories: 20 },
  { label: 'Coffee (black)', match: ['black coffee', 'americano', 'espresso'], calories: 5 },
  { label: 'Latte', match: ['latte'], calories: 150 },
  { label: 'Cappuccino', match: ['cappuccino'], calories: 120 },
  { label: 'Glass of wine', match: ['wine'], calories: 160 },
  { label: 'Pint of lager', match: ['pint of lager', 'pint of beer', 'lager', 'beer', 'pint'], calories: 200 },
  { label: 'Glass of orange juice', match: ['orange juice', 'juice'], calories: 110 },
  { label: 'Fizzy drink (can)', match: ['coke', 'cola', 'fizzy drink', 'soda'], calories: 140 },
  { label: 'Glass of milk', match: ['glass of milk', 'milk'], calories: 120 },
  { label: 'Protein shake', match: ['protein shake', 'shake'], calories: 200 },
  { label: 'Smoothie', match: ['smoothie'], calories: 180 },
]

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, couple: 2, few: 3, half: 0.5,
}

export interface ParsedFood {
  label: string
  calories: number
  quantity: number
}

/** Quantity is the last number/number-word appearing before the match position */
function quantityBefore(segment: string, matchIndex: number): number {
  const before = segment.slice(0, matchIndex)
  let qty = 1
  for (const token of before.split(/[\s-]+/)) {
    const clean = token.replace(/[^a-z0-9.]/g, '')
    if (!clean) continue
    if (clean in NUMBER_WORDS) qty = NUMBER_WORDS[clean]
    else if (/^\d+(\.\d+)?$/.test(clean)) qty = Math.min(20, parseFloat(clean))
  }
  return qty
}

export function parseFood(transcript: string): ParsedFood[] {
  let text = transcript.toLowerCase()
  // protect compound phrases containing connectors ("fish and chips")
  // before splitting segments on those connectors
  for (const def of FOOD_DB) {
    for (const phrase of def.match) {
      if (phrase.includes(' and ')) {
        text = text.replaceAll(phrase, phrase.replaceAll(' and ', ' & '))
      }
    }
  }
  // split into food segments on common connectors
  const segments = text.split(/,|\band\b|\bwith a\b|\bplus\b|\bthen\b/).map((s) => s.trim()).filter(Boolean)
  const results: ParsedFood[] = []

  for (const segment of segments) {
    // find the food whose match phrase occurs in this segment; longest phrase wins
    let best: { def: FoodDef; phrase: string; index: number } | null = null
    for (const def of FOOD_DB) {
      for (const phrase of def.match) {
        const index = segment.indexOf(phrase)
        if (index === -1) continue
        // word-boundary check so "tea" doesn't match inside "steak"
        const before = segment[index - 1]
        const after = segment[index + phrase.length]
        if ((before && /[a-z]/.test(before)) || (after && /[a-z]/.test(after))) continue
        if (!best || phrase.length > best.phrase.length) best = { def, phrase, index }
      }
    }
    if (best) {
      const quantity = quantityBefore(segment, best.index)
      results.push({
        label: best.def.label,
        calories: Math.round(best.def.calories * quantity),
        quantity,
      })
    }
  }
  return results
}
