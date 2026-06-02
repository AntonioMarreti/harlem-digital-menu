const fs = require('fs');
let code = fs.readFileSync('src/app/staff/page.tsx', 'utf8');

code = code.replace("const [calls] = useState(mockCalls);", `const [calls, setCalls] = useState(mockCalls);
  const handleMarkCallHandled = (id: string) => {
    setCalls(calls.map(c => c.id === id ? { ...c, status: 'handled' } : c));
  };`);

code = code.replace(/<Button className="w-full bg-red-600 hover:bg-red-700 text-white">Mark as Handled<\/Button>/, `<Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={() => handleMarkCallHandled(call.id)}>Отметить как выполненный</Button>`);

// Filter out handled calls from displaying red border maybe, or keep them all? The instructions say "Staff should be able to mark a mock call as handled locally." but we also should probably hide or gray out handled calls.
// Let's gray out handled calls.

code = code.replace(/<Card key={call.id} className="border-t-4 border-t-red-500 bg-red-50">/, `<Card key={call.id} className={\`border-t-4 \${call.status === 'new' ? 'border-t-red-500 bg-red-50' : 'border-t-gray-300 bg-gray-50 opacity-60'}\`}>`);

code = code.replace(/<CardTitle className="text-red-700">Table {call.tableId}<\/CardTitle>/, `<CardTitle className={call.status === 'new' ? 'text-red-700' : 'text-gray-700'}>Стол {call.tableNumber}</CardTitle>`);

code = code.replace(/<AlertCircle className="text-red-500 w-5 h-5" \/>/, `{call.status === 'new' ? <AlertCircle className="text-red-500 w-5 h-5" /> : <CheckCircle2 className="text-gray-500 w-5 h-5" />}`);

code = code.replace(/<CardFooter>\n\s*<Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={\(\) => handleMarkCallHandled\(call.id\)}>Отметить как выполненный<\/Button>\n\s*<\/CardFooter>/, `<CardFooter>
                        {call.status === 'new' && (
                           <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={() => handleMarkCallHandled(call.id)}>Отметить как выполненный</Button>
                        )}
                     </CardFooter>`);

fs.writeFileSync('src/app/staff/page.tsx', code);
