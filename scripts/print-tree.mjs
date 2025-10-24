import fs from 'fs';
import path from 'path';

const IGNORES = new Set(['node_modules', '.next', '.vercel', '.git']);
const MAX_DEPTH = 3;

function listDirs(dir) {
try {
return fs.readdirSync(dir, { withFileTypes: true })
.filter(d => d.isDirectory() && !IGNORES.has(d.name))
.map(d => d.name)
.sort((a, b) => a.localeCompare(b));
} catch {
return [];
}
}

function printTree(dir, prefix = '', depth = 0) {
if (depth >= MAX_DEPTH) return;
const children = listDirs(dir);
children.forEach((name, i) => {
const last = i === children.length - 1;
const connector = last ? '└── ' : '├── ';
console.log(prefix + connector + name);
const nextPrefix = prefix + (last ? '    ' : '│   ');
printTree(path.join(dir, name), nextPrefix, depth + 1);
});
}

console.log(path.basename(process.cwd()));
printTree(process.cwd());
