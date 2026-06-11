export interface Category {
  id: string;
  name: string;
  description?: string | null;
  total_places?: number;
  created_at?: string;
  last_scraped?: string | null;
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
}

export interface Place {
  id: string;
  name: string;
  address?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  place_type?: string | null;
  rating?: number | null;
  search_query?: string | null;
  scraped_at?: string | null;
  category_id?: string | null;
  category_name?: string | null;
}

export interface ScrapePayload {
  search: string;
  total: number;
  category_id: string;
}

export interface ScrapeJob {
  job_id: string;
  status: "pending" | "running" | "done" | "error" | string;
  message?: string;
}

export interface ScrapeResult {
  total: number;
  results: Place[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page?: number;
  page_size?: number;
}
