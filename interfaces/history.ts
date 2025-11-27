export interface History {
  id: number
  platform: string
  query: string
  content?: string
  datetime: string
  type?:string
}

export interface NavHistoriesProps {
  histories: History[]
  onSelect: (query: History) => void
  onDelete: (id: number) => void
}