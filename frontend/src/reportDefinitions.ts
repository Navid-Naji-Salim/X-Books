export const reports = [
  { id: "profit-loss", title: "Profit & Loss", description: "Compare invoiced sales with recorded purchases and review net profit." },
  { id: "sales", title: "Sales Report", description: "Review invoice totals, payment status, customers, and sales activity." },
  { id: "purchases", title: "Purchases Report", description: "Review bill totals, payment status, vendors, and purchase activity." },
  { id: "customers", title: "Customers Report", description: "See customer activity, invoiced totals, and outstanding balances." },
  { id: "vendors", title: "Vendors Report", description: "See vendor activity, billed totals, and outstanding balances." },
] as const;

export const reportNavigationItems = reports.map((report) => ({
  label: report.title,
  to: `/reports/${report.id}`,
}));
