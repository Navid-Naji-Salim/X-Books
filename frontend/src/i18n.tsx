import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type Language = "en" | "ku" | "ar";

const translations: Record<string, { ku: string; ar: string }> = {
  "Edit Item": { ku: "دەستکاریی کاڵا", ar: "تعديل العنصر" },
  "Bill Details": { ku: "وردەکاریی وەسڵ", ar: "تفاصيل فاتورة الشراء" },
  "Enter phone number": { ku: "ژمارەی تەلەفۆن بنووسە", ar: "أدخل رقم الهاتف" },
  "Partially Paid": { ku: "بەشێکی دراوە", ar: "مدفوع جزئياً" },
  Home: { ku: "سەرەکی", ar: "الرئيسية" }, Items: { ku: "کاڵاکان", ar: "العناصر" }, Sales: { ku: "فرۆشتن", ar: "المبيعات" }, Purchases: { ku: "کڕین", ar: "المشتريات" }, Report: { ku: "ڕاپۆرت", ar: "التقرير" }, Reports: { ku: "ڕاپۆرتەکان", ar: "التقارير" },
  Invoices: { ku: "پسووڵەکان", ar: "الفواتير" }, Customers: { ku: "کڕیارەکان", ar: "العملاء" }, Vendors: { ku: "دابینکەرەکان", ar: "الموردون" }, Bills: { ku: "وەسڵەکان", ar: "فواتير الشراء" },
  Collapse: { ku: "داخستن", ar: "طي" }, Expand: { ku: "فراوانکردن", ar: "توسيع" }, "Collapse Sidebar": { ku: "داخستنی لاتەنیشت", ar: "طي الشريط الجانبي" }, "Expand Sidebar": { ku: "فراوانکردنی لاتەنیشت", ar: "توسيع الشريط الجانبي" },
  User: { ku: "بەکارهێنەر", ar: "المستخدم" }, Settings: { ku: "ڕێکخستنەکان", ar: "الإعدادات" }, "User Settings": { ku: "ڕێکخستنەکانی بەکارهێنەر", ar: "إعدادات المستخدم" }, "Open User Settings": { ku: "کردنەوەی ڕێکخستنەکانی بەکارهێنەر", ar: "فتح إعدادات المستخدم" }, "Close User Settings": { ku: "داخستنی ڕێکخستنەکانی بەکارهێنەر", ar: "إغلاق إعدادات المستخدم" },
  Language: { ku: "زمان", ar: "اللغة" }, English: { ku: "ئینگلیزی", ar: "الإنجليزية" }, Kurdish: { ku: "کوردی", ar: "الكردية" }, Arabic: { ku: "عەرەبی", ar: "العربية" }, "Log Out": { ku: "چوونەدەرەوە", ar: "تسجيل الخروج" },
  "Preparing your books workspace...": { ku: "ئامادەکردنی ژینگەی ژمێریاریت...", ar: "جارٍ تجهيز مساحة المحاسبة..." }, Email: { ku: "ئیمەیڵ", ar: "البريد الإلكتروني" }, Password: { ku: "وشەی نهێنی", ar: "كلمة المرور" }, "Log In": { ku: "چوونەژوورەوە", ar: "تسجيل الدخول" }, "Logging In": { ku: "چوونەژوورەوە", ar: "جارٍ تسجيل الدخول" }, "Unable to log in.": { ku: "نەتوانرا بچیتە ژوورەوە.", ar: "تعذر تسجيل الدخول." },
  "Financial Overview": { ku: "پوختەی دارایی", ar: "نظرة مالية" }, "Your financial overview, clearly presented.": { ku: "پوختەی داراییەکەت بە ڕوونی پیشان دراوە.", ar: "نظرتك المالية، معروضة بوضوح." }, Receivables: { ku: "قەرزە وەرگیراوەکان", ar: "الذمم المدينة" }, Payables: { ku: "قەرزە دراوەکان", ar: "الذمم الدائنة" }, "Total Unpaid Invoices": { ku: "کۆی فاکتورە نەدراوەکان", ar: "إجمالي الفواتير غير المدفوعة" }, "Total Unpaid Bills": { ku: "کۆی پسوڵە نەدراوەکان", ar: "إجمالي الفواتير المستحقة غير المدفوعة" }, Current: { ku: "ئێستا", ar: "الحالي" }, Overdue: { ku: "دواکەوتوو", ar: "متأخر" }, "View All": { ku: "بینینی هەموو", ar: "عرض الكل" },
  "Cash Flow": { ku: "ڕەوتی پارە", ar: "التدفق النقدي" }, Incoming: { ku: "هاتوو", ar: "الوارد" }, Outgoing: { ku: "دەرچوو", ar: "الصادر" }, "Incoming Cash": { ku: "پارەی هاتوو", ar: "النقد الداخل" }, "Outgoing Cash": { ku: "پارەی دەرچوو", ar: "النقد الخارج" }, "Income vs Expenses": { ku: "داهات بەرامبەر خەرجی", ar: "الدخل مقابل المصروفات" }, Income: { ku: "داهات", ar: "الدخل" }, Expenses: { ku: "خەرجییەکان", ar: "المصروفات" }, "Net Activity": { ku: "چالاکیی خاوێن", ar: "صافي النشاط" }, "Invoice Income": { ku: "داهاتی پسووڵە", ar: "دخل الفواتير" }, "Recorded Expenses": { ku: "خەرجییە تۆمارکراوەکان", ar: "المصروفات المسجلة" },
  "Cash received and paid by month": { ku: "پارەی وەرگیراو و دراو بە مانگ", ar: "النقد المقبوض والمدفوع شهرياً" }, "Invoices and bills recorded by month": { ku: "پسووڵە و وەسڵە تۆمارکراوەکان بە مانگ", ar: "الفواتير وفواتير الشراء المسجلة شهرياً" },
  "Good morning": { ku: "بەیانی باش", ar: "صباح الخير" }, "Good afternoon": { ku: "نیوەڕۆ باش", ar: "مساء الخير" }, "Good evening": { ku: "ئێوارە باش", ar: "مساء الخير" },
  "New Item": { ku: "کاڵای نوێ", ar: "عنصر جديد" }, "Save Item": { ku: "پاشەکەوتکردنی کاڵا", ar: "حفظ العنصر" }, "Item List": { ku: "لیستی کاڵاکان", ar: "قائمة العناصر" }, "Item Details": { ku: "وردەکاریی کاڵا", ar: "تفاصيل العنصر" }, "Basic Details": { ku: "وردەکاریی سەرەتایی", ar: "التفاصيل الأساسية" }, Name: { ku: "ناو", ar: "الاسم" }, Description: { ku: "وەسف", ar: "الوصف" }, SKU: { ku: "SKU", ar: "SKU" }, Unit: { ku: "یەکە", ar: "الوحدة" }, Quantity: { ku: "بڕ", ar: "الكمية" }, Rate: { ku: "نرخ", ar: "السعر" }, Amount: { ku: "بڕی پارە", ar: "المبلغ" }, Actions: { ku: "کردارەکان", ar: "الإجراءات" }, View: { ku: "بینین", ar: "عرض" }, Edit: { ku: "دەستکاری", ar: "تعديل" }, Delete: { ku: "سڕینەوە", ar: "حذف" }, Deleting: { ku: "سڕینەوە...", ar: "جارٍ الحذف" }, Cancel: { ku: "هەڵوەشاندنەوە", ar: "إلغاء" }, Close: { ku: "داخستن", ar: "إغلاق" }, Update: { ku: "نوێکردنەوە", ar: "تحديث" }, "Saving...": { ku: "پاشەکەوت دەکرێت...", ar: "جارٍ الحفظ..." }, Search: { ku: "گەڕان", ar: "بحث" }, Notes: { ku: "تێبینییەکان", ar: "ملاحظات" },
  "Sales Information": { ku: "زانیاریی فرۆشتن", ar: "معلومات المبيعات" }, "Purchase Information": { ku: "زانیاریی کڕین", ar: "معلومات المشتريات" }, "Sales Price": { ku: "نرخی فرۆشتن", ar: "سعر البيع" }, "Purchase Price": { ku: "نرخی کڕین", ar: "سعر الشراء" }, "Cost Price": { ku: "نرخی تێچوو", ar: "سعر التكلفة" }, Tax: { ku: "باج", ar: "الضريبة" }, "Select an option": { ku: "هەڵبژاردەیەک دیاری بکە", ar: "اختر خياراً" }, Exempt: { ku: "بێباج", ar: "معفى" }, "Standard Tax": { ku: "باجی ئاسایی", ar: "الضريبة القياسية" }, "Reduced Tax": { ku: "باجی کەمکراو", ar: "الضريبة المخفضة" }, "Out of Scope": { ku: "دەرەوەی بازنە", ar: "خارج النطاق" },
  "New Customer": { ku: "کڕیاری نوێ", ar: "عميل جديد" }, "Edit Customer": { ku: "دەستکاریی کڕیار", ar: "تعديل العميل" }, "Save Customer": { ku: "پاشەکەوتکردنی کڕیار", ar: "حفظ العميل" }, "Update Customer": { ku: "نوێکردنەوەی کڕیار", ar: "تحديث العميل" }, "Customer List": { ku: "لیستی کڕیارەکان", ar: "قائمة العملاء" }, "Customer Details": { ku: "وردەکاریی کڕیار", ar: "تفاصيل العميل" }, "New Vendor": { ku: "دابینکەری نوێ", ar: "مورد جديد" }, "Edit Vendor": { ku: "دەستکاریی دابینکەر", ar: "تعديل المورد" }, "Save Vendor": { ku: "پاشەکەوتکردنی دابینکەر", ar: "حفظ المورد" }, "Update Vendor": { ku: "نوێکردنەوەی دابینکەر", ar: "تحديث المورد" }, "Vendor List": { ku: "لیستی دابینکەرەکان", ar: "قائمة الموردين" }, "Vendor Details": { ku: "وردەکاریی دابینکەر", ar: "تفاصيل المورد" },
  Type: { ku: "جۆر", ar: "النوع" }, Business: { ku: "بازرگانی", ar: "شركة" }, Individual: { ku: "تاک", ar: "فرد" }, "Company Name": { ku: "ناوی کۆمپانیا", ar: "اسم الشركة" }, Contact: { ku: "پەیوەندی", ar: "الاتصال" }, "No phone": { ku: "تەلەفۆن نییە", ar: "لا يوجد هاتف" }, "Payment Terms": { ku: "مەرجەکانی پارەدان", ar: "شروط الدفع" }, "Search Items": { ku: "گەڕان بەدوای کاڵا", ar: "بحث العناصر" }, "Search Customers": { ku: "گەڕان بەدوای کڕیار", ar: "بحث العملاء" }, "Search Vendors": { ku: "گەڕان بەدوای دابینکەر", ar: "بحث الموردين" }, "Search Invoices": { ku: "گەڕان بەدوای پسووڵە", ar: "بحث الفواتير" }, "Search Bills": { ku: "گەڕان بەدوای وەسڵ", ar: "بحث فواتير الشراء" }, "Search items by any detail…": { ku: "گەڕان بەدوای کاڵا بە هەر وردەکارییەک…", ar: "ابحث عن العناصر بأي تفصيل…" }, "Search customers by any detail…": { ku: "گەڕان بەدوای کڕیار بە هەر وردەکارییەک…", ar: "ابحث عن العملاء بأي تفصيل…" }, "Search vendors by any detail…": { ku: "گەڕان بەدوای دابینکەر بە هەر وردەکارییەک…", ar: "ابحث عن الموردين بأي تفصيل…" }, "Search invoices by any detail…": { ku: "گەڕان بەدوای پسووڵە بە هەر وردەکارییەک…", ar: "ابحث عن الفواتير بأي تفصيل…" }, "Search bills by any detail…": { ku: "گەڕان بەدوای وەسڵ بە هەر وردەکارییەک…", ar: "ابحث عن فواتير الشراء بأي تفصيل…" }, "Discard unsaved changes?": { ku: "گۆڕانکارییە پاشەکەوت‌نەکراوەکان هەڵبوەشێنرێنەوە؟", ar: "هل تريد تجاهل التغييرات غير المحفوظة؟" },
  "Contact and Billing Details": { ku: "زانیاریی پەیوەندی و وەسڵ", ar: "بيانات الاتصال والفوترة" }, "First Name": { ku: "ناوی یەکەم", ar: "الاسم الأول" }, "Last Name": { ku: "ناوی کۆتایی", ar: "اسم العائلة" }, "Email Address": { ku: "ناونیشانی ئیمەیڵ", ar: "عنوان البريد الإلكتروني" }, Phone: { ku: "تەلەفۆن", ar: "الهاتف" }, "Billing Address": { ku: "ناونیشانی وەسڵ", ar: "عنوان الفوترة" }, "Address Line 1": { ku: "هێڵی ناونیشان ١", ar: "سطر العنوان 1" }, "Address Line 2": { ku: "هێڵی ناونیشان ٢", ar: "سطر العنوان 2" }, City: { ku: "شار", ar: "المدينة" }, "State / Province": { ku: "پارێزگا / هەرێم", ar: "المحافظة / المنطقة" }, "Postal Code": { ku: "کۆدی پۆست", ar: "الرمز البريدي" }, Country: { ku: "وڵات", ar: "البلد" }, Location: { ku: "شوێن", ar: "الموقع" }, "Purchase Settings": { ku: "ڕێکخستنەکانی کڕین", ar: "إعدادات الشراء" }, "Sales Settings": { ku: "ڕێکخستنەکانی فرۆشتن", ar: "إعدادات المبيعات" }, "Default Payment Terms": { ku: "مەرجی بنەڕەتیی پارەدان", ar: "شروط الدفع الافتراضية" },
  "Street and building": { ku: "شەقام و بینا", ar: "الشارع والمبنى" }, "Suite, floor, or landmark": { ku: "ژوور، نهۆم، یان نیشانە", ar: "الجناح أو الطابق أو علامة مميزة" }, "Notes for internal use": { ku: "تێبینی بۆ بەکارهێنانی ناوخۆیی", ar: "ملاحظات للاستخدام الداخلي" },
  "New Invoice": { ku: "پسووڵەی نوێ", ar: "فاتورة جديدة" }, "Edit Invoice": { ku: "دەستکاریی پسووڵە", ar: "تعديل الفاتورة" }, "Save Invoice": { ku: "پاشەکەوتکردنی پسووڵە", ar: "حفظ الفاتورة" }, "Update Invoice": { ku: "نوێکردنەوەی پسووڵە", ar: "تحديث الفاتورة" }, "Saved Invoices": { ku: "پسووڵە پاشەکەوتکراوەکان", ar: "الفواتير المحفوظة" }, Invoice: { ku: "پسووڵە", ar: "الفاتورة" }, "Invoice Number": { ku: "ژمارەی پسووڵە", ar: "رقم الفاتورة" }, Customer: { ku: "کڕیار", ar: "العميل" }, "Invoice Date": { ku: "بەرواری پسووڵە", ar: "تاريخ الفاتورة" }, "Due Date": { ku: "بەرواری دان", ar: "تاريخ الاستحقاق" }, Status: { ku: "دۆخ", ar: "الحالة" }, Total: { ku: "کۆ", ar: "الإجمالي" }, Subtotal: { ku: "کۆی لاوەکی", ar: "المجموع الفرعي" }, Discount: { ku: "داشکاندن", ar: "الخصم" }, Paid: { ku: "دراوە", ar: "مدفوع" }, Unpaid: { ku: "نەدراوە", ar: "غير مدفوع" }, "Record Payment": { ku: "تۆمارکردنی پارەدان", ar: "تسجيل دفعة" }, "Payment Date": { ku: "بەرواری پارەدان", ar: "تاريخ الدفع" }, "Save Payment": { ku: "پاشەکەوتکردنی پارەدان", ar: "حفظ الدفعة" }, "Add Line": { ku: "زیادکردنی هێڵ", ar: "إضافة سطر" },
  "Customer and Billing Details": { ku: "وردەکاریی کڕیار و وەسڵ", ar: "تفاصيل العميل والفوترة" }, "Vendor and Billing Details": { ku: "وردەکاریی دابینکەر و وەسڵ", ar: "تفاصيل المورد والفوترة" }, "Select a customer": { ku: "کڕیارێک هەڵبژێرە", ar: "اختر عميلاً" }, "Invoice Details": { ku: "وردەکاریی پسووڵە", ar: "تفاصيل الفاتورة" }, "Payment Schedule": { ku: "خشتەی پارەدان", ar: "جدول الدفع" }, Terms: { ku: "مەرجەکان", ar: "الشروط" }, "Due on Receipt": { ku: "لە کاتی وەرگرتن", ar: "مستحق عند الاستلام" }, "Item Table": { ku: "خشتەی کاڵاکان", ar: "جدول العناصر" }, Item: { ku: "کاڵا", ar: "العنصر" }, "Select an item": { ku: "کاڵایەک هەڵبژێرە", ar: "اختر عنصراً" }, "Select a tax": { ku: "باجێک هەڵبژێرە", ar: "اختر ضريبة" }, "Remove Line": { ku: "سڕینەوەی هێڵ", ar: "حذف السطر" }, "+ Add New Row": { ku: "+ زیادکردنی ڕیزی نوێ", ar: "+ إضافة صف جديد" }, "Add New Row": { ku: "زیادکردنی ڕیزی نوێ", ar: "إضافة صف جديد" }, "Customer Notes": { ku: "تێبینییەکانی کڕیار", ar: "ملاحظات العميل" }, "Thanks for your business.": { ku: "سوپاس بۆ مامەڵەکەتان.", ar: "شكراً لتعاملكم معنا." }, "Displayed on the invoice": { ku: "لەسەر پسووڵەکە پیشان دەدرێت", ar: "يظهر على الفاتورة" },
  "New Bill": { ku: "وەسڵی نوێ", ar: "فاتورة شراء جديدة" }, "Edit Bill": { ku: "دەستکاریی وەسڵ", ar: "تعديل فاتورة الشراء" }, "Save Bill": { ku: "پاشەکەوتکردنی وەسڵ", ar: "حفظ فاتورة الشراء" }, "Update Bill": { ku: "نوێکردنەوەی وەسڵ", ar: "تحديث فاتورة الشراء" }, "Saved Bills": { ku: "وەسڵە پاشەکەوتکراوەکان", ar: "فواتير الشراء المحفوظة" }, Bill: { ku: "وەسڵ", ar: "فاتورة الشراء" }, "Bill Number": { ku: "ژمارەی وەسڵ", ar: "رقم فاتورة الشراء" }, Vendor: { ku: "دابینکەر", ar: "المورد" }, "Bill Date": { ku: "بەرواری وەسڵ", ar: "تاريخ فاتورة الشراء" }, "Pay Bill": { ku: "دانی وەسڵ", ar: "دفع فاتورة الشراء" },
  "Sales Report": { ku: "ڕاپۆرتی فرۆشتن", ar: "تقرير المبيعات" }, "Purchases Report": { ku: "ڕاپۆرتی کڕین", ar: "تقرير المشتريات" }, "Customers Report": { ku: "ڕاپۆرتی کڕیاران", ar: "تقرير العملاء" }, "Vendors Report": { ku: "ڕاپۆرتی دابینکەران", ar: "تقرير الموردين" }, "Profit & Loss": { ku: "قازانج و زیان", ar: "الأرباح والخسائر" }, "Generate Report": { ku: "دروستکردنی ڕاپۆرت", ar: "إنشاء التقرير" }, "Export PDF": { ku: "هەناردەکردنی PDF", ar: "تصدير PDF" }, From: { ku: "لە", ar: "من" }, To: { ku: "بۆ", ar: "إلى" }, Outstanding: { ku: "ماوە", ar: "المستحق" }, "Net Profit": { ku: "قازانجی خاوێن", ar: "صافي الربح" }, Transactions: { ku: "مامەڵەکان", ar: "المعاملات" }, Category: { ku: "پۆل", ar: "الفئة" },
  "No saved invoices yet.": { ku: "هێشتا هیچ پسووڵەیەک پاشەکەوت نەکراوە.", ar: "لا توجد فواتير محفوظة بعد." }, "No saved bills yet.": { ku: "هێشتا هیچ وەسڵێک پاشەکەوت نەکراوە.", ar: "لا توجد فواتير شراء محفوظة بعد." }, "No customers yet.": { ku: "هێشتا هیچ کڕیارێک نییە.", ar: "لا يوجد عملاء بعد." }, "No vendors yet.": { ku: "هێشتا هیچ دابینکەرێک نییە.", ar: "لا يوجد موردون بعد." }, "No items yet.": { ku: "هێشتا هیچ کاڵایەک نییە.", ar: "لا توجد عناصر بعد." }, "No items match your search.": { ku: "هیچ کاڵایەک لەگەڵ گەڕانەکەت یەک ناگرێتەوە.", ar: "لا توجد عناصر تطابق بحثك." }, "No customers match your search.": { ku: "هیچ کڕیارێک لەگەڵ گەڕانەکەت یەک ناگرێتەوە.", ar: "لا يوجد عملاء يطابقون بحثك." }, "No vendors match your search.": { ku: "هیچ دابینکەرێک لەگەڵ گەڕانەکەت یەک ناگرێتەوە.", ar: "لا يوجد موردون يطابقون بحثك." }, "No invoices match your search.": { ku: "هیچ پسووڵەیەک لەگەڵ گەڕانەکەت یەک ناگرێتەوە.", ar: "لا توجد فواتير تطابق بحثك." }, "No bills match your search.": { ku: "هیچ وەسڵێک لەگەڵ گەڕانەکەت یەک ناگرێتەوە.", ar: "لا توجد فواتير شراء تطابق بحثك." },
};

const dynamicTranslate = (value: string, language: Exclude<Language, "en">) => {
  const direct = translations[value]?.[language];
  if (direct) return direct;
  const greeting = value.match(/^(Good morning|Good afternoon|Good evening), (.+)$/);
  if (greeting) return `${translations[greeting[1]]?.[language] ?? greeting[1]}، ${greeting[2]}`;
  const filteredCount = value.match(/^(\d+) of (\d+) (items|customers|vendors|invoices|bills)$/);
  if (filteredCount) {
    const nouns = language === "ku" ? { items: "کاڵا", customers: "کڕیار", vendors: "دابینکەر", invoices: "پسووڵە", bills: "وەسڵ" } : { items: "عنصر", customers: "عميل", vendors: "مورد", invoices: "فاتورة", bills: "فاتورة شراء" };
    return language === "ku" ? `${filteredCount[1]} لە ${filteredCount[2]} ${nouns[filteredCount[3] as keyof typeof nouns]}` : `${filteredCount[1]} من ${filteredCount[2]} ${nouns[filteredCount[3] as keyof typeof nouns]}`;
  }
  const count = value.match(/^(\d+) (item|customer|vendor|invoice|bill)s?$/);
  if (count) {
    const nouns = language === "ku" ? { item: "کاڵا", customer: "کڕیار", vendor: "دابینکەر", invoice: "پسووڵە", bill: "وەسڵ" } : { item: "عنصر", customer: "عميل", vendor: "مورد", invoice: "فاتورة", bill: "فاتورة شراء" };
    return `${count[1]} ${nouns[count[2] as keyof typeof nouns]}`;
  }
  const period = value.match(/^(.+) · (\d{4})$/);
  if (period) return `${translations[period[1]]?.[language] ?? period[1]} · ${period[2]}`;
  const lineCount = value.match(/^(\d+) line item$/);
  if (lineCount) return language === "ku" ? `${lineCount[1]} هێڵی کاڵا` : `${lineCount[1]} بند`;
  const months: Record<string, { ku: string; ar: string }> = { Jan: { ku: "کانوونی دووەم", ar: "يناير" }, Feb: { ku: "شوبات", ar: "فبراير" }, Mar: { ku: "ئازار", ar: "مارس" }, Apr: { ku: "نیسان", ar: "أبريل" }, May: { ku: "ئایار", ar: "مايو" }, Jun: { ku: "حوزەیران", ar: "يونيو" }, Jul: { ku: "تەممووز", ar: "يوليو" }, Aug: { ku: "ئاب", ar: "أغسطس" }, Sep: { ku: "ئەیلوول", ar: "سبتمبر" }, Oct: { ku: "تشرینی یەکەم", ar: "أكتوبر" }, Nov: { ku: "تشرینی دووەم", ar: "نوفمبر" }, Dec: { ku: "کانوونی یەکەم", ar: "ديسمبر" } };
  if (months[value]) return months[value][language];
  return value;
};

type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; t: (value: string) => string };
const LanguageContext = createContext<LanguageContextValue | null>(null);
const sourceText = new WeakMap<Text, string>();
const sourceAttributes = new WeakMap<Element, Map<string, string>>();

const translateTextNode = (node: Text, language: Language, sourceLanguage: Language = language) => {
  const parent = node.parentElement;
  if (!parent || ["SCRIPT", "STYLE"].includes(parent.tagName)) return;
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
