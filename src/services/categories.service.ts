import { api } from "./api";
import type { Category, CreateCategoryPayload, Place } from "./types";

export const CategoriesService = {
  list: async (): Promise<Category[]> => {
    const { data } = await api.get("/categories");
    return Array.isArray(data) ? data : data?.items ?? [];
  },
  get: async (id: string): Promise<Category> => {
    const { data } = await api.get(`/categories/${id}`);
    return data;
  },
  create: async (payload: CreateCategoryPayload): Promise<Category> => {
    const { data } = await api.post("/categories", payload);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },
  places: async (id: string): Promise<Place[]> => {
    const { data } = await api.get(`/categories/${id}/places`);
    return Array.isArray(data) ? data : data?.items ?? [];
  },
};
