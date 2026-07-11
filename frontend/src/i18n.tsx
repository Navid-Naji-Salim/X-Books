import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type Language = "en" | "ku" | "ar";

const translations: Record<string, { ku: string; ar: string }> = {
  Home: { ku: "سەرەکی", ar: "الرئيسية" }, Items: { ku: "کاڵاکان", ar: "العناصر" }, Sales: { ku: "فرۆشتن", ar: "المبيعات" }, Purchases: { ku: "کڕین", ar: "المشتريات" }, Reports: { ku: "ڕاپۆرتەکان", ar: "التقارير" },
  Invoices: { ku: "پسووڵەکان", ar: "الفواتير" }, Customers: { ku: "کڕیارەکان", ar: "العملاء" }, Vendors: { ku: "دابینکەرەکان", ar: "الموردون" }, Bills: { ku: "وەسڵەکان", ar: "فواتير الشراء" },
  Collapse: { ku: "داخستن", ar: "طي" }, Expand: { ku: "فراوانکردن", ar: "توسيع" }, "Collapse sidebar": { ku: "داخستنی لاتەنیشت", ar: "طي الشريط الجانبي" }, "Expand sidebar": { ku: "فراوانکردنی لاتەنیشت", ar: "توسيع الشريط الجانبي" },
  Admin: { ku: "بەڕێوەبەر", ar: "المشرف" }, Administrator: { ku: "بەڕێوەبەر", ar: "المسؤول" }, "Open admin settings": { ku: "کردنەوەی ڕێکخستنەکان", ar: "فتح إعدادات المشرف" },
  Language: { ku: "زمان", ar: "اللغة" }, English: { ku: "ئینگلیزی", ar: "الإنجليزية" }, Kurdish: { ku: "کوردی", ar: "الكردية" }, Arabic: { ku: "عەرەبی", ar: "العربية" }, "Log out": { ku: "چوونەدەرەوە", ar: "تسجيل الخروج" },
  "Preparing your books workspace...": { ku: "ئامادەکردنی ژینگەی ژمێریاریت...", ar: "جارٍ تجهيز مساحة المحاسبة..." }, Email: { ku: "ئیمەیڵ", ar: "البريد الإلكتروني" }, Password: { ku: "وشەی نهێنی", ar: "كلمة المرور" }, "Log in": { ku: "چوونەژوورەوە", ar: "تسجيل الدخول" }, "Logging in": { ku: "چوونەژوورەوە", ar: "جارٍ تسجيل الدخول" }, "Unable to log in.": { ku: "نەتوانرا بچیتە ژوورەوە.", ar: "تعذر تسجيل الدخول." },
  "Financial overview": { ku: "پوختەی دارایی", ar: "نظرة مالية" }, "Your financial overview, clearly presented.": { ku: "پوختەی داراییەکەت بە ڕوونی پیشان دراوە.", ar: "نظرتك المالية، معروضة بوضوح." }, Receivables: { ku: "قەرزە وەرگیراوەکان", ar: "الذمم المدينة" }, Payables: { ku: "قەرزە دراوەکان", ar: "الذمم الدائنة" }, "Total outstanding": { ku: "کۆی ماوە", ar: "إجمالي المستحق" }, Current: { ku: "ئێستا", ar: "الحالي" }, Overdue: { ku: "دواکەوتوو", ar: "متأخر" }, "Nothing outstanding.": { ku: "هیچ بڕێک نەماوە.", ar: "لا توجد مبالغ مستحقة." }, "View all": { ku: "بینینی هەموو", ar: "عرض الكل" }, Due: { ku: "کاتی دان", ar: "مستحق" },
  "Cash flow": { ku: "ڕەوتی پارە", ar: "التدفق النقدي" }, "Incoming cash": { ku: "پارەی هاتوو", ar: "النقد الداخل" }, "Outgoing cash": { ku: "پارەی دەرچوو", ar: "النقد الخارج" }, "Income vs expenses": { ku: "داهات بەرامبەر خەرجی", ar: "الدخل مقابل المصروفات" }, Income: { ku: "داهات", ar: "الدخل" }, Expenses: { ku: "خەرجییەکان", ar: "المصروفات" }, "Net activity": { ku: "چالاکیی خاوێن", ar: "صافي النشاط" }, "Invoice income": { ku: "داهاتی پسووڵە", ar: "دخل الفواتير" }, "Recorded expenses": { ku: "خەرجییە تۆمارکراوەکان", ar: "المصروفات المسجلة" },
  "Cash received and paid by month": { ku: "پارەی وەرگیراو و دراو بە مانگ", ar: "النقد المقبوض والمدفوع شهرياً" }, "Invoices and bills recorded by month": { ku: "پسووڵە و وەسڵە تۆمارکراوەکان بە مانگ", ar: "الفواتير وفواتير الشراء المسجلة شهرياً" },
  "Good morning": { ku: "بەیانی باش", ar: "صباح الخير" }, "Good afternoon": { ku: "نیوەڕۆ باش", ar: "مساء الخير" }, "Good evening": { ku: "ئێوارە باش", ar: "مساء الخير" },
  "New item": { ku: "کاڵای نوێ", ar: "عنصر جديد" }, "Save item": { ku: "پاشەکەوتکردنی کاڵا", ar: "حفظ العنصر" }, "Item list": { ku: "لیستی کاڵاکان", ar: "قائمة العناصر" }, "Item details": { ku: "وردەکاریی کاڵا", ar: "تفاصيل العنصر" }, "Basic details": { ku: "وردەکاریی سەرەتایی", ar: "التفاصيل الأساسية" }, Name: { ku: "ناو", ar: "الاسم" }, Description: { ku: "وەسف", ar: "الوصف" }, SKU: { ku: "SKU", ar: "SKU" }, Unit: { ku: "یەکە", ar: "الوحدة" }, Quantity: { ku: "بڕ", ar: "الكمية" }, Rate: { ku: "نرخ", ar: "السعر" }, Amount: { ku: "بڕی پارە", ar: "المبلغ" }, Actions: { ku: "کردارەکان", ar: "الإجراءات" }, Edit: { ku: "دەستکاری", ar: "تعديل" }, Delete: { ku: "سڕینەوە", ar: "حذف" }, Deleting: { ku: "سڕینەوە...", ar: "جارٍ الحذف" }, Cancel: { ku: "هەڵوەشاندنەوە", ar: "إلغاء" }, Update: { ku: "نوێکردنەوە", ar: "تحديث" }, Search: { ku: "گەڕان", ar: "بحث" }, Notes: { ku: "تێبینییەکان", ar: "ملاحظات" },
  "Sales information": { ku: "زانیاریی فرۆشتن", ar: "معلومات المبيعات" }, "Purchase information": { ku: "زانیاریی کڕین", ar: "معلومات المشتريات" }, "Sales price": { ku: "نرخی فرۆشتن", ar: "سعر البيع" }, "Purchase price": { ku: "نرخی کڕین", ar: "سعر الشراء" }, "Cost price": { ku: "نرخی تێچوو", ar: "سعر التكلفة" }, Tax: { ku: "باج", ar: "الضريبة" }, "Select an option": { ku: "هەڵبژاردەیەک دیاری بکە", ar: "اختر خياراً" }, Exempt: { ku: "بێباج", ar: "معفى" }, "Standard Tax": { ku: "باجی ئاسایی", ar: "الضريبة القياسية" }, "Reduced Tax": { ku: "باجی کەمکراو", ar: "الضريبة المخفضة" }, "Out of Scope": { ku: "دەرەوەی بازنە", ar: "خارج النطاق" },
  "New customer": { ku: "کڕیاری نوێ", ar: "عميل جديد" }, "Edit customer": { ku: "دەستکاریی کڕیار", ar: "تعديل العميل" }, "Save customer": { ku: "پاشەکەوتکردنی کڕیار", ar: "حفظ العميل" }, "Update customer": { ku: "نوێکردنەوەی کڕیار", ar: "تحديث العميل" }, "Customer list": { ku: "لیستی کڕیارەکان", ar: "قائمة العملاء" }, "Customer details": { ku: "وردەکاریی کڕیار", ar: "تفاصيل العميل" }, "New vendor": { ku: "دابینکەری نوێ", ar: "مورد جديد" }, "Edit vendor": { ku: "دەستکاریی دابینکەر", ar: "تعديل المورد" }, "Save vendor": { ku: "پاشەکەوتکردنی دابینکەر", ar: "حفظ المورد" }, "Update vendor": { ku: "نوێکردنەوەی دابینکەر", ar: "تحديث المورد" }, "Vendor list": { ku: "لیستی دابینکەرەکان", ar: "قائمة الموردين" }, "Vendor details": { ku: "وردەکاریی دابینکەر", ar: "تفاصيل المورد" },
  Type: { ku: "جۆر", ar: "النوع" }, Business: { ku: "بازرگانی", ar: "شركة" }, Individual: { ku: "تاک", ar: "فرد" }, "Company name": { ku: "ناوی کۆمپانیا", ar: "اسم الشركة" }, Contact: { ku: "پەیوەندی", ar: "الاتصال" }, "No phone": { ku: "تەلەفۆن نییە", ar: "لا يوجد هاتف" }, "Payment terms": { ku: "مەرجەکانی پارەدان", ar: "شروط الدفع" }, "Search customers": { ku: "گەڕان بەدوای کڕیار", ar: "بحث العملاء" }, "Search vendors": { ku: "گەڕان بەدوای دابینکەر", ar: "بحث الموردين" },
  "Contact and billing details": { ku: "زانیاریی پەیوەندی و وەسڵ", ar: "بيانات الاتصال والفوترة" }, "Email address": { ku: "ناونیشانی ئیمەیڵ", ar: "عنوان البريد الإلكتروني" }, Phone: { ku: "تەلەفۆن", ar: "الهاتف" }, "Billing address": { ku: "ناونیشانی وەسڵ", ar: "عنوان الفوترة" }, "Address line 1": { ku: "هێڵی ناونیشان ١", ar: "سطر العنوان 1" }, "Address line 2": { ku: "هێڵی ناونیشان ٢", ar: "سطر العنوان 2" }, City: { ku: "شار", ar: "المدينة" }, "State / province": { ku: "پارێزگا / هەرێم", ar: "المحافظة / المنطقة" }, "Postal code": { ku: "کۆدی پۆست", ar: "الرمز البريدي" }, Country: { ku: "وڵات", ar: "البلد" }, Location: { ku: "شوێن", ar: "الموقع" }, "Purchase settings": { ku: "ڕێکخستنەکانی کڕین", ar: "إعدادات الشراء" }, "Sales settings": { ku: "ڕێکخستنەکانی فرۆشتن", ar: "إعدادات المبيعات" }, "Default payment terms": { ku: "مەرجی بنەڕەتیی پارەدان", ar: "شروط الدفع الافتراضية" },
  "Street and building": { ku: "شەقام و بینا", ar: "الشارع والمبنى" }, "Suite, floor, or landmark": { ku: "ژوور، نهۆم، یان نیشانە", ar: "الجناح أو الطابق أو علامة مميزة" }, "Internal context about this customer": { ku: "تێبینیی ناوخۆیی دەربارەی کڕیار", ar: "ملاحظات داخلية عن العميل" }, "Internal context about this vendor": { ku: "تێبینیی ناوخۆیی دەربارەی دابینکەر", ar: "ملاحظات داخلية عن المورد" },
  "New invoice": { ku: "پسووڵەی نوێ", ar: "فاتورة جديدة" }, "Edit invoice": { ku: "دەستکاریی پسووڵە", ar: "تعديل الفاتورة" }, "Save invoice": { ku: "پاشەکەوتکردنی پسووڵە", ar: "حفظ الفاتورة" }, "Update invoice": { ku: "نوێکردنەوەی پسووڵە", ar: "تحديث الفاتورة" }, "Saved invoices": { ku: "پسووڵە پاشەکەوتکراوەکان", ar: "الفواتير المحفوظة" }, Invoice: { ku: "پسووڵە", ar: "الفاتورة" }, "Invoice number": { ku: "ژمارەی پسووڵە", ar: "رقم الفاتورة" }, Customer: { ku: "کڕیار", ar: "العميل" }, "Invoice date": { ku: "بەرواری پسووڵە", ar: "تاريخ الفاتورة" }, "Due date": { ku: "بەرواری دان", ar: "تاريخ الاستحقاق" }, Status: { ku: "دۆخ", ar: "الحالة" }, Total: { ku: "کۆ", ar: "الإجمالي" }, Subtotal: { ku: "کۆی لاوەکی", ar: "المجموع الفرعي" }, Discount: { ku: "داشکاندن", ar: "الخصم" }, Paid: { ku: "دراوە", ar: "مدفوع" }, Unpaid: { ku: "نەدراوە", ar: "غير مدفوع" }, "Record payment": { ku: "تۆمارکردنی پارەدان", ar: "تسجيل دفعة" }, "Payment date": { ku: "بەرواری پارەدان", ar: "تاريخ الدفع" }, "Save payment": { ku: "پاشەکەوتکردنی پارەدان", ar: "حفظ الدفعة" }, "Add line": { ku: "زیادکردنی هێڵ", ar: "إضافة سطر" },
  "Customer and billing details": { ku: "وردەکاریی کڕیار و وەسڵ", ar: "تفاصيل العميل والفوترة" }, "Select a customer": { ku: "کڕیارێک هەڵبژێرە", ar: "اختر عميلاً" }, "Invoice details": { ku: "وردەکاریی پسووڵە", ar: "تفاصيل الفاتورة" }, "Payment schedule": { ku: "خشتەی پارەدان", ar: "جدول الدفع" }, Terms: { ku: "مەرجەکان", ar: "الشروط" }, "Due on Receipt": { ku: "لە کاتی وەرگرتن", ar: "مستحق عند الاستلام" }, "Item table": { ku: "خشتەی کاڵاکان", ar: "جدول العناصر" }, Item: { ku: "کاڵا", ar: "العنصر" }, "Select an item": { ku: "کاڵایەک هەڵبژێرە", ar: "اختر عنصراً" }, "Select a tax": { ku: "باجێک هەڵبژێرە", ar: "اختر ضريبة" }, "Remove line": { ku: "سڕینەوەی هێڵ", ar: "حذف السطر" }, "+ Add new row": { ku: "+ زیادکردنی ڕیزی نوێ", ar: "+ إضافة صف جديد" }, "Customer notes": { ku: "تێبینییەکانی کڕیار", ar: "ملاحظات العميل" }, "Thanks for your business.": { ku: "سوپاس بۆ مامەڵەکەتان.", ar: "شكراً لتعاملكم معنا." }, "Displayed on the invoice": { ku: "لەسەر پسووڵەکە پیشان دەدرێت", ar: "يظهر على الفاتورة" },
  "New bill": { ku: "وەسڵی نوێ", ar: "فاتورة شراء جديدة" }, "Edit bill": { ku: "دەستکاریی وەسڵ", ar: "تعديل فاتورة الشراء" }, "Save bill": { ku: "پاشەکەوتکردنی وەسڵ", ar: "حفظ فاتورة الشراء" }, "Update bill": { ku: "نوێکردنەوەی وەسڵ", ar: "تحديث فاتورة الشراء" }, "Saved bills": { ku: "وەسڵە پاشەکەوتکراوەکان", ar: "فواتير الشراء المحفوظة" }, Bill: { ku: "وەسڵ", ar: "فاتورة الشراء" }, "Bill number": { ku: "ژمارەی وەسڵ", ar: "رقم فاتورة الشراء" }, Vendor: { ku: "دابینکەر", ar: "المورد" }, "Bill date": { ku: "بەرواری وەسڵ", ar: "تاريخ فاتورة الشراء" }, "Pay bill": { ku: "دانی وەسڵ", ar: "دفع فاتورة الشراء" },
  "Generated reports.": { ku: "ڕاپۆرتە دروستکراوەکان.", ar: "التقارير المنشأة." }, "View report": { ku: "بینینی ڕاپۆرت", ar: "عرض التقرير" }, "Sales Report": { ku: "ڕاپۆرتی فرۆشتن", ar: "تقرير المبيعات" }, "Purchases Report": { ku: "ڕاپۆرتی کڕین", ar: "تقرير المشتريات" }, "Customers Report": { ku: "ڕاپۆرتی کڕیاران", ar: "تقرير العملاء" }, "Vendors Report": { ku: "ڕاپۆرتی دابینکەران", ar: "تقرير الموردين" }, "Profit & Loss": { ku: "قازانج و زیان", ar: "الأرباح والخسائر" }, "Generate report": { ku: "دروستکردنی ڕاپۆرت", ar: "إنشاء التقرير" }, "Export PDF": { ku: "هەناردەکردنی PDF", ar: "تصدير PDF" }, From: { ku: "لە", ar: "من" }, To: { ku: "بۆ", ar: "إلى" }, Outstanding: { ku: "ماوە", ar: "المستحق" }, "Net profit": { ku: "قازانجی خاوێن", ar: "صافي الربح" }, Transactions: { ku: "مامەڵەکان", ar: "المعاملات" }, Category: { ku: "پۆل", ar: "الفئة" },
  "No saved invoices yet.": { ku: "هێشتا هیچ پسووڵەیەک پاشەکەوت نەکراوە.", ar: "لا توجد فواتير محفوظة بعد." }, "No saved bills yet.": { ku: "هێشتا هیچ وەسڵێک پاشەکەوت نەکراوە.", ar: "لا توجد فواتير شراء محفوظة بعد." }, "No customers yet.": { ku: "هێشتا هیچ کڕیارێک نییە.", ar: "لا يوجد عملاء بعد." }, "No vendors yet.": { ku: "هێشتا هیچ دابینکەرێک نییە.", ar: "لا يوجد موردون بعد." }, "No items yet.": { ku: "هێشتا هیچ کاڵایەک نییە.", ar: "لا توجد عناصر بعد." },
};

const dynamicTranslate = (value: string, language: Exclude<Language, "en">) => {
  const direct = translations[value]?.[language];
  if (direct) return direct;
  const greeting = value.match(/^(Good morning|Good afternoon|Good evening), (.+)$/);
  if (greeting) return `${translations[greeting[1]]?.[language] ?? greeting[1]}، ${greeting[2]}`;
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

const translateDocument = (language: Language, sourceLanguage: Language = language) => {
  document.documentElement.lang = language === "ku" ? "ckb" : language;
  document.documentElement.dir = language === "en" ? "ltr" : "rtl";
  document.body.classList.toggle("is-rtl", language !== "en");
  const root = document.getElementById("root");
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    const parent = node.parentElement;
    if (parent && !["SCRIPT", "STYLE"].includes(parent.tagName)) {
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
    }
    node = walker.nextNode() as Text | null;
  }
  root.querySelectorAll("[placeholder], [aria-label], [title]").forEach((element) => {
    const originals = sourceAttributes.get(element) ?? new Map<string, string>();
    ["placeholder", "aria-label", "title"].forEach((attribute) => {
      const current = element.getAttribute(attribute);
      if (current !== null && !originals.has(attribute)) originals.set(attribute, current);
      const original = originals.get(attribute);
      if (original) element.setAttribute(attribute, language === "en" ? original : dynamicTranslate(original, language));
    });
    sourceAttributes.set(element, originals);
  });
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("xbooksLanguage");
    return saved === "ku" || saved === "ar" ? saved : "en";
  });
  const previousLanguage = useRef<Language>(language);
  const setLanguage = (next: Language) => { localStorage.setItem("xbooksLanguage", next); setLanguageState(next); };
  useEffect(() => {
    translateDocument(language, previousLanguage.current);
    previousLanguage.current = language;
    const observer = new MutationObserver(() => translateDocument(language));
    observer.observe(document.getElementById("root") ?? document.body, { childList: true, subtree: true, characterData: true });
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
