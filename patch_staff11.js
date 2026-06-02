const fs = require('fs');
let code = fs.readFileSync('src/app/staff/page.tsx', 'utf8');

// I should also ensure that 'Staff Dashboard' and 'Harlem Lounge' headers are somewhat localized or matching the requested "Russian UI only" as much as possible, though the prompt implies main components should be Russian. Let's localize the header.
code = code.replace(/<h1 className="text-xl font-bold">Staff Dashboard<\/h1>/, '<h1 className="text-xl font-bold">Панель персонала</h1>');
code = code.replace(/<Button variant="ghost" size="sm" className="text-white hover:bg-gray-800">Home<\/Button>/, '<Button variant="ghost" size="sm" className="text-white hover:bg-gray-800">На главную</Button>');
fs.writeFileSync('src/app/staff/page.tsx', code);
