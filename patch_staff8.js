const fs = require('fs');
let code = fs.readFileSync('src/app/staff/page.tsx', 'utf8');

const newOrderGrid = `
function OrderGrid({ orders, onUpdateStatus }: { orders: typeof mockOrders, onUpdateStatus: (id: string, status: any) => void }) {
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
          <Card key={order.id} className={\`border-t-4 \${hasCraftBeery ? 'border-t-orange-500' : 'border-t-blue-500'}\`}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Стол {order.tableNumber}</CardTitle>
                  <div className="text-xs text-gray-400 mt-1">{order.id}</div>
                </div>
                <Badge variant={statusColors[order.status] as any}>
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
`;

code = code.replace(/function OrderGrid\([\s\S]*?<\/div>\n  \);\n}\n/m, newOrderGrid);

fs.writeFileSync('src/app/staff/page.tsx', code);
