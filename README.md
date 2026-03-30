# Minibo Systems

نسخة `Vercel-ready` من `Minibo Systems` مبنية بـ `React + TypeScript + Vite + PWA`.

هذه النسخة تعمل بالكامل داخل المتصفح مع تخزين محلي عبر `IndexedDB`، وتدعم:

- `Bootstrap Access` لأول دخول عبر `bootstrap-account.json`
- تسجيل دخول محلي مع إجبار تغيير كلمة المرور
- لوحة تحكم `Dashboard`
- إدخال إنتاج شبيه بالإكسيل
- الاعتمادات والتوقيعات `SVG`
- تصدير `XLSX`
- تصدير `PDF`
- `Free Engine Bulk` لتبادل البيانات بحزم ملفات
- ثيم نهاري/ليلي
- `PWA` عبر `manifest.webmanifest` و`sw.js`

## لماذا هذه النسخة أمامية فقط

تم تنفيذها بهذه الصورة لأن الاستضافة المطلوبة كانت على `Vercel`. هذه البيئة لا تناسب تشغيل `SQLite` كقاعدة بيانات مشتركة ودائمة داخل نفس المشروع، لذلك النسخة الحالية تعتمد على:

- `IndexedDB` داخل المتصفح
- تبادل ملفات `JSON / ZIP / XLSX / PDF`

## المتطلبات

- Node.js 24+
- npm 11+

## التشغيل المحلي

```bash
npm install
npm run dev
```

## البناء والتحقق

```bash
npm run lint
npm run build
```

## أول دخول للنظام

لا يوجد حساب افتراضي ثابت داخل الإنتاج. يتم إنشاء أول حساب عبر ملف تأسيسي موقّع:

```bash
npm run issue:bootstrap -- --username=admin --password=1234 --targetInstance=minibopwadk.vercel.app
```

إذا كانت النسخة المنشورة تعمل على دومين مختلف، استخدم نفس القيمة الظاهرة في شاشة `Bootstrap Access` تحت `معرّف النسخة الحالية`.

للاختبار فقط يمكنك استخدام:

```bash
npm run issue:bootstrap -- --username=admin --password=1234 --targetInstance=*
```

يفضل عدم استخدام `*` في الإنتاج.

## ملفات المستخدمين

يمكن إصدار ملف مستقل لكل مستخدم:

```bash
npm run issue:user -- --username=worker1 --displayName="Worker One" --password=1234 --targetInstance=minibopwadk.vercel.app --permissions=DASHBOARD_VIEW,PRODUCTION_EDIT
```

سيُنتج ملفًا مثل:

```text
worker1-user-account.json
```

وبعد إعادة نشر النسخة الحالية، يستطيع المستخدم استيراد ملفه من شاشة تسجيل الدخول عبر زر `استيراد ملف مستخدم`.

## Troubleshooting

إذا ظهرت رسالة `توقيع ملف التأسيس غير صالح` على النسخة المنشورة، فالسبب الأغلب أن نسخة Vercel تعمل بحزمة قديمة.

تم التحقق من الموقع الحالي `https://minibopwadk.vercel.app/bootstrap` بتاريخ `March 30, 2026` وتبين أنه ما زال يستخدم المفتاح العام القديم داخل الحزمة المنشورة، بينما المستودع الحالي يحتوي على المفتاح الجديد ومسار التحقق المحدث. الحل:

1. ادفع آخر تغييرات المستودع إلى GitHub.
2. أعد `Deploy` من Vercel.
3. بعد اكتمال النشر، أنشئ ملف `bootstrap-account.json` جديدًا.
4. ارفع الملف الجديد على شاشة `Bootstrap Access`.

إذا لم تُعد النشر فسيظل أي ملف جديد مرفوضًا حتى لو كان توقيعه صحيحًا.

## النشر على Vercel

الإعدادات:

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

متغيرات البيئة المقترحة:

```text
VITE_INSTANCE_ID=minibopwadk.vercel.app
VITE_BOOTSTRAP_PUBLIC_KEY=jiAHN+2oHNWbeLpMuVPfMc5S7X5xGqFj9+gLqSahNOs=
```

ملف [`.vercelignore`](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/.vercelignore) يمنع رفع ملفات المطورين مثل `tools/` و`docs/` و`developer-kit/` وملفات الحسابات المولدة.

## أدوات المطورين

يوجد مساران:

- الأدوات داخل المشروع الرئيسي تحت [tools](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/tools)
- نسخة منفصلة للمطورين فقط داخل [developer-kit](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/developer-kit)

لإنشاء نسخة المطورين المنفصلة:

```bash
npm run package:developer-kit
```

هذه النسخة تحتوي على:

- `Bootstrap Issuer`
- `User Account Issuer`
- `Developer Portal`
- `Bulk verifier`
- الـ schemas والوثائق اللازمة

## بوابة المطورين

بوابة المطورين هي موقع محلي منفصل لتوليد ملفات الحسابات:

```bash
npm run dev:developer-portal
```

ثم افتح:

```text
http://localhost:4010
```

ومن خلالها يمكنك إنشاء:

- `bootstrap-account.json`
- ملف مستقل لكل مستخدم بصيغة `<username>-user-account.json`

## ملفات مهمة

- التطبيق الرئيسي: [src/App.tsx](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/src/App.tsx)
- قاعدة البيانات المحلية: [src/lib/db.ts](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/src/lib/db.ts)
- التشفير والتحقق من ملفات الحسابات: [src/lib/crypto.ts](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/src/lib/crypto.ts)
- سياق التطبيق: [src/context/AppContext.tsx](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/src/context/AppContext.tsx)
- شاشة التأسيس: [src/pages/BootstrapPage.tsx](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/src/pages/BootstrapPage.tsx)
- شاشة تسجيل الدخول: [src/pages/LoginPage.tsx](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/src/pages/LoginPage.tsx)
- Vercel config: [vercel.json](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/vercel.json)

## ملاحظة مهمة

إذا أردت لاحقًا نسخة متعددة المستخدمين فعليًا ببيانات مشتركة بين كل الأجهزة عبر الإنترنت، فستحتاج Backend وقاعدة بيانات دائمة خارج `Vercel static hosting`.
