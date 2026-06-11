import { api, API_BASE_URL } from "./api";
import type { ScrapeJob, ScrapePayload, ScrapeResult } from "./types";

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
    return data;
  },
  streamUrl: (jobId: string) => `${API_BASE_URL}/scrape/${jobId}/stream`,
};
