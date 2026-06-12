import { api } from "./api";
import { normalizePlace, type Place, type RawPlace } from "./types";

function extract(data: any): RawPlace[] {
  if (Array.isArray(data)) return data;
  return data?.places ?? data?.items ?? data?.results ?? [];
}

export const PlacesService = {
  list: async (params?: { category_id?: string }): Promise<Place[]> => {
    const { data } = await api.get("/places", { params });
    return extract(data).map((r, i) => normalizePlace(r, i));
  },
};

export const HealthService = {
  check: async (): Promise<{ status: string }> => {
    const { data } = await api.get("/health");
    return data;
  },
};
