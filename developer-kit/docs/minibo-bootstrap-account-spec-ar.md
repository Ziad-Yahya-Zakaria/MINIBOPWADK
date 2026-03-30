# Minibo Bootstrap Account Spec

هذه الوثيقة تخص آلية الدخول الأول للنظام عبر ملف حساب تأسيسي بصيغة `JSON`.

## الهدف

- منع وجود حساب افتراضي ثابت داخل الإنتاج.
- جعل أول دخول للنظام ممكناً فقط عبر ملف يصدره المطورون أو الجهة التقنية المسؤولة.
- تقليل مخاطر ترك `admin / 1234` أو أي بيانات دخول معروفة.

## السيناريو المعتمد

1. يتم نشر النظام لأول مرة.
2. لا توجد أي حسابات في قاعدة البيانات.
3. التطبيق يعرض شاشة `Bootstrap Access`.
4. المسؤول يرفع ملف `bootstrap-account.json`.
5. النظام يتحقق من الملف.
6. إذا كان الملف صحيحاً:
- ينشئ المستخدم الإداري الأول.
- يسجل العملية في `Audit Log`.
- يعلّم `packageId` كمستهلك.
7. بعدها يستخدم المسؤول الحساب الناتج لتسجيل الدخول.
8. عند أول دخول، يجب إجباره على تغيير كلمة المرور.

## شروط الملف

- صيغة الملف: `JSON`
- استخدام واحد فقط
- يحتوي `packageId`
- يحتوي `issuedAtUtc`
- يحتوي `expiresAtUtc`
- يحتوي `targetInstance`
- يحتوي `username`
- يحتوي `displayName`
- يحتوي `passwordHash`
- يحتوي `roles` و`permissions`
- يحتوي `mustChangePassword = true`
- يحتوي `hmacSha256`

## مثال بنية الملف

```json
{
  "schemaVersion": "1.0",
  "packageId": "c4dca74d-65bc-41a1-a0b9-d53dc76a7bd1",
  "issuedAtUtc": "2026-03-30T08:00:00Z",
  "expiresAtUtc": "2026-04-02T08:00:00Z",
  "targetInstance": "minibo-prod-main",
  "issuer": {
    "tool": "Minibo.Systems.BootstrapIssuer",
    "operator": "DevOps Team"
  },
  "account": {
    "username": "admin.root",
    "displayName": "Primary Administrator",
    "passwordHash": "<identity-password-hash>",
    "mustChangePassword": true,
    "roles": ["SuperAdmin"],
    "permissions": ["*"],
    "signatureSvg": null
  },
  "integrity": {
    "payloadSha256": "<sha256>",
    "hmacSha256": "<hmac>"
  }
}
```

## التحقق عند الرفع

- تحقق من `schemaVersion`
- تحقق من `expiresAtUtc`
- تحقق من مطابقة `targetInstance`
- تحقق من سلامة الحقول المطلوبة
- تحقق من `payloadSha256`
- تحقق من `hmacSha256`
- تحقق أن `packageId` لم يستهلك من قبل

## أداة المطورين المنفصلة

المسار المقترح:

```text
tools/
  Minibo.Systems.BootstrapIssuer/
```

## مسؤوليات الأداة

- توليد JSON صحيح حسب الـ schema
- حساب `passwordHash` بنفس أسلوب `ASP.NET Core Identity`
- حساب `payloadSha256`
- حساب `hmacSha256`
- ربط الملف بـ `targetInstance`
- تحديد تاريخ انتهاء
- إمكانية توليد ملف لحساب واحد أو أكثر حسب الحاجة

## قواعد أمنية

- لا تحفظ كلمة المرور كنص واضح داخل JSON
- لا تسمح باستخدام الملف بعد انتهاء صلاحيته
- لا تسمح باستخدام الملف على instance مختلف
- لا تسمح بإعادة استخدام `packageId`
- لا تعرض محتوى الملف الخام في الواجهة بعد الرفع
