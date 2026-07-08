import { useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { api } from "./api";
import { Sidebar } from "./layout/Sidebar";
import { BillsPage } from "./pages/BillsPage";
import { CustomersPage } from "./pages/CustomersPage";
import { HomePage } from "./pages/HomePage";
import { ItemsPage } from "./pages/ItemsPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { LoginPage } from "./pages/LoginPage";
import { ReportsPage } from "./pages/ReportsPage";
import { VendorsPage } from "./pages/VendorsPage";
import type { Admin, Bill, Contact, Invoice, Item, Summary } from "./types";

type AppData = {
  summary: Summary;
  items: Item[];
  customers: Contact[];
  vendors: Contact[];
  invoices: Invoice[];
  bills: Bill[];
  nextBillNumber: string;
};

const emptySummary: Summary = {
  activeItemCount: 0,
  customerCount: 0,
  inventoryValue: 0,
  itemCount: 0,
  vendorCount: 0,
};

const emptyData: AppData = {
  summary: emptySummary,
  items: [],
  customers: [],
  vendors: [],
  invoices: [],
  bills: [],
  nextBillNumber: "BILL-0001",
};

export const App = () => {
  const [token, setToken] = useState(() => localStorage.getItem("adminToken"));
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [data, setData] = useState<AppData>(emptyData);
  const [booting, setBooting] = useState(true);
  const [dataError, setDataError] = useState("");

  const logout = () => {
    localStorage.removeItem("adminToken");
    setToken(null);
    setAdmin(null);
    setData(emptyData);
    setDataError("");
  };

  const loadData = async (activeToken: string) => {
    setDataError("");
    const [summary, items, customers, vendors, invoices, bills, nextBill] = await Promise.all([
      api.summary(activeToken),
      api.items(activeToken),
      api.customers(activeToken),
      api.vendors(activeToken),
      api.invoices(activeToken),
      api.bills(activeToken),
      api.nextBillNumber(activeToken),
    ]);

    setData({ summary, items, customers, vendors, invoices, bills, nextBillNumber: nextBill.billNumber });
  };

  useEffect(() => {
    if (!token) {
      setBooting(false);
      return;
    }

    let isCurrent = true;
    const boot = async () => {
      try {
        const response = await api.me(token);
        if (!isCurrent) {
          return;
        }

        setAdmin(response.admin);
        await loadData(token).catch(() => {
          setDataError("Some workspace data could not be loaded. Try refreshing in a moment.");
        });
      } catch {
        if (isCurrent) {
          logout();
        }
      } finally {
        if (isCurrent) {
          setBooting(false);
        }
      }
    };

    void boot();
    return () => {
      isCurrent = false;
    };
  }, [token]);

  if (booting) {
    return <div className="loading-screen">Preparing your books workspace...</div>;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <LoginRoute
            admin={admin}
            loadData={loadData}
            setAdmin={setAdmin}
            setToken={setToken}
            token={token}
          />
        }
      />
      <Route
        element={
          <ProtectedLayout
            admin={admin}
            onLogout={logout}
            token={token}
          />
        }
      >
        <Route index element={<HomePage admin={admin!} bills={data.bills} customers={data.customers} invoices={data.invoices} items={data.items} summary={data.summary} vendors={data.vendors} onRefresh={() => (token ? loadData(token) : Promise.resolve())} />} />
        <Route
          path="items"
          element={
            <ItemsPage
              dataError={dataError}
              items={data.items}
              token={token ?? ""}
              vendors={data.vendors}
              onRefresh={() => (token ? loadData(token) : Promise.resolve())}
            />
          }
        />
        <Route
          path="sales/invoices"
          element={
            <InvoicesPage
              customers={data.customers}
              dataError={dataError}
              invoices={data.invoices}
              items={data.items}
              token={token ?? ""}
              onRefresh={() => (token ? loadData(token) : Promise.resolve())}
            />
          }
        />
        <Route
          path="sales/customers"
          element={
            <CustomersPage
              contacts={data.customers}
              dataError={dataError}
              token={token ?? ""}
              onRefresh={() => (token ? loadData(token) : Promise.resolve())}
            />
          }
        />
        <Route
          path="purchases/bills"
          element={<BillsPage bills={data.bills} dataError={dataError} items={data.items} nextBillNumber={data.nextBillNumber} vendors={data.vendors} token={token ?? ""} onRefresh={() => (token ? loadData(token) : Promise.resolve())} />}
        />
        <Route
          path="purchases/vendors"
          element={
            <VendorsPage
              contacts={data.vendors}
              dataError={dataError}
              token={token ?? ""}
              onRefresh={() => (token ? loadData(token) : Promise.resolve())}
            />
          }
        />
        <Route path="reports" element={<ReportsPage bills={data.bills} customers={data.customers} invoices={data.invoices} vendors={data.vendors} token={token ?? ""} />} />
        <Route path="reports/:reportId" element={<ReportsPage bills={data.bills} customers={data.customers} invoices={data.invoices} vendors={data.vendors} token={token ?? ""} />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

type LoginRouteProps = {
  admin: Admin | null;
  loadData: (activeToken: string) => Promise<void>;
  setAdmin: (admin: Admin) => void;
  setToken: (token: string) => void;
  token: string | null;
};

const LoginRoute = ({ admin, loadData, setAdmin, setToken, token }: LoginRouteProps) => {
  if (token && admin) {
    return <Navigate to="/" replace />;
  }

  return (
    <LoginPage
      onLogin={async (email, password) => {
        const response = await api.login(email, password);
        localStorage.setItem("adminToken", response.token);
        setToken(response.token);
        setAdmin(response.admin);
        void loadData(response.token).catch(() => {
          // The user is authenticated; keep them in the app even if a secondary
          // workspace request needs another try.
        });
      }}
    />
  );
};

type ProtectedLayoutProps = {
  admin: Admin | null;
  onLogout: () => void;
  token: string | null;
};

const ProtectedLayout = ({ admin, onLogout, token }: ProtectedLayoutProps) => {
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  if (!token || !admin) {
    return <Navigate to="/login" replace />;
  }

  const logout = () => {
    onLogout();
    navigate("/login", { replace: true });
  };

  return (
    <div className={`app-shell ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        admin={admin}
        isCollapsed={isSidebarCollapsed}
        onLogout={logout}
        onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
      />
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};
