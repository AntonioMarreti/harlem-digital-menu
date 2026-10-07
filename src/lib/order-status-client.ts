export const ORDER_STATUS_CONFLICT_MESSAGE = 'Заказ уже изменён другим сотрудником. Данные обновлены.';

export async function refreshAfterOrderStatusConflict(
  status: number,
  code: unknown,
  refresh: () => Promise<unknown>
) {
  if (status !== 409 || code !== 'ORDER_STATUS_CONFLICT') return null;
  await refresh();
  return ORDER_STATUS_CONFLICT_MESSAGE;
}
