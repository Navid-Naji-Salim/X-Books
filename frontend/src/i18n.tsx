import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type Language = "en" | "ku" | "ar";

const soraniDigits = (value: number) => String(value).replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
const soraniMonths = ["کانوونی دووەم", "شوبات", "ئازار", "نیسان", "ئایار", "حوزەیران", "تەممووز", "ئاب", "ئەیلوول", "تشرینی یەکەم", "تشرینی دووەم", "کانوونی یەکەم"];

export const formatLocalizedDate = (value: string | Date, language: Language, style: "numeric" | "long" = "numeric") => {
  const date = new Date(typeof value === "string" ? `${value.slice(0, 10)}T00:00:00` : value);
  if (language === "ku") {
    const day = soraniDigits(date.getDate());
    const year = soraniDigits(date.getFullYear());
    return style === "long" ? `${day} ${soraniMonths[date.getMonth()]} ${year}` : `${year}/${soraniDigits(date.getMonth() + 1)}/${day}`;
  }
  return date.toLocaleDateString(language === "ar" ? "ar-IQ" : "en-US", style === "long" ? { day: "numeric", month: "short", year: "numeric" } : undefined);
};

const translations: Record<string, { ku: string; ar: string }> = {
  "Edit Item": { ku: "دەستکاریی کاڵا", ar: "تعديل العنصر" },
  "Bill Details": { ku: "وردەکاریی وەسڵ", ar: "تفاصيل فاتورة الشراء" },
  "Enter phone number": { ku: "ژمارەی تەلەفۆن بنووسە", ar: "أدخل رقم الهاتف" },
  "Report Period:": { ku: "ماوەی ڕاپۆرت:", ar: "فترة التقرير:" },
  "Generated:": { ku: "دروستکراوە:", ar: "تم الإنشاء:" },
  Erbil: { ku: "هەولێر", ar: "أربيل" },
  "Kurdistan Region": { ku: "هەرێمی کوردستان", ar: "إقليم كردستان" },
  Iraq: { ku: "عێراق", ar: "العراق" },
  "Partially Paid": { ku: "بەشێکی دراوە", ar: "مدفوع جزئياً" },
  Home: { ku: "سەرەکی", ar: "الرئيسية" }, Items: { ku: "کاڵاکان", ar: "العناصر" }, Sales: { ku: "فرۆشتن", ar: "المبيعات" }, Purchases: { ku: "کڕین", ar: "المشتريات" }, Report: { ku: "ڕاپۆرت", ar: "التقرير" }, Reports: { ku: "ڕاپۆرتەکان", ar: "التقارير" },
  Invoices: { ku: "پسووڵەکان", ar: "الفواتير" }, Customers: { ku: "کڕیارەکان", ar: "العملاء" }, Vendors: { ku: "دابینکەرەکان", ar: "الموردون" }, Bills: { ku: "وەسڵەکان", ar: "فواتير الشراء" },
  Collapse: { ku: "داخستن", ar: "طي" }, Expand: { ku: "فراوانکردن", ar: "توسيع" }, "Collapse Sidebar": { ku: "داخستنی لاتەنیشت", ar: "طي الشريط الجانبي" }, "Expand Sidebar": { ku: "فراوانکردنی لاتەنیشت", ar: "توسيع الشريط الجانبي" },
  User: { ku: "بەکارهێنەر", ar: "المستخدم" }, Settings: { ku: "ڕێکخستنەکان", ar: "الإعدادات" }, "Account Settings": { ku: "ڕێکخستنەکانی هەژمار", ar: "إعدادات الحساب" }, "User Settings": { ku: "ڕێکخستنەکانی بەکارهێنەر", ar: "إعدادات المستخدم" }, "Open User Settings": { ku: "کردنەوەی ڕێکخستنەکانی بەکارهێنەر", ar: "فتح إعدادات المستخدم" }, "Close User Settings": { ku: "داخستنی ڕێکخستنەکانی بەکارهێنەر", ar: "إغلاق إعدادات المستخدم" },
  Language: { ku: "زمان", ar: "اللغة" }, English: { ku: "ئینگلیزی", ar: "الإنجليزية" }, Kurdish: { ku: "کوردی", ar: "الكردية" }, Arabic: { ku: "عەرەبی", ar: "العربية" }, "Log Out": { ku: "چوونەدەرەوە", ar: "تسجيل الخروج" },
  "Preparing your books workspace...": { ku: "ئامادەکردنی ژینگەی ژمێریاریت...", ar: "جارٍ تجهيز مساحة المحاسبة..." }, Email: { ku: "ئیمەیڵ", ar: "البريد الإلكتروني" }, Password: { ku: "وشەی نهێنی", ar: "كلمة المرور" }, "Log In": { ku: "چوونەژوورەوە", ar: "تسجيل الدخول" }, "Logging In": { ku: "چوونەژوورەوە", ar: "جارٍ تسجيل الدخول" }, "Unable to log in.": { ku: "نەتوانرا بچیتە ژوورەوە.", ar: "تعذر تسجيل الدخول." },
  "Financial Overview": { ku: "پوختەی دارایی", ar: "نظرة مالية" }, "Your financial overview, clearly presented.": { ku: "پوختەی داراییەکەت بە ڕوونی پیشان دراوە.", ar: "نظرتك المالية، معروضة بوضوح." }, Receivables: { ku: "قەرزە وەرگیراوەکان", ar: "الذمم المدينة" }, Payables: { ku: "قەرزە دراوەکان", ar: "الذمم الدائنة" }, "Total Unpaid Invoices": { ku: "کۆی فاکتورە نەدراوەکان", ar: "إجمالي الفواتير غير المدفوعة" }, "Total Unpaid Bills": { ku: "کۆی پسوڵە نەدراوەکان", ar: "إجمالي الفواتير المستحقة غير المدفوعة" }, Current: { ku: "ئێستا", ar: "الحالي" }, Overdue: { ku: "دواکەوتوو", ar: "متأخر" }, "View All": { ku: "بینینی هەموو", ar: "عرض الكل" },
  "Cash Flow": { ku: "ڕەوتی پارە", ar: "التدفق النقدي" }, Incoming: { ku: "هاتوو", ar: "الوارد" }, Outgoing: { ku: "دەرچوو", ar: "الصادر" }, "Incoming Cash": { ku: "پارەی هاتوو", ar: "النقد الداخل" }, "Outgoing Cash": { ku: "پارەی دەرچوو", ar: "النقد الخارج" }, "Income vs Expenses": { ku: "داهات بەرامبەر خەرجی", ar: "الدخل مقابل المصروفات" }, Income: { ku: "داهات", ar: "الدخل" }, Expenses: { ku: "خەرجییەکان", ar: "المصروفات" }, "Net Activity": { ku: "چالاکیی خاوێن", ar: "صافي النشاط" }, "Invoice Income": { ku: "داهاتی پسووڵە", ar: "دخل الفواتير" }, "Recorded Expenses": { ku: "خەرجییە تۆمارکراوەکان", ar: "المصروفات المسجلة" },
  "Cash received and paid by month": { ku: "پارەی وەرگیراو و دراو بە مانگ", ar: "النقد المقبوض والمدفوع شهرياً" }, "Invoices and bills recorded by month": { ku: "پسووڵە و وەسڵە تۆمارکراوەکان بە مانگ", ar: "الفواتير وفواتير الشراء المسجلة شهرياً" },
  "Good morning": { ku: "بەیانی باش", ar: "صباح الخير" }, "Good afternoon": { ku: "نیوەڕۆ باش", ar: "مساء الخير" }, "Good evening": { ku: "ئێوارە باش", ar: "مساء الخير" },
  "New Item": { ku: "کاڵای نوێ", ar: "عنصر جديد" }, "Save Item": { ku: "پاشەکەوتکردنی کاڵا", ar: "حفظ العنصر" }, "Item List": { ku: "لیستی کاڵاکان", ar: "قائمة العناصر" }, "Item Details": { ku: "وردەکاریی کاڵا", ar: "تفاصيل العنصر" }, "Basic Details": { ku: "وردەکاریی سەرەتایی", ar: "التفاصيل الأساسية" }, Name: { ku: "ناو", ar: "الاسم" }, Description: { ku: "وەسف", ar: "الوصف" }, SKU: { ku: "SKU", ar: "SKU" }, Unit: { ku: "یەکە", ar: "الوحدة" }, Quantity: { ku: "بڕ", ar: "الكمية" }, Rate: { ku: "نرخ", ar: "السعر" }, Amount: { ku: "بڕی پارە", ar: "المبلغ" }, Actions: { ku: "کردارەکان", ar: "الإجراءات" }, View: { ku: "بینین", ar: "عرض" }, Edit: { ku: "دەستکاری", ar: "تعديل" }, Delete: { ku: "سڕینەوە", ar: "حذف" }, Deleting: { ku: "سڕینەوە...", ar: "جارٍ الحذف" }, Discard: { ku: "فڕێدان", ar: "تجاهل" }, Cancel: { ku: "هەڵوەشاندنەوە", ar: "إلغاء" }, Close: { ku: "داخستن", ar: "إغلاق" }, Update: { ku: "نوێکردنەوە", ar: "تحديث" }, "Saving...": { ku: "پاشەکەوت دەکرێت...", ar: "جارٍ الحفظ..." }, Search: { ku: "گەڕان", ar: "بحث" }, Notes: { ku: "تێبینییەکان", ar: "ملاحظات" },
  "Sales Information": { ku: "زانیاریی فرۆشتن", ar: "معلومات المبيعات" }, "Purchase Information": { ku: "زانیاریی کڕین", ar: "معلومات المشتريات" }, "Sales Price": { ku: "نرخی فرۆشتن", ar: "سعر البيع" }, "Purchase Price": { ku: "نرخی کڕین", ar: "سعر الشراء" }, "Cost Price": { ku: "نرخی تێچوو", ar: "سعر التكلفة" }, Tax: { ku: "باج", ar: "الضريبة" }, "Select an option": { ku: "هەڵبژاردەیەک دیاری بکە", ar: "اختر خياراً" }, Exempt: { ku: "بێباج", ar: "معفى" }, "Standard Tax": { ku: "باجی ئاسایی", ar: "الضريبة القياسية" }, "Reduced Tax": { ku: "باجی کەمکراو", ar: "الضريبة المخفضة" }, "Out of Scope": { ku: "دەرەوەی بازنە", ar: "خارج النطاق" },
  "New Customer": { ku: "کڕیاری نوێ", ar: "عميل جديد" }, "Edit Customer": { ku: "دەستکاریی کڕیار", ar: "تعديل العميل" }, "Save Customer": { ku: "پاشەکەوتکردنی کڕیار", ar: "حفظ العميل" }, "Update Customer": { ku: "نوێکردنەوەی کڕیار", ar: "تحديث العميل" }, "Customer List": { ku: "لیستی کڕیارەکان", ar: "قائمة العملاء" }, "Customer Details": { ku: "وردەکاریی کڕیار", ar: "تفاصيل العميل" }, "New Vendor": { ku: "دابینکەری نوێ", ar: "مورد جديد" }, "Edit Vendor": { ku: "دەستکاریی دابینکەر", ar: "تعديل المورد" }, "Save Vendor": { ku: "پاشەکەوتکردنی دابینکەر", ar: "حفظ المورد" }, "Update Vendor": { ku: "نوێکردنەوەی دابینکەر", ar: "تحديث المورد" }, "Vendor List": { ku: "لیستی دابینکەرەکان", ar: "قائمة الموردين" }, "Vendor Details": { ku: "وردەکاریی دابینکەر", ar: "تفاصيل المورد" },
  Type: { ku: "جۆر", ar: "النوع" }, Business: { ku: "بازرگانی", ar: "شركة" }, Individual: { ku: "تاک", ar: "فرد" }, "Company Name": { ku: "ناوی کۆمپانیا", ar: "اسم الشركة" }, Contact: { ku: "پەیوەندی", ar: "الاتصال" }, "No phone": { ku: "تەلەفۆن نییە", ar: "لا يوجد هاتف" }, "Payment Terms": { ku: "مەرجەکانی پارەدان", ar: "شروط الدفع" }, "Search Items": { ku: "گەڕان بەدوای کاڵا", ar: "بحث العناصر" }, "Search Customers": { ku: "گەڕان بەدوای کڕیار", ar: "بحث العملاء" }, "Search Vendors": { ku: "گەڕان بەدوای دابینکەر", ar: "بحث الموردين" }, "Search Invoices": { ku: "گەڕان بەدوای پسووڵە", ar: "بحث الفواتير" }, "Search Bills": { ku: "گەڕان بەدوای وەسڵ", ar: "بحث فواتير الشراء" }, "Search items by any detail…": { ku: "گەڕان بەدوای کاڵا بە هەر وردەکارییەک…", ar: "ابحث عن العناصر بأي تفصيل…" }, "Search customers by any detail…": { ku: "گەڕان بەدوای کڕیار بە هەر وردەکارییەک…", ar: "ابحث عن العملاء بأي تفصيل…" }, "Search vendors by any detail…": { ku: "گەڕان بەدوای دابینکەر بە هەر وردەکارییەک…", ar: "ابحث عن الموردين بأي تفصيل…" }, "Search invoices by any detail…": { ku: "گەڕان بەدوای پسووڵە بە هەر وردەکارییەک…", ar: "ابحث عن الفواتير بأي تفصيل…" }, "Search bills by any detail…": { ku: "گەڕان بەدوای وەسڵ بە هەر وردەکارییەک…", ar: "ابحث عن فواتير الشراء بأي تفصيل…" }, "Discard unsaved changes?": { ku: "گۆڕانکارییە پاشەکەوت‌نەکراوەکان هەڵبوەشێنرێنەوە؟", ar: "هل تريد تجاهل التغييرات غير المحفوظة؟" }, "Your unsaved changes will be lost.": { ku: "گۆڕانکارییە پاشەکەوت‌نەکراوەکانت لەدەست دەچن.", ar: "ستفقد تغييراتك غير المحفوظة." }, "This action cannot be undone.": { ku: "ئەم کردارە ناگەڕێندرێتەوە.", ar: "لا يمكن التراجع عن هذا الإجراء." },
  "Contact and Billing Details": { ku: "زانیاریی پەیوەندی و وەسڵ", ar: "بيانات الاتصال والفوترة" }, "First Name": { ku: "ناوی یەکەم", ar: "الاسم الأول" }, "Last Name": { ku: "ناوی کۆتایی", ar: "اسم العائلة" }, "Email Address": { ku: "ناونیشانی ئیمەیڵ", ar: "عنوان البريد الإلكتروني" }, Phone: { ku: "تەلەفۆن", ar: "الهاتف" }, "Billing Address": { ku: "ناونیشانی وەسڵ", ar: "عنوان الفوترة" }, "Address Line 1": { ku: "هێڵی ناونیشان ١", ar: "سطر العنوان 1" }, "Address Line 2": { ku: "هێڵی ناونیشان ٢", ar: "سطر العنوان 2" }, City: { ku: "شار", ar: "المدينة" }, "State / Province": { ku: "پارێزگا / هەرێم", ar: "المحافظة / المنطقة" }, "Postal Code": { ku: "کۆدی پۆست", ar: "الرمز البريدي" }, Country: { ku: "وڵات", ar: "البلد" }, Location: { ku: "شوێن", ar: "الموقع" }, "Purchase Settings": { ku: "ڕێکخستنەکانی کڕین", ar: "إعدادات الشراء" }, "Sales Settings": { ku: "ڕێکخستنەکانی فرۆشتن", ar: "إعدادات المبيعات" }, "Default Payment Terms": { ku: "مەرجی بنەڕەتیی پارەدان", ar: "شروط الدفع الافتراضية" },
  "Street and building": { ku: "شەقام و بینا", ar: "الشارع والمبنى" }, "Suite, floor, or landmark": { ku: "ژوور، نهۆم، یان نیشانە", ar: "الجناح أو الطابق أو علامة مميزة" }, "Notes for internal use": { ku: "تێبینی بۆ بەکارهێنانی ناوخۆیی", ar: "ملاحظات للاستخدام الداخلي" },
  "New Invoice": { ku: "پسووڵەی نوێ", ar: "فاتورة جديدة" }, "Edit Invoice": { ku: "دەستکاریی پسووڵە", ar: "تعديل الفاتورة" }, "Save Invoice": { ku: "پاشەکەوتکردنی پسووڵە", ar: "حفظ الفاتورة" }, "Update Invoice": { ku: "نوێکردنەوەی پسووڵە", ar: "تحديث الفاتورة" }, "Saved Invoices": { ku: "پسووڵە پاشەکەوتکراوەکان", ar: "الفواتير المحفوظة" }, Invoice: { ku: "پسووڵە", ar: "الفاتورة" }, "Invoice Number": { ku: "ژمارەی پسووڵە", ar: "رقم الفاتورة" }, Customer: { ku: "کڕیار", ar: "العميل" }, "Invoice Date": { ku: "بەرواری پسووڵە", ar: "تاريخ الفاتورة" }, "Due Date": { ku: "بەرواری دان", ar: "تاريخ الاستحقاق" }, Status: { ku: "دۆخ", ar: "الحالة" }, Total: { ku: "کۆ", ar: "الإجمالي" }, Subtotal: { ku: "کۆی لاوەکی", ar: "المجموع الفرعي" }, Discount: { ku: "داشکاندن", ar: "الخصم" }, Paid: { ku: "دراوە", ar: "مدفوع" }, Unpaid: { ku: "نەدراوە", ar: "غير مدفوع" }, "Record Payment": { ku: "تۆمارکردنی پارەدان", ar: "تسجيل دفعة" }, "Payment Date": { ku: "بەرواری پارەدان", ar: "تاريخ الدفع" }, "Save Payment": { ku: "پاشەکەوتکردنی پارەدان", ar: "حفظ الدفعة" }, "Add Line": { ku: "زیادکردنی هێڵ", ar: "إضافة سطر" },
  "Customer and Billing Details": { ku: "وردەکاریی کڕیار و وەسڵ", ar: "تفاصيل العميل والفوترة" }, "Vendor and Billing Details": { ku: "وردەکاریی دابینکەر و وەسڵ", ar: "تفاصيل المورد والفوترة" }, "Select a customer": { ku: "کڕیارێک هەڵبژێرە", ar: "اختر عميلاً" }, "Invoice Details": { ku: "وردەکاریی پسووڵە", ar: "تفاصيل الفاتورة" }, "Payment Schedule": { ku: "خشتەی پارەدان", ar: "جدول الدفع" }, Terms: { ku: "مەرجەکان", ar: "الشروط" }, "Due on Receipt": { ku: "لە کاتی وەرگرتن", ar: "مستحق عند الاستلام" }, "Item Table": { ku: "خشتەی کاڵاکان", ar: "جدول العناصر" }, Item: { ku: "کاڵا", ar: "العنصر" }, "Select an item": { ku: "کاڵایەک هەڵبژێرە", ar: "اختر عنصراً" }, "Select a tax": { ku: "باجێک هەڵبژێرە", ar: "اختر ضريبة" }, "Remove Line": { ku: "سڕینەوەی هێڵ", ar: "حذف السطر" }, "+ Add New Row": { ku: "+ زیادکردنی ڕیزی نوێ", ar: "+ إضافة صف جديد" }, "Add New Row": { ku: "زیادکردنی ڕیزی نوێ", ar: "إضافة صف جديد" }, "Customer Notes": { ku: "تێبینییەکانی کڕیار", ar: "ملاحظات العميل" }, "Thanks for your business.": { ku: "سوپاس بۆ مامەڵەکەتان.", ar: "شكراً لتعاملكم معنا." }, "Displayed on the invoice": { ku: "لەسەر پسووڵەکە پیشان دەدرێت", ar: "يظهر على الفاتورة" },
  "New Bill": { ku: "وەسڵی نوێ", ar: "فاتورة شراء جديدة" }, "Edit Bill": { ku: "دەستکاریی وەسڵ", ar: "تعديل فاتورة الشراء" }, "Save Bill": { ku: "پاشەکەوتکردنی وەسڵ", ar: "حفظ فاتورة الشراء" }, "Update Bill": { ku: "نوێکردنەوەی وەسڵ", ar: "تحديث فاتورة الشراء" }, "Saved Bills": { ku: "وەسڵە پاشەکەوتکراوەکان", ar: "فواتير الشراء المحفوظة" }, Bill: { ku: "وەسڵ", ar: "فاتورة الشراء" }, "Bill Number": { ku: "ژمارەی وەسڵ", ar: "رقم فاتورة الشراء" }, Vendor: { ku: "دابینکەر", ar: "المورد" }, "Bill Date": { ku: "بەرواری وەسڵ", ar: "تاريخ فاتورة الشراء" }, "Pay Bill": { ku: "دانی وەسڵ", ar: "دفع فاتورة الشراء" },
  "Sales Report": { ku: "ڕاپۆرتی فرۆشتن", ar: "تقرير المبيعات" }, "Purchases Report": { ku: "ڕاپۆرتی کڕین", ar: "تقرير المشتريات" }, "Customers Report": { ku: "ڕاپۆرتی کڕیاران", ar: "تقرير العملاء" }, "Vendors Report": { ku: "ڕاپۆرتی دابینکەران", ar: "تقرير الموردين" }, "Profit & Loss": { ku: "قازانج و زیان", ar: "الأرباح والخسائر" }, "Generate Report": { ku: "دروستکردنی ڕاپۆرت", ar: "إنشاء التقرير" }, "Export PDF": { ku: "هەناردەکردنی PDF", ar: "تصدير PDF" }, From: { ku: "لە", ar: "من" }, To: { ku: "بۆ", ar: "إلى" }, Outstanding: { ku: "ماوە", ar: "المستحق" }, "Net Profit": { ku: "قازانجی خاوێن", ar: "صافي الربح" }, Transactions: { ku: "مامەڵەکان", ar: "المعاملات" }, Category: { ku: "پۆل", ar: "الفئة" },
  Account: { ku: "هەژمار", ar: "الحساب" }, Company: { ku: "کۆمپانیا", ar: "الشركة" }, Date: { ku: "بەروار", ar: "التاريخ" }, Print: { ku: "چاپکردن", ar: "طباعة" }, Purchase: { ku: "کڕین", ar: "المشتريات" }, "Inventory Value": { ku: "بەهای کۆگا", ar: "قيمة المخزون" }, "Display Name": { ku: "ناوی پیشاندان", ar: "اسم العرض" }, "Create Customer": { ku: "دروستکردنی کڕیار", ar: "إنشاء عميل" }, "Create Vendor": { ku: "دروستکردنی دابینکەر", ar: "إنشاء مورد" },
  "Catalog Details": { ku: "وردەکاریی کاتەلۆگ", ar: "تفاصيل الكتالوج" }, Goods: { ku: "کاڵا", ar: "سلعة" }, Service: { ku: "خزمەتگوزاری", ar: "خدمة" }, goods: { ku: "کاڵا", ar: "سلعة" }, service: { ku: "خزمەتگوزاری", ar: "خدمة" }, box: { ku: "سندووق", ar: "صندوق" }, pcs: { ku: "دانە", ar: "قطعة" }, "No unit": { ku: "یەکە نییە", ar: "بلا وحدة" }, "Select a unit": { ku: "یەکەیەک هەڵبژێرە", ar: "اختر وحدة" }, "Premium notebook": { ku: "دەفتەری تێبینیی نایاب", ar: "دفتر ملاحظات فاخر" },
  discount: { ku: "داشکاندن", ar: "الخصومات" }, "general income": { ku: "داهاتی گشتی", ar: "الإيرادات العامة" }, "interest income": { ku: "داهاتی سوو", ar: "إيرادات الفوائد" }, "late fee income": { ku: "داهاتی سزای دواکەوتن", ar: "إيرادات رسوم التأخير" }, "other charges": { ku: "کرێی تر", ar: "رسوم أخرى" }, "Cost of Goods Sold": { ku: "تێچووی کاڵای فرۆشراو", ar: "تكلفة البضاعة المباعة" }, "Supplies Expense": { ku: "خەرجی پێداویستییەکان", ar: "مصروف المستلزمات" }, "Inventory Asset": { ku: "سامانی کۆگا", ar: "أصل المخزون" }, "Other Expense": { ku: "خەرجی تر", ar: "مصروفات أخرى" },
  "Item Image": { ku: "وێنەی کاڵا", ar: "صورة العنصر" }, "Item Image Preview": { ku: "پێشبینینی وێنەی کاڵا", ar: "معاينة صورة العنصر" }, "Image Actions": { ku: "کردارەکانی وێنە", ar: "إجراءات الصورة" }, "View Image": { ku: "بینینی وێنە", ar: "عرض الصورة" }, "Choose Another Image": { ku: "وێنەیەکی تر هەڵبژێرە", ar: "اختيار صورة أخرى" }, "Remove Image": { ku: "سڕینەوەی وێنە", ar: "إزالة الصورة" }, "Drop or browse": { ku: "دایبنێ یان بگەڕێ", ar: "أفلت الصورة أو تصفح" }, "Close Image Preview": { ku: "داخستنی پێشبینینی وێنە", ar: "إغلاق معاينة الصورة" }, "Are you sure you want to remove this image?": { ku: "دڵنیایت دەتەوێت ئەم وێنەیە بسڕیتەوە؟", ar: "هل أنت متأكد من أنك تريد إزالة هذه الصورة؟" },
  "Sales description": { ku: "وەسفی فرۆشتن", ar: "وصف المبيعات" }, "Purchase description": { ku: "وەسفی کڕین", ar: "وصف المشتريات" }, "Select a vendor": { ku: "دابینکەرێک هەڵبژێرە", ar: "اختر مورداً" }, "Net 7": { ku: "لە ماوەی ٧ ڕۆژدا", ar: "خلال 7 أيام" }, "Net 15": { ku: "لە ماوەی ١٥ ڕۆژدا", ar: "خلال 15 يوماً" }, "Net 30": { ku: "لە ماوەی ٣٠ ڕۆژدا", ar: "خلال 30 يوماً" }, "Net 45": { ku: "لە ماوەی ٤٥ ڕۆژدا", ar: "خلال 45 يوماً" }, "Net 60": { ku: "لە ماوەی ٦٠ ڕۆژدا", ar: "خلال 60 يوماً" },
  "Report Details": { ku: "وردەکاریی ڕاپۆرت", ar: "تفاصيل التقرير" }, "Profit & Loss Details": { ku: "وردەکاریی قازانج و زیان", ar: "تفاصيل الأرباح والخسائر" }, "Sales Income": { ku: "داهاتی فرۆشتن", ar: "إيرادات المبيعات" }, "Total Sales": { ku: "کۆی فرۆشتن", ar: "إجمالي المبيعات" }, "Total Purchases": { ku: "کۆی کڕین", ar: "إجمالي المشتريات" }, "Transaction Total": { ku: "کۆی مامەڵەکان", ar: "إجمالي المعاملات" }, "Report Period": { ku: "ماوەی ڕاپۆرت", ar: "فترة التقرير" }, Generated: { ku: "دروستکراوە", ar: "تم الإنشاء" }, "Generating...": { ku: "ڕاپۆرت دروست دەکرێت...", ar: "جارٍ إنشاء التقرير..." }, "No activity in this period.": { ku: "هیچ چالاکییەک لەم ماوەیەدا نییە.", ar: "لا يوجد نشاط في هذه الفترة." }, "Choose a date range and generate this report.": { ku: "مەودایەکی بەروار هەڵبژێرە و ئەم ڕاپۆرتە دروست بکە.", ar: "اختر نطاقاً زمنياً وأنشئ هذا التقرير." }, "Choose a valid date range.": { ku: "مەودایەکی دروستی بەروار هەڵبژێرە.", ar: "اختر نطاقاً زمنياً صالحاً." },
  "Compare invoiced sales with recorded purchases and review net profit.": { ku: "فرۆشتنی پسووڵەکراو لەگەڵ کڕینە تۆمارکراوەکان بەراورد بکە و قازانجی خاوێن بپشکنە.", ar: "قارن المبيعات المفوترة بالمشتريات المسجلة وراجع صافي الربح." }, "Review invoice totals, payment status, customers, and sales activity.": { ku: "کۆی پسووڵەکان، دۆخی پارەدان، کڕیاران و چالاکیی فرۆشتن بپشکنە.", ar: "راجع إجماليات الفواتير وحالة الدفع والعملاء ونشاط المبيعات." }, "Review bill totals, payment status, vendors, and purchase activity.": { ku: "کۆی وەسڵەکان، دۆخی پارەدان، دابینکەران و چالاکیی کڕین بپشکنە.", ar: "راجع إجماليات فواتير الشراء وحالة الدفع والموردين ونشاط المشتريات." }, "See customer activity, invoiced totals, and outstanding balances.": { ku: "چالاکیی کڕیاران، کۆی پسووڵەکان و باڵانسە ماوەکان ببینە.", ar: "اطّلع على نشاط العملاء وإجماليات الفواتير والأرصدة المستحقة." }, "See vendor activity, billed totals, and outstanding balances.": { ku: "چالاکیی دابینکەران، کۆی وەسڵەکان و باڵانسە ماوەکان ببینە.", ar: "اطّلع على نشاط الموردين وإجماليات فواتير الشراء والأرصدة المستحقة." },
  "Customers for your sales flow.": { ku: "کڕیاران بۆ ڕەوتی فرۆشتنەکەت.", ar: "العملاء ضمن سير عمل المبيعات." }, "Vendors for your purchasing flow.": { ku: "دابینکەران بۆ ڕەوتی کڕینەکەت.", ar: "الموردون ضمن سير عمل المشتريات." }, "Add customers now so invoices can be connected to real buyers later.": { ku: "ئێستا کڕیار زیاد بکە تا دواتر پسووڵەکان بە کڕیارە ڕاستەقینەکانەوە ببەسترێنەوە.", ar: "أضف العملاء الآن لربط الفواتير بالمشترين الفعليين لاحقاً." }, "Add vendors now so bills and purchase orders have suppliers later.": { ku: "ئێستا دابینکەر زیاد بکە تا دواتر وەسڵ و فەرمانەکانی کڕین دابینکەریان هەبێت.", ar: "أضف الموردين الآن لتكون لفواتير الشراء وأوامر الشراء جهات توريد لاحقاً." }, "No records yet.": { ku: "هێشتا هیچ تۆمارێک نییە.", ar: "لا توجد سجلات بعد." },
  "Preparing your books workspace": { ku: "ئامادەکردنی ژینگەی ژمێریاریت", ar: "جارٍ تجهيز مساحة المحاسبة" }, "Scroll Table Rows": { ku: "پێچانەوەی ڕیزەکانی خشتە", ar: "تمرير صفوف الجدول" }, "Some workspace data could not be loaded. Try refreshing in a moment.": { ku: "هەندێک داتای ژینگەکە بار نەبوو. دوای ساتێک نوێی بکەرەوە.", ar: "تعذر تحميل بعض بيانات مساحة العمل. حاول التحديث بعد قليل." }, "Request failed.": { ku: "داواکارییەکە سەرکەوتوو نەبوو.", ar: "فشل الطلب." },
  "Choose an image file.": { ku: "فایلێکی وێنە هەڵبژێرە.", ar: "اختر ملف صورة." }, "Item images must be 2 MB or smaller.": { ku: "وێنەی کاڵا دەبێت ٢ مێگابایت یان کەمتر بێت.", ar: "يجب ألا يتجاوز حجم صورة العنصر 2 ميغابايت." }, "Unable to read that image.": { ku: "نەتوانرا ئەو وێنەیە بخوێنرێتەوە.", ar: "تعذرت قراءة تلك الصورة." }, "Unable to delete item.": { ku: "نەتوانرا کاڵاکە بسڕدرێتەوە.", ar: "تعذر حذف العنصر." }, "Unable to save item.": { ku: "نەتوانرا کاڵاکە پاشەکەوت بکرێت.", ar: "تعذر حفظ العنصر." },
  "Unable to delete customer.": { ku: "نەتوانرا کڕیارەکە بسڕدرێتەوە.", ar: "تعذر حذف العميل." }, "Unable to save customer.": { ku: "نەتوانرا کڕیارەکە پاشەکەوت بکرێت.", ar: "تعذر حفظ العميل." }, "Unable to delete vendor.": { ku: "نەتوانرا دابینکەرەکە بسڕدرێتەوە.", ar: "تعذر حذف المورد." }, "Unable to save vendor.": { ku: "نەتوانرا دابینکەرەکە پاشەکەوت بکرێت.", ar: "تعذر حفظ المورد." }, "Unable to save record.": { ku: "نەتوانرا تۆمارەکە پاشەکەوت بکرێت.", ar: "تعذر حفظ السجل." },
  "Unable to delete the invoice.": { ku: "نەتوانرا پسووڵەکە بسڕدرێتەوە.", ar: "تعذر حذف الفاتورة." }, "Unable to save invoice.": { ku: "نەتوانرا پسووڵەکە پاشەکەوت بکرێت.", ar: "تعذر حفظ الفاتورة." }, "Unable to delete the bill.": { ku: "نەتوانرا وەسڵەکە بسڕدرێتەوە.", ar: "تعذر حذف فاتورة الشراء." }, "Unable to save bill.": { ku: "نەتوانرا وەسڵەکە پاشەکەوت بکرێت.", ar: "تعذر حفظ فاتورة الشراء." }, "Unable to record the payment.": { ku: "نەتوانرا پارەدانەکە تۆمار بکرێت.", ar: "تعذر تسجيل الدفعة." }, "Unable to generate the report.": { ku: "نەتوانرا ڕاپۆرتەکە دروست بکرێت.", ar: "تعذر إنشاء التقرير." },
  "Login is required.": { ku: "چوونەژوورەوە پێویستە.", ar: "تسجيل الدخول مطلوب." }, "Your session has expired.": { ku: "دانیشتنەکەت بەسەرچووە.", ar: "انتهت صلاحية جلستك." }, "Invalid email or password.": { ku: "ئیمەیڵ یان وشەی نهێنی هەڵەیە.", ar: "البريد الإلكتروني أو كلمة المرور غير صحيحة." }, "Your session is invalid.": { ku: "دانیشتنەکەت نادروستە.", ar: "جلستك غير صالحة." }, "User account no longer exists.": { ku: "هەژماری بەکارهێنەر چیتر بوونی نییە.", ar: "حساب المستخدم لم يعد موجوداً." },
  "Customer type must be Business or Individual.": { ku: "جۆری کڕیار دەبێت بازرگانی یان تاک بێت.", ar: "يجب أن يكون نوع العميل شركة أو فرداً." }, "Vendor type must be Business or Individual.": { ku: "جۆری دابینکەر دەبێت بازرگانی یان تاک بێت.", ar: "يجب أن يكون نوع المورد شركة أو فرداً." }, "Company name is required.": { ku: "ناوی کۆمپانیا پێویستە.", ar: "اسم الشركة مطلوب." }, "First and last name are required.": { ku: "ناوی یەکەم و کۆتایی پێویستن.", ar: "الاسم الأول واسم العائلة مطلوبان." }, "Customer could not be saved.": { ku: "نەتوانرا کڕیارەکە پاشەکەوت بکرێت.", ar: "تعذر حفظ العميل." },
  "Add at least one bill item.": { ku: "لانیکەم یەک کاڵا بۆ وەسڵەکە زیاد بکە.", ar: "أضف عنصراً واحداً على الأقل إلى فاتورة الشراء." }, "A bill item was not found or cannot be purchased.": { ku: "کاڵایەکی وەسڵەکە نەدۆزرایەوە یان ناتوانرێت بکڕدرێت.", ar: "لم يتم العثور على أحد عناصر فاتورة الشراء أو لا يمكن شراؤه." }, "Bill quantity and rate must be valid.": { ku: "بڕ و نرخی وەسڵەکە دەبێت دروست بن.", ar: "يجب أن تكون كمية فاتورة الشراء وسعرها صالحين." }, "Paid and partially paid bills cannot be edited.": { ku: "وەسڵی دراو و بەشێکی دراو ناتوانرێت دەستکاری بکرێت.", ar: "لا يمكن تعديل فواتير الشراء المدفوعة أو المدفوعة جزئياً." },
  "Add at least one invoice item.": { ku: "لانیکەم یەک کاڵا بۆ پسووڵەکە زیاد بکە.", ar: "أضف عنصراً واحداً على الأقل إلى الفاتورة." }, "An invoice item was not found or cannot be sold.": { ku: "کاڵایەکی پسووڵەکە نەدۆزرایەوە یان ناتوانرێت بفرۆشرێت.", ar: "لم يتم العثور على أحد عناصر الفاتورة أو لا يمكن بيعه." }, "Invoice quantity and rate must be valid.": { ku: "بڕ و نرخی پسووڵەکە دەبێت دروست بن.", ar: "يجب أن تكون كمية الفاتورة وسعرها صالحين." }, "Paid and partially paid invoices cannot be edited.": { ku: "پسووڵەی دراو و بەشێکی دراو ناتوانرێت دەستکاری بکرێت.", ar: "لا يمكن تعديل الفواتير المدفوعة أو المدفوعة جزئياً." },
  "Payment amount must be greater than zero.": { ku: "بڕی پارەدان دەبێت لە سفر زیاتر بێت.", ar: "يجب أن يكون مبلغ الدفعة أكبر من صفر." }, "Payment amount cannot exceed the remaining balance.": { ku: "بڕی پارەدان ناتوانێت لە باڵانسی ماوە زیاتر بێت.", ar: "لا يمكن أن يتجاوز مبلغ الدفعة الرصيد المتبقي." }, "This bill is already paid.": { ku: "ئەم وەسڵە پێشتر دراوە.", ar: "فاتورة الشراء هذه مدفوعة بالفعل." }, "This invoice is already paid.": { ku: "ئەم پسووڵەیە پێشتر دراوە.", ar: "هذه الفاتورة مدفوعة بالفعل." }, "quantity must be a whole number.": { ku: "بڕ دەبێت ژمارەی تەواو بێت.", ar: "يجب أن تكون الكمية عدداً صحيحاً." }, "itemType must be goods or service.": { ku: "جۆری کاڵا دەبێت کاڵا یان خزمەتگوزاری بێت.", ar: "يجب أن يكون نوع العنصر سلعة أو خدمة." },
  "The uploaded image is too large. Choose an image no larger than 2 MB.": { ku: "وێنەی بارکراو زۆر گەورەیە. وێنەیەک هەڵبژێرە کە لە ٢ مێگابایت گەورەتر نەبێت.", ar: "الصورة المرفوعة كبيرة جداً. اختر صورة لا يتجاوز حجمها 2 ميغابايت." }, "A record with this unique value already exists.": { ku: "تۆمارێک بەم بەهای تایبەتە پێشتر هەیە.", ar: "يوجد سجل بهذه القيمة الفريدة بالفعل." }, "A selected related record was not found.": { ku: "تۆماری پەیوەندیداری هەڵبژێردراو نەدۆزرایەوە.", ar: "لم يتم العثور على السجل المرتبط المحدد." }, "Database request failed.": { ku: "داواکاریی بنکەدراوە سەرکەوتوو نەبوو.", ar: "فشل طلب قاعدة البيانات." }, "Something went wrong.": { ku: "هەڵەیەک ڕوویدا.", ar: "حدث خطأ ما." },
  "No saved invoices yet.": { ku: "هێشتا هیچ پسووڵەیەک پاشەکەوت نەکراوە.", ar: "لا توجد فواتير محفوظة بعد." }, "No saved bills yet.": { ku: "هێشتا هیچ وەسڵێک پاشەکەوت نەکراوە.", ar: "لا توجد فواتير شراء محفوظة بعد." }, "No customers yet.": { ku: "هێشتا هیچ کڕیارێک نییە.", ar: "لا يوجد عملاء بعد." }, "No vendors yet.": { ku: "هێشتا هیچ دابینکەرێک نییە.", ar: "لا يوجد موردون بعد." }, "No items yet.": { ku: "هێشتا هیچ کاڵایەک نییە.", ar: "لا توجد عناصر بعد." }, "No items match your search.": { ku: "هیچ کاڵایەک لەگەڵ گەڕانەکەت یەک ناگرێتەوە.", ar: "لا توجد عناصر تطابق بحثك." }, "No customers match your search.": { ku: "هیچ کڕیارێک لەگەڵ گەڕانەکەت یەک ناگرێتەوە.", ar: "لا يوجد عملاء يطابقون بحثك." }, "No vendors match your search.": { ku: "هیچ دابینکەرێک لەگەڵ گەڕانەکەت یەک ناگرێتەوە.", ar: "لا يوجد موردون يطابقون بحثك." }, "No invoices match your search.": { ku: "هیچ پسووڵەیەک لەگەڵ گەڕانەکەت یەک ناگرێتەوە.", ar: "لا توجد فواتير تطابق بحثك." }, "No bills match your search.": { ku: "هیچ وەسڵێک لەگەڵ گەڕانەکەت یەک ناگرێتەوە.", ar: "لا توجد فواتير شراء تطابق بحثك." },
};

const dynamicTranslate = (value: string, language: Exclude<Language, "en">) => {
  const direct = translations[value]?.[language];
  if (direct) return direct;
  const fieldLabels: Record<string, { ku: string; ar: string }> = {
    amount: { ku: "بڕی پارە", ar: "المبلغ" },
    billDate: { ku: "بەرواری وەسڵ", ar: "تاريخ فاتورة الشراء" },
    billNumber: { ku: "ژمارەی وەسڵ", ar: "رقم فاتورة الشراء" },
    companyName: { ku: "ناوی کۆمپانیا", ar: "اسم الشركة" },
    customerId: { ku: "کڕیار", ar: "العميل" },
    discountPercent: { ku: "ڕێژەی داشکاندن", ar: "نسبة الخصم" },
    dueDate: { ku: "بەرواری دان", ar: "تاريخ الاستحقاق" },
    email: { ku: "ئیمەیڵ", ar: "البريد الإلكتروني" },
    firstName: { ku: "ناوی یەکەم", ar: "الاسم الأول" },
    invoiceDate: { ku: "بەرواری پسووڵە", ar: "تاريخ الفاتورة" },
    invoiceNumber: { ku: "ژمارەی پسووڵە", ar: "رقم الفاتورة" },
    itemType: { ku: "جۆری کاڵا", ar: "نوع العنصر" },
    lastName: { ku: "ناوی کۆتایی", ar: "اسم العائلة" },
    name: { ku: "ناو", ar: "الاسم" },
    password: { ku: "وشەی نهێنی", ar: "كلمة المرور" },
    paymentDate: { ku: "بەرواری پارەدان", ar: "تاريخ الدفع" },
    purchaseAccount: { ku: "هەژماری کڕین", ar: "حساب المشتريات" },
    quantity: { ku: "بڕ", ar: "الكمية" },
    rate: { ku: "نرخ", ar: "السعر" },
    salesAccount: { ku: "هەژماری فرۆشتن", ar: "حساب المبيعات" },
    salesPrice: { ku: "نرخی فرۆشتن", ar: "سعر البيع" },
    terms: { ku: "مەرجەکان", ar: "الشروط" },
    unit: { ku: "یەکە", ar: "الوحدة" },
    unitCost: { ku: "نرخی تێچوو", ar: "سعر التكلفة" },
    vendorId: { ku: "دابینکەر", ar: "المورد" },
  };
  const fieldError = value.match(/^(.+) (is required|must be text|must be a positive number|is invalid|is not a supported option)\.$/);
  if (fieldError) {
    const label = fieldLabels[fieldError[1]]?.[language] ?? translations[fieldError[1]]?.[language] ?? fieldError[1];
    const messages = language === "ku"
      ? { "is required": "پێویستە", "must be text": "دەبێت دەق بێت", "must be a positive number": "دەبێت ژمارەیەکی ئەرێنی بێت", "is invalid": "نادروستە", "is not a supported option": "هەڵبژاردەیەکی پشتگیریکراو نییە" }
      : { "is required": "مطلوب", "must be text": "يجب أن يكون نصاً", "must be a positive number": "يجب أن يكون رقماً موجباً", "is invalid": "غير صالح", "is not a supported option": "ليس خياراً مدعوماً" };
    return `${label} ${messages[fieldError[2] as keyof typeof messages]}.`;
  }
  const missingEntity = value.match(/^(Customer|Vendor|Invoice|Bill|Item) was not found\.$/);
  if (missingEntity) {
    const entity = translations[missingEntity[1]]?.[language] ?? missingEntity[1];
    return language === "ku" ? `${entity} نەدۆزرایەوە.` : `لم يتم العثور على ${entity}.`;
  }
  const deleteDocument = value.match(/^Delete (invoice|bill) (.+)\?$/);
  if (deleteDocument) {
    const entity = deleteDocument[1] === "invoice"
      ? (language === "ku" ? "پسووڵە" : "الفاتورة")
      : (language === "ku" ? "وەسڵ" : "فاتورة الشراء");
    return language === "ku"
      ? `${entity} ${deleteDocument[2]} بسڕدرێتەوە؟`
      : `هل تريد حذف ${entity} ${deleteDocument[2]}؟`;
  }
  const deleteRecord = value.match(/^Delete (.+)\?$/);
  if (deleteRecord) {
    return language === "ku"
      ? `${deleteRecord[1]} بسڕدرێتەوە؟`
      : `هل تريد حذف ${deleteRecord[1]}؟`;
  }
  const greeting = value.match(/^(Good morning|Good afternoon|Good evening), (.+)$/);
  if (greeting) return `${translations[greeting[1]]?.[language] ?? greeting[1]}، ${greeting[2]}`;
  const filteredCount = value.match(/^(\d+) of (\d+) (items|customers|vendors|invoices|bills)$/);
  if (filteredCount) {
    const nouns = language === "ku" ? { items: "کاڵا", customers: "کڕیار", vendors: "دابینکەر", invoices: "پسووڵە", bills: "وەسڵ" } : { items: "عناصر", customers: "عملاء", vendors: "موردين", invoices: "فواتير", bills: "فواتير شراء" };
    return language === "ku" ? `${filteredCount[1]} لە ${filteredCount[2]} ${nouns[filteredCount[3] as keyof typeof nouns]}` : `${filteredCount[1]} من ${filteredCount[2]} ${nouns[filteredCount[3] as keyof typeof nouns]}`;
  }
  const count = value.match(/^(\d+) (item|customer|vendor|invoice|bill)s?$/);
  if (count) {
    const kuNouns = { item: "کاڵا", customer: "کڕیار", vendor: "دابینکەر", invoice: "پسووڵە", bill: "وەسڵ" };
    const arSingular = { item: "عنصر", customer: "عميل", vendor: "مورد", invoice: "فاتورة", bill: "فاتورة شراء" };
    const arPlural = { item: "عناصر", customer: "عملاء", vendor: "موردين", invoice: "فواتير", bill: "فواتير شراء" };
    const noun = language === "ku" ? kuNouns[count[2] as keyof typeof kuNouns] : (count[1] === "1" ? arSingular : arPlural)[count[2] as keyof typeof arSingular];
    return `${count[1]} ${noun}`;
  }
  const period = value.match(/^(.+) · (\d{4})$/);
  if (period) return `${translations[period[1]]?.[language] ?? period[1]} · ${period[2]}`;
  const lineCount = value.match(/^(\d+) line items?$/);
  if (lineCount) return language === "ku" ? `${lineCount[1]} هێڵی کاڵا` : lineCount[1] === "1" ? "بند واحد" : `${lineCount[1]} بنود`;
  const pageCount = value.match(/^(\d+) pages?$/);
  if (pageCount) return language === "ku" ? `${pageCount[1]} پەڕە` : pageCount[1] === "1" ? "صفحة واحدة" : `${pageCount[1]} صفحات`;
  const reportPeriod = value.match(/^Report Period: (.+)$/);
  if (reportPeriod) return `${translations["Report Period"]?.[language] ?? "Report Period"}: ${reportPeriod[1]}`;
  const generated = value.match(/^Generated: (.+)$/);
  if (generated) return `${translations.Generated?.[language] ?? "Generated"}: ${generated[1]}`;
  const preview = value.match(/^(.+) preview$/);
  if (preview) return language === "ku" ? `پێشبینینی ${preview[1]}` : `معاينة ${preview[1]}`;
  const legendIcon = value.match(/^(.+) legend icon$/);
  if (legendIcon) {
    const label = translations[legendIcon[1]]?.[language] ?? legendIcon[1];
    return language === "ku" ? `هێمای ڕوونکەرەوەی ${label}` : `أيقونة مفتاح ${label}`;
  }
  const months: Record<string, { ku: string; ar: string }> = { Jan: { ku: "کانوونی دووەم", ar: "يناير" }, Feb: { ku: "شوبات", ar: "فبراير" }, Mar: { ku: "ئازار", ar: "مارس" }, Apr: { ku: "نیسان", ar: "أبريل" }, May: { ku: "ئایار", ar: "مايو" }, Jun: { ku: "حوزەیران", ar: "يونيو" }, Jul: { ku: "تەممووز", ar: "يوليو" }, Aug: { ku: "ئاب", ar: "أغسطس" }, Sep: { ku: "ئەیلوول", ar: "سبتمبر" }, Oct: { ku: "تشرینی یەکەم", ar: "أكتوبر" }, Nov: { ku: "تشرینی دووەم", ar: "نوفمبر" }, Dec: { ku: "کانوونی یەکەم", ar: "ديسمبر" } };
  if (months[value]) return months[value][language];
  return value;
};

type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; t: (value: string) => string };
const LanguageContext = createContext<LanguageContextValue | null>(null);
const sourceText = new WeakMap<Text, string>();
const sourceAttributes = new WeakMap<Element, Map<string, string>>();
const isTranslationExcluded = (element: Element | null) => Boolean(element?.closest('[translate="no"]'));

const translateTextNode = (node: Text, language: Language, sourceLanguage: Language = language) => {
  const parent = node.parentElement;
  if (!parent || ["SCRIPT", "STYLE"].includes(parent.tagName) || isTranslationExcluded(parent)) return;
  const previousSource = sourceText.get(node);
  if (previousSource) {
    const previousTrimmed = previousSource.trim();
    const previousTranslation = sourceLanguage === "en" ? previousTrimmed : dynamicTranslate(previousTrimmed, sourceLanguage);
    const previousDesired = previousTrimmed ? previousSource.replace(previousTrimmed, previousTranslation) : previousSource;
    if (node.data !== previousSource && node.data !== previousDesired) sourceText.set(node, node.data);
  } else sourceText.set(node, node.data);
  const original = sourceText.get(node) ?? node.data;
  const trimmed = original.trim();
  const translated = language === "en" ? trimmed : dynamicTranslate(trimmed, language);
  const desired = trimmed ? original.replace(trimmed, translated) : original;
  if (node.data !== desired) node.data = desired;
};

const translateAttributes = (element: Element, language: Language, sourceLanguage: Language = language) => {
  if (isTranslationExcluded(element)) return;
  const originals = sourceAttributes.get(element) ?? new Map<string, string>();
  ["placeholder", "aria-label", "title"].forEach((attribute) => {
    const current = element.getAttribute(attribute);
    const previousSource = originals.get(attribute);
    if (current !== null && previousSource) {
      const previousTranslation = sourceLanguage === "en" ? previousSource : dynamicTranslate(previousSource, sourceLanguage);
      if (current !== previousSource && current !== previousTranslation) originals.set(attribute, current);
    } else if (current !== null) originals.set(attribute, current);
    const original = originals.get(attribute);
    if (original) {
      const desired = language === "en" ? original : dynamicTranslate(original, language);
      if (current !== desired) element.setAttribute(attribute, desired);
    }
  });
  sourceAttributes.set(element, originals);
};

const translateSubtree = (target: Node, language: Language, sourceLanguage: Language = language) => {
  if (target instanceof Text) {
    translateTextNode(target, language, sourceLanguage);
    return;
  }
  if (!(target instanceof Element)) return;
  if (isTranslationExcluded(target)) return;
  translateAttributes(target, language, sourceLanguage);
  const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    translateTextNode(node, language, sourceLanguage);
    node = walker.nextNode() as Text | null;
  }
  target.querySelectorAll("[placeholder], [aria-label], [title]").forEach((element) => translateAttributes(element, language, sourceLanguage));
};

const prepareDocument = (language: Language) => {
  document.documentElement.lang = language === "ku" ? "ckb" : language;
  document.documentElement.dir = language === "en" ? "ltr" : "rtl";
  document.body.classList.toggle("is-rtl", language !== "en");
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("x-books-language");
    return saved === "ku" || saved === "ar" ? saved : "en";
  });
  const previousLanguage = useRef<Language>(language);
  const setLanguage = (next: Language) => { localStorage.setItem("x-books-language", next); setLanguageState(next); };
  useLayoutEffect(() => {
    prepareDocument(language);
    const root = document.getElementById("root");
    if (!root) return;
    translateSubtree(root, language, previousLanguage.current);
    previousLanguage.current = language;
    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        if (record.type === "characterData") translateTextNode(record.target as Text, language);
        else if (record.type === "attributes") translateAttributes(record.target as Element, language);
        else record.addedNodes.forEach((node) => translateSubtree(node, language));
      });
    });
    observer.observe(root, { attributes: true, attributeFilter: ["placeholder", "aria-label", "title"], childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, t: (text: string) => language === "en" ? text : dynamicTranslate(text, language) }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
};
