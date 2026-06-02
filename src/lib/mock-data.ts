export type Category = {
  id: string;
  name: string;
};

export type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  tags?: string[];
};

export type Table = {
  id: string;
  name: string;
  number: number;
};

export const categories: Category[] = [
  { id: 'cat_hookah', name: 'Hookah' },
  { id: 'cat_tea', name: 'Tea' },
  { id: 'cat_drinks', name: 'Drinks' },
  { id: 'cat_food', name: 'Food' },
];

export const menuItems: MenuItem[] = [
  {
    id: 'item_1',
    categoryId: 'cat_hookah',
    name: 'Classic Hookah',
    description: 'A classic blend of your favorite tobacco.',
    price: 1500,
    isAvailable: true,
  },
  {
    id: 'item_2',
    categoryId: 'cat_hookah',
    name: 'Premium Hookah',
    description: 'Premium dark leaf tobacco blend with a fruit bowl.',
    price: 2200,
    isAvailable: true,
    tags: ['Popular'],
  },
  {
    id: 'item_3',
    categoryId: 'cat_tea',
    name: 'Chinese Oolong',
    description: 'Authentic Chinese Oolong tea served in a traditional teapot.',
    price: 800,
    isAvailable: true,
  },
  {
    id: 'item_4',
    categoryId: 'cat_tea',
    name: 'Berries Mix',
    description: 'A sweet and sour mix of forest berries.',
    price: 600,
    isAvailable: true,
  },
  {
    id: 'item_5',
    categoryId: 'cat_drinks',
    name: 'Cola',
    description: 'Classic cola in a glass bottle.',
    price: 250,
    isAvailable: true,
  },
  {
    id: 'item_6',
    categoryId: 'cat_food',
    name: 'French Fries',
    description: 'Crispy french fries with ketchup.',
    price: 450,
    isAvailable: true,
  },
];

export const tables: Table[] = [
  { id: 'demo', name: 'Demo Table', number: 1 },
  { id: 't2', name: 'Window 1', number: 2 },
  { id: 't3', name: 'VIP Lounge', number: 3 },
];

export const mockOrders = [
  {
    id: 'order_1',
    tableId: 'demo',
    status: 'preparing',
    items: [{ name: 'Premium Hookah', quantity: 1 }],
    time: '19:45',
  },
  {
    id: 'order_2',
    tableId: 't2',
    status: 'new',
    items: [{ name: 'Chinese Oolong', quantity: 1 }, { name: 'French Fries', quantity: 1 }],
    time: '19:50',
  }
];

export const mockCalls = [
  {
    id: 'call_1',
    tableId: 't3',
    type: 'replace coals',
    status: 'new',
    time: '19:52',
  }
]
