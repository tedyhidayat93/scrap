export type ObjectType<T = any> = Record<string, T>;
export type LangType = "id" | "en";
export interface Summary {
  id: string;
  en: string;
  input?: string;
}

export interface DateOptions {
  monthType?: "long" | "short" | "narrow" | "numeric" | "2-digit";
  time?: "2-digit" | "numeric" | null;
  weekday?: boolean;
  timeOnly?: boolean;
  lang?: LangType;
}

export interface PaginationType {
  total_items: number;
  total_pages: number;
  current_page: number;
  page_size: number;

  // old compatibility
  currentPage?: number;
  totalPages?: number;
  perPage?: number;
  total?: number;
  count?: number;
  from?: number;
  to?: number;
}
export interface PaginationLink {
  url?: null | string;
  label: string;
  active?: boolean;
}
export interface PaginationResponse {
  perPage: number;
  pageCurrent: number;
  pageLast: number;
  dataFrom: number;
  dataTo: number;
  dataTotal: number;
  navigation?: {
    nextUrl: string | null;
    prevUrl: string | null;
    firstUrl: string | null;
    lastUrl: string | null;
  };
  links?: PaginationLink[];
}

export interface ExpiringItem<T> {
  value: T;
  expiration: number;
}

export interface GraphData {
  nodes: NodeData[];
  edges: EdgeData[];
}

export interface EdgeData {
  source: string;
  target: string;
  attributes: ObjectType;
}

export interface NodeData {
  key: string;
  attributes: ObjectType;
}

export type PlatformType = "tiktok" | "youtube" | "instagram" | "threads" | "facebook" | "twitter" | ""; // add your platforms
export type QueryType = "username" | "video" | "keyword"