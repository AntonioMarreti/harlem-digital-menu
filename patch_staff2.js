const fs = require('fs');
let code = fs.readFileSync('src/app/staff/page.tsx', 'utf8');
code = code.replace("import { orders, calls } from '@/lib/mock-data';", "import { mockOrders, mockCalls } from '@/lib/mock-data';");
fs.writeFileSync('src/app/staff/page.tsx', code);
