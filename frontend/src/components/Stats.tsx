import { currency } from "../lib/format";
type StatsSummary = { itemCount: number; customerCount: number; vendorCount: number; inventoryValue: number };

export const Stats = ({ summary }: { summary: StatsSummary }) => (
  <section className="stats-grid">
    <div className="stat-card">
      <span>Items</span>
      <strong>{summary.itemCount}</strong>
    </div>
    <div className="stat-card">
      <span>Customers</span>
      <strong>{summary.customerCount}</strong>
    </div>
    <div className="stat-card">
      <span>Vendors</span>
      <strong>{summary.vendorCount}</strong>
    </div>
    <div className="stat-card">
      <span>Inventory Value</span>
      <strong>{currency.format(summary.inventoryValue)}</strong>
    </div>
  </section>
);
