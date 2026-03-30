# Minibo Systems

نسخة `Vercel-ready` من `Minibo Systems` مبنية بـ `React + TypeScript + Vite + PWA`.

هذه النسخة تعمل داخل المتصفح مع تخزين محلي عبر `IndexedDB`، وتدعم:

- `Bootstrap Access` لأول دخول
- تسجيل دخول محلي مع إجبار تغيير كلمة المرور
- لوحة تحكم `Dashboard`
- إدخال إنتاج شبيه بالإكسيل
- الاعتمادات والتوقيعات `SVG`
- تصدير `XLSX` و`PDF`
- `Free Engine Bulk`
- ثيم نهاري/ليلي
- `PWA`

## لماذا هذه النسخة أمامية فقط

تم تنفيذها بهذه الصورة لأن الاستضافة المطلوبة على `Vercel`. هذه البيئة لا تناسب تشغيل `SQLite` كقاعدة بيانات مشتركة ودائمة داخل نفس المشروع، لذلك النسخة الحالية تعتمد على:

- `IndexedDB` داخل المتصفح
- تبادل ملفات `JSON / ZIP / XLSX / PDF`

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

يمكن إنشاء ملف تأسيسي من سطر الأوامر:

```bash
npm run issue:bootstrap -- --username=admin --password=1234 --targetInstance=minibopwadk.vercel.app
```

ويمكن إنشاء ملف مستقل لكل مستخدم:

```bash
npm run issue:user -- --username=worker1 --displayName="Worker One" --password=1234 --targetInstance=minibopwadk.vercel.app --permissions=DASHBOARD_VIEW,PRODUCTION_EDIT
```

## Developer Vault

أداة المطورين أصبحت مدمجة داخل النسخة الأساسية نفسها، لكنها غير ظاهرة في التنقل العام.

طرق الوصول:

1. افتح المسار:

```text
/vault
```

2. أو اضغط 7 مرات متتالية على عنوان التطبيق في شاشة `Bootstrap Access` أو `Login` أو شعار التطبيق داخل القائمة الجانبية.

بعدها ستظهر شاشة `Developer Vault`، وتطلب حل اللغز:

- اسم المطور الكامل
- تاريخ ميلاده

بعد الإجابة الصحيحة ستتمكن من:

- إنشاء `bootstrap-account.json`
- إنشاء ملف مستقل لكل مستخدم بصيغة `<username>-user-account.json`
- تنزيل الملف مباشرة من داخل النظام

## Troubleshooting

إذا ظهرت رسالة `توقيع ملف التأسيس غير صالح` فالسبب المعتاد أن نسخة Vercel ما زالت قديمة. في هذه الحالة:

1. ادفع آخر تغييرات المشروع إلى GitHub.
2. أعد `Deploy` من Vercel.
3. استخدم الملفات الجديدة فقط بعد إعادة النشر.

## النشر على Vercel

الإعدادات:

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

متغيرات البيئة المقترحة:

```text
VITE_INSTANCE_ID=minibopwadk.vercel.app
VITE_BOOTSTRAP_PUBLIC_KEY=Goa8syL3AfY8D6kfHak1Eq4iSMULcgCOG3Vbxjv6FIs=
```

ملف [`.vercelignore`](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/.vercelignore) يمنع رفع مجلدات المطورين المنفصلة مثل `tools/` و`docs/` و`developer-kit/`.

## أدوات إضافية للمطورين

ما زالت أدوات CLI والنسخة المنفصلة متوفرة إذا احتجتها:

- [tools](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/tools)
- [developer-kit](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/developer-kit)

ولإعادة توليد نسخة المطورين المنفصلة:

```bash
npm run package:developer-kit
```

## ملفات مهمة

- التطبيق الرئيسي: [src/App.tsx](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/src/App.tsx)
- الخزنة المخفية: [src/pages/DeveloperVaultPage.tsx](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/src/pages/DeveloperVaultPage.tsx)
- تحقق التوقيع: [src/lib/crypto.ts](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/src/lib/crypto.ts)
- منطق اللغز والتوقيع: [src/lib/developerVault.ts](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/src/lib/developerVault.ts)
- مشغل النقرات المخفية: [src/hooks/useDeveloperVaultTrigger.ts](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/src/hooks/useDeveloperVaultTrigger.ts)
