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
    description: 'Premium light leaf tobacco blend crafted by our masters.',
    price: 1800,
    isAvailable: true,
  },
  {
    id: 'item_2',
    categoryId: 'cat_hookah',
    name: 'Dark Leaf Hookah',
    description: 'Strong, bold dark leaf tobacco for experienced guests.',
    price: 2200,
    isAvailable: true,
    tags: ['Strong', 'Popular'],
  },
  {
    id: 'item_hk_3',
    categoryId: 'cat_hookah',
    name: 'Fruit Bowl Hookah',
    description: 'Premium tobacco served in a fresh grapefruit or pineapple bowl for an extended, rich flavor.',
    price: 3500,
    isAvailable: true,
    tags: ['Premium', 'Fresh'],
  },
  {
    id: 'item_3',
    categoryId: 'cat_tea',
    name: 'Da Hong Pao Oolong',
    description: 'Legendary dark oolong with roasted, woody, and subtly sweet notes. Served in a traditional clay teapot.',
    price: 900,
    isAvailable: true,
    tags: ['Popular'],
  },
  {
    id: 'item_tea_2',
    categoryId: 'cat_tea',
    name: 'Milk Oolong',
    description: 'Smooth, creamy Taiwanese oolong with a naturally sweet, milky aroma.',
    price: 800,
    isAvailable: true,
  },
  {
    id: 'item_4',
    categoryId: 'cat_tea',
    name: 'Wild Berries Mix',
    description: 'A warming mix of forest berries, hibiscus, and honey. Perfect with sweet hookahs.',
    price: 850,
    isAvailable: true,
    tags: ['Sweet'],
  },
  {
    id: 'item_5',
    categoryId: 'cat_drinks',
    name: 'Harlem Signature Lemonade',
    description: 'Refreshing house-made lemonade with passion fruit and fresh mint.',
    price: 450,
    isAvailable: true,
    tags: ['New', 'Fresh'],
  },
  {
    id: 'item_dr_2',
    categoryId: 'cat_drinks',
    name: 'Cola Glass',
    description: 'Classic Coca-Cola served chilled in a glass bottle.',
    price: 300,
    isAvailable: true,
  },
  {
    id: 'item_6',
    categoryId: 'cat_food',
    name: 'Truffle French Fries',
    description: 'Crispy fries tossed with truffle oil and parmesan, served with garlic aioli.',
    price: 650,
    isAvailable: true,
    tags: ['Popular'],
  },
  {
    id: 'item_fd_2',
    categoryId: 'cat_food',
    name: 'Cheese Platter',
    description: 'Selection of premium cheeses, honey, grapes, and walnuts. Ideal for sharing.',
    price: 1200,
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
