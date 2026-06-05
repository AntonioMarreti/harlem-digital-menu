"use client"

import { useState, useEffect, useCallback, useRef } from 'react';
import { Category, MenuItem, Table } from '@/lib/mock-data';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, ShoppingCart, Plus, Minus, Check, Flame, HelpCircle, Utensils, Clock, ChevronRight, AlertCircle } from 'lucide-react';

type OrderStatus = 'new' | 'accepted' | 'preparing' | 'delivered' | 'closed' | 'cancelled';

type MovedTableSessionNotice = {
  message: string;
  targetUrl?: string;
  targetLabel?: string;
};

type CartItem = { item: MenuItem, quantity: number, notes?: string };

const getCartStorageKey = (tableSessionId: string) => `harlem_cart:${tableSessionId}`;

const isStoredCartItem = (value: unknown): value is CartItem => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as {
    item?: { id?: unknown; name?: unknown; price?: unknown };
    quantity?: unknown;
    notes?: unknown;
  };

  return Boolean(
    candidate.item &&
    typeof candidate.item.id === 'string' &&
    typeof candidate.item.name === 'string' &&
    typeof candidate.item.price === 'number' &&
    Number.isFinite(candidate.item.price) &&
    typeof candidate.quantity === 'number' &&
    Number.isFinite(candidate.quantity) &&
    candidate.quantity > 0 &&
    (candidate.notes === undefined || typeof candidate.notes === 'string')
  );
};

const loadCartFromSessionStorage = (tableSessionId: string): CartItem[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const storageKey = getCartStorageKey(tableSessionId);

  try {
    const storedCart = window.sessionStorage.getItem(storageKey);
    if (!storedCart) {
      return [];
    }

    const parsedCart = JSON.parse(storedCart);
    if (!Array.isArray(parsedCart) || !parsedCart.every(isStoredCartItem)) {
      window.sessionStorage.removeItem(storageKey);
      return [];
    }

    return parsedCart;
  } catch {
    window.sessionStorage.removeItem(storageKey);
    return [];
  }
};

const saveCartToSessionStorage = (tableSessionId: string, cart: CartItem[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  const storageKey = getCartStorageKey(tableSessionId);

  try {
    if (cart.length === 0) {
      window.sessionStorage.removeItem(storageKey);
      return;
    }

    window.sessionStorage.setItem(storageKey, JSON.stringify(cart));
  } catch {
    // Ignore storage write errors: the in-memory cart is still the source of truth for this render.
  }
};

export default function GuestPageClient({
  table,
  categories,
  menuItems
}: {
  table: Table;
  categories: Category[];
  menuItems: MenuItem[];
}) {
  const [tableSessionId, setTableSessionId] = useState<string | null>(null);
  const [displayTableName, setDisplayTableName] = useState(table.name || `Стол ${table.number}`);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [movedTableSessionNotice, setMovedTableSessionNotice] = useState<MovedTableSessionNotice | null>(null);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSubmitError, setOrderSubmitError] = useState<string | null>(null);
  const tableSessionIdRef = useRef<string | null>(null);
  const orderSubmittingRef = useRef(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const cartRef = useRef<CartItem[]>([]);
  const [cartStorageReadyForSessionId, setCartStorageReadyForSessionId] = useState<string | null>(null);
  const [isHookahBuilderOpen, setIsHookahBuilderOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isStaffOpen, setIsStaffOpen] = useState(false);
  type SubmittedOrder = {
    id: string;
    items: { item: MenuItem; quantity: number; notes?: string }[];
    total: number;
    status: OrderStatus;
  };
  const [activeOrder, setActiveOrder] = useState<SubmittedOrder | null>(null);
  const [staffCallStatus, setStaffCallStatus] = useState<string | null>(null);

  // Bill and Order state
  const [billData, setBillData] = useState<{ totalAmount: number; ordersCount: number } | null>(null);
  const tableIdOrSlug = table.qrSlug || table.id;

  const getMovedTableSessionNotice = useCallback(async (res: Response): Promise<MovedTableSessionNotice | null> => {
    if (res.status !== 409) {
      return null;
    }

    const body = await res.json().catch(() => null);
    if (!body || typeof body !== 'object' || !('code' in body) || body.code !== 'TABLE_SESSION_MOVED') {
      return null;
    }

    const targetTableName = 'targetTableName' in body && typeof body.targetTableName === 'string'
      ? body.targetTableName
      : '';
    const targetTableQrSlug = 'targetTableQrSlug' in body && typeof body.targetTableQrSlug === 'string'
      ? body.targetTableQrSlug
      : '';

    return {
      message: targetTableName
        ? `Вас пересадили за ${targetTableName}. Откройте новый стол, корзина сохранена.`
        : 'Вас пересадили за другой стол. Откройте QR нового стола, корзина сохранена.',
      targetUrl: targetTableQrSlug ? `/t/${targetTableQrSlug}` : undefined,
      targetLabel: targetTableName ? `Открыть ${targetTableName}` : undefined,
    };
  }, []);

  const handleMovedTableSession = useCallback((notice: MovedTableSessionNotice) => {
    setMovedTableSessionNotice(notice);
    setBillData(null);
    setActiveOrder(null);
    setOrderSubmitError(notice.message);
  }, []);

  const refreshTableSession = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setSessionLoading(true);
      }
      setSessionError(null);

      const res = await fetch(`/api/tables/${tableIdOrSlug}/session?ts=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch session');
      }

      const data = await res.json();
      const nextTableName = typeof data.table?.name === 'string' ? data.table.name.trim() : '';
      if (nextTableName) {
        setDisplayTableName(nextTableName);
      }

      const nextSessionId = data.session.id;
      const previousSessionId = tableSessionIdRef.current;

      if (previousSessionId && previousSessionId !== nextSessionId) {
        setActiveOrder(null);
        setBillData(null);
      }

      tableSessionIdRef.current = nextSessionId;
      setTableSessionId(nextSessionId);
      setMovedTableSessionNotice(null);
    } catch (err) {
      console.error(err);
      setSessionError('Не удалось загрузить сессию стола. Пожалуйста, обновите страницу.');
      throw err;
    } finally {
      if (showLoading) {
        setSessionLoading(false);
      }
    }
  }, [tableIdOrSlug]);

  useEffect(() => {
    refreshTableSession(true).catch(() => {});
  }, [refreshTableSession]);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useEffect(() => {
    if (!tableSessionId) {
      setCartStorageReadyForSessionId(null);
      return;
    }

    if (cartRef.current.length === 0) {
      setCart(loadCartFromSessionStorage(tableSessionId));
    }

    setCartStorageReadyForSessionId(tableSessionId);
  }, [tableSessionId]);

  useEffect(() => {
    if (!tableSessionId || cartStorageReadyForSessionId !== tableSessionId) {
      return;
    }

    saveCartToSessionStorage(tableSessionId, cart);
  }, [cart, tableSessionId, cartStorageReadyForSessionId]);

  const fetchSessionState = useCallback(async () => {
    if (!tableSessionId) return;
    try {
      const cacheBuster = Date.now();

      const encodedTableIdOrSlug = encodeURIComponent(tableIdOrSlug);

      const billRes = await fetch(`/api/table-sessions/${tableSessionId}/bill?ts=${cacheBuster}&tableIdOrSlug=${encodedTableIdOrSlug}`, {
        cache: 'no-store',
      });
      if (billRes.ok) {
        const billData = await billRes.json();
        if (billData.ordersCount === 0 && billData.totalAmount === 0) {
          setBillData(null);
        } else {
          setBillData({ totalAmount: billData.totalAmount, ordersCount: billData.ordersCount });
        }
      } else {
        const movedNotice = await getMovedTableSessionNotice(billRes);
        if (movedNotice) {
          handleMovedTableSession(movedNotice);
          return;
        }

        setBillData(null);
      }

      const ordersRes = await fetch(`/api/table-sessions/${tableSessionId}/orders?ts=${cacheBuster}&tableIdOrSlug=${encodedTableIdOrSlug}`, {
        cache: 'no-store',
      });
      if (ordersRes.ok) {
        setMovedTableSessionNotice(null);
        const data = await ordersRes.json();

        const activeOrders = (data.orders ?? [])
          .filter((o: Record<string, unknown>) => o.status !== 'closed' && o.status !== 'cancelled')
          .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
            const aCreatedAt = typeof a.createdAt === 'string' ? Date.parse(a.createdAt) : 0;
            const bCreatedAt = typeof b.createdAt === 'string' ? Date.parse(b.createdAt) : 0;
            return bCreatedAt - aCreatedAt;
          });

        if (activeOrders.length > 0) {
          const latestOrder = activeOrders[0];

          // Map backend items back to the SubmittedOrder format for UI
          const mappedItems = latestOrder.items.map((backendItem: Record<string, unknown>) => {
            // Find full menu item definition if possible, or create a minimal one
            const fullMenuItem = menuItems.find(m => m.id === backendItem.menuItemId) || {
              id: backendItem.menuItemId,
              name: backendItem.name,
              price: backendItem.price,
              source: backendItem.source,
              categoryId: '',
              description: ''
            };

            let notes = undefined;
            try {
              if (backendItem.options) {
                const parsed = JSON.parse(backendItem.options as string);
                notes = parsed.notes;
              }
            } catch { }

            return {
              item: fullMenuItem as MenuItem,
              quantity: backendItem.quantity,
              notes
            };
          });

          setActiveOrder({
            id: latestOrder.id,
            items: mappedItems,
            total: latestOrder.totalAmount,
            status: latestOrder.status as OrderStatus
          });
        } else {
          setActiveOrder(null);
        }
      } else {
        const movedNotice = await getMovedTableSessionNotice(ordersRes);
        if (movedNotice) {
          handleMovedTableSession(movedNotice);
          return;
        }

        setActiveOrder(null);
      }
    } catch (err) {
      console.error('Failed to fetch session state', err);
    }
  }, [tableSessionId, menuItems, tableIdOrSlug, getMovedTableSessionNotice, handleMovedTableSession]);

  useEffect(() => {
    fetchSessionState();
    const interval = setInterval(fetchSessionState, 10000);
    return () => clearInterval(interval);
  }, [tableSessionId, fetchSessionState]);

  // Hookah Builder State
  const [hookahStrength, setHookahStrength] = useState('medium');
  const [hookahTaste, setHookahTaste] = useState('sweet');
  const [hookahNotes, setHookahNotes] = useState('');
  const [selectedHookahItem, setSelectedHookahItem] = useState<MenuItem | null>(null);

  const cartTotal = cart.reduce((total, cartItem) => total + (cartItem.item.price * cartItem.quantity), 0);
  const cartCount = cart.reduce((count, cartItem) => count + cartItem.quantity, 0);

  const addToCart = (item: MenuItem, notes?: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id && i.notes === notes);
      if (existing) {
        return prev.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1, notes }];
    });
  };

  const removeFromCart = (item: MenuItem, notes?: string) => {
    setCart(prev => {
      const newCart = [...prev];
      const index = newCart.findIndex(i => i.item.id === item.id && i.notes === notes);
      if (index > -1) {
        if (newCart[index].quantity > 1) {
          newCart[index].quantity -= 1;
        } else {
          newCart.splice(index, 1);
        }
      }
      return newCart;
    });
  };

  const handleBuildHookah = (item: MenuItem) => {
    setSelectedHookahItem(item);
    setIsHookahBuilderOpen(true);
  };

  const confirmHookahBuild = () => {
    if (selectedHookahItem) {
      const strengthLabels: Record<string, string> = {
        light: 'Лёгкий',
        medium: 'Средний',
        strong: 'Крепкий'
      };
      const tasteLabels: Record<string, string> = {
        sweet: 'сладкий',
        sour: 'кислый',
        fresh: 'свежий',
        spicy: 'пряный',
        dessert: 'десертный',
        'trust master': 'на выбор мастера'
      };
      const notes = `Крепость: ${strengthLabels[hookahStrength] || hookahStrength}; вкус: ${tasteLabels[hookahTaste] || hookahTaste}${hookahNotes ? `; пожелания: ${hookahNotes}` : ''}`;
      addToCart(selectedHookahItem, notes);
      setIsHookahBuilderOpen(false);
      setHookahNotes('');
    }
  };

  const submitOrder = async () => {
    if (orderSubmittingRef.current) {
      return;
    }

    if (!tableSessionId) {
      setOrderSubmitError('Нет активной сессии стола.');
      return;
    }

    orderSubmittingRef.current = true;
    setOrderSubmitting(true);
    setOrderSubmitError(null);

    const orderPayload = {
      tableSessionId,
      tableIdOrSlug,
      totalAmount: cartTotal,
      items: cart.map(item => ({
        id: item.item.id,
        name: item.item.name,
        source: item.item.source,
        quantity: item.quantity,
        price: item.item.price,
        options: item.notes ? { notes: item.notes } : undefined
      }))
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderPayload)
      });

      if (!res.ok) {
        let errorBody: Record<string, unknown> | null = null;
        let errorMessage = '';
        try {
          errorBody = await res.json();
          errorMessage = typeof errorBody?.error === 'string' ? errorBody.error : '';
        } catch {}

        if (res.status === 409 && errorBody?.code === 'TABLE_SESSION_MOVED') {
          const targetTableName = typeof errorBody.targetTableName === 'string' ? errorBody.targetTableName : '';
          const targetTableQrSlug = typeof errorBody.targetTableQrSlug === 'string' ? errorBody.targetTableQrSlug : '';
          handleMovedTableSession({
            message: targetTableName
              ? `Вас пересадили за ${targetTableName}. Откройте новый стол, корзина сохранена.`
              : 'Вас пересадили за другой стол. Откройте QR нового стола, корзина сохранена.',
            targetUrl: targetTableQrSlug ? `/t/${targetTableQrSlug}` : undefined,
            targetLabel: targetTableName ? `Открыть ${targetTableName}` : undefined,
          });
          return;
        }

        const normalizedError = errorMessage.toLowerCase();
        const isStaleSessionError =
          (res.status === 400 || res.status === 404) &&
          (
            normalizedError.includes('table session is not active') ||
            normalizedError.includes('session') ||
            normalizedError.includes('closed') ||
            normalizedError.includes('inactive')
          );

        if (isStaleSessionError) {
          await refreshTableSession();
          setOrderSubmitError('Счёт уже закрыт. Корзина сохранена — нажмите «Отправить заказ» ещё раз.');
          return;
        }

        throw new Error('Не удалось отправить заказ');
      }

      await res.json();
      await fetchSessionState();
      setIsCartOpen(false);
      saveCartToSessionStorage(tableSessionId, []);
      setCart([]);
    } catch (err) {
      console.error(err);
      setOrderSubmitError('Ошибка при отправке заказа. Пожалуйста, попробуйте еще раз.');
    } finally {
      orderSubmittingRef.current = false;
      setOrderSubmitting(false);
    }
  };

  const callStaff = async (reason: string) => {
    if (!tableSessionId) return;

    const reasonLabels: Record<string, string> = {
      waiter: 'Подойти',
      coals: 'Угли',
      bill: 'Счёт',
      help: 'Нужна помощь'
    };

    try {
      const res = await fetch('/api/staff-calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tableSessionId, tableIdOrSlug, reason })
      });

      if (!res.ok) {
        const movedNotice = await getMovedTableSessionNotice(res);
        if (movedNotice) {
          handleMovedTableSession(movedNotice);
          return;
        }

        throw new Error('Failed to call staff');
      }

      setStaffCallStatus(`Сотрудник вызван: ${reasonLabels[reason] || reason}`);
    } catch (err) {
      console.error(err);
      setStaffCallStatus('Ошибка при вызове сотрудника. Попробуйте еще раз.');
    } finally {
      setIsStaffOpen(false);
      setTimeout(() => setStaffCallStatus(null), 3000);
    }
  };

  if (sessionLoading) {
    return (
      <div className="guest-theme min-h-screen w-full bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Загрузка сессии...</p>
        </div>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="guest-theme min-h-screen w-full bg-background flex items-center justify-center p-4">
        <div className="text-center bg-card p-6 rounded-lg shadow-sm max-w-sm w-full">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Ошибка</h2>
          <p className="text-muted-foreground">{sessionError}</p>
          <Button className="mt-6 w-full" onClick={() => window.location.reload()}>
            Обновить
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="guest-theme min-h-screen w-full bg-background overflow-x-hidden">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-background relative flex flex-col text-foreground font-sans shadow-2xl selection:bg-primary/30">

      {/* Top Banner / Notification Area */}
      {staffCallStatus && (
        <div className="fixed top-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 p-4 animate-in slide-in-from-top-4 flex justify-center pointer-events-none">
          <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg text-sm font-medium flex items-center gap-2">
            <Check className="h-4 w-4" />
            {staffCallStatus}
          </div>
        </div>
      )}

      {movedTableSessionNotice && (
        <div className="fixed top-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 p-4 animate-in slide-in-from-top-4">
          <div className="bg-destructive text-destructive-foreground px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{movedTableSessionNotice.message}</span>
            </div>
            {movedTableSessionNotice.targetUrl && (
              <a
                className="self-start rounded-md bg-background px-3 py-1 text-xs font-semibold text-foreground"
                href={movedTableSessionNotice.targetUrl}
              >
                {movedTableSessionNotice.targetLabel || 'Открыть новый стол'}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/50 px-5 pt-5 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold font-serif tracking-wide text-primary">Harlem</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/70"></span> {displayTableName}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full border-border/50 bg-background/50 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => setIsStaffOpen(true)}
          >
            <Bell className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full border-border/50 bg-background/50 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors relative"
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingCart className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-in zoom-in">
                {cartCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-28">
        {/* Welcome Section */}
        <div className="px-5 py-6">
          <h2 className="text-2xl font-serif mb-2">Добро пожаловать в «Харлем»</h2>
          <p className="text-muted-foreground text-sm">QR-меню · заказ со столика</p>
        </div>

        {/* Bill block */}
        {billData && billData.totalAmount > 0 && (
          <div className="mx-5 mb-4 bg-primary/10 border border-primary/20 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-primary">Ваш счёт (заказов: {billData.ordersCount})</p>
                <p className="text-xl font-bold text-foreground">{billData.totalAmount} ₽</p>
              </div>
              <Button size="sm" variant="outline" className="rounded-full border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => callStaff('bill')}>
                Попросить счёт
              </Button>
            </div>
          </div>
        )}

        {/* Статус заказа Ribbon */}
        {activeOrder && (
          <div className="mx-5 mb-6 bg-card border border-border/50 rounded-xl p-4 flex items-center justify-between shadow-sm cursor-pointer" onClick={() => setIsCartOpen(true)}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                {(activeOrder.status === 'new' || activeOrder.status === 'accepted') && <Clock className="h-4 w-4" />}
                {activeOrder.status === 'preparing' && <Flame className="h-4 w-4" />}
                {activeOrder.status === 'delivered' && <Check className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-sm font-medium">Ваш заказ {activeOrder.status === "new" ? "отправлен" : activeOrder.status === "accepted" ? "принят" : activeOrder.status === "preparing" ? "готовится" : "вынесен"}</p>
                <p className="text-xs text-muted-foreground">Нажмите для деталей</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        {/* Menu Tabs */}
        <Tabs defaultValue="cat_hookah" className="w-full flex-col">
          <div className="px-5 sticky top-[77px] z-10 bg-background/95 backdrop-blur-md pt-3 pb-3 border-b border-border/20">
            <TabsList className="w-full min-h-11 flex-nowrap justify-start overflow-x-auto h-auto py-1.5 px-1.5 bg-secondary/50 rounded-full gap-1.5 no-scrollbar border border-border/20 scroll-px-5">
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="rounded-full border border-transparent px-4 py-2 text-sm transition-all flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-sm"
                >
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="px-5 mt-4">
            {categories.map((cat) => (
              <TabsContent key={cat.id} value={cat.id} className="space-y-4 outline-none pb-6">
                {cat.id === 'cat_food' && (
                  <div className="bg-secondary/40 border border-secondary p-3 rounded-xl mb-4 text-xs text-muted-foreground text-center">
                    Еда готовится в соседнем баре Craft Beery и передаётся к вашему столику.
                  </div>
                )}

                {menuItems
                  .filter((item) => item.categoryId === cat.id)
                  .map((item) => {
                    const cartQuantity = cart
                      .filter((cartItem) => cartItem.item.id === item.id)
                      .reduce((sum, cartItem) => sum + cartItem.quantity, 0);
                    const plainCartQuantity = cart.find((cartItem) => cartItem.item.id === item.id && !cartItem.notes)?.quantity ?? 0;
                    const isInCart = cartQuantity > 0;

                    return (
                      <Card key={item.id} className={`w-full min-w-0 overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm shadow-sm hover:border-primary/30 transition-colors ${isInCart ? 'border-primary/50 bg-primary/5 shadow-primary/10' : ''}`}>
                        <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-base font-medium leading-tight text-foreground">{item.name}</CardTitle>
                            {item.sourceLabel && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/30 text-primary/80 mt-1 mb-1">
                                {item.sourceLabel}
                              </Badge>
                            )}
                            {item.tags && item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {item.tags.map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-2 bg-secondary/80 text-secondary-foreground border-none font-medium">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {isInCart && (
                              <Badge className="mt-2 bg-primary/10 text-primary/90 border-none rounded-full px-2.5 py-0.5 text-[11px] font-medium hover:bg-primary/15">
                                В корзине: {cartQuantity}
                              </Badge>
                            )}
                          </div>
                          <span className="font-semibold text-primary whitespace-nowrap">{item.price} ₽</span>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 pt-0 text-sm text-muted-foreground leading-relaxed">
                          {item.description}
                        </CardContent>
                        <CardFooter className="px-4 pb-4 pt-2 border-t-0 bg-transparent flex justify-end">
                          {cat.id === 'cat_hookah' ? (
                            <Button
                              size="sm"
                              className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border-none transition-colors rounded-full px-5"
                              onClick={() => handleBuildHookah(item)}
                            >
                              {isInCart ? 'Настроить ещё' : 'Настроить кальян'}
                            </Button>
                          ) : plainCartQuantity > 0 ? (
                            <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 p-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-primary hover:bg-background"
                                onClick={() => removeFromCart(item)}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </Button>
                              <span className="min-w-6 text-center text-sm font-semibold text-primary">{plainCartQuantity}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-primary hover:bg-background"
                                onClick={() => addToCart(item)}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-border/50 bg-transparent hover:bg-primary/10 hover:text-primary hover:border-primary/30 rounded-full px-5"
                              onClick={() => addToCart(item)}
                            >
                              Добавить
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    );
                  })}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </main>

      {/* Floating Action Menu Container */}
      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 px-5 pb-6 flex justify-center pointer-events-none">
         <div className="w-full flex justify-between gap-3 pointer-events-auto">
            <Button
              size="lg"
              variant="outline"
              className="rounded-full shadow-xl shadow-black/20 gap-2 border-border/50 bg-card/90 backdrop-blur-md hover:bg-card hover:border-primary/50 text-foreground flex-1"
              onClick={() => setIsStaffOpen(true)}
            >
              <Bell className="h-5 w-5 text-primary" />
              Позвать персонал
            </Button>

            <Button
              size="lg"
              className="rounded-full shadow-xl shadow-primary/20 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground flex-1 relative overflow-hidden"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart className="h-5 w-5" />
              Мой заказ
              {cartTotal > 0 && <span className="ml-1 font-semibold">{cartTotal} ₽</span>}
            </Button>
         </div>
      </div>

      {/* Hookah Builder Drawer */}
      <Drawer open={isHookahBuilderOpen} onOpenChange={setIsHookahBuilderOpen}>
        <DrawerContent className="guest-theme bg-card text-foreground border-border/50 max-h-[90vh]">
          <div className="mx-auto w-12 h-1.5 rounded-full bg-muted mt-4 mb-2" />
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle className="text-xl font-serif text-primary">Настроить кальян</DrawerTitle>
            <DrawerDescription className="text-muted-foreground">Настройте ваш {selectedHookahItem?.name?.toLowerCase()}</DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="px-4 py-2 overflow-y-auto">
            <div className="space-y-6 pb-6">
              <div className="space-y-3 rounded-2xl border border-border/30 bg-background/40 p-3">
                <Label className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Крепость</Label>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Крепость кальяна">
                  {[
                    { value: 'light', label: 'Лёгкий' },
                    { value: 'medium', label: 'Средний' },
                    { value: 'strong', label: 'Крепкий' }
                  ].map((s) => {
                    const isSelected = hookahStrength === s.value;

                    return (
                      <button
                        key={s.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`relative flex min-h-12 w-full items-center justify-center rounded-xl border p-3 text-center transition-all ${isSelected ? 'border-primary bg-primary/15 text-primary shadow-sm shadow-primary/10' : 'border-border/50 bg-background text-foreground/80 hover:border-primary/40 hover:bg-accent/50 hover:text-foreground'}`}
                        onClick={() => setHookahStrength(s.value)}
                      >
                        <span className="text-sm font-medium">{s.label}</span>
                        {isSelected && (
                          <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-border/30 bg-background/40 p-3">
                <Label className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Вкусовой профиль</Label>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Вкусовой профиль кальяна">
                  {[
                    { value: 'sweet', label: 'сладкий' },
                    { value: 'sour', label: 'кислый' },
                    { value: 'fresh', label: 'свежий' },
                    { value: 'spicy', label: 'пряный' },
                    { value: 'dessert', label: 'десертный' },
                    { value: 'trust master', label: 'на выбор мастера' }
                  ].map((t) => {
                    const isSelected = hookahTaste === t.value;

                    return (
                      <button
                        key={t.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`relative flex min-h-12 w-full items-center justify-center rounded-xl border p-3 text-center transition-all ${isSelected ? 'border-primary bg-primary/15 text-primary shadow-sm shadow-primary/10' : 'border-border/50 bg-background text-foreground/80 hover:border-primary/40 hover:bg-accent/50 hover:text-foreground'}`}
                        onClick={() => setHookahTaste(t.value)}
                      >
                        <span className="text-sm font-medium text-center leading-tight">{t.label}</span>
                        {isSelected && (
                          <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-border/30 bg-background/40 p-3">
                <Label htmlFor="notes" className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Пожелания</Label>
                <Textarea
                  id="notes"
                  placeholder="Например, безо льда..."
                  className="bg-background border-border/50 focus-visible:ring-primary rounded-xl resize-none min-h-[80px]"
                  value={hookahNotes}
                  onChange={(e) => setHookahNotes(e.target.value)}
                />
              </div>
            </div>
          </ScrollArea>
          <DrawerFooter className="pt-2 pb-6 border-t border-border/20 bg-card/80 backdrop-blur-sm">
            <Button className="w-full rounded-full py-6 text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" onClick={confirmHookahBuild}>
              Добавить • {selectedHookahItem?.price} ₽
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost" className="rounded-full w-full">Отмена</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Cart / My Order Sheet */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent side="bottom" className="guest-theme h-[90vh] bg-card text-foreground border-t border-border/50 rounded-t-3xl p-0 flex flex-col">
          <div className="mx-auto w-12 h-1.5 rounded-full bg-muted mt-4 mb-2 absolute left-1/2 -translate-x-1/2" />
          <SheetHeader className="px-6 pt-10 pb-4 text-left border-b border-border/20">
            <SheetTitle className="text-2xl font-serif text-primary">Ваш заказ</SheetTitle>
            <SheetDescription className="text-muted-foreground">Проверьте позиции перед отправкой.</SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 px-6 py-4">
            {cart.length === 0 && !activeOrder ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground space-y-4">
                <ShoppingCart className="h-12 w-12 opacity-20" />
                <p>Ваша корзина пуста</p>
                <SheetClose render={<Button variant="outline" className="rounded-full border-border/50">Вернуться в меню</Button>} />
              </div>
            ) : (
              <div className="space-y-6">
                {activeOrder && (
                   <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-6">
                     <div className="flex justify-between items-center mb-4">
                       <h3 className="font-semibold text-primary flex items-center gap-2">
                          <Clock className="h-4 w-4" /> Заказ #{activeOrder.id.substring(0, 8)}
                       </h3>
                       <span className="font-bold">{activeOrder.total} ₽</span>
                     </div>

                     <div className="flex justify-between items-center text-xs text-muted-foreground mb-4">
                       <div className={`flex flex-col items-center ${activeOrder.status === 'new' || activeOrder.status === 'accepted' || activeOrder.status === 'preparing' || activeOrder.status === 'delivered' ? 'text-primary font-bold' : ''}`}>
                         <div className={`w-3 h-3 rounded-full mb-1 ${activeOrder.status === 'new' || activeOrder.status === 'accepted' || activeOrder.status === 'preparing' || activeOrder.status === 'delivered' ? 'bg-primary' : 'bg-muted'}`} />
                         Отправлен
                       </div>
                       <div className={`flex flex-col items-center ${activeOrder.status === 'accepted' || activeOrder.status === 'preparing' || activeOrder.status === 'delivered' ? 'text-primary font-bold' : ''}`}>
                         <div className={`w-3 h-3 rounded-full mb-1 ${activeOrder.status === 'accepted' || activeOrder.status === 'preparing' || activeOrder.status === 'delivered' ? 'bg-primary' : 'bg-muted'}`} />
                         Принят
                       </div>
                       <div className={`flex flex-col items-center ${activeOrder.status === 'preparing' || activeOrder.status === 'delivered' ? 'text-primary font-bold' : ''}`}>
                         <div className={`w-3 h-3 rounded-full mb-1 ${activeOrder.status === 'preparing' || activeOrder.status === 'delivered' ? 'bg-primary' : 'bg-muted'}`} />
                         Готовится
                       </div>
                       <div className={`flex flex-col items-center ${activeOrder.status === 'delivered' ? 'text-primary font-bold' : ''}`}>
                         <div className={`w-3 h-3 rounded-full mb-1 ${activeOrder.status === 'delivered' ? 'bg-primary' : 'bg-muted'}`} />
                         Вынесен
                       </div>
                     </div>

                     <div className="space-y-2 mt-4 pt-4 border-t border-primary/20">
                       {activeOrder.items.map((cartItem, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{cartItem.quantity}x {cartItem.item.name}</span>
                          </div>
                       ))}
                     </div>
                   </div>
                )}

                {cart.length > 0 && (
                  <div className="space-y-6">
                    {(() => {
                      const harlemItems = cart.filter(i => i.item.source !== 'craft_beery');
                      const craftBeeryItems = cart.filter(i => i.item.source === 'craft_beery');

                      return (
                        <>
                          {harlemItems.length > 0 && (
                            <div className="space-y-4">
                              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Из Харлема</h4>
                              {harlemItems.map((cartItem, idx) => (
                                <div key={idx} className="flex gap-4 items-start">
                                  <div className="flex-1 space-y-1">
                                    <div className="flex justify-between">
                                      <div>
                                        <p className="font-medium">{cartItem.item.name}</p>
                                        {cartItem.item.sourceLabel && (
                                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/30 text-primary/80 mt-1">
                                            {cartItem.item.sourceLabel}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="font-semibold">{cartItem.item.price * cartItem.quantity} ₽</p>
                                    </div>
                                    {cartItem.notes && (
                                      <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded-lg mt-2 leading-relaxed">
                                        {cartItem.notes}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 bg-secondary rounded-full p-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 rounded-full hover:bg-background"
                                      onClick={() => removeFromCart(cartItem.item, cartItem.notes)}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="text-sm font-medium w-4 text-center">{cartItem.quantity}</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 rounded-full hover:bg-background"
                                      onClick={() => addToCart(cartItem.item, cartItem.notes)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {craftBeeryItems.length > 0 && (
                            <div className="space-y-4 mt-6">
                              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Из Craft Beery</h4>
                              <div className="bg-secondary/40 border border-secondary p-3 rounded-xl text-xs text-muted-foreground text-center">
                                Позиции Craft Beery готовятся в соседнем баре и будут переданы к вашему столику.
                              </div>
                              {craftBeeryItems.map((cartItem, idx) => (
                                <div key={idx} className="flex gap-4 items-start">
                                  <div className="flex-1 space-y-1">
                                    <div className="flex justify-between">
                                      <div>
                                        <p className="font-medium">{cartItem.item.name}</p>
                                        {cartItem.item.sourceLabel && (
                                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/30 text-primary/80 mt-1">
                                            {cartItem.item.sourceLabel}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="font-semibold">{cartItem.item.price * cartItem.quantity} ₽</p>
                                    </div>
                                    {cartItem.notes && (
                                      <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded-lg mt-2 leading-relaxed">
                                        {cartItem.notes}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 bg-secondary rounded-full p-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 rounded-full hover:bg-background"
                                      onClick={() => removeFromCart(cartItem.item, cartItem.notes)}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="text-sm font-medium w-4 text-center">{cartItem.quantity}</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 rounded-full hover:bg-background"
                                      onClick={() => addToCart(cartItem.item, cartItem.notes)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {cart.length > 0 && (
            <div className="p-6 border-t border-border/20 bg-background/50 backdrop-blur-md">
              <div className="flex justify-between items-center mb-4">
                <span className="text-muted-foreground">Итого</span>
                <span className="text-xl font-bold text-primary">{cartTotal} ₽</span>
              </div>
              {orderSubmitError && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4 flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                  <span>{orderSubmitError}</span>
                </div>
              )}
              <Button
                className="w-full rounded-full py-6 text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                onClick={submitOrder}
                disabled={orderSubmitting}
              >
                {orderSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                ) : null}
                {orderSubmitting ? 'Отправка...' : 'Отправить заказ'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Staff Actions Drawer */}
      <Drawer open={isStaffOpen} onOpenChange={setIsStaffOpen}>
        <DrawerContent className="guest-theme bg-card text-foreground border-border/50">
          <div className="mx-auto w-12 h-1.5 rounded-full bg-muted mt-4 mb-2" />
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle className="text-xl font-serif text-primary">Нужна помощь?</DrawerTitle>
            <DrawerDescription className="text-muted-foreground">Мы скоро подойдем.</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 grid grid-cols-2 gap-3 pb-8">
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-3 rounded-2xl border-border/50 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all"
              onClick={() => callStaff('waiter')}
            >
              <Utensils className="h-6 w-6" />
              <span>Позвать официанта</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-3 rounded-2xl border-border/50 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all"
              onClick={() => callStaff('coals')}
            >
              <Flame className="h-6 w-6" />
              <span>Заменить угли</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-3 rounded-2xl border-border/50 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all"
              onClick={() => callStaff('bill')}
            >
              <span className="text-xl font-serif">₽</span>
              <span>Попросить счёт</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-3 rounded-2xl border-border/50 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all"
              onClick={() => callStaff('help')}
            >
              <HelpCircle className="h-6 w-6" />
              <span>Нужна помощь</span>
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      </div>
    </div>
  );
}
