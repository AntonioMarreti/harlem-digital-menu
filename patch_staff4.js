const fs = require('fs');
let code = fs.readFileSync('src/app/staff/page.tsx', 'utf8');

code = code.replace(/<TabsList className="mb-6">[\s\S]*?<\/TabsList>/, `<div className="w-full overflow-x-auto pb-2 mb-4">
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
          </div>`);
code = code.replace('<Tabs defaultValue="orders" className="w-full">', '<Tabs defaultValue="all" className="w-full">');

// Now let's handle the contents

fs.writeFileSync('src/app/staff/page.tsx', code);
