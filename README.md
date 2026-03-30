# Minibo Systems

نسخة `Vercel-ready` من نظام `Minibo Systems` كتطبيق `React + TypeScript + Vite + PWA`.

هذه النسخة تعمل بالكامل داخل المتصفح مع تخزين محلي عبر `IndexedDB`، وتدعم:

- `Bootstrap Access` لأول دخول عبر `bootstrap-account.json`
- تسجيل الدخول المحلي وتغيير كلمة المرور إجباريًا
- لوحة تحكم `Dashboard`
- إدخال إنتاج شبيه بالإكسيل
- الاعتمادات والتوقيعات `SVG`
- تصدير `XLSX`
- تصدير `PDF`
- `Free Engine Bulk` للتبادل الدوري عبر حزم ملفات
- ثيم نهاري/ليلي
- `PWA` مع `manifest.webmanifest` و`sw.js`

## لماذا هذه النسخة أمامية فقط

تم تنفيذها بهذه الصورة لأنك طلبت الرفع على `Vercel`. `Vercel` لا يناسب تشغيل `SQLite` كقاعدة بيانات دائمة داخل نفس المشروع، لذلك هذه النسخة تعتمد على:

- `IndexedDB` داخل المتصفح
- ملفات `JSON / ZIP / XLSX / PDF` للتشغيل والتبادل

## المتطلبات

- Node.js 24+
- npm 11+

## التشغيل المحلي

```bash
npm install
npm run dev
```

## البناء

```bash
npm run build
```

## التحقق

```bash
npm run lint
npm run build
```

## أول دخول للنظام

لا يوجد حساب افتراضي داخل الإنتاج. بدلاً من ذلك:

1. أنشئ ملف bootstrap:

```bash
npm run issue:bootstrap -- --username=admin --password=1234 --targetInstance=minibo-vercel-main
```

2. سيُنشأ ملف باسم:

```text
bootstrap-account.json
```

3. افتح التطبيق.
4. إذا لم يكن هناك أي مستخدمين، ستظهر شاشة `Bootstrap Access`.
5. ارفع الملف.
6. بعد ذلك سيتم إجبار المستخدم على تغيير كلمة المرور.

## النشر على Vercel

### الخيار المباشر

ارفع المشروع إلى GitHub ثم اربطه بـ Vercel.

إعدادات Vercel:

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

ملف [`.vercelignore`](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/.vercelignore) يمنع رفع ملفات المطورين مثل `tools/` و`docs/` و`bootstrap-account.json` إلى بيئة بناء Vercel.

### متغيرات البيئة

يمكنك إضافة:

```text
VITE_INSTANCE_ID=minibo-vercel-main
VITE_BOOTSTRAP_PUBLIC_KEY=<public-key-if-you-change-it>
```

## Free Engine Bulk

يمكنك من داخل التطبيق:

- إنشاء حزمة تصدير لفترة معينة
- تنزيلها كملف `zip`
- رفعها في نسخة أخرى من Minibo Systems

## ملفات مهمة

- التطبيق الرئيسي: [src/App.tsx](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/src/App.tsx)
- قاعدة البيانات المحلية: [src/lib/db.ts](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/src/lib/db.ts)
- التشفير وbootstrap verification: [src/lib/crypto.ts](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/src/lib/crypto.ts)
- PWA manifest: [public/manifest.webmanifest](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/public/manifest.webmanifest)
- Service worker: [public/sw.js](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/public/sw.js)
- Vercel config: [vercel.json](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/vercel.json)

## أدوات المطورين

- Bootstrap issuer:
  - [tools/Minibo.Systems.BootstrapIssuer/issue-bootstrap.mjs](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/tools/Minibo.Systems.BootstrapIssuer/issue-bootstrap.mjs)
- Bulk verifier:
  - [tools/Minibo.Systems.BulkPackageTool/verify-bulk-manifest.mjs](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/tools/Minibo.Systems.BulkPackageTool/verify-bulk-manifest.mjs)

إذا أردت نسخة منفصلة للمطورين فقط:

```bash
npm run package:developer-kit
```

وسيتم إنشاء مجلد:

```text
developer-kit/
```

هذا المجلد يحتوي أدوات المطورين والسكيمات فقط، ويمكنك مشاركته مع فريق المطورين بدون دمجه مع نسخة المستخدم النهائية.

## ملاحظة مهمة

إذا أردت لاحقاً نسخة متعددة المستخدمين فعلياً ببيانات مشتركة بين كل الأجهزة عبر الإنترنت، فستحتاج Backend وقاعدة بيانات دائمة خارج `Vercel static hosting`.
