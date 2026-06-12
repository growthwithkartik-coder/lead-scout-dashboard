import { api, API_BASE_URL } from "./api";
import { normalizePlace, type RawPlace } from "./types";
import type { ScrapeJob, ScrapePayload, ScrapeResult } from "./types";

function extractPlaces(data: any): RawPlace[] {
  if (Array.isArray(data)) return data;
  return data?.places ?? data?.results ?? data?.items ?? data?.data ?? [];
}

export const ScrapeService = {
  start: async (payload: ScrapePayload): Promise<ScrapeJob> => {
    const { data } = await api.post("/scrape", payload);
    return data;
  },
  status: async (jobId: string): Promise<ScrapeJob> => {
    const { data } = await api.get(`/scrape/${jobId}/status`);
    return data;
  },
  result: async (jobId: string): Promise<ScrapeResult> => {
    const { data } = await api.get(`/scrape/${jobId}/result`);
    const raw = extractPlaces(data);
    const results = raw.map((r, i) => normalizePlace(r, i));
    const total =
      typeof data?.count === "number" ? data.count :
      typeof data?.total === "number" ? data.total :
      results.length;
    return { total, results };
  },
  streamUrl: (jobId: string) => `${API_BASE_URL}/scrape/${jobId}/stream`,
};
