const fs = require('fs');
let code = fs.readFileSync('src/app/staff/page.tsx', 'utf8');
code = code.replace("const [orders, setOrders] = useState(mockOrders);", "const [orders] = useState(mockOrders);");
code = code.replace("const [calls, setCalls] = useState(mockCalls);", "const [calls] = useState(mockCalls);");
fs.writeFileSync('src/app/staff/page.tsx', code);
