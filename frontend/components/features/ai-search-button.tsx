import VisualAISearch from './visual-ai-search'

interface AISearchProps {
  userStatus?: 'lost' | 'found'
}

export default function AISearchButton({ userStatus = 'lost' }: AISearchProps) {
  return <VisualAISearch />
}