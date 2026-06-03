const fs = require('fs');
const file = 'src/app/api/tables/[tableId]/bill/route.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace('const db = getDb();', `
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      tableSessionId: "mock-session-123",
      tableId: params.tableId,
      tableName: "Mock Table",
      tableQrSlug: params.tableId,
      ordersCount: 3,
      activeOrdersCount: 1,
      totalAmount: 1500,
      createdAt: new Date().toISOString()
    }, { status: 200 });
  }
  const db = getDb();
`);
fs.writeFileSync(file, content);
