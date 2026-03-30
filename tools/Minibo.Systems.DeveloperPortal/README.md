# Minibo Systems Developer Portal

بوابة ويب محلية للمطورين فقط، منفصلة عن نسخة المستخدم النهائية.

## التشغيل

```bash
npm run dev:developer-portal
```

ثم افتح:

```text
http://localhost:4010
```

## الاستخدام

من خلال البوابة يمكنك:

- إنشاء `bootstrap-account.json` لأول حساب في النظام
- إنشاء ملف مستقل لكل مستخدم بصيغة `<username>-user-account.json`
- تحديد `targetInstance` لكل ملف
- إدخال `roles` و`permissions`
- تنزيل الملف مباشرة بعد التوليد

## ملاحظة

هذه الأداة لا تُرفع مع التطبيق الرئيسي على Vercel لأن مجلد `tools/` مستبعد عبر [`.vercelignore`](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/.vercelignore).
