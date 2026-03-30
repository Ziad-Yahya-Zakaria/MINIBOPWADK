# Minibo Systems Bootstrap Issuer

الأداة الفعلية:

- [issue-bootstrap.mjs](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/tools/Minibo.Systems.BootstrapIssuer/issue-bootstrap.mjs)

## الاستخدام

من جذر المشروع:

```bash
npm run issue:bootstrap -- --username=admin --password=1234 --targetInstance=minibo-vercel-main
```

## ما الذي تفعله الأداة

- توليد `bootstrap-account.json`
- حساب `passwordHash`
- ربط الملف بـ `targetInstance`
- حساب `payloadSha256`
- توقيع الملف

## المرجع

- [bootstrap-account.schema.json](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/docs/schemas/bootstrap-account.schema.json)
