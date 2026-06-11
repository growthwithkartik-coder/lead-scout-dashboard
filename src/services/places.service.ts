import { api } from "./api";
import type { Place } from "./types";

export const PlacesService = {
  list: async (params?: { category_id?: string }): Promise<Place[]> => {
    const { data } = await api.get("/places", { params });
    return Array.isArray(data) ? data : data?.items ?? [];
  },
};

export const HealthService = {
  check: async (): Promise<{ status: string }> => {
    const { data } = await api.get("/health");
    return data;
  },
};
