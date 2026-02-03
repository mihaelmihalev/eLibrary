import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE } from "./client";

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

export type RequestPlanResponse = { requestId: number; status: string };

export type PaymentMethod = "Cash" | "Card" | "BankTransfer";
export type PayDto = {
  method: PaymentMethod;
  paymentReference?: string | null;
};
export type PayResponse = { paymentId: number; status: string };

export type PendingRequest = {
  id: number;
  userId: string;
  plan: string;
  requestedAt: string;
};

export type ApproveResponse = {
  requestId: number;
  paymentId: number;
  receiptNumber: string;
  receiptPdf: string;
  subscriptionEnd: string;
};

export type RejectDto = { note?: string | null };

export type AdminActiveSub = {
  id: number;
  userId: string;
  userName?: string | null;
  email?: string | null;
  plan: string;
  startDate: string;
  endDate: string;
};

export function apiOrigin() {
  return API_BASE.replace(/\/api\/?$/i, "");
}

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

export function useRequestPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (planId: number) =>
      (await api.post<RequestPlanResponse>(`/Subscriptions/request/${planId}`))
        .data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-requests"] });
    },
  });
}

export function usePayRequest() {
  return useMutation({
    mutationFn: async (p: { requestId: number; dto: PayDto }) =>
      (await api.post<PayResponse>(`/Subscriptions/pay/${p.requestId}`, p.dto))
        .data,
  });
}

export function usePendingRequests() {
  return useQuery({
    queryKey: ["admin-pending-requests"],
    queryFn: async () =>
      (await api.get<PendingRequest[]>("/admin/subscriptions/pending")).data,
  });
}

export function useAdminActiveSubscriptions() {
  return useQuery({
    queryKey: ["admin-active-subs"],
    queryFn: async () =>
      (await api.get<AdminActiveSub[]>("/admin/subscriptions/active")).data,
  });
}

export function useApproveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: number) =>
      (
        await api.post<ApproveResponse>(
          `/admin/subscriptions/approve/${requestId}`
        )
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pending-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-active-subs"] });
    },
  });
}

export function useRejectRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { requestId: number; dto: RejectDto }) =>
      (await api.post(`/admin/subscriptions/reject/${p.requestId}`, p.dto))
        .data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pending-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-active-subs"] });
    },
  });
}
