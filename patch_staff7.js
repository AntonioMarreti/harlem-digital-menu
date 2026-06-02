const fs = require('fs');
let code = fs.readFileSync('src/app/staff/page.tsx', 'utf8');

// Move imports to top
let imports = [];
let withoutImports = code.split('\n').filter(line => {
  if (line.startsWith('import ') || line.startsWith('"use client";')) {
    imports.push(line);
    return false;
  }
  return true;
}).join('\n');

let finalCode = Array.from(new Set(imports)).join('\n') + '\n' + withoutImports;

fs.writeFileSync('src/app/staff/page.tsx', finalCode);
