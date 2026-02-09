#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const index_1 = require("./index");
function readStdin() {
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
    const raw = file ? (0, node_fs_1.readFileSync)(file, 'utf-8') : await readStdin();
    if (!raw) {
        process.stderr.write('Usage: kidsnotebook-page-calc <input.json>\n');
        process.stderr.write('Or pass JSON via stdin.\n');
        process.exit(1);
    }
    const input = JSON.parse(raw);
    const output = (0, index_1.calcPages)(input);
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}
main().catch((err) => {
    process.stderr.write(`Error: ${String(err)}\n`);
    process.exit(1);
});
