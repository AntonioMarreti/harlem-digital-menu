import { notFound } from 'next/navigation';
import { tables, categories, menuItems } from '@/lib/mock-data';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, ShoppingCart } from 'lucide-react';

export default function GuestTablePage({ params }: { params: { tableId: string } }) {
  const table = tables.find((t) => t.id === params.tableId);

  if (!table) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative shadow-xl">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b px-4 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold font-serif">Harlem Lounge</h1>
          <p className="text-sm text-gray-500">Table {table.number}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="rounded-full">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="default" size="icon" className="rounded-full relative">
            <ShoppingCart className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
              0
            </span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-24">
        <Tabs defaultValue="cat_hookah" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto h-auto py-2 bg-transparent gap-2 no-scrollbar border-b">
            {categories.map((cat) => (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="rounded-full data-[state=active]:bg-black data-[state=active]:text-white bg-gray-100 border border-gray-200"
              >
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-6">
            {categories.map((cat) => (
              <TabsContent key={cat.id} value={cat.id} className="space-y-4 outline-none">
                {menuItems
                  .filter((item) => item.categoryId === cat.id)
                  .map((item) => (
                    <Card key={item.id} className="overflow-hidden border-gray-200 shadow-sm">
                      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{item.name}</CardTitle>
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {item.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-[10px] py-0">{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="font-semibold">{item.price} ₽</span>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 text-sm text-gray-500">
                        {item.description}
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-end">
                        <Button size="sm" variant={cat.id === 'cat_hookah' ? 'default' : 'outline'}>
                          {cat.id === 'cat_hookah' ? 'Build Hookah' : 'Add to Order'}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </main>

      {/* Call Staff Floating Action */}
      <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-20 pointer-events-none">
         <div className="max-w-md w-full flex justify-center pointer-events-auto">
            <Button size="lg" className="rounded-full shadow-lg gap-2 bg-black hover:bg-gray-800 text-white w-2/3">
              <Bell className="h-5 w-5" />
              Call Staff
            </Button>
         </div>
      </div>
    </div>
  );
}
