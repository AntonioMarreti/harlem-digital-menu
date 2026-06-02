import { mockOrders, mockCalls } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function StaffDashboard() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-black text-white p-4 sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Staff Dashboard</h1>
          <p className="text-xs text-gray-400">Harlem Lounge</p>
        </div>
        <Link href="/">
           <Button variant="ghost" size="sm" className="text-white hover:bg-gray-800">Home</Button>
        </Link>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="orders">Active Orders ({mockOrders.length})</TabsTrigger>
            <TabsTrigger value="calls" className="relative">
              Staff Calls
              {mockCalls.length > 0 && (
                <span className="ml-2 w-2 h-2 rounded-full bg-red-500 inline-block"></span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockOrders.map((order) => (
                <Card key={order.id} className="border-t-4 border-t-blue-500">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle>Table {order.tableId}</CardTitle>
                      <Badge variant={order.status === 'new' ? 'destructive' : 'secondary'}>
                        {order.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Clock className="w-3 h-3 mr-1" />
                      {order.time}
                    </div>
                  </CardHeader>
                  <CardContent className="py-2 border-y my-2">
                    <ul className="space-y-1 text-sm">
                      {order.items.map((item, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>{item.quantity}x {item.name}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="pt-2 flex justify-end gap-2">
                    {order.status === 'new' && (
                       <Button size="sm">Accept</Button>
                    )}
                    {order.status === 'preparing' && (
                       <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50">
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Ready
                       </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="calls" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {mockCalls.map((call) => (
                  <Card key={call.id} className="border-t-4 border-t-red-500 bg-red-50">
                     <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-red-700">Table {call.tableId}</CardTitle>
                          <AlertCircle className="text-red-500 w-5 h-5" />
                        </div>
                        <div className="text-lg font-semibold mt-2">{call.type}</div>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          {call.time}
                        </div>
                     </CardHeader>
                     <CardFooter>
                        <Button className="w-full bg-red-600 hover:bg-red-700 text-white">Mark as Handled</Button>
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
