import { useQuery } from "@tanstack/react-query";
import { api } from "./client";

export type NotificationsCountDto = { count: number };

export function useUnreadNotificationsCount(enabled: boolean) {
  return useQuery({
    queryKey: ["notifications-count"],
    enabled,
    queryFn: async () =>
      (await api.get<NotificationsCountDto>("/notifications/count", { params: { unreadOnly: true } })).data,
    refetchInterval: 15000,
  });
}
