import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const outDir = resolve(root, 'developer-kit');

if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}

mkdirSync(outDir, { recursive: true });

copyIfExists('tools', 'tools');
copyIfExists('docs/schemas', 'docs/schemas');
copyIfExists('docs/minibo-bootstrap-account-spec-ar.md', 'docs/minibo-bootstrap-account-spec-ar.md');
copyIfExists('docs/free-engine-bulk-spec-ar.md', 'docs/free-engine-bulk-spec-ar.md');
copyIfExists('.env.example', '.env.example');

writeFileSync(
  resolve(outDir, 'README.md'),
  `# Developer Kit

هذا المجلد مخصص للمطورين فقط، ولا يجب رفعه ضمن نسخة المستخدم النهائية على Vercel.

## المحتويات

- tools/Minibo.Systems.BootstrapIssuer
- tools/Minibo.Systems.BulkPackageTool
- docs/schemas
- docs/minibo-bootstrap-account-spec-ar.md
- docs/free-engine-bulk-spec-ar.md

## الاستخدام السريع

إصدار ملف bootstrap:

\`\`\`bash
npm run issue:bootstrap -- --username=admin --password=1234 --targetInstance=minibo-vercel-main
\`\`\`

فحص manifest خاص بـ bulk:

\`\`\`bash
npm run verify:bulk -- path/to/manifest.json
\`\`\`
`,
  'utf8'
);

console.log(`Developer kit created at: ${outDir}`);

function copyIfExists(fromRelative, toRelative) {
  const from = resolve(root, fromRelative);
  const to = resolve(outDir, toRelative);
  if (!existsSync(from)) {
    return;
  }
  cpSync(from, to, { recursive: true, force: true });
}
