// check-tokens.mjs — static token checks for figma-import.js (Rules 2 and 3).
//   1. `const tokens = { … }` is a plain literal that evaluates on its own
//   2. every C.x / S.x / R.x / Z.x / tokens.<group>.x reference exists in tokens
//   3. every typography key used (style: '…', *Style: '…', DEFAULT_TEXT_STYLE, txt(…, '…')) exists
//   4. every shadow key used (shadow: '…') exists
//   5. no hex color literal appears outside the tokens block (comments excluded)
//
// Usage: node check-tokens.mjs figma-import.js   → exit 0 clean, 1 on any problem
import fs from 'node:fs';

const src = fs.readFileSync(process.argv[2], 'utf8');
const problems = [];

// Blank out comments and string contents while keeping offsets, so brace matching and
// reference scanning are not fooled by text inside strings or comments.
function mask(code, keepStrings) {
  let out = '';
  let i = 0;
  while (i < code.length) {
    const c = code[i], d = code[i + 1];
    if (c === '/' && d === '/') { while (i < code.length && code[i] !== '\n') { out += ' '; i++; } continue; }
    if (c === '/' && d === '*') { while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) { out += code[i] === '\n' ? '\n' : ' '; i++; } out += '  '; i += 2; continue; }
    if (c === '\'' || c === '"' || c === '`') {
      const q = c; out += c; i++;
      while (i < code.length && code[i] !== q) {
        if (code[i] === '\\') { out += keepStrings ? code.slice(i, i + 2) : '  '; i += 2; continue; }
        out += keepStrings ? code[i] : (code[i] === '\n' ? '\n' : ' '); i++;
      }
      out += q; i++; continue;
    }
    out += c; i++;
  }
  return out;
}

const noComments = mask(src, true);   // strings intact, comments blanked
const skeleton = mask(src, false);    // strings and comments blanked

// 1 — locate and evaluate the tokens literal
const start = skeleton.search(/const\s+tokens\s*=\s*\{/);
let tokens = null;
let tokensEnd = -1;
if (start < 0) {
  problems.push('no `const tokens = {` block found');
} else {
  const open = skeleton.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < skeleton.length; i++) {
    if (skeleton[i] === '{') depth++;
    else if (skeleton[i] === '}' && --depth === 0) { tokensEnd = i + 1; break; }
  }
  try {
    tokens = new Function(`return (${src.slice(open, tokensEnd)});`)();
  } catch (err) {
    problems.push(`tokens block is not a plain literal: ${err.message}`);
  }
}

if (tokens) {
  const groups = { C: 'colors', S: 'spacing', R: 'radius', Z: 'sizes' };
  const rest = noComments.slice(tokensEnd);
  const restSkeleton = skeleton.slice(tokensEnd);

  // 2 — alias and tokens.<group> references (scan code only, not string contents)
  for (const [alias, group] of Object.entries(groups)) {
    const re = new RegExp(`\\b${alias}\\.([A-Za-z_$][\\w$]*)`, 'g');
    for (const m of restSkeleton.matchAll(re)) {
      if (!tokens[group] || !(m[1] in tokens[group])) problems.push(`${alias}.${m[1]} — not defined in tokens.${group}`);
    }
    const reBracket = new RegExp(`\\b${alias}\\[\\s*['"]([^'"]+)['"]\\s*\\]`, 'g');
    for (const m of rest.matchAll(reBracket)) {
      if (!tokens[group] || !(m[1] in tokens[group])) problems.push(`${alias}['${m[1]}'] — not defined in tokens.${group}`);
    }
  }
  for (const m of restSkeleton.matchAll(/\btokens\.(\w+)\.([A-Za-z_$][\w$]*)/g)) {
    if (!tokens[m[1]] || !(m[2] in tokens[m[1]])) problems.push(`tokens.${m[1]}.${m[2]} — not defined`);
  }

  // 3 — typography keys
  const typoRefs = [
    // style: '…' and any *Style: '…' param (numeralStyle, labelStyle…)
    ...[...rest.matchAll(/\b(?:style|\w+Style)\s*:\s*'([^']+)'/g)].map(m => m[1]),
    ...[...rest.matchAll(/DEFAULT_TEXT_STYLE\s*=\s*'([^']+)'/g)].map(m => m[1]),
    ...[...rest.matchAll(/\btxt\([^,]+,\s*'([^']+)'/g)].map(m => m[1])
  ];
  for (const key of new Set(typoRefs)) {
    if (!tokens.typography || !(key in tokens.typography)) problems.push(`typography '${key}' — not defined in tokens.typography`);
  }

  // 4 — shadow keys
  for (const m of rest.matchAll(/\bshadow\s*:\s*'([^']+)'/g)) {
    if (!tokens.shadows || !(m[1] in tokens.shadows)) problems.push(`shadow '${m[1]}' — not defined in tokens.shadows`);
  }

  // 5 — hex literals outside the tokens block
  const lines = rest.split('\n');
  const firstLine = src.slice(0, tokensEnd).split('\n').length;
  lines.forEach((line, i) => {
    const hex = line.match(/['"`]#[0-9A-Fa-f]{3,8}['"`]/);
    if (hex) problems.push(`line ${firstLine + i}: hardcoded color ${hex[0]} outside tokens — use C.<key>`);
  });
}

for (const p of [...new Set(problems)]) console.log(`❌ ${p}`);
console.log(problems.length ? `${new Set(problems).size} token problem(s).` : 'Token references clean.');
process.exit(problems.length ? 1 : 0);
