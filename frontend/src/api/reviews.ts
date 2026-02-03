import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export type Review = {
  id: number;
  bookId: number;
  userId: string;
  userName: string;
  rating: number; // 1..5
  comment: string;
  createdAt: string;
  updatedAt?: string | null;
};

export function useReviews(bookId: number) {
  return useQuery({
    queryKey: ["reviews", bookId],
    queryFn: async () => {
      const res = await api.get<Review[]>(`/books/${bookId}/reviews`);
      return res.data;
    },
  });
}

export function useUpsertReview(bookId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { rating: number; comment: string }) => {
      const res = await api.post<Review>(`/books/${bookId}/reviews`, payload);
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["reviews", bookId] });
      await qc.invalidateQueries({ queryKey: ["books"] });
    },
  });
}

export function useDeleteReview(bookId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: number) => {
      await api.delete(`/books/${bookId}/reviews/${reviewId}`);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["reviews", bookId] });
      await qc.invalidateQueries({ queryKey: ["books"] });
    },
  });
}
