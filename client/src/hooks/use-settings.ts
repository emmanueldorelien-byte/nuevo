import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";
import type { Settings, InsertSettings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useSettings() {
  return useQuery<Settings>({
    queryKey: [api.settings.get.path],
  });
}

export function useUpdateSettings() {
  return useMutation({
    mutationFn: async (updates: Partial<InsertSettings>) => {
      const res = await apiRequest("PUT", api.settings.update.path, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.settings.get.path] });
    },
  });
}
