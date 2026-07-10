import type { GoalArea } from '../lib/types'

export const GOAL_AREAS: GoalArea[] = [
  {
    id: 'health',
    name: 'Health & Fitness',
    tagline: 'Physical health, nutrition, exercise, sleep and well-being',
    icon: '❤️‍🔥',
    gradient: 'from-[#ff375f] to-[#ff9f0a]',
    examples: ['Lose weight', 'Run a 5k', 'Sleep 8 hours', 'Eat better'],
  },
  {
    id: 'wealth',
    name: 'Wealth & Finance',
    tagline: 'Income, savings, investments and financial independence',
    icon: '💷',
    gradient: 'from-[#32d74b] to-[#00c7be]',
    examples: ['Save a deposit', 'Clear a debt', 'Build an emergency fund'],
  },
  {
    id: 'career',
    name: 'Career & Work',
    tagline: 'Professional growth, skills and job satisfaction',
    icon: '💼',
    gradient: 'from-[#0a84ff] to-[#5e5ce6]',
    examples: ['Get promoted', 'Start a business', 'Learn a new skill'],
  },
  {
    id: 'family',
    name: 'Family & Relationships',
    tagline: 'Partner, children, friends and social connection',
    icon: '👨‍👩‍👧',
    gradient: 'from-[#ff9f0a] to-[#ff375f]',
    examples: ['Be a better parent', 'Reconnect with friends', 'Date night weekly'],
  },
  {
    id: 'personal',
    name: 'Personal Development',
    tagline: 'Learning, creativity, emotional intelligence and growth',
    icon: '📚',
    gradient: 'from-[#5e5ce6] to-[#bf5af2]',
    examples: ['Learn a language', 'Read 12 books', 'Improve your IQ'],
  },
  {
    id: 'spirituality',
    name: 'Spirituality & Mindfulness',
    tagline: 'Faith, meditation and connection to a higher purpose',
    icon: '🧘',
    gradient: 'from-[#30b0c7] to-[#0a84ff]',
    examples: ['Meditate daily', 'Practise gratitude', 'Find calm'],
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle & Leisure',
    tagline: 'Travel, recreation, fun and quality of life',
    icon: '🏝️',
    gradient: 'from-[#00c7be] to-[#32d74b]',
    examples: ['Plan a big trip', 'Take up a hobby', 'More fun, less scrolling'],
  },
  {
    id: 'community',
    name: 'Community & Contribution',
    tagline: 'Volunteering, philanthropy and helping others',
    icon: '🤝',
    gradient: 'from-[#ff9f0a] to-[#bf5af2]',
    examples: ['Volunteer monthly', 'Mentor someone', 'Give back locally'],
  },
  {
    id: 'habits',
    name: 'Break Bad Habits',
    tagline: 'Quit smoking, overeating, swearing — build good habits instead',
    icon: '🚭',
    gradient: 'from-[#6e6e73] to-[#1d1d1f]',
    examples: ['Quit smoking', 'Cut down drinking', 'Stop procrastinating'],
  },
  {
    id: 'legacy',
    name: 'Legacy & Life Purpose',
    tagline: 'The long-term impact you want your life to have',
    icon: '🌟',
    gradient: 'from-[#bf5af2] to-[#ff375f]',
    examples: ['Write your book', 'Define your purpose', 'Build something that lasts'],
  },
]

export function getArea(id: string): GoalArea {
  return GOAL_AREAS.find((a) => a.id === id) ?? GOAL_AREAS[0]
}
