import type { MenuItem } from './mock-data';

export type CanonicalItemOptions = {
  choice?: string;
  notes?: string;
};

export type ItemOptionsValidation =
  | { ok: true; value: CanonicalItemOptions | null }
  | { ok: false; code: string; error: string };

const MAX_ITEM_NOTES_LENGTH = 500;

export function getChoiceAvailabilityId(item: MenuItem, choiceLabel: string) {
  return item.choiceAvailabilityScope === 'shared_tea'
    ? `tea::${choiceLabel}`
    : `${item.id}::${choiceLabel}`;
}

/** Validates user-supplied options against the canonical menu item and stop-list. */
export function validateCanonicalItemOptions(
  item: MenuItem,
  options: unknown,
  availability: ReadonlyMap<string, boolean>
): ItemOptionsValidation {
  if (options === undefined || options === null) {
    options = {};
  }

  if (typeof options !== 'object' || Array.isArray(options)) {
    return { ok: false, code: 'INVALID_ITEM_OPTIONS', error: 'Invalid item options' };
  }

  const candidate = options as { choice?: unknown; notes?: unknown };
  const rawNotes = candidate.notes;
  if (rawNotes !== undefined && rawNotes !== null && typeof rawNotes !== 'string') {
    return { ok: false, code: 'INVALID_ITEM_NOTES', error: 'Invalid item notes' };
  }

  const notes = typeof rawNotes === 'string' ? rawNotes.trim() : '';
  if (notes.length > MAX_ITEM_NOTES_LENGTH) {
    return { ok: false, code: 'INVALID_ITEM_NOTES', error: 'Item notes are too long' };
  }

  const hasChoices = Boolean(item.choices?.length);
  const rawChoice = candidate.choice;
  if (rawChoice !== undefined && rawChoice !== null && typeof rawChoice !== 'string') {
    return { ok: false, code: 'INVALID_CHOICE', error: 'Неизвестный вариант товара' };
  }
  const choiceText = typeof rawChoice === 'string' ? rawChoice.trim() : '';

  if (hasChoices && !choiceText) {
    return {
      ok: false,
      code: 'CHOICE_REQUIRED',
      error: `Выберите вариант для товара «${item.name}»`,
    };
  }

  if (!hasChoices && rawChoice !== undefined && rawChoice !== null && rawChoice !== '') {
    return { ok: false, code: 'INVALID_CHOICE', error: 'Этот товар не поддерживает выбор варианта' };
  }

  let choice: string | undefined;
  if (hasChoices) {
    const canonicalChoice = item.choices!.find((candidateChoice) => candidateChoice.label === choiceText);
    if (!canonicalChoice) {
      return { ok: false, code: 'INVALID_CHOICE', error: 'Неизвестный вариант товара' };
    }

    const availabilityId = getChoiceAvailabilityId(item, canonicalChoice.label);
    if (availability.get(availabilityId) === false) {
      return {
        ok: false,
        code: 'CHOICE_UNAVAILABLE',
        error: `Вариант «${canonicalChoice.label}» для товара «${item.name}» временно недоступен`,
      };
    }
    choice = canonicalChoice.label;
  }

  const value: CanonicalItemOptions = {};
  if (choice) value.choice = choice;
  if (notes) value.notes = notes;
  return { ok: true, value: Object.keys(value).length ? value : null };
}

/** Structured choice display with a display-only fallback for older saved orders. */
export function getDisplayChoice(options: unknown): string | null {
  let value = options;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const choice = (value as { choice?: unknown }).choice;
  return typeof choice === 'string' && choice.trim() ? choice.trim() : null;
}

export function getDisplayNotes(options: unknown): string | null {
  let value = options;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const notes = (value as { notes?: unknown }).notes;
  return typeof notes === 'string' && notes.trim() ? notes.trim() : null;
}
