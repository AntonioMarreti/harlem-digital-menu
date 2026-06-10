"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Clock, CheckCircle2, AlertCircle, RefreshCw, Inbox, Bell, LayoutGrid, Search } from 'lucide-react';
import Link from 'next/link';
import { categories, menuItems } from '@/lib/mock-data';


type OrderItem = {
  id: string;
  menuItemId: string;
  name: string;
  source: 'harlem' | 'craft_beery';
  quantity: number;
  price: number;
  options: unknown;
};

type Order = {
  id: string;
  status: 'new' | 'accepted' | 'preparing' | 'delivered' | 'closed' | 'cancelled';
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  tableSessionId: string;
  tableId: string;
  tableName: string;
  tableQrSlug: string;
  items: OrderItem[];
};

type StaffCall = {
  id: string;
  reason: string;
  status: 'new' | 'handled' | 'cancelled';
  createdAt: string;
  tableSessionId: string;
  tableId: string;
  tableName: string;
  tableQrSlug: string;
};

type TableSessionInfo = {
  id: string;
  tableId: string;
  tableName: string;
  tableQrSlug: string;
  createdAt: string;
  ordersCount: number;
  activeOrdersCount: number;
  totalAmount: number;
};

type RecentlyClosedSession = {
  id: string;
  tableId: string;
  tableName: string;
  tableQrSlug: string;
  closedAt: string | null;
  totalAmount: number;
};

type StaffTable = {
  id: string;
  name: string;
  qrSlug: string;
  activeSessionId: string | null;
  isOccupied: boolean;
};

const callReasonLabels: Record<string, string> = {
  waiter: 'Подойти',
  coals: 'Угли',
  bill: 'Счёт',
  help: 'Нужна помощь'
};

function formatTableLabel(tableName?: string | null, tableQrSlug?: string | null) {
  const name = tableName?.trim();
  if (name) {
    return name;
  }

  const qrSlug = tableQrSlug?.trim();
  if (!qrSlug) {
    return 'Стол';
  }

  const harlemPilotTableMatch = qrSlug.match(/^h0?([1-9]\d*)$/i);
  if (harlemPilotTableMatch) {
    return `Стол ${Number(harlemPilotTableMatch[1])}`;
  }

  return `Стол ${qrSlug}`;
}

function formatOrderItemOptions(options: unknown): string[] {
  if (!options || typeof options !== 'object' || !('notes' in options)) {
    return [];
  }

  const notes = (options as { notes?: unknown }).notes;

  if (typeof notes !== 'string') {
    return [];
  }

  const trimmedNotes = notes.trim();
  if (!trimmedNotes) {
    return [];
  }

  const legacyMatch = trimmedNotes.match(/^Strength:\s*([^,]+),\s*Taste:\s*([^-]+?)(?:\s*-\s*(.+))?$/i);
  if (!legacyMatch) {
    return trimmedNotes
      .split(';')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        if (line.toLowerCase().startsWith('вкус:')) {
          return `Вкус:${line.slice(line.indexOf(':') + 1)}`;
        }
        if (line.toLowerCase().startsWith('пожелания:')) {
          return `Пожелания:${line.slice(line.indexOf(':') + 1)}`;
        }
        return line;
      });
  }

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

  const strength = legacyMatch[1].trim();
  const taste = legacyMatch[2].trim();
  const guestNotes = legacyMatch[3]?.trim();

  return [
    `Крепость: ${strengthLabels[strength] || strength}`,
    `Вкус: ${tasteLabels[taste] || taste}`,
    ...(guestNotes ? [`Пожелания: ${guestNotes}`] : [])
  ];
}

function getWaitMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

function formatNewOrderWaitLabel(createdAt: string): string {
  const minutes = getWaitMinutes(createdAt);
  if (minutes < 1) return 'Новый · только что';
  return `Ждёт ${minutes} мин`;
}

function getNewOrderUrgency(createdAt: string): 'normal' | 'warning' | 'urgent' {
  const minutes = getWaitMinutes(createdAt);
  if (minutes >= 7) return 'urgent';
  if (minutes >= 3) return 'warning';
  return 'normal';
}

function OrderGrid({ orders, onUpdateStatus, onCloseTableSession, onCancelClick }: { orders: Order[], onUpdateStatus: (id: string, status: 'new' | 'accepted' | 'preparing' | 'delivered' | 'closed' | 'cancelled') => void, onCloseTableSession: (tableId: string) => void, onCancelClick: (id: string) => void }) {
  const statusTranslations: Record<string, string> = {
    new: 'Новый',
    accepted: 'Принят',
    preparing: 'Готовится',
    delivered: 'Вынесен',
    cancelled: 'Отменён',
    closed: 'Закрыт'
  };

  const statusColors: Record<string, string> = {
    new: 'secondary', // normal new will be secondary by default
    accepted: 'default',
    preparing: 'secondary',
    delivered: 'outline',
    cancelled: 'destructive',
    closed: 'outline'
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {orders.map((order: Order) => {
        const harlemItems = order.items.filter(i => i.source === 'harlem');
        const craftBeeryItems = order.items.filter(i => i.source === 'craft_beery');
        const hasCraftBeery = craftBeeryItems.length > 0;

        const isNew = order.status === 'new';
        const urgency = isNew ? getNewOrderUrgency(order.createdAt) : 'normal';

        let badgeVariant = statusColors[order.status] as "default" | "destructive" | "outline" | "secondary";
        let badgeText = statusTranslations[order.status];
        let badgeClassName = "";

        if (isNew) {
           badgeText = formatNewOrderWaitLabel(order.createdAt);
           if (urgency === 'urgent') {
             badgeVariant = "destructive";
             badgeClassName = "animate-pulse shadow-sm";
           } else if (urgency === 'warning') {
             badgeVariant = "default";
             badgeClassName = "bg-amber-500 hover:bg-amber-600 text-white border-transparent shadow-sm";
           } else {
             badgeVariant = "secondary";
             badgeClassName = "bg-blue-100 text-blue-800 hover:bg-blue-200 border-transparent shadow-sm";
           }
        }

        return (
          <Card key={order.id} className={`border-t-4 ${hasCraftBeery ? 'border-t-orange-500' : 'border-t-blue-500'}`}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{formatTableLabel(order.tableName, order.tableQrSlug)}</CardTitle>
                  <div className="text-xs text-gray-400 mt-1">{order.id}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={badgeVariant} className={badgeClassName}>
                    {badgeText}
                  </Badge>
                  <Button variant="outline" onClick={() => onCloseTableSession(order.tableId)}>
                    Освободить стол
                  </Button>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-500 mt-2">
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(order.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="font-semibold text-gray-800">{order.totalAmount} ₽</div>
              </div>
            </CardHeader>
            <CardContent className="py-2 border-y my-2 space-y-3">
              {harlemItems.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Харлем</h4>
                  <ul className="space-y-1 text-sm">
                    {harlemItems.map((item, idx) => {
                      const itemOptionLines = formatOrderItemOptions(item.options);

                      return (
                        <li key={idx}>
                          <div className="flex justify-between">
                            <span>{item.quantity}x {item.name}</span>
                          </div>
                          {itemOptionLines.length > 0 && (
                            <div className="mt-1 space-y-0.5 text-xs text-gray-500 leading-snug">
                              {itemOptionLines.map((line) => (
                                <div key={line}>{line}</div>
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {hasCraftBeery && (
                <div>
                  <h4 className="text-xs font-semibold text-orange-600 uppercase mb-1">Craft Beery</h4>
                  <ul className="space-y-1 text-sm text-orange-900 bg-orange-50 p-2 rounded">
                    {craftBeeryItems.map((item, idx) => {
                      const itemOptionLines = formatOrderItemOptions(item.options);

                      return (
                        <li key={idx}>
                          <div className="flex justify-between">
                            <span>{item.quantity}x {item.name}</span>
                          </div>
                          {itemOptionLines.length > 0 && (
                            <div className="mt-1 space-y-0.5 text-xs text-gray-500 leading-snug">
                              {itemOptionLines.map((line) => (
                                <div key={line}>{line}</div>
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="text-xs text-orange-600 mt-2 flex items-start gap-1">
                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>Позиции Craft Beery нужно передать в соседний бар.</span>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-2 flex flex-wrap gap-2">
              {order.status === 'new' && (
                  <Button onClick={() => onUpdateStatus(order.id, 'accepted')}>Принять</Button>
              )}
              {order.status === 'accepted' && (
                  <Button onClick={() => onUpdateStatus(order.id, 'preparing')}>Готовить</Button>
              )}
              {order.status === 'preparing' && (
                  <Button variant="outline" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => onUpdateStatus(order.id, 'delivered')}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Вынесен
                  </Button>
              )}
              {order.status === 'delivered' && (
                  <Button variant="outline" onClick={() => onUpdateStatus(order.id, 'closed')}>Закрыть</Button>
              )}
              {(order.status === 'new' || order.status === 'accepted') && (
                  <Button variant="destructive" className="ml-auto" onClick={() => onCancelClick(order.id)}>Отменить</Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}



function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
      <div className="bg-white p-4 rounded-full shadow-sm mb-4 ring-1 ring-gray-100">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {description && <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>}
    </div>
  );
}

export default function StaffDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [calls, setCalls] = useState<StaffCall[]>([]);
  const [tableSessions, setTableSessions] = useState<TableSessionInfo[]>([]);
  const [recentlyClosedSessions, setRecentlyClosedSessions] = useState<RecentlyClosedSession[]>([]);
  const [tables, setTables] = useState<StaffTable[]>([]);
  const [transferTargets, setTransferTargets] = useState<Record<string, string>>({});
  const [movingSessionId, setMovingSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, boolean>>({});
  const [stopListSearchQuery, setStopListSearchQuery] = useState('');

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    variant: 'default' | 'destructive';
    onConfirm: () => void;
  } | null>(null);

  const requestConfirm = (title: string, description: string, confirmLabel: string, variant: 'default' | 'destructive', onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, title, description, confirmLabel, variant, onConfirm });
  };

  const closeConfirm = () => {
    setConfirmDialog(null);
  };

  const fetchData = async () => {
    try {
      setError(null);

      const [ordersRes, callsRes, tableSessionsRes, tablesRes, availabilityRes, recentlyClosedRes] = await Promise.all([
        fetch('/api/staff/orders'),
        fetch('/api/staff-calls'),
        fetch('/api/staff/table-sessions'),
        fetch('/api/staff/tables'),
        fetch('/api/staff/menu-availability'),
        fetch('/api/staff/recently-closed')
      ]);

      if (!ordersRes.ok || !callsRes.ok || !tableSessionsRes.ok || !tablesRes.ok) {
        throw new Error('Ошибка при загрузке данных');
      }

      const ordersData = await ordersRes.json();
      const callsData = await callsRes.json();
      const tableSessionsData = await tableSessionsRes.json();
      const tablesData = await tablesRes.json();
      const availabilityData = await availabilityRes.json();
      const recentlyClosedData = await recentlyClosedRes.json().catch(() => ({ recentlyClosed: [] }));

      setOrders(ordersData.orders || []);
      setCalls(callsData.calls || []);
      setTableSessions(tableSessionsData.tableSessions || []);
      setTables(tablesData.tables || []);
      setAvailabilityMap(availabilityData || {});
      setRecentlyClosedSessions(recentlyClosedData.recentlyClosed || []);
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить данные. Проверьте подключение к базе данных.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateOrderStatus = async (id: string, status: 'new' | 'accepted' | 'preparing' | 'delivered' | 'closed' | 'cancelled') => {
    try {
      const res = await fetch(`/api/staff/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!res.ok) {
        throw new Error('Не удалось обновить статус');
      }

      if (status === 'closed') {
        setFeedback('Заказ закрыт и скрыт из активных.');
        setTimeout(() => setFeedback(null), 3000);
      } else if (status === 'cancelled') {
         setFeedback('Заказ отменён и скрыт из активных.');
         setTimeout(() => setFeedback(null), 3000);
      }

      fetchData(); // Refresh data immediately
    } catch (err) {
      console.error(err);
      setError('Ошибка обновления статуса заказа');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCloseTableSession = (tableId: string) => {
    requestConfirm(
      'Закрыть счёт?',
      'Сессия стола будет закрыта, а стол станет свободным. Активные заказы этой сессии больше не будут отображаться как открытые.',
      'Закрыть счёт',
      'destructive',
      async () => {
        try {
          const res = await fetch(`/api/tables/${tableId}/session/close`, {
            method: 'POST',
          });

          if (!res.ok) {
            throw new Error('Не удалось освободить стол');
          }

          setFeedback('Стол освобожден, сессия закрыта.');
          setTimeout(() => setFeedback(null), 3000);
          fetchData(); // Refresh data immediately
        } catch (err) {
          console.error(err);
          setError('Ошибка при освобождении стола');
          setTimeout(() => setError(null), 3000);
        }
      }
    );
  };

  const handleReleaseEmptyTableSession = (sessionId: string) => {
    requestConfirm(
      'Освободить пустой стол?',
      'Пустая QR-сессия будет закрыта, а стол снова станет доступен для гостей.',
      'Освободить стол',
      'destructive',
      async () => {
        try {
          const res = await fetch(`/api/staff/table-sessions/${sessionId}/release-empty`, {
            method: 'POST',
          });

          if (!res.ok) {
            const body = await res.json().catch(() => null);
            if (res.status === 409 && body?.code === 'TABLE_SESSION_HAS_ORDERS') {
              fetchData();
              throw new Error('На этом столе уже появился заказ. Обновите список.');
            }
            throw new Error('Не удалось освободить пустой стол');
          }

          setFeedback('Пустой стол освобожден.');
          setTimeout(() => setFeedback(null), 3000);
          fetchData();
        } catch (err) {
          console.error(err);
          setError(err instanceof Error ? err.message : 'Ошибка при освобождении пустого стола');
          setTimeout(() => setError(null), 3000);
        }
      }
    );
  };

  const handleMoveTableSession = async (sessionId: string) => {
    const targetTableIdOrSlug = transferTargets[sessionId];
    if (!targetTableIdOrSlug) {
      setError('Выберите новый стол.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      setMovingSessionId(sessionId);

      const res = await fetch(`/api/staff/table-sessions/${sessionId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetTableIdOrSlug })
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const errorMessage = typeof body?.error === 'string' ? body.error : 'Не удалось перенести стол';
        if (res.status === 409 && errorMessage === 'Target table is occupied') {
          fetchData();
          throw new Error('Стол уже занят. Обновите список.');
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      const nextTableName = typeof data.table?.name === 'string' ? data.table.name : 'новый стол';

      setFeedback(`Сессия перенесена на ${nextTableName}.`);
      setTimeout(() => setFeedback(null), 3000);
      setTransferTargets((current) => ({ ...current, [sessionId]: '' }));
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Ошибка при переносе стола');
      setTimeout(() => setError(null), 3000);
    } finally {
      setMovingSessionId(null);
    }
  };

  const handleMoveEmptyTableSession = (sessionId: string) => {
    if (!transferTargets[sessionId]) {
      setError('Выберите новый стол.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    requestConfirm(
      'Перенести QR-сессию?',
      'Открытая пустая QR-сессия будет перенесена на выбранный стол.',
      'Перенести',
      'default',
      async () => {
        await handleMoveTableSession(sessionId);
      }
    );
  };

  const handleMarkCallHandled = async (id: string) => {
    try {
      const res = await fetch(`/api/staff-calls/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'handled' })
      });

      if (!res.ok) {
        throw new Error('Не удалось отметить вызов как обработанный');
      }

      setFeedback('Вызов обработан');
      setTimeout(() => setFeedback(null), 3000);
      fetchData();
    } catch (err) {
      console.error(err);
      setError('Ошибка обновления статуса вызова');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/staff/auth/logout', {
      method: 'POST',
    });
    window.location.reload();
  };

  const handleToggleAvailability = async (itemId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;

    // Optimistic update
    setAvailabilityMap(prev => ({ ...prev, [itemId]: newStatus }));

    try {
      const res = await fetch('/api/staff/menu-availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, isAvailable: newStatus })
      });

      if (!res.ok) {
        throw new Error('Failed to update availability');
      }
    } catch (err) {
      console.error(err);
      setError('Ошибка при обновлении статуса товара');
      setTimeout(() => setError(null), 3000);
      // Revert on error
      setAvailabilityMap(prev => ({ ...prev, [itemId]: currentStatus }));
    }
  };

  const newOrders = orders.filter(o => o.status === 'new');
  const harlemOrders = orders.filter(o => o.items.some(i => i.source === 'harlem'));
  const craftBeeryOrders = orders.filter(o => o.items.some(i => i.source === 'craft_beery'));
  const activeCalls = calls.filter(c => c.status === 'new');
  const billSessions = tableSessions.filter(session => session.ordersCount > 0);
  const emptySessions = tableSessions.filter(session => session.ordersCount === 0);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {feedback && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg flex items-center">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {feedback}
        </div>
      )}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-md shadow-lg flex items-center">
          <AlertCircle className="w-4 h-4 mr-2" />
          {error}
        </div>
      )}

      <header className="bg-black text-white p-4 sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Панель персонала</h1>
          <p className="text-xs text-gray-400">Harlem Lounge</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="text-black bg-white hover:bg-gray-200">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout} className="text-black bg-white hover:bg-gray-200">
            Выйти
          </Button>
          <Link href="/">
           <Button variant="ghost" size="sm" className="text-white hover:bg-gray-800">На главную</Button>
        </Link>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            type="button"
            aria-label="Показать новые заказы"
            className="flex flex-col overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm"
            onClick={() => setActiveTab('new')}
          >
            <div className="p-3 w-full flex flex-col items-center justify-center text-center h-full">
              <span className="text-xs md:text-sm text-gray-500 mb-1 leading-tight">Новые заказы</span>
              <span className="text-xl md:text-2xl font-bold">{newOrders.length}</span>
            </div>
          </button>

          <button
            type="button"
            aria-label="Показать вызовы"
            className={`flex flex-col overflow-hidden rounded-xl cursor-pointer transition-colors shadow-sm ${activeCalls.length > 0 ? 'bg-red-50 ring-1 ring-red-500 hover:bg-red-100' : 'bg-card ring-1 ring-foreground/10 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('calls')}
          >
            <div className="p-3 w-full flex flex-col items-center justify-center text-center h-full">
              <span className={`text-xs md:text-sm mb-1 leading-tight ${activeCalls.length > 0 ? 'text-red-700' : 'text-gray-500'}`}>Вызовы</span>
              <span className={`text-xl md:text-2xl font-bold ${activeCalls.length > 0 ? 'text-red-700' : 'text-gray-900'}`}>{activeCalls.length}</span>
            </div>
          </button>

          <button
            type="button"
            aria-label="Показать открытые столы"
            className="flex flex-col overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm"
            onClick={() => setActiveTab('tables')}
          >
            <div className="p-3 w-full flex flex-col items-center justify-center text-center h-full">
              <span className="text-xs md:text-sm text-gray-500 mb-1 leading-tight">Столы</span>
              <span className="text-xl md:text-2xl font-bold">{tableSessions.length}</span>
            </div>
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col">
          <div className="w-full overflow-x-auto pb-2 mb-4">
            <TabsList className="flex w-max min-w-full sm:w-full space-x-2">
              <TabsTrigger value="all">Все ({orders.length})</TabsTrigger>
              <TabsTrigger value="new">Новые ({newOrders.length})</TabsTrigger>
              <TabsTrigger value="harlem">Harlem ({harlemOrders.length})</TabsTrigger>
              <TabsTrigger value="craft_beery">Craft Beery ({craftBeeryOrders.length})</TabsTrigger>
              <TabsTrigger value="calls" className="relative">
                Вызовы
                {activeCalls.length > 0 && (
                  <span className="ml-2 w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                )}
              </TabsTrigger>
              <TabsTrigger value="tables">Открытые столы ({tableSessions.length})</TabsTrigger>
              <TabsTrigger value="stoplist">Стоп-лист</TabsTrigger>
            </TabsList>
          </div>


          <TabsContent value="all" className="space-y-4">
             {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mr-3"></div>
                  <span className="text-gray-500 font-medium my-auto">Загрузка заказов...</span>
                </div>
             ) : orders.length === 0 ? (
                <EmptyState icon={Inbox} title="Нет активных заказов" description="Новые заказы появятся здесь" />
             ) : (
                <OrderGrid orders={orders} onUpdateStatus={handleUpdateOrderStatus} onCloseTableSession={handleCloseTableSession} onCancelClick={setCancellingOrderId} />
             )}
          </TabsContent>
          <TabsContent value="new" className="space-y-4">
             {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mr-3"></div>
                  <span className="text-gray-500 font-medium my-auto">Загрузка заказов...</span>
                </div>
             ) : newOrders.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="Нет новых заказов" description="Все поступившие заказы уже в работе" />
             ) : (
                <OrderGrid orders={newOrders} onUpdateStatus={handleUpdateOrderStatus} onCloseTableSession={handleCloseTableSession} onCancelClick={setCancellingOrderId} />
             )}
          </TabsContent>
          <TabsContent value="harlem" className="space-y-4">
             {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mr-3"></div>
                  <span className="text-gray-500 font-medium my-auto">Загрузка заказов...</span>
                </div>
             ) : harlemOrders.length === 0 ? (
                <EmptyState icon={Inbox} title="Нет активных заказов Harlem" description="Заказы для этого зала появятся здесь" />
             ) : (
                <OrderGrid orders={harlemOrders} onUpdateStatus={handleUpdateOrderStatus} onCloseTableSession={handleCloseTableSession} onCancelClick={setCancellingOrderId} />
             )}
          </TabsContent>
          <TabsContent value="craft_beery" className="space-y-4">
             {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mr-3"></div>
                  <span className="text-gray-500 font-medium my-auto">Загрузка заказов...</span>
                </div>
             ) : craftBeeryOrders.length === 0 ? (
                <EmptyState icon={Inbox} title="Нет активных заказов Craft Beery" description="Заказы для этого зала появятся здесь" />
             ) : (
                <OrderGrid orders={craftBeeryOrders} onUpdateStatus={handleUpdateOrderStatus} onCloseTableSession={handleCloseTableSession} onCancelClick={setCancellingOrderId} />
             )}
          </TabsContent>

          <TabsContent value="calls" className="space-y-4">
            {activeCalls.length === 0 ? (
              <EmptyState icon={Bell} title="Нет активных вызовов" description="Все вызовы обработаны" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {activeCalls.map((call) => (
                  <Card key={call.id} className={`border-t-4 ${call.status === 'new' ? 'border-t-red-500 bg-red-50' : 'border-t-gray-300 bg-gray-50 opacity-60'}`}>
                     <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className={call.status === 'new' ? 'text-red-700' : 'text-gray-700'}>{formatTableLabel(call.tableName, call.tableQrSlug)}</CardTitle>
                          {call.status === 'new' ? <AlertCircle className="text-red-500 w-5 h-5" /> : <CheckCircle2 className="text-gray-500 w-5 h-5" />}
                        </div>
                        <div className="text-lg font-semibold mt-2">{callReasonLabels[call.reason] || call.reason}</div>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(call.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                     </CardHeader>
                     <CardFooter>
                        {call.status === 'new' && (
                           <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={() => handleMarkCallHandled(call.id)}>Отметить как выполненный</Button>
                        )}
                     </CardFooter>
                  </Card>
               ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stoplist" className="space-y-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold">Стоп-лист</h2>
              <p className="text-sm text-gray-500">Управление доступностью товаров для гостей.</p>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Найти товар..."
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-black focus:border-black text-base md:text-lg h-12 shadow-sm"
                value={stopListSearchQuery}
                onChange={(e) => setStopListSearchQuery(e.target.value)}
              />
            </div>

            {(() => {
              const query = stopListSearchQuery.toLowerCase().trim();
              let hasAnyMatches = false;

              const result = categories.map(cat => {
                const catItems = menuItems.filter(item => item.categoryId === cat.id);
                const filteredItems = query
                  ? catItems.filter(item => item.name.toLowerCase().includes(query) || cat.name.toLowerCase().includes(query) || (item.sourceLabel && item.sourceLabel.toLowerCase().includes(query)))
                  : catItems;

                if (filteredItems.length === 0) return null;
                hasAnyMatches = true;

                return (
                  <div key={cat.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 font-semibold text-gray-800">
                      {cat.name}
                    </div>
                    <div className="divide-y divide-gray-100">
                      {filteredItems.map(item => {
                        const isAvailable = availabilityMap[item.id] ?? item.isAvailable ?? true;
                        return (
                          <div key={item.id} className={`flex items-center justify-between p-4 transition-colors ${!isAvailable ? 'bg-red-50/50' : ''}`}>
                            <div>
                              <div className="font-medium text-gray-900 flex items-center gap-2">
                                {item.name}
                                {!isAvailable && <Badge variant="destructive" className="text-[10px] uppercase">На стопе</Badge>}
                              </div>
                              {item.sourceLabel && <div className="text-xs text-gray-400 mt-1">{item.sourceLabel}</div>}
                            </div>
                            <div>
                              <Button
                                variant={isAvailable ? "outline" : "destructive"}
                                size="sm"
                                className={isAvailable ? "text-gray-600" : ""}
                                onClick={() => handleToggleAvailability(item.id, isAvailable)}
                              >
                                {isAvailable ? "Снять с продажи" : "Вернуть в продажу"}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });

              if (query && !hasAnyMatches) {
                return <EmptyState icon={Search} title="Ничего не найдено" description="По вашему запросу товаров нет" />;
              }

              return <div className="space-y-6">{result}</div>;
            })()}
          </TabsContent>

          <TabsContent value="tables" className="space-y-4">
             {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mr-3"></div>
                  <span className="text-gray-500 font-medium my-auto">Загрузка столов...</span>
                </div>
             ) : tableSessions.length === 0 ? (
                <EmptyState icon={LayoutGrid} title="Нет занятых столов" description="Все столы свободны" />
             ) : (
                <div className="space-y-8">
                  <section className="space-y-3">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Счета с заказами</h2>
                      <p className="text-sm text-gray-500">Столы с заказами и текущим счётом.</p>
                    </div>
                    {billSessions.length === 0 ? (
                      <EmptyState icon={CheckCircle2} title="Нет активных счетов" description="Открытые счета появятся здесь" />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {billSessions.map((session) => (
                          <Card key={session.id} className="border-t-4 border-t-purple-500">
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                <CardTitle>{formatTableLabel(session.tableName, session.tableQrSlug)}</CardTitle>
                                <Badge variant={session.activeOrdersCount > 0 ? "default" : "outline"}>
                                  {session.activeOrdersCount > 0 ? 'Есть активные заказы' : 'Все заказы закрыты'}
                                </Badge>
                              </div>
                              <div className="flex justify-between items-center text-sm text-gray-500 mt-2">
                                <div className="flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Открыт: {new Date(session.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="font-semibold text-gray-800">{session.totalAmount} ₽</div>
                              </div>
                            </CardHeader>
                            <CardContent className="py-2 border-y my-2 space-y-1">
                              <div className="text-sm text-gray-700 flex justify-between">
                                <span>Всего заказов:</span>
                                <span className="font-medium">{session.ordersCount}</span>
                              </div>
                              <div className="text-sm text-gray-700 flex justify-between">
                                <span>Активных заказов:</span>
                                <span className="font-medium">{session.activeOrdersCount}</span>
                              </div>
                            </CardContent>
                            <CardFooter className="pt-2 flex flex-col gap-2">
                              <div className="flex w-full gap-2">
                                <select
                                  className="h-10 min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm"
                                  value={transferTargets[session.id] || ''}
                                  onChange={(event) => setTransferTargets((current) => ({
                                    ...current,
                                    [session.id]: event.target.value
                                  }))}
                                  disabled={movingSessionId === session.id}
                                >
                                  <option value="">Новый стол</option>
                                  {tables.map((table) => {
                                    const isCurrentTable = table.id === session.tableId;
                                    const isDisabled = isCurrentTable || (table.isOccupied && table.activeSessionId !== session.id);

                                    return (
                                      <option key={table.id} value={table.qrSlug} disabled={isDisabled}>
                                        {formatTableLabel(table.name, table.qrSlug)}
                                        {isCurrentTable ? ' — текущий' : table.isOccupied ? ' — занят' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                                <Button
                                  variant="outline"
                                  disabled={!transferTargets[session.id] || movingSessionId === session.id}
                                  onClick={() => handleMoveTableSession(session.id)}
                                >
                                  Перенести стол
                                </Button>
                              </div>
                              <Button
                                className="w-full"
                                variant="outline"
                                onClick={() => handleCloseTableSession(session.tableId)}
                              >
                                Освободить стол / Закрыть счёт
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    )}
                  </section>

                  {emptySessions.length > 0 && (
                    <section className="space-y-3">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Открытые QR без заказов</h2>
                        <p className="text-sm text-gray-500">Гость мог открыть QR и выбирать позиции. Если гость пересел — перенесите стол. Если ушёл — освободите без заказа.</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {emptySessions.map((session) => (
                          <Card key={session.id} className="border-t-4 border-t-gray-400 bg-gray-50">
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                <CardTitle>{formatTableLabel(session.tableName, session.tableQrSlug)}</CardTitle>
                                <Badge variant="outline">QR открыт, заказов нет</Badge>
                              </div>
                              <div className="flex justify-between items-center text-sm text-gray-500 mt-2">
                                <div className="flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Открыт: {new Date(session.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="font-semibold text-gray-800">0 ₽</div>
                              </div>
                            </CardHeader>
                            <CardContent className="py-2 border-y my-2 space-y-1">
                              <div className="text-sm text-gray-600 bg-white border border-gray-200 rounded-md p-2">
                                Гость мог открыть QR и выбирать позиции. Если гость пересел — перенесите стол. Если ушёл — освободите без заказа.
                              </div>
                            </CardContent>
                            <CardFooter className="pt-2 flex flex-col gap-2">
                              <div className="flex w-full gap-2">
                                <select
                                  className="h-10 min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm"
                                  value={transferTargets[session.id] || ''}
                                  onChange={(event) => setTransferTargets((current) => ({
                                    ...current,
                                    [session.id]: event.target.value
                                  }))}
                                  disabled={movingSessionId === session.id}
                                >
                                  <option value="">Новый стол</option>
                                  {tables.map((table) => {
                                    const isCurrentTable = table.id === session.tableId;
                                    const isDisabled = isCurrentTable || (table.isOccupied && table.activeSessionId !== session.id);

                                    return (
                                      <option key={table.id} value={table.qrSlug} disabled={isDisabled}>
                                        {formatTableLabel(table.name, table.qrSlug)}
                                        {isCurrentTable ? ' — текущий' : table.isOccupied ? ' — занят' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                                <Button
                                  variant="outline"
                                  disabled={!transferTargets[session.id] || movingSessionId === session.id}
                                  onClick={() => handleMoveEmptyTableSession(session.id)}
                                >
                                  Перенести на другой стол
                                </Button>
                              </div>
                              <Button
                                className="w-full"
                                variant="outline"
                                onClick={() => handleReleaseEmptyTableSession(session.id)}
                              >
                                Освободить без заказа
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    </section>
                  )}

                  {recentlyClosedSessions.length > 0 && (
                    <section className="space-y-3 mt-12 pt-6 border-t border-gray-100">
                      <div>
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Недавно закрытые</h2>
                      </div>
                      <div className="flex flex-col gap-2">
                        {recentlyClosedSessions.map((session) => (
                          <div key={session.id} className="flex justify-between items-center bg-gray-50/50 rounded-lg p-3 text-sm border border-gray-100/50">
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-gray-700">{formatTableLabel(session.tableName, session.tableQrSlug)}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-500">
                                {session.closedAt ? `закрыт ${new Date(session.closedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : 'закрыт'}
                              </span>
                            </div>
                            <span className="font-medium text-gray-600">{session.totalAmount} ₽</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
             )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!cancellingOrderId} onOpenChange={(open) => !open && setCancellingOrderId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отменить заказ?</DialogTitle>
            <DialogDescription>
              Заказ будет помечен как отменённый. Это действие нельзя быстро отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCancellingOrderId(null)}>Вернуться</Button>
            <Button variant="destructive" onClick={() => {
              if (cancellingOrderId) {
                handleUpdateOrderStatus(cancellingOrderId, 'cancelled');
                setCancellingOrderId(null);
              }
            }}>Да, отменить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDialog?.isOpen} onOpenChange={(open) => !open && closeConfirm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog?.title}</DialogTitle>
            <DialogDescription>
              {confirmDialog?.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeConfirm}>Вернуться</Button>
            <Button variant={confirmDialog?.variant || 'default'} onClick={() => {
              if (confirmDialog?.onConfirm) {
                confirmDialog.onConfirm();
                closeConfirm();
              }
            }}>{confirmDialog?.confirmLabel}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
