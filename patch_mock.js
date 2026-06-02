const fs = require('fs');
let code = fs.readFileSync('src/lib/mock-data.ts', 'utf8');

const newTypes = `
export type OrderStatus = 'new' | 'accepted' | 'preparing' | 'served' | 'closed';
export type CallStatus = 'new' | 'handled';

export type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  source: 'harlem' | 'craft_beery';
};

export type Order = {
  id: string;
  tableId: string;
  tableNumber: number;
  status: OrderStatus;
  items: OrderItem[];
  time: string;
  totalAmount: number;
};

export type StaffCall = {
  id: string;
  tableId: string;
  tableNumber: number;
  type: string;
  status: CallStatus;
  time: string;
};
`;

code = code.replace("export const mockOrders = [", newTypes + "\nexport const mockOrders: Order[] = [");
code = code.replace(/export const mockOrders = \[[\s\S]*?\];/, `export const mockOrders: Order[] = [
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

code = code.replace(/export const mockCalls = \[[\s\S]*?\];/, `export const mockCalls: StaffCall[] = [
  {
    id: 'call_1',
    tableId: 't3',
    tableNumber: 3,
    type: 'Заменить угли',
    status: 'new',
    time: '19:52',
  },
  {
    id: 'call_2',
    tableId: 't2',
    tableNumber: 2,
    type: 'Позвать официанта',
    status: 'new',
    time: '19:58',
  },
  {
    id: 'call_3',
    tableId: 'demo',
    tableNumber: 1,
    type: 'Попросить счёт',
    status: 'handled',
    time: '19:30',
  }
];`);

fs.writeFileSync('src/lib/mock-data.ts', code);
