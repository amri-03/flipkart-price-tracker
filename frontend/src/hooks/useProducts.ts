import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../services/api.client";

export interface Product {
  id: string;
  url: string;
  platformId: string;
  title: string;
  imageUrl: string | null;
  currentPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface PriceHistoryPoint {
  id: string;
  productId: string;
  price: number;
  recordedAt: string;
}

/**
 * Fetches all tracked products from the database.
 */
export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await apiClient.get<Product[]>("/products");
      return response.data;
    },
  });
}

/**
 * Retrieves a single product card details.
 */
export function useProduct(id: string) {
  return useQuery<Product>({
    queryKey: ["product", id],
    queryFn: async () => {
      const response = await apiClient.get<Product>(`/products/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Retrieves the historical chart points for a product.
 */
export function useProductHistory(id: string) {
  return useQuery<PriceHistoryPoint[]>({
    queryKey: ["product-history", id],
    queryFn: async () => {
      const response = await apiClient.get<{ history: PriceHistoryPoint[] }>(`/products/${id}/history`);
      return response.data.history;
    },
    enabled: !!id,
  });
}

/**
 * Mutation to track a new product URL.
 */
export function useTrackProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (url: string) => {
      const response = await apiClient.post<Product>("/products", { url });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

/**
 * Mutation to force refresh / scrape an item immediately.
 */
export function useRefreshProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<Product>(`/products/${id}/refresh`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", data.id] });
      queryClient.invalidateQueries({ queryKey: ["product-history", data.id] });
    },
  });
}

/**
 * Mutation to untrack and delete a product.
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
