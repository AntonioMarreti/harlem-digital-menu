const fs = require('fs');
let code = fs.readFileSync('src/app/staff/page.tsx', 'utf8');

code = `
function OrderGrid({ orders }: { orders: typeof mockOrders }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {orders.map((order) => (
        <Card key={order.id} className="border-t-4 border-t-blue-500">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <CardTitle>Стол {order.tableNumber}</CardTitle>
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
                <Button size="sm">Принять</Button>
            )}
            {order.status === 'preparing' && (
                <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Вынесен
                </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

` + code;

fs.writeFileSync('src/app/staff/page.tsx', code);
