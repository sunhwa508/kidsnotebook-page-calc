#!/usr/bin/env node
import { readFileSync } from 'node:fs';

import { calcPages } from './index';

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
  });
}

async function main() {
  const file = process.argv[2];
  const raw = file ? readFileSync(file, 'utf-8') : await readStdin();
  if (!raw) {
    process.stderr.write('Usage: kidsnotebook-page-calc <input.json>\n');
    process.stderr.write('Or pass JSON via stdin.\n');
    process.exit(1);
  }

  const input = JSON.parse(raw);
  const output = calcPages(input);
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((err) => {
  process.stderr.write(`Error: ${String(err)}\n`);
  process.exit(1);
});
