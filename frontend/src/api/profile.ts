import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export type ProfileSummaryDto = {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    phone: string | null;
  };
  subscription: {
    planName: string;
    startDate: string;
    endDate: string;
  } | null;
  activity: {
    borrowingsCount: number;
    activeBorrowingsCount: number;
    reviewsCount: number;
    score: number;

    lastBorrowing: {
      bookId: number;
      title: string;
      author?: string | null;
      borrowedAt: string;
      returnedAt?: string | null;
    } | null;

    lastReview: {
      bookId: number;
      title: string;
      author?: string | null;
      rating: number;
      createdAt: string;
    } | null;
  };
};

export function useProfileSummary() {
  return useQuery({
    queryKey: ["profile-summary"],
    queryFn: async () => (await api.get<ProfileSummaryDto>("/profile/summary")).data,
  });
}

export type MyBorrowingRow = {
  borrowingId: number;
  bookId: number;
  title: string;
  author?: string | null;
  borrowedAt: string;
  dueAt: string;
  returnedAt?: string | null;

  isOverdue: boolean;
  daysLeft: number;
  overdueDays: number;

  fineAmount: number;
  finePaid: boolean;
};

type ActiveBorrowingApiRow = {
  id: number;
  bookId: number;
  borrowedAt: string;
  dueAt: string;
  isOverdue: boolean;
  daysLeft: number;
  overdueDays: number;
  bookTitle: string;
  author?: string | null;
};

type HistoryBorrowingApiRow = {
  id: number;
  bookId: number;
  borrowedAt: string;
  dueAt: string;
  returnedAt?: string | null;
  fineAmount: number;
  finePaid: boolean;
  wasOverdue: boolean;
  bookTitle: string;
  author?: string | null;
};

function mapActiveToMyRow(x: ActiveBorrowingApiRow): MyBorrowingRow {
  return {
    borrowingId: x.id,
    bookId: x.bookId,
    title: x.bookTitle,
    author: x.author ?? null,
    borrowedAt: x.borrowedAt,
    dueAt: x.dueAt,
    returnedAt: null,

    isOverdue: !!x.isOverdue,
    daysLeft: x.daysLeft ?? 0,
    overdueDays: x.overdueDays ?? 0,

    fineAmount: 0,
    finePaid: true,
  };
}

function mapHistoryToMyRow(x: HistoryBorrowingApiRow): MyBorrowingRow {
  return {
    borrowingId: x.id,
    bookId: x.bookId,
    title: x.bookTitle,
    author: x.author ?? null,
    borrowedAt: x.borrowedAt,
    dueAt: x.dueAt,
    returnedAt: x.returnedAt ?? null,

    isOverdue: false,
    daysLeft: 0,
    overdueDays: 0,

    fineAmount: x.fineAmount ?? 0,
    finePaid: !!x.finePaid,
  };
}

export function useMyBorrowings(params?: { activeOnly?: boolean; limit?: number }) {
  const activeOnly = params?.activeOnly ?? true;
  const limit = params?.limit ?? 20;

  return useQuery({
    queryKey: ["my-borrowings", activeOnly, limit],
    queryFn: async (): Promise<MyBorrowingRow[]> => {
      if (activeOnly) {
        const rows = (await api.get<ActiveBorrowingApiRow[]>("/borrowings/active")).data;
        return rows.slice(0, limit).map(mapActiveToMyRow);
      }

      const rows = (await api.get<HistoryBorrowingApiRow[]>("/borrowings/history")).data;
      return rows.slice(0, limit).map(mapHistoryToMyRow);
    },
  });
}

export function useReturnBorrowing() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (borrowingId: number) => {
      const res = await api.post(`/borrowings/${borrowingId}/return`);
      return res.data as { fineAmount?: number; finePaid?: boolean };
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["profile-summary"] });
      await qc.invalidateQueries({ queryKey: ["my-borrowings"] });
      await qc.invalidateQueries({ queryKey: ["books"] });
      await qc.invalidateQueries({ queryKey: ["profile-overview"] });
      await qc.invalidateQueries({ queryKey: ["profile-activity"] });
      await qc.invalidateQueries({ queryKey: ["notifications"] });
      await qc.invalidateQueries({ queryKey: ["notifications-count"] });
      await qc.invalidateQueries({ queryKey: ["fines-summary"] });
    },
  });
}

export type ReturnedBorrowingRow = {
  borrowingId: number;
  bookId: number;
  title: string;
  author?: string | null;
  borrowedAt: string;
  returnedAt: string;
  fineAmount: number;
};

export type ActivityPointDto = {
  year: number;
  month: number;
  borrowings: number;
  reviews: number;
  total: number;
};

export type ProfileOverviewDto = {
  returnedBorrowingsCount: number;
  returnedHistory: ReturnedBorrowingRow[];
  lastReturned?: ReturnedBorrowingRow | null;
  activity: ActivityPointDto[];
};

export function useProfileOverview(params?: { historyLimit?: number; months?: number }) {
  const historyLimit = params?.historyLimit ?? 50;
  const months = params?.months ?? 6;

  return useQuery({
    queryKey: ["profile-overview", historyLimit, months],
    queryFn: async () =>
      (await api.get<ProfileOverviewDto>("/profile/overview", { params: { historyLimit, months } })).data,
  });
}

export function useProfileActivity(params?: { months?: number }) {
  const months = params?.months ?? 6;

  return useQuery({
    queryKey: ["profile-activity", months],
    queryFn: async () => (await api.get<ActivityPointDto[]>("/profile/activity", { params: { months } })).data,
  });
}

export type FinesSummaryDto = { count: number; total: number };

export function useFinesSummary() {
  return useQuery({
    queryKey: ["fines-summary"],
    queryFn: async () => (await api.get<FinesSummaryDto>("/profile/fines/summary")).data,
  });
}

export function usePayAllFines() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post("/profile/fines/pay-all")).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["fines-summary"] });
      await qc.invalidateQueries({ queryKey: ["notifications"] });
      await qc.invalidateQueries({ queryKey: ["notifications-count"] });
      await qc.invalidateQueries({ queryKey: ["my-borrowings"] });
      await qc.invalidateQueries({ queryKey: ["profile-overview"] });
    },
  });
}
