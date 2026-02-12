import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export type Book = {
  id: number;
  title: string;
  author?: string;
  genre?: string;
  isbn?: string | null;
  coverUrl?: string | null;
  publishedOn?: string | null;
  copiesTotal: number;
  copiesAvailable: number;
  avgRating?: number;
  reviewsCount?: number;
};

export type BookQuery = {
  search?: string;
  author?: string;
  genre?: string;
  availableOnly?: boolean;

  sortBy?:
    | "id"
    | "title"
    | "author"
    | "genre"
    | "publishedOn"
    | "copiesAvailable"
    | "avgRating"
    | "newest"
    | "rating"
    | "reviews"
    | "available"
    | "borrowed";

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

function mapSortDir(
  _sortBy?: BookQuery["sortBy"],
  sortDir?: BookQuery["sortDir"],
): BookQuery["sortDir"] | undefined {
  return sortDir;
}

export function useBooks(q: BookQuery) {
  const sortDirMapped = mapSortDir(q.sortBy, q.sortDir);

  return useQuery({
    queryKey: key({ ...q, sortDir: sortDirMapped }),
    queryFn: async () => {
      const res = await api.get<PagedBooks>("/Books", {
        params: {
          search: q.search || undefined,
          author: q.author || undefined,
          genre: q.genre || undefined,
          availableOnly: q.availableOnly || undefined,

          sortBy: q.sortBy || undefined,
          sortDir: sortDirMapped || undefined,

          page: q.page ?? 1,
          pageSize: q.pageSize ?? 10,
        },
      });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useCreateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: Omit<Book, "id">) =>
      api.post<Book>("/Books", b).then((r) => r.data),
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

export async function uploadBookCover(bookId: number, file: File) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await api.post<{ coverUrl: string }>(
    `/Books/${bookId}/cover`,
    fd,
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  return res.data.coverUrl;
}
