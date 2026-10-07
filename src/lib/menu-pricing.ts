import { menuItems } from './mock-data';

export const HARLEM_TIME_ZONE = 'Europe/Moscow';

const DAYTIME_HOOKAH_PRICES: Record<string, number> = {
  item_1: 700,
  item_2: 999,
};
const DAYTIME_START_SECONDS = 13 * 60 * 60;
const DAYTIME_END_SECONDS = 17 * 60 * 60;
const SECONDS_PER_DAY = 24 * 60 * 60;

const menuItemById = new Map(menuItems.map((item) => [item.id, item]));
const harlemClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: HARLEM_TIME_ZONE,
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function getHarlemSecondsSinceMidnight(at: Date): number {
  const parts = Object.fromEntries(
    harlemClock.formatToParts(at).map((part) => [part.type, part.value])
  );

  return Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second);
}

export function isHarlemDaytime(at: Date): boolean {
  const seconds = getHarlemSecondsSinceMidnight(at);
  return seconds >= DAYTIME_START_SECONDS && seconds < DAYTIME_END_SECONDS;
}

export function getCanonicalMenuItemPrice(itemId: string, at: Date): number | null {
  const item = menuItemById.get(itemId);
  if (!item) return null;

  return isHarlemDaytime(at) && itemId in DAYTIME_HOOKAH_PRICES
    ? DAYTIME_HOOKAH_PRICES[itemId]
    : item.price;
}

export function getCanonicalOrderItemPrice(
  submittedItem: { menuItemId?: unknown; id?: unknown; price?: unknown },
  at: Date
): number | null {
  const itemId = typeof submittedItem.menuItemId === 'string'
    ? submittedItem.menuItemId
    : typeof submittedItem.id === 'string'
      ? submittedItem.id
      : null;

  return itemId ? getCanonicalMenuItemPrice(itemId, at) : null;
}

// The guest clock is anchored to server time; wake it at the next local price boundary.
export function millisecondsUntilNextHookahPriceChange(at: Date): number {
  const seconds = getHarlemSecondsSinceMidnight(at);
  const nextBoundary = seconds < DAYTIME_START_SECONDS
    ? DAYTIME_START_SECONDS
    : seconds < DAYTIME_END_SECONDS
      ? DAYTIME_END_SECONDS
      : SECONDS_PER_DAY + DAYTIME_START_SECONDS;
  return (nextBoundary - seconds) * 1000 - at.getMilliseconds();
}
