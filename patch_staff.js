const fs = require('fs');
let code = fs.readFileSync('src/app/staff/page.tsx', 'utf8');

code = '"use client";\n\nimport { useState } from "react";\n' + code;

code = code.replace("export default function StaffDashboard() {", `export default function StaffDashboard() {
  const [orders, setOrders] = useState(mockOrders);
  const [calls, setCalls] = useState(mockCalls);`);

code = code.replace(/mockOrders/g, "orders");
code = code.replace(/mockCalls/g, "calls");
code = code.replace("useState(orders)", "useState(mockOrders)");
code = code.replace("useState(calls)", "useState(mockCalls)");

fs.writeFileSync('src/app/staff/page.tsx', code);
