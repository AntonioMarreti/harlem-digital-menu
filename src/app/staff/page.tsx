"use client";
import { useState } from "react";
import { mockOrders, mockCalls } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';


function OrderGrid({ orders, onUpdateStatus }: { orders: typeof mockOrders, onUpdateStatus: (id: string, status: 'new' | 'accepted' | 'preparing' | 'served' | 'closed') => void }) {
  const statusTranslations: Record<string, string> = {
    new: 'Новый',
    accepted: 'Принят',
    preparing: 'Готовится',
    served: 'Вынесен',
    closed: 'Закрыт'
  };

  const statusColors: Record<string, string> = {
    new: 'destructive',
    accepted: 'default',
    preparing: 'secondary',
    served: 'outline',
    closed: 'outline'
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {orders.map((order) => {
        const harlemItems = order.items.filter(i => i.source === 'harlem');
        const craftBeeryItems = order.items.filter(i => i.source === 'craft_beery');
        const hasCraftBeery = craftBeeryItems.length > 0;

        return (
          <Card key={order.id} className={`border-t-4 ${hasCraftBeery ? 'border-t-orange-500' : 'border-t-blue-500'}`}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Стол {order.tableNumber}</CardTitle>
                  <div className="text-xs text-gray-400 mt-1">{order.id}</div>
                </div>
                <Badge variant={statusColors[order.status] as "default" | "destructive" | "outline" | "secondary"}>
                  {statusTranslations[order.status]}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-500 mt-2">
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {order.time}
                </div>
                <div className="font-semibold text-gray-800">{order.totalAmount} ₽</div>
              </div>
            </CardHeader>
            <CardContent className="py-2 border-y my-2 space-y-3">
              {harlemItems.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Харлем</h4>
                  <ul className="space-y-1 text-sm">
                    {harlemItems.map((item, idx) => (
                      <li key={idx} className="flex justify-between">
                        <span>{item.quantity}x {item.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {hasCraftBeery && (
                <div>
                  <h4 className="text-xs font-semibold text-orange-600 uppercase mb-1">Craft Beery</h4>
                  <ul className="space-y-1 text-sm text-orange-900 bg-orange-50 p-2 rounded">
                    {craftBeeryItems.map((item, idx) => (
                      <li key={idx} className="flex justify-between">
                        <span>{item.quantity}x {item.name}</span>
                      </li>
                    ))}
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
                  <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => onUpdateStatus(order.id, 'served')}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Вынесен
                  </Button>
              )}
              {order.status === 'served' && (
                  <Button size="sm" variant="outline" onClick={() => onUpdateStatus(order.id, 'closed')}>Закрыть</Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}



export default function StaffDashboard() {
  const [orders, setOrders] = useState(mockOrders);
  const handleUpdateOrderStatus = (id: string, status: 'new' | 'accepted' | 'preparing' | 'served' | 'closed') => {
    setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
  };
  const [calls, setCalls] = useState(mockCalls);
  const handleMarkCallHandled = (id: string) => {
    setCalls(calls.map(c => c.id === id ? { ...c, status: 'handled' } : c));
  };
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-black text-white p-4 sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Панель персонала</h1>
          <p className="text-xs text-gray-400">Harlem Lounge</p>
        </div>
        <Link href="/">
           <Button variant="ghost" size="sm" className="text-white hover:bg-gray-800">На главную</Button>
        </Link>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
        <Tabs defaultValue="all" className="w-full flex flex-col">
          <div className="w-full overflow-x-auto pb-2 mb-4">
            <TabsList className="flex w-max min-w-full sm:w-full space-x-2">
              <TabsTrigger value="all">Все ({orders.length})</TabsTrigger>
              <TabsTrigger value="new">Новые ({orders.filter(o => o.status === 'new').length})</TabsTrigger>
              <TabsTrigger value="harlem">Кальяны ({orders.filter(o => o.items.some(i => i.source === 'harlem')).length})</TabsTrigger>
              <TabsTrigger value="craft_beery">Craft Beery ({orders.filter(o => o.items.some(i => i.source === 'craft_beery')).length})</TabsTrigger>
              <TabsTrigger value="calls" className="relative">
                Вызовы
                {calls.filter(c => c.status === 'new').length > 0 && (
                  <span className="ml-2 w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>


          <TabsContent value="all" className="space-y-4">
             <OrderGrid orders={orders} onUpdateStatus={handleUpdateOrderStatus} />
          </TabsContent>
          <TabsContent value="new" className="space-y-4">
             <OrderGrid orders={orders.filter(o => o.status === 'new')} onUpdateStatus={handleUpdateOrderStatus} />
          </TabsContent>
          <TabsContent value="harlem" className="space-y-4">
             <OrderGrid orders={orders.filter(o => o.items.some(i => i.source === 'harlem'))} onUpdateStatus={handleUpdateOrderStatus} />
          </TabsContent>
          <TabsContent value="craft_beery" className="space-y-4">
             <OrderGrid orders={orders.filter(o => o.items.some(i => i.source === 'craft_beery'))} onUpdateStatus={handleUpdateOrderStatus} />
          </TabsContent>

          <TabsContent value="calls" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {calls.map((call) => (
                  <Card key={call.id} className={`border-t-4 ${call.status === 'new' ? 'border-t-red-500 bg-red-50' : 'border-t-gray-300 bg-gray-50 opacity-60'}`}>
                     <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className={call.status === 'new' ? 'text-red-700' : 'text-gray-700'}>Стол {call.tableNumber}</CardTitle>
                          {call.status === 'new' ? <AlertCircle className="text-red-500 w-5 h-5" /> : <CheckCircle2 className="text-gray-500 w-5 h-5" />}
                        </div>
                        <div className="text-lg font-semibold mt-2">{call.type}</div>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          {call.time}
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
