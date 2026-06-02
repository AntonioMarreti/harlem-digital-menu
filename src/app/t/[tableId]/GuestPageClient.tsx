"use client"

import { useState } from 'react';
import { Category, MenuItem, Table } from '@/lib/mock-data';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, ShoppingCart, Plus, Minus, Check, Flame, HelpCircle, Utensils, Clock, ChevronRight } from 'lucide-react';

export default function GuestPageClient({
  table,
  categories,
  menuItems
}: {
  table: Table;
  categories: Category[];
  menuItems: MenuItem[];
}) {
  const [cart, setCart] = useState<{item: MenuItem, quantity: number, notes?: string}[]>([]);
  const [isHookahBuilderOpen, setIsHookahBuilderOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isStaffOpen, setIsStaffOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'none' | 'new' | 'preparing' | 'delivered'>('none');
  const [staffCallStatus, setStaffCallStatus] = useState<string | null>(null);

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

  const removeFromCart = (index: number) => {
    setCart(prev => {
      const newCart = [...prev];
      if (newCart[index].quantity > 1) {
        newCart[index].quantity -= 1;
      } else {
        newCart.splice(index, 1);
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
      const notes = `Strength: ${hookahStrength}, Taste: ${hookahTaste}${hookahNotes ? ` - ${hookahNotes}` : ''}`;
      addToCart(selectedHookahItem, notes);
      setIsHookahBuilderOpen(false);
      setHookahNotes('');
    }
  };

  const submitOrder = () => {
    setOrderStatus('new');
    setIsCartOpen(false);
    setCart([]);

    // Simulate order progression
    setTimeout(() => setOrderStatus('preparing'), 3000);
    setTimeout(() => setOrderStatus('delivered'), 10000);
  };

  const callStaff = (reason: string) => {
    setStaffCallStatus(`Staff called: ${reason}`);
    setIsStaffOpen(false);
    setTimeout(() => setStaffCallStatus(null), 3000);
  };

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

      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/50 px-5 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold font-serif tracking-wide text-primary">Harlem</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/70"></span> Стол {table.number}
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

        {/* Статус заказа Ribbon */}
        {orderStatus !== 'none' && (
          <div className="mx-5 mb-6 bg-card border border-border/50 rounded-xl p-4 flex items-center justify-between shadow-sm" onClick={() => setIsCartOpen(true)}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                {orderStatus === 'new' && <Clock className="h-4 w-4" />}
                {orderStatus === 'preparing' && <Flame className="h-4 w-4" />}
                {orderStatus === 'delivered' && <Check className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-sm font-medium">Ваш заказ {orderStatus === "new" ? "отправлен" : orderStatus === "preparing" ? "готовится" : "выполнен"}</p>
                <p className="text-xs text-muted-foreground">Нажмите для деталей</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        {/* Menu Tabs */}
        <Tabs defaultValue="cat_hookah" className="w-full flex-col">
          <div className="px-5 sticky top-[73px] z-10 bg-background/95 backdrop-blur-md pt-2 pb-2">
            <TabsList className="w-full flex-nowrap justify-start overflow-x-auto h-auto py-1 px-1 bg-secondary/50 rounded-full gap-1 no-scrollbar border border-border/20">
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="rounded-full px-4 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex-shrink-0"
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
                  .map((item) => (
                    <Card key={item.id} className="w-full min-w-0 overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm shadow-sm hover:border-primary/30 transition-colors">
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
                        </div>
                        <span className="font-semibold text-primary whitespace-nowrap">{item.price} ₽</span>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-end">
                        {cat.id === 'cat_hookah' ? (
                          <Button
                            size="sm"
                            className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border-none transition-colors rounded-full px-5"
                            onClick={() => handleBuildHookah(item)}
                          >
                            Настроить кальян
                          </Button>
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
                  ))}
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
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Крепость</Label>
                <RadioGroup value={hookahStrength} onValueChange={setHookahStrength} className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'light', label: 'Лёгкий' },
                    { value: 'medium', label: 'Средний' },
                    { value: 'strong', label: 'Крепкий' }
                  ].map((s) => (
                    <div key={s.value}>
                      <RadioGroupItem value={s.value} id={`strength-${s.value}`} className="peer sr-only" />
                      <Label
                        htmlFor={`strength-${s.value}`}
                        className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-background p-3 hover:bg-accent/50 hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                      >
                        <span className="text-sm font-medium">{s.label}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Вкусовой профиль</Label>
                <RadioGroup value={hookahTaste} onValueChange={setHookahTaste} className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'sweet', label: 'сладкий' },
                    { value: 'sour', label: 'кислый' },
                    { value: 'fresh', label: 'свежий' },
                    { value: 'spicy', label: 'пряный' },
                    { value: 'dessert', label: 'десертный' },
                    { value: 'trust master', label: 'на выбор мастера' }
                  ].map((t) => (
                    <div key={t.value}>
                      <RadioGroupItem value={t.value} id={`taste-${t.value}`} className="peer sr-only" />
                      <Label
                        htmlFor={`taste-${t.value}`}
                        className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-background p-3 hover:bg-accent/50 hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary cursor-pointer transition-all text-center"
                      >
                        <span className="text-sm font-medium text-center leading-tight">{t.label}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-3">
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
            {cart.length === 0 && orderStatus === 'none' ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground space-y-4">
                <ShoppingCart className="h-12 w-12 opacity-20" />
                <p>Ваша корзина пуста</p>
                <SheetClose render={<Button variant="outline" className="rounded-full border-border/50">Вернуться в меню</Button>} />
              </div>
            ) : (
              <div className="space-y-6">
                {orderStatus !== 'none' && (
                   <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
                     <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Статус заказа
                     </h3>
                     <p className="text-sm">Текущий статус: <strong className="uppercase tracking-wide">{orderStatus === "new" ? "ОТПРАВЛЕН" : orderStatus === "preparing" ? "ГОТОВИТСЯ" : "ВЫПОЛНЕН"}</strong></p>
                   </div>
                )}

                <div className="space-y-4">
                  {cart.map((cartItem, idx) => (
                    <div key={idx} className="flex gap-4 items-start">
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between">
                          <p className="font-medium">{cartItem.item.name}</p>
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
                          onClick={() => removeFromCart(idx)}
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
              </div>
            )}
          </ScrollArea>

          {cart.length > 0 && (
            <div className="p-6 border-t border-border/20 bg-background/50 backdrop-blur-md">
              <div className="flex justify-between items-center mb-4">
                <span className="text-muted-foreground">Итого</span>
                <span className="text-xl font-bold text-primary">{cartTotal} ₽</span>
              </div>
              <Button
                className="w-full rounded-full py-6 text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                onClick={submitOrder}
              >
                Отправить заказ
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
              onClick={() => callStaff('Call waiter')}
            >
              <Utensils className="h-6 w-6" />
              <span>Позвать официанта</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-3 rounded-2xl border-border/50 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all"
              onClick={() => callStaff('Replace coals')}
            >
              <Flame className="h-6 w-6" />
              <span>Заменить угли</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-3 rounded-2xl border-border/50 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all"
              onClick={() => callStaff('Ask for bill')}
            >
              <span className="text-xl font-serif">₽</span>
              <span>Попросить счёт</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-3 rounded-2xl border-border/50 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all"
              onClick={() => callStaff('Need help')}
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
