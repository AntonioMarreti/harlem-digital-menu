const fs = require('fs');
let code = fs.readFileSync('src/lib/mock-data.ts', 'utf8');

code = code.replace(/export const mockOrders: Order\[\] = \[[\s\S]*?\];/, `export const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    tableId: 'demo',
    tableNumber: 1,
    status: 'new',
    time: '19:45',
    totalAmount: 1290,
    items: [
      { id: 'item_2', name: 'Кальян премиум', quantity: 1, price: 1290, source: 'harlem' }
    ]
  },
  {
    id: 'ORD-002',
    tableId: 't2',
    tableNumber: 2,
    status: 'preparing',
    time: '19:50',
    totalAmount: 700,
    items: [
      { id: 'tea_2', name: 'Чай 900 мл', quantity: 1, price: 280, source: 'harlem' },
      { id: 'cb_27', name: 'Греческий', quantity: 1, price: 420, source: 'craft_beery' }
    ]
  },
  {
    id: 'ORD-003',
    tableId: 't3',
    tableNumber: 3,
    status: 'accepted',
    time: '19:55',
    totalAmount: 1840,
    items: [
      { id: 'cb_20', name: 'Дядя Сэм', quantity: 2, price: 590, source: 'craft_beery' },
      { id: 'cb_39', name: 'Картофель фри', quantity: 2, price: 230, source: 'craft_beery' },
      { id: 'tea_6', name: 'Американо', quantity: 1, price: 120, source: 'harlem' },
      { id: 'tea_5', name: 'Эспрессо', quantity: 1, price: 120, source: 'harlem' }
    ]
  }
];`);

fs.writeFileSync('src/lib/mock-data.ts', code);
