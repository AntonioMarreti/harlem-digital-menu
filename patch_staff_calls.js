const fs = require('fs');
const file = 'src/app/api/staff-calls/route.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace('const db = getDb();', `
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ call: { id: "mock-call", status: "new" } }, { status: 201 });
  }
  const db = getDb();
`);
fs.writeFileSync(file, content);
