const fs = require('fs');
let code = fs.readFileSync('src/app/staff/page.tsx', 'utf8');

code = code.replace(/onUpdateStatus: \(id: string, status: any\) => void/, "onUpdateStatus: (id: string, status: 'new' | 'accepted' | 'preparing' | 'served' | 'closed') => void");
code = code.replace(/variant={statusColors\[order.status\] as any}/, "variant={statusColors[order.status] as \"default\" | \"destructive\" | \"outline\" | \"secondary\"}");

// The main page needs to pass onUpdateStatus
code = code.replace(/<OrderGrid orders={orders} \/>/g, "<OrderGrid orders={orders} onUpdateStatus={handleUpdateOrderStatus} />");
code = code.replace(/<OrderGrid orders={orders.filter\(o => o.status === 'new'\)} \/>/g, "<OrderGrid orders={orders.filter(o => o.status === 'new')} onUpdateStatus={handleUpdateOrderStatus} />");
code = code.replace(/<OrderGrid orders={orders.filter\(o => o.items.some\(i => i.source === 'harlem'\)\)} \/>/g, "<OrderGrid orders={orders.filter(o => o.items.some(i => i.source === 'harlem'))} onUpdateStatus={handleUpdateOrderStatus} />");
code = code.replace(/<OrderGrid orders={orders.filter\(o => o.items.some\(i => i.source === 'craft_beery'\)\)} \/>/g, "<OrderGrid orders={orders.filter(o => o.items.some(i => i.source === 'craft_beery'))} onUpdateStatus={handleUpdateOrderStatus} />");

code = code.replace("const [orders] = useState(mockOrders);", `const [orders, setOrders] = useState(mockOrders);
  const handleUpdateOrderStatus = (id: string, status: 'new' | 'accepted' | 'preparing' | 'served' | 'closed') => {
    setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
  };`);
fs.writeFileSync('src/app/staff/page.tsx', code);
