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

export interface RawPlace {
  introduction?: string | null;
  email?: string | null;
  place_type?: string | null;
  search_query?: string | null;
  reviews_count?: number | null;
  reviews_average?: number | null;
  category_id?: string | null;
  category_name?: string | null;
  scraped_at?: string | null;
  name?: string | null;
  job_id?: string | null;
  website?: string | null;
  address?: string | null;
  phone_number?: string | null;
  id?: string | null;
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
  reviews_count?: number | null;
  introduction?: string | null;
  search_query?: string | null;
  scraped_at?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  job_id?: string | null;
}

export function normalizePlace(r: RawPlace, idx = 0): Place {
  const clean = (v?: string | null) => (v == null ? null : String(v).trim() || null);
  return {
    id: r.id ?? `${r.job_id ?? "p"}-${r.name ?? "x"}-${idx}`,
    name: clean(r.name) ?? "Unnamed",
    address: clean(r.address),
    website: clean(r.website),
    phone: clean(r.phone_number),
    email: clean(r.email),
    place_type: clean(r.place_type),
    rating: r.reviews_average ?? null,
    reviews_count: r.reviews_count ?? null,
    introduction: clean(r.introduction),
    search_query: clean(r.search_query),
    scraped_at: r.scraped_at ?? null,
    category_id: r.category_id ?? null,
    category_name: r.category_name ?? null,
    job_id: r.job_id ?? null,
  };
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
