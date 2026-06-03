const fs = require('fs');
const file = 'src/app/api/tables/[tableId]/session/route.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace('const db = getDb();', `
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      session: { id: "mock-session-123", tableId: params.tableId, status: "active", createdAt: new Date().toISOString() },
      table: { id: params.tableId, name: "Mock Table", qrSlug: params.tableId }
    }, { status: 200 });
  }
  const db = getDb();
`);
fs.writeFileSync(file, content);
