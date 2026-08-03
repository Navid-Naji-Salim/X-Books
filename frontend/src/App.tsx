import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api } from "./api";
import { AppLoadingScreen } from "./components/AppLoadingScreen";
import { Sidebar } from "./layout/Sidebar";
import { LoginPage } from "./pages/LoginPage";
import type { Bill, Contact, Invoice, Item, Summary, User } from "./types";

const BillsPage = lazy(() => import("./pages/BillsPage").then((module) => ({ default: module.BillsPage })));
const CustomersPage = lazy(() => import("./pages/CustomersPage").then((module) => ({ default: module.CustomersPage })));
const HomePage = lazy(() => import("./pages/HomePage").then((module) => ({ default: module.HomePage })));
const ItemsPage = lazy(() => import("./pages/ItemsPage").then((module) => ({ default: module.ItemsPage })));
const InvoicesPage = lazy(() => import("./pages/InvoicesPage").then((module) => ({ default: module.InvoicesPage })));
const ReportsPage = lazy(() => import("./pages/ReportsPage").then((module) => ({ default: module.ReportsPage })));
const VendorsPage = lazy(() => import("./pages/VendorsPage").then((module) => ({ default: module.VendorsPage })));

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
  year: new Date().getFullYear(),
  receivables: { outstanding: 0, current: 0, overdue: 0 },
  payables: { outstanding: 0, current: 0, overdue: 0 },
  months: Array.from({ length: 12 }, (_, monthIndex) => ({ month: new Date(2000, monthIndex, 1).toLocaleString("en-US", { month: "short" }), monthIndex, cashReceived: 0, cashPaid: 0, income: 0, expenses: 0 })),
  cashActivity: { totalIncoming: 0, totalOutgoing: 0, netActivity: 0 },
  activity: { totalIncome: 0, totalExpenses: 0, netActivity: 0 },
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

const normalizedSummary = (summary: Summary): Summary => ({
  year: summary.year ?? emptySummary.year,
  receivables: summary.receivables ?? emptySummary.receivables,
  payables: summary.payables ?? emptySummary.payables,
  months: Array.isArray(summary.months) && summary.months.length === 12 ? summary.months : emptySummary.months,
  cashActivity: summary.cashActivity ?? emptySummary.cashActivity,
  activity: summary.activity ?? emptySummary.activity,
});

export const App = () => {
  const [token, setToken] = useState(() => localStorage.getItem("userToken"));
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<AppData>(emptyData);
  const [booting, setBooting] = useState(true);
  const [dataError, setDataError] = useState("");

  const logout = () => {
    localStorage.removeItem("userToken");
    setToken(null);
    setUser(null);
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

    setData({ summary: normalizedSummary(summary), items, customers, vendors, invoices, bills, nextBillNumber: nextBill.billNumber });
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

        setUser(response.user);
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
    return <AppLoadingScreen />;
  }

  return (
    <Suspense fallback={<AppLoadingScreen />}>
      <Routes>
      <Route
        path="/login"
        element={
          <LoginRoute
            user={user}
            setBooting={setBooting}
            setUser={setUser}
            setToken={setToken}
            token={token}
          />
        }
      />
      <Route
        element={
          <ProtectedLayout
            user={user}
            onLogout={logout}
            token={token}
          />
        }
      >
        <Route index element={<HomePage user={user!} dataError={dataError} summary={data.summary} />} />
        <Route
          path="items"
          element={
            <ItemsPage
              dataError={dataError}
              items={data.items}
              token={token ?? ""}
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
        <Route path="reports" element={<ReportsPage token={token ?? ""} />} />
      </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

type LoginRouteProps = {
  user: User | null;
  setBooting: (booting: boolean) => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  token: string | null;
};

const LoginRoute = ({ user, setBooting, setUser, setToken, token }: LoginRouteProps) => {
  if (token && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <LoginPage
      onLogin={async (email, password) => {
        const response = await api.login(email, password);
        localStorage.setItem("userToken", response.token);
        setBooting(true);
        setToken(response.token);
        setUser(response.user);
      }}
    />
  );
};

type ProtectedLayoutProps = {
  user: User | null;
  onLogout: () => void;
  token: string | null;
};

const ProtectedLayout = ({ user, onLogout, token }: ProtectedLayoutProps) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const contentRef = useRef<HTMLElement>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hasSidebarToggled, setHasSidebarToggled] = useState(false);
  const workspaceFrameModifier = pathname === "/"
    ? "is-home"
    : pathname.startsWith("/reports")
      ? "is-report"
      : pathname === "/sales/invoices" || pathname === "/purchases/bills"
        ? "is-document"
        : "is-records";

  useLayoutEffect(() => {
    window.scrollTo({ left: 0, top: 0, behavior: "auto" });
    contentRef.current?.scrollTo({ left: 0, top: 0, behavior: "auto" });
  }, [pathname]);

  useEffect(() => {
    const compactLayout = window.matchMedia("(max-width: 980px)");
    const keepNavigationVisible = () => {
      if (compactLayout.matches) setIsSidebarCollapsed(false);
    };
    keepNavigationVisible();
    compactLayout.addEventListener("change", keepNavigationVisible);
    return () => compactLayout.removeEventListener("change", keepNavigationVisible);
  }, []);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const logout = () => {
    onLogout();
    navigate("/login", { replace: true });
  };

  return (
    <div className={`app-shell ${isSidebarCollapsed ? "sidebar-collapsed" : ""} ${hasSidebarToggled ? "sidebar-has-toggled" : ""}`}>
      <Sidebar
        user={user}
        isCollapsed={isSidebarCollapsed}
        onLogout={logout}
        onToggleCollapse={() => {
          setHasSidebarToggled(true);
          setIsSidebarCollapsed((current) => !current);
        }}
      />
      <main className="content" ref={contentRef}>
        <div className={`workspace-frame ${workspaceFrameModifier}`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};
