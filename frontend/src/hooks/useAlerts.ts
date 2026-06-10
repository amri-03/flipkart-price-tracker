import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../services/api.client";

export interface Alert {
  id: string;
  productId: string;
  targetPrice: number;
  notificationChannel: "TELEGRAM" | "DISCORD" | "EMAIL";
  isActive: boolean;
  lastTriggeredAt: string | null;
  cooldownHours: number;
  createdAt: string;
}

export interface CreateAlertPayload {
  productId: string;
  targetPrice: number;
  notificationChannel: "TELEGRAM" | "DISCORD" | "EMAIL";
  cooldownHours?: number;
}

export interface UpdateAlertPayload {
  id: string;
  targetPrice?: number;
  isActive?: boolean;
  cooldownHours?: number;
}

/**
 * Fetches all alerts configured for a specific product.
 */
export function useProductAlerts(productId: string) {
  return useQuery<Alert[]>({
    queryKey: ["product-alerts", productId],
    queryFn: async () => {
      const response = await apiClient.get<Alert[]>(`/products/${productId}/alerts`);
      return response.data;
    },
    enabled: !!productId,
  });
}

/**
 * Mutation to create an active alert trigger.
 */
export function useCreateAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateAlertPayload) => {
      const { productId, ...body } = payload;
      const response = await apiClient.post<Alert>(`/products/${productId}/alerts`, body);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-alerts", variables.productId] });
    },
  });
}

/**
 * Mutation to update or toggle status of an alert.
 */
export function useUpdateAlert(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateAlertPayload) => {
      const { id, ...body } = payload;
      const response = await apiClient.put<Alert>(`/alerts/${id}`, body);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-alerts", productId] });
    },
  });
}

/**
 * Mutation to delete an alert.
 */
export function useDeleteAlert(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/alerts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-alerts", productId] });
    },
  });
}
