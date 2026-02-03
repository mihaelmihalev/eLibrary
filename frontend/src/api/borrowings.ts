import { api } from "./client";

export type BorrowItem = {
  id: number;
  bookId: number;
  bookTitle: string;
  author: string;
  borrowedAt: string;
  returnedAt?: string | null;
};

export async function getMyActive(): Promise<BorrowItem[]> {
  const { data } = await api.get("/borrowings/active");
  return data;
}

export async function getMyHistory(): Promise<BorrowItem[]> {
  const { data } = await api.get("/borrowings/history");
  return data;
}

export async function borrowBook(bookId: number): Promise<{ id: number }> {
  const { data } = await api.post(`/borrowings/${bookId}`);
  return data;
}

export async function returnBook(borrowingId: number): Promise<void> {
  await api.post(`/borrowings/${borrowingId}/return`);
}
