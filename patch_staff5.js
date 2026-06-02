const fs = require('fs');
let code = fs.readFileSync('src/app/staff/page.tsx', 'utf8');

code = code.replace(/<TabsContent value="orders" className="space-y-4">[\s\S]*?<\/TabsContent>/, `
          <TabsContent value="all" className="space-y-4">
             <OrderGrid orders={orders} />
          </TabsContent>
          <TabsContent value="new" className="space-y-4">
             <OrderGrid orders={orders.filter(o => o.status === 'new')} />
          </TabsContent>
          <TabsContent value="harlem" className="space-y-4">
             <OrderGrid orders={orders.filter(o => o.items.some(i => i.source === 'harlem'))} />
          </TabsContent>
          <TabsContent value="craft_beery" className="space-y-4">
             <OrderGrid orders={orders.filter(o => o.items.some(i => i.source === 'craft_beery'))} />
          </TabsContent>`);

fs.writeFileSync('src/app/staff/page.tsx', code);
