import { categories, menuItems, tables } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, QrCode } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-sm text-gray-500">System Management</p>
        </div>
        <div className="flex gap-4">
           <Link href="/">
             <Button variant="outline">Back to Home</Button>
           </Link>
           <Button variant="ghost" size="icon"><Settings className="w-5 h-5" /></Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r hidden md:block">
           <nav className="p-4 space-y-2">
             <Button variant="secondary" className="w-full justify-start">Dashboard</Button>
             <Button variant="ghost" className="w-full justify-start">Menu Items</Button>
             <Button variant="ghost" className="w-full justify-start">Categories</Button>
             <Button variant="ghost" className="w-full justify-start">Tables & QR</Button>
             <Button variant="ghost" className="w-full justify-start text-gray-400">Settings (Soon)</Button>
           </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500 font-medium">Total Menu Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{menuItems.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500 font-medium">Active Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{categories.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500 font-medium">Registered Tables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{tables.length}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Tables Quick View */}
             <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                   <div>
                     <CardTitle>Tables & QR Codes</CardTitle>
                     <CardDescription>Manage your venue tables</CardDescription>
                   </div>
                   <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Table</Button>
                </CardHeader>
                <CardContent>
                   <ul className="divide-y">
                      {tables.map(table => (
                         <li key={table.id} className="py-3 flex justify-between items-center">
                            <div>
                               <p className="font-medium">{table.name}</p>
                               <p className="text-xs text-gray-500">ID: {table.id}</p>
                            </div>
                            <div className="flex gap-2">
                               <Button variant="outline" size="sm">
                                  <Link href={`/t/${table.id}`} target="_blank">View</Link>
                               </Button>
                               <Button variant="secondary" size="icon"><QrCode className="w-4 h-4" /></Button>
                            </div>
                         </li>
                      ))}
                   </ul>
                </CardContent>
             </Card>

             {/* Menu Quick View */}
             <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                   <div>
                     <CardTitle>Menu Overview</CardTitle>
                     <CardDescription>Recent items</CardDescription>
                   </div>
                   <Button size="sm" variant="outline">Manage All</Button>
                </CardHeader>
                <CardContent>
                   <ul className="divide-y">
                      {menuItems.slice(0, 4).map(item => (
                         <li key={item.id} className="py-3 flex justify-between items-center">
                            <div>
                               <p className="font-medium text-sm">{item.name}</p>
                               <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-500">{item.price} ₽</span>
                                  {item.isAvailable ? (
                                    <Badge variant="secondary" className="text-[10px] py-0 h-4 bg-green-100 text-green-800">Available</Badge>
                                  ) : (
                                    <Badge variant="destructive" className="text-[10px] py-0 h-4">Hidden</Badge>
                                  )}
                               </div>
                            </div>
                            <Button variant="ghost" size="sm">Edit</Button>
                         </li>
                      ))}
                   </ul>
                </CardContent>
             </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
