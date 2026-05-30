/** 模擬 REST 延遲與偶發錯誤（開發用） */
export async function mockFetch<T>(data: T, options?: { delayMs?: number; fail?: boolean }): Promise<T> {
  const delayMs = options?.delayMs ?? 500;
  await new Promise((r) => setTimeout(r, delayMs));
  if (options?.fail) {
    throw new Error('無法載入資料，請稍後再試。');
  }
  return data;
}
