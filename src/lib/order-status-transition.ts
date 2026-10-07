export const ORDER_STATUS_TRANSITIONS = {
  new: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['delivered'],
  delivered: ['closed'],
  closed: [],
  cancelled: [],
} as const;

export type OrderStatus = keyof typeof ORDER_STATUS_TRANSITIONS;

export type OrderStatusTransitionResult<T> =
  | { kind: 'updated'; value: T }
  | { kind: 'invalid_transition' }
  | { kind: 'conflict' };

export async function transitionOrderStatus<T>(
  expectedStatus: OrderStatus,
  requestedStatus: string,
  conditionalUpdate: (expectedStatus: OrderStatus, requestedStatus: OrderStatus) => Promise<T | null>,
  clientExpectedStatus: string = expectedStatus
): Promise<OrderStatusTransitionResult<T>> {
  if (clientExpectedStatus !== expectedStatus) return { kind: 'conflict' };
  if (!(ORDER_STATUS_TRANSITIONS[expectedStatus] as readonly string[]).includes(requestedStatus)) {
    return { kind: 'invalid_transition' };
  }

  const updated = await conditionalUpdate(expectedStatus, requestedStatus as OrderStatus);
  return updated ? { kind: 'updated', value: updated } : { kind: 'conflict' };
}
