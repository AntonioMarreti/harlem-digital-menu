import assert from 'node:assert/strict';
import test from 'node:test';
import { menuItems } from '../src/lib/mock-data';
import {
  getChoiceAvailabilityId,
  getDisplayChoice,
  getDisplayNotes,
  validateCanonicalItemOptions,
} from '../src/lib/menu-choices';

const item = (id: string) => {
  const found = menuItems.find((menuItem) => menuItem.id === id);
  assert.ok(found, `expected canonical menu item ${id}`);
  return found;
};

test('server validation requires a structured choice and ignores choice-like notes', () => {
  const tea = item('tea_1');
  const label = tea.choices![0].label;
  assert.deepEqual(
    validateCanonicalItemOptions(
      tea,
      { notes: `Сорт: ${label}` },
      new Map([[`tea::${label}`, false]])
    ),
    {
      ok: false,
      code: 'CHOICE_REQUIRED',
      error: 'Выберите вариант для товара «Чай 500 мл»',
    }
  );
});

test('server rejects invented choices and choices on products without choices', () => {
  const invented = validateCanonicalItemOptions(item('tea_1'), { choice: 'Несуществующий сорт' }, new Map());
  assert.equal(invented.ok, false);
  if (!invented.ok) assert.equal(invented.code, 'INVALID_CHOICE');
  assert.equal(
    validateCanonicalItemOptions(item('dr_11'), { choice: 'Лимон' }, new Map()).ok,
    false
  );
  assert.deepEqual(
    validateCanonicalItemOptions(item('dr_11'), undefined, new Map()),
    { ok: true, value: null }
  );
});

test('canonical tea choice is accepted and shared stop-list blocks both tea sizes', () => {
  const tea500 = item('tea_1');
  const tea900 = item('tea_2');
  const label = tea500.choices![0].label;
  const availability = new Map([[`tea::${label}`, false]]);

  for (const tea of [tea500, tea900]) {
    assert.deepEqual(validateCanonicalItemOptions(tea, { choice: label }, new Map()), {
      ok: true,
      value: { choice: label },
    });
  }
  for (const tea of [tea500, tea900]) {
    assert.equal(getChoiceAvailabilityId(tea, label), `tea::${label}`);
    assert.equal(validateCanonicalItemOptions(tea, { choice: label }, availability).ok, false);
  }
});

test('lemonade and cider choices validate against their own item availability keys', () => {
  for (const menuItem of [item('dr_18'), item('cid_1')]) {
    const label = menuItem.choices![0].label;
    const validated = validateCanonicalItemOptions(menuItem, { choice: label }, new Map());
    assert.deepEqual(validated, { ok: true, value: { choice: label } });
    assert.equal(getChoiceAvailabilityId(menuItem, label), `${menuItem.id}::${label}`);

    const stopped = new Map([[`${menuItem.id}::${label}`, false]]);
    const unavailable = validateCanonicalItemOptions(menuItem, { choice: label }, stopped);
    assert.equal(unavailable.ok, false);
    if (!unavailable.ok) assert.equal(unavailable.code, 'CHOICE_UNAVAILABLE');
  }
});

test('tea add-on uses its item-scoped stop-list and keeps its display prefix', () => {
  const addOn = item('tea_4');
  const label = addOn.choices![0].label;
  assert.equal(getChoiceAvailabilityId(addOn, label), `tea_4::${label}`);
  assert.deepEqual(
    validateCanonicalItemOptions(addOn, { choice: label, notes: 'пожалуйста' }, new Map()),
    { ok: true, value: { choice: label, notes: 'пожалуйста' } }
  );
  const unavailable = validateCanonicalItemOptions(
    addOn,
    { choice: label },
    new Map([[`tea_4::${label}`, false]])
  );
  assert.equal(unavailable.ok, false);
  if (!unavailable.ok) assert.equal(unavailable.code, 'CHOICE_UNAVAILABLE');

  assert.equal(addOn.choiceNoteLabel, 'Добавка: ');
});

test('choice and notes persist separately; legacy notes remain display-only', () => {
  const tea = item('tea_1');
  const choice = tea.choices![0].label;
  assert.deepEqual(
    validateCanonicalItemOptions(tea, { choice, notes: 'без сахара', forgedField: 'ignored' }, new Map()),
    { ok: true, value: { choice, notes: 'без сахара' } }
  );

  const legacyOptions = { notes: 'Сорт: Эрл Грей' };
  assert.equal(getDisplayChoice(legacyOptions), null);
  assert.equal(getDisplayNotes(legacyOptions), 'Сорт: Эрл Грей');
});

test('hookah notes continue to work without a structured menu choice', () => {
  const hookah = item('item_1');
  const result = validateCanonicalItemOptions(
    hookah,
    { notes: 'Крепость: Средний; вкус: сладкий' },
    new Map()
  );
  assert.deepEqual(result, {
    ok: true,
    value: { notes: 'Крепость: Средний; вкус: сладкий' },
  });
});
