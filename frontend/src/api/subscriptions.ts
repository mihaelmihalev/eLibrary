import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export type SubscriptionPlan = {
  id: number;
  name: string;
  durationDays: number;
  price: number;
};

export type MySubscriptionDto = {
  id: number;
  planId: number;
  startDate: string;
  endDate: string;
} | null;

export type AdminActiveSub = {
  id: number;
  userId: string;
  userName?: string | null;
  email?: string | null;
  plan: string;
  startDate: string;
  endDate: string;
};

export type PurchaseDto = {
  planId: number;
  cardToken: string; 
};

export type PurchaseResponse = {
  requestId: number;
  paymentId: number;
  status: "Paid" | "Rejected";
  subscriptionEnd?: string | null;
};

export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: async () =>
      (await api.get<SubscriptionPlan[]>("/Subscriptions/plans")).data,
  });
}

export function useMySubscription() {
  return useQuery({
    queryKey: ["my-subscription"],
    queryFn: async () =>
      (await api.get<MySubscriptionDto>("/Subscriptions/me")).data,
  });
}

export function useAdminActiveSubscriptions() {
  return useQuery({
    queryKey: ["admin-active-subs"],
    queryFn: async () =>
      (await api.get<AdminActiveSub[]>("/admin/subscriptions/active")).data,
  });
}

export function usePurchasePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: PurchaseDto) =>
      (await api.post<PurchaseResponse>(`/Subscriptions/purchase`, dto)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
      qc.invalidateQueries({ queryKey: ["admin-active-subs"] });
    },
  });
}

export type AdminPaymentStatus = "Paid" | "Rejected";

export type AdminPaymentRow = {
  id: number;
  createdAt: string | null;
  paidAt: string | null;
  amount: number;
  method: string;
  status: AdminPaymentStatus;
  userId: string;
  userName?: string | null;
  email?: string | null;
  plan: string;
};

export function useAdminPayments(params?: {
  status?: AdminPaymentStatus | "All";
  limit?: number;
}) {
  const status = params?.status ?? "All";
  const limit = params?.limit ?? 100;

  return useQuery({
    queryKey: ["admin-payments", status, limit],
    queryFn: async () => {
      const q: Record<string, string> = {};
      if (status !== "All") q.status = status;
      q.limit = String(limit);

      const qs = new URLSearchParams(q).toString();
      const url = `/admin/payments${qs ? `?${qs}` : ""}`;

      return (await api.get<AdminPaymentRow[]>(url)).data;
    },
  });
}
