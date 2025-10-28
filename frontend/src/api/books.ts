import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export type Book = {
  id: number;
  title: string;
  author?: string;
  genre?: string;
  isbn?: string | null;
  publishedOn?: string | null;
  copiesTotal: number;
  copiesAvailable: number;
};

export type BookQuery = {
  search?: string;
  author?: string;
  genre?: string;
  availableOnly?: boolean;
  sortBy?: "id" | "title" | "author" | "genre" | "publishedOn" | "copies";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type PagedBooks = {
  items: Book[];
  totalCount: number;
  page: number;
  pageSize: number;
};

const key = (q: BookQuery) => ["books", q];

export function useBooks(q: BookQuery) {
  return useQuery({
    queryKey: key(q),
    queryFn: async () => {
      const res = await api.get<PagedBooks>("/Books", {
        params: {
          search: q.search || undefined,
          author: q.author || undefined,
          genre: q.genre || undefined,
          availableOnly: q.availableOnly || undefined,
          sortBy: q.sortBy || undefined,
          sortDir: q.sortDir || undefined,
          page: q.page ?? 1,
          pageSize: q.pageSize ?? 10,
        },
      });
      return res.data;
    },
    placeholderData: prev => prev,
  });
}

export function useCreateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: Omit<Book, "id">) =>
      api.post<Book>("/Books", b).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useUpdateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: Book) => api.put(`/Books/${b.id}`, b),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/Books/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });
}
