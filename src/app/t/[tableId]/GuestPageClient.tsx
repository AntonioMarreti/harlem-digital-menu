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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Bell, ShoppingCart, Plus, Minus, Check, Flame, HelpCircle, Utensils, Clock, ChevronRight, AlertCircle, Search } from 'lucide-react';

type OrderStatus = 'new' | 'accepted' | 'preparing' | 'delivered' | 'closed' | 'cancelled';

type MovedTableSessionNotice = {
  message: string;
  targetUrl?: string;
  targetLabel?: string;
};

type CartItem = { item: MenuItem, quantity: number, notes?: string };

const CLOSED_SESSION_NOTICE = 'Этот счёт уже закрыт. Если хотите сделать новый заказ, мы подготовили новый счёт для этого стола. Корзина в этой вкладке сохранена.';
const CLOSED_SESSION_SUBMIT_MESSAGE = 'Счёт уже закрыт. Корзина сохранена — нажмите «Отправить заказ» ещё раз, чтобы отправить её в новый счёт.';
const CLOSED_SESSION_STAFF_CALL_MESSAGE = 'Счёт уже закрыт. Мы обновили стол — попробуйте вызвать персонал ещё раз.';

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

const loadCartFromLocalStorage = (tableSessionId: string): CartItem[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const storageKey = getCartStorageKey(tableSessionId);

  try {
    const storedCart = window.localStorage.getItem(storageKey);
    if (!storedCart) {
      return [];
    }

    const parsedCart = JSON.parse(storedCart);
    if (!Array.isArray(parsedCart) || !parsedCart.every(isStoredCartItem)) {
      window.localStorage.removeItem(storageKey);
      return [];
    }

    return parsedCart;
  } catch {
    window.localStorage.removeItem(storageKey);
    return [];
  }
};

const saveCartToLocalStorage = (tableSessionId: string, cart: CartItem[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  const storageKey = getCartStorageKey(tableSessionId);

  try {
    if (cart.length === 0) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(cart));
  } catch {
    // Ignore storage write errors: the in-memory cart is still the source of truth for this render.
  }
};

const cleanupOldCartStorage = (currentTableSessionId: string) => {
  if (typeof window === 'undefined') return;
  const currentKey = getCartStorageKey(currentTableSessionId);
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('harlem_cart:') && key !== currentKey) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => window.localStorage.removeItem(key));
  } catch {
    // Ignore errors
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
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id || "cat_hookah");
  const touchStartRef = useRef<{ x: number, y: number } | null>(null);

  const scrollToCategoryTab = useCallback((catId: string) => {
    setTimeout(() => {
      const trigger = document.querySelector(`[data-cat-trigger="${catId}"]`);
      if (trigger) {
        trigger.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 10);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('select') ||
      target.closest('.radio-label') ||
      target.closest('[role="dialog"]') ||
      target.closest('[role="tab"]') ||
      target.closest('.choice-drawer-trigger')
    ) {
      return;
    }
    if (e.touches.length > 1) return;

    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  }, []);

  const handleTouchCancel = useCallback(() => {
    touchStartRef.current = null;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartRef.current.x;
    const deltaY = Math.abs(touchEndY - touchStartRef.current.y);

    const minSwipeDistance = 60;

    if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > deltaY * 1.5) {
      const currentIndex = categories.findIndex(c => c.id === activeCategory);
      if (currentIndex !== -1) {
        let newCat = activeCategory;
        if (deltaX > 0 && currentIndex > 0) {
          newCat = categories[currentIndex - 1].id;
        } else if (deltaX < 0 && currentIndex < categories.length - 1) {
          newCat = categories[currentIndex + 1].id;
        }

        if (newCat !== activeCategory) {
          setActiveCategory(newCat);
          scrollToCategoryTab(newCat);
        }
      }
    }

    touchStartRef.current = null;
  }, [activeCategory, categories, scrollToCategoryTab]);

  useEffect(() => {
    fetch('/api/menu-availability')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) setAvailabilityMap(data);
      })
      .catch(err => console.error('Error fetching availability:', err));
  }, []);

  const [displayTableName, setDisplayTableName] = useState(table.name || `Стол ${table.number}`);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [movedTableSessionNotice, setMovedTableSessionNotice] = useState<MovedTableSessionNotice | null>(null);
  const [staleTableSessionNotice, setStaleTableSessionNotice] = useState<string | null>(null);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSubmitError, setOrderSubmitError] = useState<string | null>(null);
  const tableSessionIdRef = useRef<string | null>(null);
  const orderSubmittingRef = useRef(false);
  const pendingOrderIdempotencyKeyRef = useRef<string | null>(null);
  const [cartPulseKeys, setCartPulseKeys] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const cartRef = useRef<CartItem[]>([]);
  const addingHookahRef = useRef(false);
  const [cartStorageReadyForSessionId, setCartStorageReadyForSessionId] = useState<string | null>(null);
  const [isHookahBuilderOpen, setIsHookahBuilderOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isStaffOpen, setIsStaffOpen] = useState(false);
  const [isItemDrawerOpen, setIsItemDrawerOpen] = useState(false);
  const [itemDrawerMode, setItemDrawerMode] = useState<'details' | 'choice'>('details');
  const [selectedDrawerItem, setSelectedDrawerItem] = useState<MenuItem | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string>('');
  const [choiceSearchQuery, setChoiceSearchQuery] = useState('');
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

    const body = await res.clone().json().catch(() => null);
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
        ? `Вас пересадили за ${targetTableName}. Старый QR больше не принимает заказы. Откройте новый стол — корзина сохранена.`
        : 'Вас пересадили за другой стол. Старый QR больше не принимает заказы. Откройте QR нового стола — корзина сохранена.',
      targetUrl: targetTableQrSlug ? `/t/${targetTableQrSlug}` : undefined,
      targetLabel: targetTableName ? `Открыть ${targetTableName}` : undefined,
    };
  }, []);

  const isClosedTableSessionResponse = useCallback(async (res: Response) => {
    if (res.status !== 404) {
      return false;
    }

    const body = await res.clone().json().catch(() => null);
    return Boolean(body && typeof body === 'object' && 'isClosed' in body && body.isClosed === true);
  }, []);

  const isInactiveTableSessionResponse = useCallback(async (res: Response) => {
    if (res.status !== 400 && res.status !== 404) {
      return false;
    }

    const body = await res.clone().json().catch(() => null);
    const errorMessage = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
      ? body.error.toLowerCase()
      : '';

    return Boolean(
      body &&
      typeof body === 'object' &&
      (
        ('isClosed' in body && body.isClosed === true) ||
        errorMessage.includes('table session is not active') ||
        errorMessage.includes('session is closed')
      )
    );
  }, []);

  const handleStaleTableSession = useCallback((message = CLOSED_SESSION_NOTICE) => {
    setStaleTableSessionNotice(message);
    setBillData(null);
    setActiveOrder(null);
  }, []);

  const handleMovedTableSession = useCallback((notice: MovedTableSessionNotice) => {
    setMovedTableSessionNotice(notice);
    setStaleTableSessionNotice(null);
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
    pendingOrderIdempotencyKeyRef.current = null;
  }, [cart]);

  useEffect(() => {
    if (!tableSessionId) {
      setCartStorageReadyForSessionId(null);
      return;
    }

    cleanupOldCartStorage(tableSessionId);
    if (cartRef.current.length === 0) {
      setCart(loadCartFromLocalStorage(tableSessionId));
    }

    setCartStorageReadyForSessionId(tableSessionId);
  }, [tableSessionId]);

  useEffect(() => {
    if (!tableSessionId || cartStorageReadyForSessionId !== tableSessionId) {
      return;
    }

    saveCartToLocalStorage(tableSessionId, cart);
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

        if (await isClosedTableSessionResponse(billRes)) {
          handleStaleTableSession();
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

        if (await isClosedTableSessionResponse(ordersRes)) {
          handleStaleTableSession();
          return;
        }

        setActiveOrder(null);
      }
    } catch (err) {
      console.error('Failed to fetch session state', err);
    }
  }, [
    tableSessionId,
    menuItems,
    tableIdOrSlug,
    getMovedTableSessionNotice,
    handleMovedTableSession,
    isClosedTableSessionResponse,
    handleStaleTableSession,
  ]);

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
    setCartPulseKeys(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id && i.notes === notes);
      if (existing) {
        return prev.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1, notes }];
    });
  };

  const removeFromCart = (item: MenuItem, notes?: string) => {
    setCartPulseKeys(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
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
    setHookahStrength('medium');
    setHookahTaste('sweet');
    setHookahNotes('');
    addingHookahRef.current = false;
    setIsHookahBuilderOpen(true);
  };

  const confirmHookahBuild = () => {
    if (selectedHookahItem && !addingHookahRef.current) {
      addingHookahRef.current = true;
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

    if (!pendingOrderIdempotencyKeyRef.current) {
      pendingOrderIdempotencyKeyRef.current = crypto.randomUUID();
    }

    const orderPayload = {
      tableSessionId,
      tableIdOrSlug,
      idempotencyKey: pendingOrderIdempotencyKeyRef.current,
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
              ? `Вас пересадили за ${targetTableName}. Старый QR больше не принимает заказы. Откройте новый стол — корзина сохранена.`
              : 'Вас пересадили за другой стол. Старый QR больше не принимает заказы. Откройте QR нового стола — корзина сохранена.',
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
          handleStaleTableSession();
          setOrderSubmitError(CLOSED_SESSION_SUBMIT_MESSAGE);
          return;
        }
        if (errorMessage) {
          setOrderSubmitError(errorMessage);
          return;
        }

        throw new Error('Не удалось отправить заказ');
      }

      await res.json();
      await fetchSessionState();
      setIsCartOpen(false);
      saveCartToLocalStorage(tableSessionId, []);
      setCart([]);
      setStaleTableSessionNotice(null);
      pendingOrderIdempotencyKeyRef.current = null;
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

        if (await isInactiveTableSessionResponse(res)) {
          await refreshTableSession();
          handleStaleTableSession(CLOSED_SESSION_STAFF_CALL_MESSAGE);
          setStaffCallStatus(CLOSED_SESSION_STAFF_CALL_MESSAGE);
          return;
        }

        throw new Error('Failed to call staff');
      }

      setStaleTableSessionNotice(null);
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
    <div className="guest-theme min-h-screen w-full bg-background overflow-x-clip">
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

      {!movedTableSessionNotice && staleTableSessionNotice && (
        <div className="fixed top-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 p-4 animate-in slide-in-from-top-4">
          <div className="bg-card text-card-foreground border border-primary/30 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
              <span>{staleTableSessionNotice}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="self-start rounded-full border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => {
                refreshTableSession()
                  .then(() => setStaleTableSessionNotice(null))
                  .catch(() => {});
              }}
            >
              Обновить стол
            </Button>
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
      <main className={`flex-1 pb-[calc(7rem+env(safe-area-inset-bottom))] ${((billData && billData.totalAmount > 0) || activeOrder) ? 'pt-6' : 'pt-2'}`}>

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
        <Tabs
          value={activeCategory}
          onValueChange={(val) => {
            setActiveCategory(val);
            scrollToCategoryTab(val);
          }}
          className="w-full flex-col"
        >
          <div className="px-5 sticky top-[85px] z-10 bg-background/95 backdrop-blur-md py-3">
            <TabsList className="w-full min-h-9 flex-nowrap justify-start overflow-x-auto h-auto py-1 px-1 bg-secondary/50 rounded-full gap-1 no-scrollbar border border-border/20 scroll-px-5">
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  data-cat-trigger={cat.id}
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition-all flex-shrink-0 ${
                    activeCategory === cat.id
                      ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30 font-semibold'
                      : 'border-transparent text-foreground/70 font-medium'
                  }`}
                >
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div
            className="px-5 mt-3"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
          >
            {categories.map((cat) => (
              <TabsContent key={cat.id} value={cat.id} className="space-y-2.5 outline-none pb-6">
                {cat.id === 'cat_food' && (
                  <div className="bg-secondary/40 border border-secondary p-3 rounded-xl mb-4 text-xs text-muted-foreground text-center">
                    Еда готовится в соседнем баре Craft Beery и передаётся к вашему столику.
                  </div>
                )}

                {menuItems
                  .filter((item) => item.categoryId === cat.id)
                  .map((item) => {
                    let isItemAvailable = availabilityMap[item.id] ?? item.isAvailable ?? true;
                    if (isItemAvailable && item.choices && item.choices.length > 0) {
                      const hasAvailableChoice = item.choices.some(choice => availabilityMap[(item.choiceAvailabilityScope === 'shared_tea' || (!item.choiceAvailabilityScope && item.categoryId === 'cat_tea')) ? `tea::${choice.label}` : `${item.id}::${choice.label}`] ?? true);
                      if (!hasAvailableChoice) {
                        isItemAvailable = false;
                      }
                    }
                    const cartQuantity = cart
                      .filter((cartItem) => cartItem.item.id === item.id)
                      .reduce((sum, cartItem) => sum + cartItem.quantity, 0);
                    const plainCartQuantity = cart.find((cartItem) => cartItem.item.id === item.id && !cartItem.notes)?.quantity ?? 0;
                    const isInCart = cartQuantity > 0;

                    if (cat.id === 'cat_hookah') {
                      return (
                        <Card key={item.id} className={`w-full min-w-0 overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm shadow-sm transition-colors ${isInCart ? 'border-primary/50 bg-primary/5 shadow-primary/10' : 'hover:border-primary/30'} ${!isItemAvailable ? 'opacity-60 grayscale-[0.3]' : ''}`}>
                          <CardHeader className="p-3 pb-1.5 flex flex-row items-start justify-between gap-3">
                            <div className="flex-1">
                              <CardTitle className="text-base font-medium leading-tight text-foreground flex items-center flex-wrap gap-2">
                                {item.name}
                                {!isItemAvailable && (
                                  <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-medium whitespace-nowrap">Нет в наличии</Badge>
                                )}
                              </CardTitle>
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
                          <CardContent className="px-3 pb-2 pt-0 text-sm text-muted-foreground leading-snug">
                            {item.description}
                          </CardContent>
                          <CardFooter className="px-3 pb-3 pt-1.5 border-t-0 bg-transparent flex justify-end">
                            <Button
                              size="sm"
                              className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border-none transition-colors rounded-full px-5 disabled:opacity-50"
                              onClick={() => isItemAvailable && handleBuildHookah(item)}
                              disabled={!isItemAvailable}
                            >
                              {!isItemAvailable ? 'Недоступно' : isInCart ? 'Настроить ещё' : 'Настроить кальян'}
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    }

                    return (
                      <Card key={item.id} className={`w-full min-w-0 overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm shadow-sm transition-colors p-0 gap-0 ${isInCart ? 'border-primary/50 bg-primary/5' : ''} ${!isItemAvailable ? 'opacity-60 grayscale-[0.3]' : ''}`}>
                        <div className="px-3.5 py-3 flex gap-3.5 items-center">
                          {/* Left Column: Info */}
                          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                            <div>
                              <div className="flex items-center flex-wrap gap-2">
                                <h3 className="text-base font-medium leading-tight text-foreground">{item.name}</h3>
                                {!isItemAvailable && (
                                  <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-medium whitespace-nowrap">На стопе</Badge>
                                )}
                              </div>
                              {item.sourceLabel && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/30 text-primary/80 mt-1 mb-0.5">
                                  {item.sourceLabel}
                                </Badge>
                              )}
                            </div>
                            {item.shortDescription && (
                              <p className="text-sm text-muted-foreground leading-snug">
                                {item.shortDescription}
                              </p>
                            )}
                            {item.description && (
                              <div className="mt-1.5">
                                <Button
                                  variant="link"
                                  className="h-auto p-0 text-[13px] text-primary [@media(hover:hover)]:hover:text-primary/80 active:text-primary/80 font-medium transition-colors"
                                  onClick={() => {
                                    setSelectedDrawerItem(item);
                                    setItemDrawerMode('details');
                                    setIsItemDrawerOpen(true);
                                  }}
                                >
                                  Подробнее
                                </Button>
                              </div>
                            )}
                            {item.tags && item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {item.tags.map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-2 bg-secondary/80 text-secondary-foreground border-none font-medium">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {/* Fallback cart text if complex quantities differ from plain buttons */}
                            {isInCart && cartQuantity > plainCartQuantity && (
                              <div className="mt-0.5">
                                <span className="text-[11px] text-primary font-medium">В корзине: {cartQuantity}</span>
                              </div>
                            )}
                          </div>

                          {/* Right Column: Coherent Action */}
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="font-semibold text-primary whitespace-nowrap">{item.price} ₽</span>

                            <div>
                              {!isItemAvailable ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled
                                  className="h-9 rounded-full px-4 text-muted-foreground font-medium text-xs opacity-70 disabled:opacity-70"
                                >
                                  Нет в наличии
                                </Button>
                              ) : plainCartQuantity > 0 ? (
                                <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 p-1 animate-cart-pop">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-full text-primary [@media(hover:hover)]:hover:bg-background active:bg-background active:scale-95 transition-transform duration-100"
                                    onClick={() => removeFromCart(item)}
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </Button>
                                  <span key={cartPulseKeys[item.id] || 'default'} className="min-w-5 text-center text-sm font-semibold text-primary animate-cart-pop inline-block">{plainCartQuantity}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-full text-primary [@media(hover:hover)]:hover:bg-background active:bg-background active:scale-95 transition-transform duration-100"
                                    onClick={() => {
                                    if (item.choices && item.choices.length > 0) {
                                      setSelectedDrawerItem(item);
                                      setSelectedChoice('');
                                      setChoiceSearchQuery('');
                                      setItemDrawerMode('choice');
                                      setIsItemDrawerOpen(true);
                                    } else {
                                      addToCart(item);
                                    }
                                  }}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  className="border-border/50 bg-transparent [@media(hover:hover)]:hover:bg-primary/10 [@media(hover:hover)]:hover:text-primary [@media(hover:hover)]:hover:border-primary/30 active:bg-primary/10 active:text-primary active:border-primary/30 rounded-full px-4 h-9 text-sm active:scale-95 transition-all duration-100"
                                  onClick={() => {
                                    if (item.choices && item.choices.length > 0) {
                                      setSelectedDrawerItem(item);
                                      setSelectedChoice('');
                                      setChoiceSearchQuery('');
                                      setItemDrawerMode('choice');
                                      setIsItemDrawerOpen(true);
                                    } else {
                                      addToCart(item);
                                    }
                                  }}
                                >
                                  {item.choices && item.choices.length > 0
                                    ? (item.choiceActionLabel || (item.categoryId === 'cat_tea' ? 'Выбрать сорт' : 'Выбрать вкус'))
                                    : 'Добавить'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                {cat.id === 'cat_hookah' && (
                  <Card className="p-3.5 bg-primary/5 border-primary/20 rounded-xl flex items-start gap-3 mt-2 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="font-semibold text-foreground text-sm leading-tight mb-0.5">
                        Дневной кальян до 17:00
                      </div>
                      <div className="text-xs font-medium text-primary flex flex-wrap gap-x-1 mb-1">
                        <span className="whitespace-nowrap">Стандарт — 700&nbsp;₽</span>
                        <span className="text-primary/50">·</span>
                        <span className="whitespace-nowrap">Премиум — 999&nbsp;₽</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground leading-tight">
                        Успейте заказать до 17:00
                      </div>
                    </div>
                  </Card>
                )}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </main>

      {/* Floating Action Menu Container */}
      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] flex justify-center pointer-events-none">
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
              {cartTotal > 0 ? (
                <span className="ml-1 font-semibold">{cartTotal} ₽</span>
              ) : billData && billData.totalAmount > 0 ? (
                <span className="ml-1 font-semibold">{billData.totalAmount} ₽</span>
              ) : activeOrder && activeOrder.total > 0 ? (
                <span className="ml-1 font-semibold">{activeOrder.total} ₽</span>
              ) : null}
            </Button>
         </div>
      </div>

      {/* Item Details / Choice Drawer */}
      <Drawer open={isItemDrawerOpen} onOpenChange={setIsItemDrawerOpen}>
        <DrawerContent className="guest-theme max-w-[430px] mx-auto bg-background/95 text-foreground backdrop-blur-xl border-border/50 max-h-[90vh] flex flex-col">
          <DrawerHeader className="text-left pb-2 flex-shrink-0">
            <DrawerTitle className="text-xl font-semibold flex justify-between items-start">
              {selectedDrawerItem?.name}
            </DrawerTitle>
            <DrawerDescription className="text-muted-foreground">
              {itemDrawerMode === 'choice' ? 'Выберите вариант' : (selectedDrawerItem?.price + ' ₽')}
            </DrawerDescription>
            {itemDrawerMode === 'choice' && (selectedDrawerItem?.choiceAvailabilityScope === 'shared_tea' || (!selectedDrawerItem?.choiceAvailabilityScope && selectedDrawerItem?.categoryId === 'cat_tea')) && (
              <div className="mt-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Поиск по сортам..."
                  className="w-full h-10 pl-9 pr-4 rounded-full border border-border/50 bg-secondary/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                  value={choiceSearchQuery}
                  onChange={(e) => setChoiceSearchQuery(e.target.value)}
                />
              </div>
            )}
          </DrawerHeader>
          <div className="p-5 pb-8 overflow-y-auto flex-1">
            {itemDrawerMode === 'details' ? (
              <div className="text-base text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {selectedDrawerItem?.description}
              </div>
            ) : (
              <RadioGroup value={selectedChoice} onValueChange={setSelectedChoice} className="space-y-4">
                {(() => {
                  let filteredChoices = selectedDrawerItem?.choices || [];
                  if (choiceSearchQuery.trim()) {
                    const q = choiceSearchQuery.toLowerCase();
                    filteredChoices = filteredChoices.filter(c =>
                      c.label.toLowerCase().includes(q) ||
                      (c.description && c.description.toLowerCase().includes(q))
                    );
                  }

                  if (filteredChoices.length === 0) {
                    return (
                      <div className="text-center text-muted-foreground py-8 text-sm">
                        Ничего не найдено по вашему запросу.
                      </div>
                    );
                  }

                  const grouped = filteredChoices.reduce((acc, curr) => {
                    const g = curr.group || 'default';
                    if (!acc[g]) acc[g] = [];
                    acc[g].push(curr);
                    return acc;
                  }, {} as Record<string, typeof filteredChoices>);

                  return Object.entries(grouped).map(([group, items]) => (
                    <div key={group} className="space-y-3">
                      {group !== 'default' && (selectedDrawerItem?.choiceAvailabilityScope === 'shared_tea' || (!selectedDrawerItem?.choiceAvailabilityScope && selectedDrawerItem?.categoryId === 'cat_tea')) && (
                        <h4 className="font-semibold text-sm text-foreground/60 uppercase tracking-wider mt-4 first:mt-0 pl-1">{group}</h4>
                      )}
                      {items.map((choice) => {
                        const isChoiceAvailable = availabilityMap[(selectedDrawerItem?.choiceAvailabilityScope === 'shared_tea' || (!selectedDrawerItem?.choiceAvailabilityScope && selectedDrawerItem?.categoryId === 'cat_tea')) ? `tea::${choice.label}` : `${selectedDrawerItem?.id}::${choice.label}`] ?? true;
                        return (
                        <label
                          key={choice.label}
                          className={`flex items-start justify-between p-4 rounded-xl border-2 transition-all ${
                            !isChoiceAvailable
                              ? 'opacity-50 grayscale-[0.5] cursor-not-allowed pointer-events-none bg-secondary/20 border-border/20'
                              : selectedChoice === choice.label
                                ? 'border-primary bg-primary/5 shadow-sm cursor-pointer'
                                : 'border-border/40 [@media(hover:hover)]:hover:border-primary/40 active:border-primary/40 active:bg-primary/5 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0 pr-2">
                            <RadioGroupItem value={choice.label} id={choice.label} className="mt-1 shrink-0" disabled={!isChoiceAvailable} />
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className={`font-semibold text-base leading-tight flex items-center flex-wrap gap-2 ${selectedChoice === choice.label ? 'text-primary' : 'text-foreground'}`}>
                                {choice.label}
                                {!isChoiceAvailable && (
                                  <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-medium whitespace-nowrap">Нет в наличии</Badge>
                                )}
                              </div>
                              {choice.description && (
                                <div className="text-sm text-foreground/70 line-clamp-2 leading-snug">
                                  {choice.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </label>
                      )})}
                    </div>
                  ));
                })()}
              </RadioGroup>
            )}
          </div>
          <div className="p-5 pt-2 flex-shrink-0 bg-background/95 backdrop-blur-xl border-t border-border/10 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            {itemDrawerMode === 'details' ? (
              <Button
                className="w-full rounded-full py-6 text-lg bg-primary [@media(hover:hover)]:hover:bg-primary/90 active:bg-primary/90 active:scale-[0.98] text-primary-foreground shadow-lg shadow-primary/20 transition-all"
                onClick={() => {
                  if (selectedDrawerItem?.choices && selectedDrawerItem.choices.length > 0) {
                    setSelectedChoice('');
                    setChoiceSearchQuery('');
                    setItemDrawerMode('choice');
                  } else if (selectedDrawerItem) {
                    addToCart(selectedDrawerItem);
                    setIsItemDrawerOpen(false);
                  }
                }}
              >
                {selectedDrawerItem?.choices && selectedDrawerItem.choices.length > 0
                  ? (selectedDrawerItem.choiceActionLabel || (selectedDrawerItem.categoryId === 'cat_tea' ? 'Выбрать сорт' : 'Выбрать вкус'))
                  : 'Добавить в корзину'}
              </Button>
            ) : (
              <Button
                disabled={!selectedChoice}
                className="w-full rounded-full py-6 text-lg bg-primary [@media(hover:hover)]:hover:bg-primary/90 active:bg-primary/90 active:scale-[0.98] text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-50 transition-all"
                onClick={() => {
                  if (selectedDrawerItem && selectedChoice) {
                    const prefix = selectedDrawerItem.choiceNoteLabel || (selectedDrawerItem.categoryId === 'cat_tea' ? 'Сорт: ' : 'Вкус: ');
                    addToCart(selectedDrawerItem, `${prefix}${selectedChoice}`);
                    setIsItemDrawerOpen(false);
                  }
                }}
              >
                Добавить • {selectedDrawerItem?.price} ₽
              </Button>
            )}
          </div>
        </DrawerContent>
      </Drawer>

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
                          <Clock className="h-4 w-4" /> Заказ {activeOrder.status === 'new' ? 'отправлен' : activeOrder.status === 'accepted' ? 'принят' : activeOrder.status === 'preparing' ? 'готовится' : 'вынесен'}
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
                                      className="h-6 w-6 rounded-full [@media(hover:hover)]:hover:bg-background active:bg-background active:scale-95 transition-transform duration-100"
                                      onClick={() => removeFromCart(cartItem.item, cartItem.notes)}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span key={cartPulseKeys[cartItem.item.id] || 'default'} className="text-sm font-medium w-4 text-center animate-cart-pop inline-block">{cartItem.quantity}</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 rounded-full [@media(hover:hover)]:hover:bg-background active:bg-background active:scale-95 transition-transform duration-100"
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
                                      className="h-6 w-6 rounded-full [@media(hover:hover)]:hover:bg-background active:bg-background active:scale-95 transition-transform duration-100"
                                      onClick={() => removeFromCart(cartItem.item, cartItem.notes)}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span key={cartPulseKeys[cartItem.item.id] || 'default'} className="text-sm font-medium w-4 text-center animate-cart-pop inline-block">{cartItem.quantity}</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 rounded-full [@media(hover:hover)]:hover:bg-background active:bg-background active:scale-95 transition-transform duration-100"
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
