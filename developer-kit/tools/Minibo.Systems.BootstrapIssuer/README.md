# Minibo Systems Account Issuer

أدوات إصدار ملفات الحسابات الموقعة للمطورين.

## الملفات

- [issue-bootstrap.mjs](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/tools/Minibo.Systems.BootstrapIssuer/issue-bootstrap.mjs)
- [issue-user-account.mjs](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/tools/Minibo.Systems.BootstrapIssuer/issue-user-account.mjs)

## Bootstrap

```bash
npm run issue:bootstrap -- --username=admin --password=1234 --targetInstance=minibopwadk.vercel.app
```

## User Account

كل مستخدم يجب أن يخرج له ملف مستقل خاص به.

```bash
npm run issue:user -- --username=worker1 --displayName="Worker One" --password=1234 --targetInstance=minibopwadk.vercel.app --permissions=DASHBOARD_VIEW,PRODUCTION_EDIT
```

مثال الناتج:

```text
worker1-user-account.json
```

## Developer Portal

```bash
npm run dev:developer-portal
```

ثم افتح:

```text
http://localhost:4010
```

## المراجع

- [bootstrap-account.schema.json](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/docs/schemas/bootstrap-account.schema.json)
- [user-account.schema.json](C:/Users/Muhammad%20Mahmoud/OneDrive/Desktop/zozo/docs/schemas/user-account.schema.json)
