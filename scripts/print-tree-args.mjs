import fs from 'fs';
import path from 'path';

const IGNORES = new Set(['node_modules', '.next', '.vercel', '.git']);

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

function printTree(dir, maxDepth, prefix = '', depth = 0) {
  if (depth >= maxDepth) return;
  const children = listDirs(dir);
  children.forEach((name, i) => {
    const last = i === children.length - 1;
    const connector = last ? '└── ' : '├── ';
    console.log(prefix + connector + name);
    const nextPrefix = prefix + (last ? '    ' : '│   ');
    printTree(path.join(dir, name), maxDepth, nextPrefix, depth + 1);
  });
}

const target = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const maxDepth = Number(process.argv[3] || 3);

console.log(path.relative(process.cwd(), target) || path.basename(target));
printTree(target, maxDepth);
