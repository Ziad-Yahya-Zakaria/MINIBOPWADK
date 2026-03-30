# Developer Kit

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

```bash
npm install
```

شغل بوابة المطورين كموقع محلي:

```bash
npm run dev:developer-portal
```

ثم افتح:

```text
http://localhost:4010
```

من خلالها يمكنك:

- إنشاء `bootstrap-account.json`
- إنشاء ملف مستقل لكل مستخدم بصيغة `<username>-user-account.json`
- تنزيل الملف مباشرة من المتصفح

إصدار ملف bootstrap من سطر الأوامر:

```bash
npm run issue:bootstrap -- --username=admin --password=1234 --targetInstance=minibopwadk.vercel.app
```

إصدار ملف مستخدم مستقل:

```bash
npm run issue:user -- --username=worker1 --displayName="Worker One" --password=1234 --targetInstance=minibopwadk.vercel.app --permissions=DASHBOARD_VIEW,PRODUCTION_EDIT
```

فحص manifest خاص بـ bulk:

```bash
npm run verify:bulk -- path/to/manifest.json
```
