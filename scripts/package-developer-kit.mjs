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
  resolve(outDir, 'package.json'),
  JSON.stringify(
    {
      name: 'minibo-systems-developer-kit',
      private: true,
      type: 'module',
      scripts: {
        'dev:developer-portal': 'node ./tools/Minibo.Systems.DeveloperPortal/server.mjs',
        'issue:bootstrap': 'node ./tools/Minibo.Systems.BootstrapIssuer/issue-bootstrap.mjs',
        'issue:user': 'node ./tools/Minibo.Systems.BootstrapIssuer/issue-user-account.mjs',
        'verify:bulk': 'node ./tools/Minibo.Systems.BulkPackageTool/verify-bulk-manifest.mjs'
      },
      dependencies: {
        tweetnacl: '^1.0.3'
      },
      engines: {
        node: '>=20'
      }
    },
    null,
    2
  ) + '\n',
  'utf8'
);

writeFileSync(
  resolve(outDir, '.gitignore'),
  ['node_modules', 'downloads', 'bootstrap-account.json', '*-user-account.json', '*.log'].join('\n') + '\n',
  'utf8'
);

writeFileSync(
  resolve(outDir, 'README.md'),
  `# Developer Kit

هذا المجلد مخصص للمطورين فقط، ولا يجب رفعه ضمن نسخة المستخدم النهائية على Vercel.

## المحتويات

- tools/Minibo.Systems.BootstrapIssuer
- tools/Minibo.Systems.DeveloperPortal
- tools/Minibo.Systems.BulkPackageTool
- docs/schemas
- docs/minibo-bootstrap-account-spec-ar.md
- docs/free-engine-bulk-spec-ar.md

## التشغيل السريع

ثبت الاعتماديات:

\`\`\`bash
npm install
\`\`\`

شغل بوابة المطورين كموقع محلي:

\`\`\`bash
npm run dev:developer-portal
\`\`\`

ثم افتح:

\`\`\`text
http://localhost:4010
\`\`\`

من خلالها يمكنك:

- إنشاء \`bootstrap-account.json\`
- إنشاء ملف مستقل لكل مستخدم بصيغة \`<username>-user-account.json\`
- تنزيل الملف مباشرة من المتصفح

إصدار ملف bootstrap من سطر الأوامر:

\`\`\`bash
npm run issue:bootstrap -- --username=admin --password=1234 --targetInstance=minibopwadk.vercel.app
\`\`\`

إصدار ملف مستخدم مستقل:

\`\`\`bash
npm run issue:user -- --username=worker1 --displayName="Worker One" --password=1234 --targetInstance=minibopwadk.vercel.app --permissions=DASHBOARD_VIEW,PRODUCTION_EDIT
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
