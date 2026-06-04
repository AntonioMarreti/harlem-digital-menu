"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';


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

const callReasonLabels: Record<string, string> = {
  waiter: 'Подойти',
  coals: 'Угли',
  bill: 'Счёт',
  help: 'Нужна помощь'
};

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

function OrderGrid({ orders, onUpdateStatus, onCloseTableSession }: { orders: Order[], onUpdateStatus: (id: string, status: 'new' | 'accepted' | 'preparing' | 'delivered' | 'closed' | 'cancelled') => void, onCloseTableSession: (tableId: string) => void }) {
  const statusTranslations: Record<string, string> = {
    new: 'Новый',
    accepted: 'Принят',
    preparing: 'Готовится',
    delivered: 'Вынесен',
    cancelled: 'Отменён',
    closed: 'Закрыт'
  };

  const statusColors: Record<string, string> = {
    new: 'destructive',
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

        return (
          <Card key={order.id} className={`border-t-4 ${hasCraftBeery ? 'border-t-orange-500' : 'border-t-blue-500'}`}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Стол {order.tableQrSlug || order.tableName}</CardTitle>
                  <div className="text-xs text-gray-400 mt-1">{order.id}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={statusColors[order.status] as "default" | "destructive" | "outline" | "secondary"}>
                    {statusTranslations[order.status]}
                  </Badge>
                  <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => onCloseTableSession(order.tableId)}>
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
                  <Button size="sm" onClick={() => onUpdateStatus(order.id, 'accepted')}>Принять</Button>
              )}
              {order.status === 'accepted' && (
                  <Button size="sm" onClick={() => onUpdateStatus(order.id, 'preparing')}>Готовить</Button>
              )}
              {order.status === 'preparing' && (
                  <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => onUpdateStatus(order.id, 'delivered')}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Вынесен
                  </Button>
              )}
              {order.status === 'delivered' && (
                  <Button size="sm" variant="outline" onClick={() => onUpdateStatus(order.id, 'closed')}>Закрыть</Button>
              )}
              {(order.status === 'new' || order.status === 'accepted') && (
                  <Button size="sm" variant="destructive" onClick={() => onUpdateStatus(order.id, 'cancelled')}>Отменить</Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}



export default function StaffDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [calls, setCalls] = useState<StaffCall[]>([]);
  const [tableSessions, setTableSessions] = useState<TableSessionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);

      const [ordersRes, callsRes, tableSessionsRes] = await Promise.all([
        fetch('/api/staff/orders'),
        fetch('/api/staff-calls'),
        fetch('/api/staff/table-sessions')
      ]);

      if (!ordersRes.ok || !callsRes.ok || !tableSessionsRes.ok) {
        throw new Error('Ошибка при загрузке данных');
      }

      const ordersData = await ordersRes.json();
      const callsData = await callsRes.json();
      const tableSessionsData = await tableSessionsRes.json();

      setOrders(ordersData.orders || []);
      setCalls(callsData.calls || []);
      setTableSessions(tableSessionsData.tableSessions || []);
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

  const handleCloseTableSession = async (tableId: string) => {
    if (!confirm('Вы уверены, что хотите освободить стол? Это закроет текущую сессию и скроет все заказы для этого стола.')) return;
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

  const newOrders = orders.filter(o => o.status === 'new');
  const harlemOrders = orders.filter(o => o.items.some(i => i.source === 'harlem'));
  const craftBeeryOrders = orders.filter(o => o.items.some(i => i.source === 'craft_beery'));
  const activeCalls = calls.filter(c => c.status === 'new');

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
          <Link href="/">
           <Button variant="ghost" size="sm" className="text-white hover:bg-gray-800">На главную</Button>
        </Link>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
        <Tabs defaultValue="all" className="w-full flex flex-col">
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
              <TabsTrigger value="tables">Счета ({tableSessions.length})</TabsTrigger>
            </TabsList>
          </div>


          <TabsContent value="all" className="space-y-4">
             {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mr-3"></div>
                  <span className="text-gray-500 font-medium my-auto">Загрузка заказов...</span>
                </div>
             ) : orders.length === 0 ? (
                <div className="text-center py-12 text-gray-500 font-medium">Нет активных заказов</div>
             ) : (
                <OrderGrid orders={orders} onUpdateStatus={handleUpdateOrderStatus} onCloseTableSession={handleCloseTableSession} />
             )}
          </TabsContent>
          <TabsContent value="new" className="space-y-4">
             {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mr-3"></div>
                  <span className="text-gray-500 font-medium my-auto">Загрузка заказов...</span>
                </div>
             ) : newOrders.length === 0 ? (
                <div className="text-center py-12 text-gray-500 font-medium">Нет новых заказов</div>
             ) : (
                <OrderGrid orders={newOrders} onUpdateStatus={handleUpdateOrderStatus} onCloseTableSession={handleCloseTableSession} />
             )}
          </TabsContent>
          <TabsContent value="harlem" className="space-y-4">
             {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mr-3"></div>
                  <span className="text-gray-500 font-medium my-auto">Загрузка заказов...</span>
                </div>
             ) : harlemOrders.length === 0 ? (
                <div className="text-center py-12 text-gray-500 font-medium">Нет активных заказов Harlem</div>
             ) : (
                <OrderGrid orders={harlemOrders} onUpdateStatus={handleUpdateOrderStatus} onCloseTableSession={handleCloseTableSession} />
             )}
          </TabsContent>
          <TabsContent value="craft_beery" className="space-y-4">
             {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mr-3"></div>
                  <span className="text-gray-500 font-medium my-auto">Загрузка заказов...</span>
                </div>
             ) : craftBeeryOrders.length === 0 ? (
                <div className="text-center py-12 text-gray-500 font-medium">Нет активных заказов Craft Beery</div>
             ) : (
                <OrderGrid orders={craftBeeryOrders} onUpdateStatus={handleUpdateOrderStatus} onCloseTableSession={handleCloseTableSession} />
             )}
          </TabsContent>

          <TabsContent value="calls" className="space-y-4">
            {activeCalls.length === 0 ? (
              <div className="text-center py-12 text-gray-500 font-medium">Нет активных вызовов</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {activeCalls.map((call) => (
                  <Card key={call.id} className={`border-t-4 ${call.status === 'new' ? 'border-t-red-500 bg-red-50' : 'border-t-gray-300 bg-gray-50 opacity-60'}`}>
                     <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className={call.status === 'new' ? 'text-red-700' : 'text-gray-700'}>Стол {call.tableQrSlug || call.tableName}</CardTitle>
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

          <TabsContent value="tables" className="space-y-4">
             {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mr-3"></div>
                  <span className="text-gray-500 font-medium my-auto">Загрузка столов...</span>
                </div>
             ) : tableSessions.length === 0 ? (
                <div className="text-center py-12 text-gray-500 font-medium">Нет занятых столов</div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tableSessions.map((session) => (
                    <Card key={session.id} className="border-t-4 border-t-purple-500">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle>Стол {session.tableQrSlug || session.tableName}</CardTitle>
                          <Badge variant={session.activeOrdersCount > 0 ? "default" : "outline"}>
                            {session.activeOrdersCount > 0 ? 'Есть активные заказы' : 'Все заказы закрыты'}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-500 mt-2">
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(session.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
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
                      <CardFooter className="pt-2">
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
