# Minibo Systems - Master Build Prompt

مرجع تنفيذي موحد لبناء النظام من الصفر بدون تعارضات.

- اسم البرنامج: `Minibo Systems`
- الشعار المعتمد بالإنجليزية: `A New Era for Everyone`
- نوع النسخة: `Production Line Management & Approval`
- الإصدار: `6.9`
- الحزمة الخدماتية: `30`
- تاريخ تثبيت هذه القرارات: `2026-03-30`

## قرارات حسم المتطلبات

- قاعدة البيانات المعتمدة في هذه النسخة هي `SQLite` فقط.
- الواجهة ستكون `React` حديثة، لكن ناتج البناء النهائي يجب أن يكون Web App صريحاً بملفات `HTML / JS / CSS / sw.js / manifest.webmanifest`.
- التطبيق يجب أن يعمل كـ `PWA` قابل للتثبيت.
- لا يوجد أي `CDN` أو خدمة خارجية أو Auth خارجي أو SaaS.
- كل الخطوط والأصوات والأيقونات محلية داخل المشروع.
- خط البرنامج بالكامل هو `Cairo`.
- التوقيعات الرسمية تحفظ بصيغة `SVG` شفافة بعد تنقيتها.
- لا يوجد تسجيل ذاتي للمستخدمين.
- أول دخول للنظام في الإنتاج لا يتم عبر حساب افتراضي ثابت، بل عبر ملف حساب تأسيسي `bootstrap-account.json`.
- ملف `bootstrap-account.json` يتم توليده من أداة منفصلة للمطورين، ويكون أحادي الاستخدام ومؤقت الصلاحية.
- بعد اكتمال bootstrap الأول، يتم إنشاء الحسابات اللاحقة من لوحة الادمن فقط.
- أضف ميزة تبادل بيانات دورية باسم `Free Engine Bulk`.
- `Free Engine Bulk` يعتمد على تصدير ملفات مجمعة ثم رفعها إلى موقع/بوابة مركزية أو مشاركتها يدوياً ثم استيرادها في مواقع أخرى.
- لأنك تريد رفع المشروع على الإنترنت، فالبنية يجب أن تدعم `HTTPS`, `reverse proxy`, و`PWA deployment`.
- إذا زادت الكتابات المتزامنة جداً على الإنترنت، فهذه مخاطرة على `SQLite`. لذلك يجب تصميم طبقة البيانات بحيث يمكن ترحيلها لاحقاً إلى محرك أقوى بدون كسر النظام.

## خط الأساس التقني المقترح

| المجال | الاختيار |
| --- | --- |
| Backend Runtime | `.NET 10 LTS` |
| Web API | `ASP.NET Core 10` |
| ORM | `EF Core 10 + SQLite provider` |
| Auth | `ASP.NET Core Identity + Policies/Permissions` |
| Realtime | `SignalR` |
| Architecture | `Clean Architecture + CQRS + MediatR + DDD-lite` |
| Validation | `FluentValidation 12.x + DependencyInjectionExtensions 12.x` |
| Logging | `Serilog.AspNetCore 10.x` |
| Telemetry | `OpenTelemetry.Extensions.Hosting 1.x` |
| Excel | `ClosedXML 0.105.x` |
| PDF | `Microsoft.Playwright 1.58.x` |
| Frontend Runtime | `Node.js 24 LTS` |
| Frontend App | `React 19.2.x + TypeScript` |
| Build Tool | `Vite 8.x` |
| PWA | `vite-plugin-pwa 1.x + workbox-window 7.x` |
| Routing | `react-router-dom 7.x` |
| Data Fetching | `@tanstack/react-query 5.x` |
| Forms | `react-hook-form 7.x` |
| UI Library | `MUI 7.3.x` |
| Data Grid | `@mui/x-data-grid 8.x` Community |
| Charts | `Recharts 3.x` |
| Local Browser Drafts | `IndexedDB + Dexie 4.x` |
| Bulk Exchange | `ZIP + JSON manifest + checksum + HMAC SHA-256` |
| Hosting | `IIS or Nginx reverse proxy + HTTPS` |
| Backend Tests | `xUnit + FluentAssertions + WebApplicationFactory` |
| Frontend Tests | `Vitest + Testing Library` |
| E2E | `Playwright` |

## الهيكل المؤسسي المقترح

```text
minibo-systems/
  docs/
    adr/
    schemas/
    minibo-systems-master-prompt-ar.md
    minibo-bootstrap-account-spec-ar.md
    free-engine-bulk-spec-ar.md
  src/
    Minibo.Systems.Domain/
    Minibo.Systems.Application/
    Minibo.Systems.Infrastructure/
    Minibo.Systems.Api/
    Minibo.Systems.Contracts/
    Minibo.Systems.Web/
      public/
        manifest.webmanifest
        icons/
  tests/
    Minibo.Systems.Domain.Tests/
    Minibo.Systems.Application.Tests/
    Minibo.Systems.IntegrationTests/
    Minibo.Systems.ArchitectureTests/
    Minibo.Systems.Web.Tests/
    Minibo.Systems.E2E/
  tools/
    Minibo.Systems.BootstrapIssuer/
    Minibo.Systems.BulkPackageTool/
  assets/
    fonts/
    sounds/
  Directory.Build.props
  Directory.Packages.props
  .editorconfig
  README.md
```

## البرومبت الجاهز للنسخ

انسخ النص التالي كما هو إلى أداة البناء أو إلى Agent آخر:

```text
أنت مهندس برمجيات مؤسسي وخبير C#.NET وReact وSQLite وPWA. ابنِ نظاماً كاملاً من الصفر باسم "Minibo Systems" بشعار "A New Era for Everyone" وبوصف "Production Line Management & Approval"، إصدار 6.9 وحزمة خدماتية 30. المطلوب نظام مؤسسي لإدارة خطوط الإنتاج، إدخال الإنتاج الفعلي، اعتماده، مراقبته لحظياً، وإخراج تقارير XLSX وPDF موقعة إلكترونياً، مع دعم تبادل البيانات الدوري عبر ميزة اسمها Free Engine Bulk.

قواعد غير قابلة للتفاوض:
1. استخدم SQLite فقط في هذه النسخة لكل البيانات.
2. لا تستخدم أي خدمة خارجية أو CDN أو SaaS أو Auth خارجي.
3. استخدم فقط مكتبات مفتوحة المصدر وآمنة.
4. الواجهة React حديثة بستايل قريب من Material You 3 باستخدام MUI Community فقط.
5. ناتج بناء الواجهة يجب أن يخرج ملفات ويب تشغيلية: `index.html`, ملفات `js`, ملفات `css`, ملف `sw.js`, وملف `manifest.webmanifest`.
6. فعّل PWA بالكامل: service worker, installability, app shell caching, update flow.
7. اللغة الأساسية عربية RTL مع دعم الإنجليزية عند الحاجة.
8. لا تسمح بشاشات بيضاء. كل شاشة يجب أن تحتوي Error Boundary وLoading State وEmpty State وSkeletons.
9. لا يوجد self-registration.
10. إذا كانت قاعدة البيانات بلا مستخدمين، يجب قفل النظام في وضع bootstrap وعدم السماح بأي دخول إلا بعد استيراد ملف `bootstrap-account.json`.
11. أنشئ أداة منفصلة للمطورين لتوليد ملف bootstrap account JSON وتوقيعه وربطه بالـ instance المستهدف وتحديد تاريخ انتهاء له.
12. ملف bootstrap account يجب أن يكون one-time use ويحتوي على packageId وissuedAt وexpiresAt وtargetInstance وpasswordHash وroles/permissions وmustChangePassword.
13. بعد استيراد الحساب التأسيسي، يجب إجبار المستخدم على تغيير كلمة المرور عند أول دخول.
14. أي مستخدم جديد ينشئه الادمن يجب أن يُجبر أيضاً على تغيير كلمة المرور عند أول دخول.
15. كل الخطوط والأصوات والأيقونات والملفات الثابتة يجب أن تكون محلية داخل المشروع.
16. أضف ميزة Free Engine Bulk لتبادل البيانات بين المواقع عبر حزم ZIP تحتوي manifest JSON وبيانات snapshot.
17. اختبر كل مسار أساسي قبل التسليم. لا تتوقف عند التحليل فقط؛ نفذ واختبر وأصلح.

اعتمد الخط التقني التالي:
- Backend: .NET 10 LTS + ASP.NET Core Web API + EF Core SQLite + ASP.NET Core Identity + SignalR + MediatR + FluentValidation + Serilog + OpenTelemetry.
- Frontend: React 19 + TypeScript + Vite 8 + MUI 7 + react-router-dom 7 + TanStack Query + React Hook Form + MUI Data Grid Community + Recharts + vite-plugin-pwa + workbox-window + IndexedDB/Dexie.
- Testing: xUnit + FluentAssertions + Integration Tests + Architecture Tests + Vitest + Playwright E2E.
- PDF: توليد HTML داخلي للطباعة ثم تحويله إلى PDF عبر Microsoft.Playwright محلياً.
- XLSX: ClosedXML.
- Developer Tools: أداة BootstrapIssuer وأداة BulkPackageTool.

ابنِ الحل بهذه الهيكلية:
- src/Minibo.Systems.Domain
- src/Minibo.Systems.Application
- src/Minibo.Systems.Infrastructure
- src/Minibo.Systems.Api
- src/Minibo.Systems.Contracts
- src/Minibo.Systems.Web
- tests/Minibo.Systems.Domain.Tests
- tests/Minibo.Systems.Application.Tests
- tests/Minibo.Systems.IntegrationTests
- tests/Minibo.Systems.ArchitectureTests
- tests/Minibo.Systems.Web.Tests
- tests/Minibo.Systems.E2E
- tools/Minibo.Systems.BootstrapIssuer
- tools/Minibo.Systems.BulkPackageTool

أضف من الجذر:
- Directory.Build.props
- Directory.Packages.props
- .editorconfig
- README.md
- docs/adr/
- docs/schemas/

أولاً: المصادقة والصلاحيات
- استخدم ASP.NET Core Identity مع Cookie Auth إذا كان frontend وAPI على نفس النطاق.
- استخدم Permission-based authorization وليس roles فقط.
- الادمن يتحكم في كل الصلاحيات من لوحة الإدارة.
- أضف ForcePasswordChange.
- أضف lockout لمحاولات الدخول الفاشلة.
- سجّل كل الأحداث الحساسة في Audit Log.
- لا تضف نسيان كلمة المرور عبر البريد في هذه النسخة.
- إذا كانت قاعدة البيانات بلا مستخدمين:
  - اعرض شاشة Bootstrap Access.
  - اسمح فقط برفع ملف `bootstrap-account.json`.
  - تحقق من schema وHMAC وexpiresAt وtargetInstance وعدم إعادة استخدام packageId.
  - أنشئ المستخدم الأول ثم علّم الحزمة بأنها consumed.
- بعد bootstrap الأول، لا يتم إنشاء حسابات جديدة إلا من لوحة الادمن.

ثانياً: الوحدات الرئيسية

1. Dashboard
- بطاقات رئيسية:
  - إجمالي وزن الإنتاج الفعلي.
  - إجمالي ساعات التشغيل.
  - محدد منتج منفصل.
- فلترة تاريخية من/إلى، والبيانات تراكمية داخل النطاق.
- رسم بياني تفاعلي لكل منتج بلون مختلف.
- جدول أسفل الرسم مع أسماء المنتجات وكميات الإنتاج.
- دعم الفلترة، إلغاء الفلترة، وتصدير XLSX حسب الفلاتر الحالية.
- التحديث لحظي عبر SignalR.
- عند وصول تحديث جديد:
  - حدث البطاقات.
  - حدث الرسم.
  - حدث الجدول.
  - شغّل صوت إشعار محلي إذا كانت الإعدادات تسمح.
- أضف زر كتم/تشغيل صوت الإشعارات.

2. لوحة إدخال الإنتاج
- يبدأ المستخدم باختيار الوردية من قائمة صلاحياته.
- يختار البراندات المسموح له بها.
- افتح تبويباً لكل براند.
- كل تبويب يعرض أيقونة مرتبطة بنوع البراند.
- لا تظهر داخل البراند إلا المنتجات المربوطة به مسبقاً.
- اختيار المنتج يتم من Combobox مع بحث.
- بعد اختيار المنتج يتم جلب:
  - كود المنتج
  - الوزن
  - وزن العبوة
  - الوحدة
- لا تسمح بتكرار نفس المنتج داخل نفس تبويب البراند إلا بعد إزالته.
- نفذ منطقة إدخال تشبه Excel بشكل متطور:
  - تنقل بالكيبورد عبر Tab وShift+Tab وEnter والأسهم.
  - دعم paste متعدد الخلايا إن أمكن.
  - إدخال سريع للكميات الصغيرة بدون lag.
  - صف كميات لكل ساعة.
  - صف ملاحظات مقابل لكل ساعة.
  - عدد الساعات يولّد من إعداد الوردية.
  - تحديث المجاميع والملخصات أثناء الكتابة بشكل debounced.
  - جدول جانبي أو سفلي يوضح إنتاج كل ساعة فوراً أثناء الإدخال.
- دعم autosave.
- تخزين الدرافت في IndexedDB محلياً ثم مزامنته عند الاتصال.
- دعم حفظ مسودة، اعتماد براند واحد، أو اعتماد الكل حسب الصلاحية.
- بعد اعتماد براند:
  - يقفل التبويب من التعديل العادي.
  - لا يفتح للتعديل إلا عبر لوحة الاعتماد وبحسب الصلاحيات.
- أي إدخال أو تعديل يجب أن ينعكس فوراً في الداشبورد.

3. لوحة الاعتماد
- تعرض السجلات المرسلة للاعتماد.
- كل سجل يوضح:
  - البراند
  - التاريخ
  - الوردية
  - المستخدم المدخل
  - حالة الاعتماد
- الادمن يحدد مسار الاعتماد ومن سيوقع.
- كل معتمد يوقع بتوقيع SVG محفوظ ومنقّى.
- لا يتم إتاحة PDF وXLSX إلا بعد اكتمال الاعتمادات المطلوبة.
- PDF يحتوي التوقيعات في أماكن ثابتة ومنظمة.
- XLSX يستخدم دائماً الرؤوس:
  - اسم المنتج
  - كود المنتج
  - كمية الإنتاج بالعبوة
  - كمية الإنتاج بالكيلو

4. لوحة KPI
- إجمالي الإنتاج بالكيلو.
- إجمالي الإنتاج بالعبوات.
- الإنتاج لكل ساعة تشغيل.
- أكثر المنتجات إنتاجاً.
- أكثر البراندات نشاطاً.
- عدد الاعتمادات المعلقة.
- مقارنة بين الورديات داخل الفترة.

5. لوحة الادمن
- إدارة المستخدمين.
- إدارة الأدوار.
- إدارة الصلاحيات.
- إدارة الورديات.
- إدارة البراندات.
- إدارة الأصناف.
- ربط الأصناف بالبراندات.
- ربط الأصناف بالتقارير.
- إدارة التواقيع.
- إدارة الثيم.
- إدارة الأصوات.
- إدارة التقارير.
- إدارة Free Engine Bulk.
- عرض Audit Log.
- أي عنصر رئيسي يجب أن يدعم الإضافة والتعديل والأرشفة.

6. إدارة الأصناف والاستيراد
- اسمح بتنزيل قالب XLSX فارغ للأدمن بالرؤوس التالية وبالترتيب الحرفي:
  - الصنف
  - الكود
  - الوحدة
  - المعامل
  - البراند
  - الحالة
  - مجموعة فرعية
  - مجموعة رئيسية
  - مجموعة مخصصة
- اسمح برفع ملف بنفس الشكل للاستيراد.
- اسمح بإضافة صنف فردي.
- أي صنف جديد يجب أن ينعكس فوراً في الربط مع البراندات والتقارير.

7. Free Engine Bulk
- أنشئ ميزة مستقلة باسم `Free Engine Bulk`.
- الهدف: تبادل البيانات على دفعات بين مواقع أو جهات مختلفة بدون اتصال مباشر بقاعدة البيانات.
- السيناريو:
  - المستخدم في الموقع A يختار فترة أو تقارير.
  - النظام يولّد Bulk Package.
  - المستخدم يرفع الحزمة إلى موقع مركزي أو يشاركها يدوياً.
  - المستخدم في الموقع B ينزّل الحزمة.
  - يرفعها داخل Minibo Systems عنده.
  - تظهر البيانات في التقارير ولوحات العرض حسب الصلاحيات.
- الحزمة بصيغة zip وتحتوي على:
  - manifest.json
  - data/*.json
  - optional reports/*.xlsx
  - checksum file
  - signature/HMAC metadata
- manifest.json يتضمن على الأقل:
  - packageId
  - sourceInstanceId
  - sourceInstanceName
  - periodFrom
  - periodTo
  - exportedAtUtc
  - entityCounts
  - schemaVersion
  - checksum
- الاستيراد يجب أن:
  - يمنع التكرار
  - يحتفظ بمصدر البيانات
  - يعلّم البيانات بأنها imported/read-only إذا لزم
  - يسجل العملية كاملة في Audit Log
- أضف شاشة إدارية للحزم:
  - إنشاء حزمة
  - رفع حزمة
  - سجل التصدير
  - سجل الاستيراد
  - الأخطاء والتحقق
- اسمح بتصدير مجدول كل فترة زمنية يحددها الادمن.
- أضف صلاحيات مستقلة:
  - Bulk.Export
  - Bulk.Import
  - Bulk.Download
  - Bulk.Manage

8. PWA والنشر على الإنترنت
- ابنِ الواجهة كـ PWA قابلة للتثبيت.
- وفر:
  - manifest.webmanifest
  - sw.js
  - icons محلية
  - offline shell
  - update notification
- اجعل البناء النهائي مناسباً للرفع على الإنترنت.
- افترض النشر عبر:
  - backend API على ASP.NET Core
  - frontend static assets عبر reverse proxy
  - HTTPS فقط في الإنتاج
- أضف security headers وcompression وcache strategy مناسبة.

ثالثاً: النموذج البياني Domain Model
- User
- Role
- Permission
- UserSignature
- Shift
- ShiftHourTemplate
- Brand
- Product
- ProductBrandLink
- ReportDefinition
- ReportDefinitionProductLink
- ProductionBatch
- ProductionBatchBrand
- ProductionEntry
- ProductionEntryHourValue
- ProductionEntryHourNote
- ApprovalWorkflow
- ApprovalStep
- ApprovalDecision
- Notification
- AuditLog
- SystemSetting
- ThemePreference
- SoundPreference
- BootstrapAccountPackage
- BootstrapAccountConsumption
- BulkExchangeProfile
- BulkExportJob
- BulkImportJob
- BulkPackage
- BulkPackageItem

رابعاً: قواعد العمل المهمة
- البيانات الزمنية تحفظ بالوقت الحقيقي.
- نطاق التاريخ في الداشبورد والتقارير تراكمي.
- منع تكرار الصنف داخل نفس تبويب البراند.
- السماح بوجود الصنف نفسه في أكثر من تقرير.
- إقفال سجل الإدخال بعد الإرسال للاعتماد إلا باستثناءات صلاحية صريحة.
- لا يُنشأ PDF نهائي إلا بعد اكتمال الاعتمادات المطلوبة.
- التوقيعات تُحمّل من قاعدة البيانات فقط.
- جميع عمليات التعديل والحذف المنطقي والاعتماد والتصدير والاستيراد تسجّل في Audit Log.
- استخدم optimistic concurrency.
- في SQLite فعّل WAL mode وقلّل زمن المعاملات.
- حزم bootstrap account لا يعاد استخدامها إطلاقاً.
- حزم Free Engine Bulk لا تستورد مرتين لنفس packageId.
- إذا كان النشر عاماً على الإنترنت مع SQLite، فاجعل الكتابات الحرجة قصيرة جداً وفصل العمليات الثقيلة في background jobs.

خامساً: الواجهة وتجربة الاستخدام
- استخدم Cairo في كامل التطبيق.
- اجعل التصميم حديثاً وعملياً.
- شاشة الدخول بسيطة جداً.
- إذا لم توجد حسابات، اعرض Bootstrap Access بدلاً من شاشة الدخول.
- بعد أول دخول ناجح، أعد التوجيه فوراً إلى صفحة تغيير كلمة المرور.
- وفّر ثيم نهاري وليلي متناسقين.
- اجعل التطبيق responsive.
- استخدم Notification Center مع عداد غير مقروء.
- أضف install action للـ PWA عندما يكون مناسباً.
- أضف مؤشرات واضحة لحالة الاتصال:
  - online
  - offline
  - syncing
  - import/export in progress

سادساً: التقارير والملفات
- XLSX اليومي أو للفترة يجب أن يستخدم دائماً الرؤوس:
  - اسم المنتج
  - كود المنتج
  - كمية الإنتاج بالعبوة
  - كمية الإنتاج بالكيلو
- PDF الاعتماد يجب أن يحتوي:
  - عنوان التقرير
  - بيانات البراند أو الفترة
  - جدول الأصناف
  - التوقيعات
  - تاريخ الاعتماد
- أنشئ HTML template منفصلاً للطباعة ثم حوّله إلى PDF عبر Playwright.
- اسمح للتقارير أن تشمل البيانات المستوردة عبر Free Engine Bulk أو تستثنيها حسب الفلتر.

سابعاً: الأمان
- استخدم ASP.NET Core Identity لتشفير كلمات المرور.
- احمِ كل endpoint بسياسات واضحة.
- استخدم anti-forgery إذا كانت الواجهة والـ API على نفس النطاق مع cookies.
- لا تسمح برفع SVG غير منقّى.
- طبّق rate limiting على login.
- افحص ملفات JSON وZIP المرفوعة بشكل صارم.
- تحقق من checksum وHMAC وليس اسم الملف فقط.
- اربط bootstrap packages وbulk packages بالـ instance identifier عند الحاجة.

ثامناً: الاختبارات المطلوبة قبل التسليم
- Unit tests للـ domain rules.
- Application tests للـ commands/queries.
- Integration tests للـ API + SQLite test database.
- Architecture tests تمنع اختراق الطبقات.
- Frontend component tests للشاشات الحرجة.
- E2E tests على الأقل للمسارات التالية:
  - bootstrap الأول عبر ملف JSON
  - منع إعادة استخدام bootstrap-account.json
  - تسجيل الدخول وإجبار تغيير كلمة المرور
  - إنشاء مستخدم جديد ثم إجباره على تغيير كلمة المرور
  - إنشاء وردية وبراند وصنف وربطهم
  - إدخال إنتاج براند مع ساعات وملاحظات
  - ظهور التحديث في الداشبورد لحظياً
  - اعتماد سجل من المعتمدين المطلوبين
  - توليد XLSX وPDF بعد اكتمال الاعتماد
  - منع تكرار الصنف داخل نفس البراند
  - استيراد أصناف من قالب XLSX
  - إنشاء Bulk Package وتصديره
  - استيراد Bulk Package وعرضه في التقارير

تاسعاً: ترتيب التنفيذ الإجباري
1. أنشئ الحل والطبقات والملفات المركزية.
2. أنشئ Domain وApplication وInfrastructure وAPI أولاً.
3. نفذ المصادقة والصلاحيات ووضع bootstrap account JSON وأداة المطورين الخاصة به.
4. نفذ إعدادات النظام والـ master data.
5. نفذ إدخال الإنتاج.
6. نفذ الاعتماد والتوقيعات.
7. نفذ الداشبورد اللحظي.
8. نفذ KPI.
9. نفذ Free Engine Bulk.
10. نفذ الاستيراد والتصدير.
11. فعّل PWA والـ service worker والـ manifest.
12. نفذ الاختبارات.
13. حسّن الواجهة والألوان والثيمات والصوت.
14. شغّل lint/build/test ثم أصلح أي خلل.

عاشراً: متطلبات الخرج النهائي
- أعطني مشروعاً قابلاً للتشغيل محلياً بالكامل.
- زوّد README واضحاً:
  - المتطلبات المسبقة
  - أوامر التشغيل
  - أوامر البناء
  - أوامر الاختبار
  - مكان ملف SQLite
  - آلية bootstrap account JSON لأول دخول
  - أوامر بناء وتشغيل أدوات المطورين
- أخرج الواجهة النهائية بشكل يمكن رفعه على الإنترنت ويحتوي build output المطلوب.
- لا تترك TODOs حرجة.
- إذا اضطررت لافتراض شيء، سجّله في docs/adr.

أوامر التشغيل المتوقعة في README:
- backend restore/build/test
- frontend install/build/test
- install playwright browsers
- apply database migrations
- generate bootstrap account json
- run api
- run web

آلية الدخول الأولية:
- إذا لم يوجد أي مستخدمين، يفتح النظام وضع Bootstrap Access.
- يرفع المسؤول ملف `bootstrap-account.json`.
- بعد قبول الملف، يسجّل الدخول بالحساب الناتج.
- first action after login: force change password
```

## ترتيب التنفيذ من الباك إند حتى بدء التشغيل

1. تهيئة الحل
- إنشاء الحل والمشاريع والملفات المركزية.
- تفعيل `nullable`, `warnings as errors`, و`Central Package Management`.

2. البنية الخلفية
- بناء `Domain`.
- بناء `Application` مع `CQRS`.
- بناء `Infrastructure` مع `SQLite`, `Identity`, `Repositories`, `Migrations`.
- بناء `Api` مع `Auth`, `SignalR`, `Policies`, `Swagger` داخلي للتطوير فقط.

3. أدوات المطورين
- بناء `BootstrapIssuer` لتوليد ملف `bootstrap-account.json`.
- بناء `BulkPackageTool` لفحص أو بناء أو التحقق من حزم Free Engine Bulk.

4. البيانات الأساسية
- المستخدمون والصلاحيات.
- الورديات والبراندات والأصناف.
- التقارير والتواقيع والإعدادات.

5. الإدخال والاعتماد
- شاشة إدخال الإنتاج الشبيهة بالإكسيل.
- الحفظ المرحلي والاعتماد.
- قفل السجل بعد الإرسال.
- سير اعتماد متعدد التوقيع.

6. العرض والتحليلات
- Dashboard لحظي.
- KPI board.
- Notifications center.

7. التبادل الدوري
- Free Engine Bulk export/import.
- الحزم المجدولة.
- البوابة المركزية أو النقل اليدوي.

8. الواجهة والنشر
- PWA.
- service worker.
- manifest.
- build output جاهز للرفع.

9. الاختبارات
- اختبارات باك إند.
- اختبارات واجهة.
- اختبارات E2E.

10. بدء التشغيل
- إنشاء قاعدة SQLite إذا لم تكن موجودة.
- تطبيق migrations.
- إذا لم يوجد أي مستخدم:
  - تفعيل شاشة bootstrap.
  - استيراد `bootstrap-account.json`.
- تشغيل API.
- تشغيل Web.
- تسجيل الدخول وإجبار تغيير كلمة المرور.

## ملاحظات تنفيذية مهمة

- إذا كان عدد المستخدمين المتزامنين كبيراً جداً مستقبلاً، اجعل طبقة البيانات قابلة للترحيل لاحقاً إلى `PostgreSQL` أو `MariaDB`، لكن لا تغيّر SQLite في هذه النسخة.
- استخدم `WAL` ونسخاً احتياطية دورية لملف SQLite.
- يفضل تقديم الـ frontend والـ backend من نفس النطاق في الإنتاج لتبسيط الأمان.
- لا تعتمد على أي ملفات خارجية لخط Cairo أو أصوات الإشعارات.
- استخدم Data Grid Community فقط.
- إذا كان الاستهداف إنترنتاً عاماً مع كثافة كتابات كبيرة جداً، فهذه نقطة خطر مع SQLite؛ خففها بعمليات قصيرة وqueued jobs وتصميم يسمح بترحيل المزود لاحقاً.
- حافظ على build output واضح للواجهة: `index.html`, `assets/*.js`, `assets/*.css`, `sw.js`, `manifest.webmanifest`.

## مراجع التحقق من الإصدارات

- .NET support policy: https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core
- React versions: https://react.dev/versions
- Material UI versions: https://mui.com/versions/
- Vite releases: https://vite.dev/releases
- Node.js releases: https://nodejs.org/en/about/releases/
- Vite 8 announcement: https://vite.dev/blog/announcing-vite8
- vite-plugin-pwa package: https://www.npmjs.com/package/vite-plugin-pwa
- workbox-window package: https://www.npmjs.com/package/workbox-window
- TanStack Query package: https://www.npmjs.com/package/@tanstack/react-query
- React Router DOM package: https://www.npmjs.com/package/react-router-dom
- React Hook Form package: https://www.npmjs.com/package/react-hook-form
- Recharts package: https://www.npmjs.com/package/recharts
- MediatR package: https://www.nuget.org/packages/MediatR/
- FluentValidation package: https://www.nuget.org/packages/FluentValidation/
- FluentValidation.DependencyInjectionExtensions package: https://www.nuget.org/packages/FluentValidation.DependencyInjectionExtensions/
- Serilog.AspNetCore package: https://www.nuget.org/packages/Serilog.AspNetCore
- OpenTelemetry.Extensions.Hosting package: https://www.nuget.org/packages/OpenTelemetry.Extensions.Hosting/
- ClosedXML package: https://www.nuget.org/packages/ClosedXML/
- Microsoft.Playwright package: https://www.nuget.org/packages/Microsoft.Playwright
