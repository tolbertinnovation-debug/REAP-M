import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Warehouse,
  UsersRound,
  Truck,
  Wallet,
  ChartNoAxesCombined,
  Megaphone,
  MessageSquare,
  Settings,
  ShieldCheck,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Download,
  CalendarDays,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpLeft,
  AlertTriangle,
  MoreHorizontal,
  Leaf,
  Check,
  SlidersHorizontal,
  Printer,
  Copy,
  Send,
  Pencil,
  UserRound,
  ExternalLink,
  CircleCheck,
} from "lucide-react";
import { useApp, api, money, day, today, go, label, cents } from "./context";
import {
  Brand,
  Button,
  Badge,
  Empty,
  Loading,
  Notice,
  Modal,
  Field,
  Form,
  PageHeading,
  ConfirmButton,
} from "./ui";
import { Login, OrderDetails } from "./storefront";

const navItems = [
  ["overview", "Overview", LayoutDashboard],
  ["orders", "Orders", ShoppingBag],
  ["products", "Products", Package],
  ["inventory", "Inventory", Warehouse],
  ["customers", "Customers", UsersRound],
  ["deliveries", "Deliveries", Truck],
  ["finance", "Finances", Wallet],
  ["marketing", "Marketing", Megaphone],
  ["messages", "Messages", MessageSquare],
  ["reports", "Reports & analytics", ChartNoAxesCombined],
  ["team", "Team & access", ShieldCheck],
  ["settings", "Settings", Settings],
];
const endStatuses = ["cancelled", "completed"];
export function Admin() {
  const { user, route, logout, config, notify, refreshProducts } = useApp();
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0),
    [menu, setMenu] = useState(false),
    [globalSearch, setGlobalSearch] = useState("");
  const page = route.split("/")[2]?.split("?")[0] || "overview";
  useEffect(() => {
    if (user && user.role !== "customer")
      api("/admin/bootstrap")
        .then((d) => {
          setData(d);
          setError("");
        })
        .catch((e) => setError(e.message));
  }, [user, version]);
  useEffect(() => setMenu(false), [route]);
  async function mutate(path, payload, message = "Changes saved") {
    await api("/admin/" + path, payload);
    setVersion((n) => n + 1);
    await refreshProducts();
    notify(message);
  }
  if (!user || user.role === "customer") return <Login staff />;
  const permitted = page === "security" || user.scopes.includes(page);
  const activeNav =
    page === "security"
      ? ["security", "Account security"]
      : navItems.find((n) => n[0] === page);
  return (
    <div className="admin-app">
      <aside className={"admin-sidebar " + (menu ? "open" : "")}>
        <div className="sidebar-brand">
          <Brand small />
          <button
            className="icon-btn mobile-only"
            aria-label="Close menu"
            onClick={() => setMenu(false)}
          >
            <X />
          </button>
        </div>
        <div className="workspace-label">
          <span className="workspace-icon">
            <Leaf size={16} />
          </span>
          <span>
            REAP Business<small>Operations workspace</small>
          </span>
          <ChevronDown size={15} />
        </div>
        <small className="nav-label">WORKSPACE</small>
        <nav aria-label="Workspace navigation">
          {navItems
            .filter(([p]) => user.scopes.includes(p))
            .map(([p, title, Icon], i) => (
              <a
                className={
                  (p === page ? "active " : "") +
                  (p === "team" ? "nav-divider" : "")
                }
                href={"#/admin/" + (p === "overview" ? "" : p)}
                key={p}
              >
                <Icon size={19} strokeWidth={1.7} />
                <span>{title}</span>
                {p === "orders" && data?.summary.open > 0 && (
                  <b>{data.summary.open}</b>
                )}
              </a>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <a href="#/" className="visit-store">
            <ArrowUpRight size={17} /> Visit storefront{" "}
            <ExternalLink size={13} />
          </a>
          <div className="sidebar-user">
            <span className="avatar">
              {user.name
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("")}
            </span>
            <span>
              <a href="#/admin/security" title="Account security">
                <strong>{user.name}</strong>
                <small>{label(user.role)} · Account</small>
              </a>
            </span>
            <button className="icon-btn" aria-label="Sign out" onClick={logout}>
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {menu && (
        <div className="sidebar-backdrop" onClick={() => setMenu(false)} />
      )}
      <div className="admin-main">
        <header className="admin-header">
          <div>
            <button
              className="icon-btn mobile-only"
              onClick={() => setMenu(true)}
              aria-label="Open dashboard menu"
            >
              <Menu />
            </button>
            <span className="header-breadcrumb">
              Workspace <span>/</span>{" "}
              <strong>{activeNav?.[1] || "Overview"}</strong>
            </span>
          </div>
          <div className="admin-header-right">
            <form
              className="admin-search"
              onSubmit={(e) => {
                e.preventDefault();
                go("/admin/orders?q=" + encodeURIComponent(globalSearch));
              }}
            >
              <Search size={17} />
              <input
                aria-label="Find an order"
                placeholder="Find an order…"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                disabled={!user.scopes.includes("orders")}
              />
              <kbd>↵</kbd>
            </form>
            <a className="header-store" href="#/">
              Storefront <ArrowUpRight size={14} />
            </a>
            <span className="admin-avatar">{user.name[0]}</span>
          </div>
        </header>
        {config.demo && (
          <div className="admin-demo">
            <span>
              <span className="status-dot" /> Demonstration workspace{" "}
              <span className="demo-hide">
                · All customers, prices and records are samples.
              </span>
            </span>
            <a href="#/">
              View market <ArrowUpRight size={13} />
            </a>
          </div>
        )}
        <main id="main-content" className="admin-content">
          {error ? (
            <Notice type="error">
              {error}{" "}
              <button className="link" onClick={() => setVersion((n) => n + 1)}>
                Try again
              </button>
            </Notice>
          ) : !data ? (
            <Loading />
          ) : !permitted ? (
            <Empty
              title="This area is reserved for another role"
              text="Choose an available section from the navigation."
            />
          ) : page === "overview" ? (
            <Overview data={data} />
          ) : page === "orders" ? (
            <Orders data={data} mutate={mutate} />
          ) : page === "products" ? (
            <Products data={data} mutate={mutate} />
          ) : page === "inventory" ? (
            <Inventory data={data} mutate={mutate} />
          ) : page === "customers" ? (
            <Customers data={data} mutate={mutate} />
          ) : page === "deliveries" ? (
            <Deliveries data={data} mutate={mutate} />
          ) : page === "finance" ? (
            <Finance data={data} mutate={mutate} />
          ) : page === "marketing" ? (
            <Marketing data={data} mutate={mutate} />
          ) : page === "messages" ? (
            <Messages data={data} mutate={mutate} />
          ) : page === "reports" ? (
            <Reports data={data} />
          ) : page === "team" ? (
            <Team data={data} mutate={mutate} />
          ) : page === "security" ? (
            <PersonalSecurity />
          ) : (
            <SettingsPage data={data} />
          )}
        </main>
        <div className="admin-footer">
          REAP Market <span>Growing good, together.</span>
          <span>All monetary values in USD</span>
        </div>
      </div>
    </div>
  );
}

function Metric({ title, value, detail, Icon, tone = "" }) {
  return (
    <div className={"metric " + tone}>
      <div>
        <span>{title}</span>
        <span className="metric-icon">
          <Icon size={19} strokeWidth={1.7} />
        </span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
function StatGrid({ data }) {
  const { user } = useApp();
  return (
    <div className="metrics-grid">
      <Metric
        title={data.reports ? "Order value" : "Visible orders"}
        value={data.reports ? money(data.reports.sales) : data.summary.orders}
        detail={
          data.reports
            ? "Last 30 days · excluding cancelled"
            : "Orders available to your role"
        }
        Icon={Wallet}
        tone="highlight"
      />
      <Metric
        title="Orders in progress"
        value={data.summary.open}
        detail="From received to out for delivery"
        Icon={ShoppingBag}
      />
      <Metric
        title={
          user.scopes.includes("customers") ? "Customers" : "Completed orders"
        }
        value={
          user.scopes.includes("customers")
            ? data.summary.customers
            : data.orders.filter((o) => o.status === "completed").length
        }
        detail={
          user.scopes.includes("customers")
            ? "People in your customer directory"
            : "In the current view"
        }
        Icon={UsersRound}
      />
      <Metric
        title={
          user.scopes.includes("inventory")
            ? "Low stock products"
            : "Awaiting fulfillment"
        }
        value={
          user.scopes.includes("inventory")
            ? data.summary.low_stock
            : data.orders.filter((o) =>
                ["preparing", "ready"].includes(o.status),
              ).length
        }
        detail={
          user.scopes.includes("inventory")
            ? "At or below reorder threshold"
            : "Preparing or ready for collection"
        }
        Icon={Package}
      />
    </div>
  );
}
function SalesChart({ report }) {
  const points = report?.daily || [],
    max = Math.max(1, ...points.map((p) => p.total));
  const path = points
    .map(
      (p, i) =>
        `${i ? "L" : "M"}${40 + i * (580 / Math.max(1, points.length - 1))},${180 - (p.total / max) * 130}`,
    )
    .join(" ");
  return (
    <div className="sales-chart">
      <svg
        viewBox="0 0 660 230"
        role="img"
        aria-label="Daily order value chart. Exact values are available in the table below."
      >
        <defs>
          <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#9ab790" stopOpacity=".4" />
            <stop offset="100%" stopColor="#9ab790" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.33, 0.66, 1].map((v, i) => (
          <g key={i}>
            <line
              x1="40"
              x2="625"
              y1={180 - v * 130}
              y2={180 - v * 130}
              stroke="#e9ece6"
              strokeDasharray="3 4"
            />
            <text x="2" y={184 - v * 130} fill="#52664d" fontSize="10">
              ${Math.round((max * v) / 100)}
            </text>
          </g>
        ))}
        {points.length > 0 && (
          <>
            <path d={path + ` L620,180 L40,180 Z`} fill="url(#chartFill)" />
            <path
              d={path}
              fill="none"
              stroke="#2e674c"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((p, i) => (
              <g key={p.day}>
                <circle
                  cx={40 + i * (580 / Math.max(1, points.length - 1))}
                  cy={180 - (p.total / max) * 130}
                  r="3"
                  fill="#2e674c"
                >
                  <title>
                    {p.day}: {money(p.total)}
                  </title>
                </circle>
                {i % Math.max(1, Math.ceil(points.length / 6)) === 0 && (
                  <text
                    x={40 + i * (580 / Math.max(1, points.length - 1))}
                    y="211"
                    textAnchor="middle"
                    fill="#52664d"
                    fontSize="10"
                  >
                    {new Date(p.day).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </text>
                )}
              </g>
            ))}
          </>
        )}
        {points.length === 0 && (
          <text x="330" y="110" textAnchor="middle" fill="#52664d">
            No orders in this date range
          </text>
        )}
      </svg>
      <details className="chart-data">
        <summary>View chart data</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Orders</th>
                <th>Order value</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.day}>
                  <td>{day(p.day)}</td>
                  <td>{p.orders}</td>
                  <td>{money(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
function Overview({ data }) {
  const { user } = useApp();
  const low = data.products.filter((p) => p.active && p.stock <= p.threshold);
  return (
    <>
      <PageHeading
        eyebrow="YOUR BUSINESS, AT A GLANCE"
        title="A fresh look at your day."
        text="Here’s what’s happening across your market."
      >
        <span className="date-pill">
          <CalendarDays size={16} />
          {day(today())}
        </span>
        {user.scopes.includes("products") && (
          <Button onClick={() => go("/admin/products?new=1")}>
            <Plus size={17} /> Add product
          </Button>
        )}
      </PageHeading>
      <StatGrid data={data} />
      <div className="dashboard-middle">
        <section className="panel revenue-panel">
          <div className="panel-title">
            <div>
              <h2>{data.reports ? "Sales overview" : "Your order activity"}</h2>
              <p>
                {data.reports
                  ? "Order value before fulfillment · last 30 days"
                  : "Keep the day moving, one order at a time."}
              </p>
            </div>
            <span className="legend">
              <i />
              Order value
            </span>
          </div>
          {data.reports ? (
            <>
              <div className="chart-headline">
                <strong>{money(data.reports.sales)}</strong>
                <span>
                  {data.reports.daily.reduce((s, d) => s + d.orders, 0)} orders
                  placed
                </span>
              </div>
              <SalesChart report={data.reports} />
            </>
          ) : (
            <div className="status-overview">
              {[
                "received",
                "confirmed",
                "preparing",
                "ready",
                "out_for_delivery",
                "completed",
              ].map((s) => (
                <div key={s}>
                  <Badge value={s} />
                  <strong>
                    {data.orders.filter((o) => o.status === s).length}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="panel attention-panel">
          <div className="panel-title">
            <h2>A little attention</h2>
            <span className="attention-dot" />
          </div>
          <p className="muted">Small actions that keep things growing.</p>
          <a
            className="attention-item"
            href={
              "#/admin/" +
              (user.scopes.includes("orders") ? "orders" : "deliveries")
            }
          >
            <span className="attention-icon peach">
              <ShoppingBag size={20} />
            </span>
            <span>
              <strong>
                {data.orders.filter((o) => o.status === "received").length} new
                orders
              </strong>
              <small>Ready for a first look</small>
            </span>
            <ChevronDown className="rotate-arrow" size={16} />
          </a>
          {user.scopes.includes("inventory") && (
            <a className="attention-item" href="#/admin/inventory">
              <span className="attention-icon yellow">
                <Package size={20} />
              </span>
              <span>
                <strong>{low.length} products running low</strong>
                <small>Give your inventory a check</small>
              </span>
              <ArrowRight size={16} />
            </a>
          )}
          <a
            className="attention-item"
            href={
              "#/admin/" +
              (user.scopes.includes("deliveries") ? "deliveries" : "orders")
            }
          >
            <span className="attention-icon blue">
              <Truck size={20} />
            </span>
            <span>
              <strong>
                {data.orders.filter((o) => o.status === "ready").length} orders
                ready
              </strong>
              <small>The next stop is your customer</small>
            </span>
            <ArrowRight size={16} />
          </a>
          <div className="workspace-tip">
            <Leaf size={20} />
            <div>
              <strong>A healthy market starts here.</strong>
              <p>
                Keep stock and order statuses up to date so customers know what
                to expect.
              </p>
            </div>
          </div>
        </section>
      </div>
      <div className="dashboard-bottom">
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Recent orders</h2>
              <p>The latest from your community.</p>
            </div>
            {user.scopes.includes("orders") && (
              <a className="text-link" href="#/admin/orders">
                View all <ArrowRight size={14} />
              </a>
            )}
          </div>
          <OrderTable orders={data.orders.slice(0, 5)} compact />
        </section>
        <section className="panel top-products">
          <div className="panel-title">
            <h2>{data.reports ? "Popular products" : "Quick links"}</h2>
            <span className="muted small">30 days</span>
          </div>
          {data.reports?.top.length ? (
            data.reports.top.slice(0, 4).map((p, i) => (
              <div className="top-product" key={p.name}>
                <span className="rank">0{i + 1}</span>
                <div>
                  <strong>{p.name}</strong>
                  <small>{p.quantity} units ordered</small>
                </div>
                <b>{money(p.total)}</b>
              </div>
            ))
          ) : (
            <div className="quick-links">
              {navItems
                .filter(([p]) => user.scopes.includes(p) && p !== "overview")
                .slice(0, 4)
                .map(([p, t, Icon]) => (
                  <a key={p} href={"#/admin/" + p}>
                    <Icon size={19} />
                    {t}
                    <ArrowUpRight size={15} />
                  </a>
                ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Table({
  columns,
  rows,
  empty = "No records to display",
  pageSize = 12,
}) {
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [rows.length]);
  const pageCount = Math.ceil(rows.length / pageSize),
    p = Math.min(page, Math.max(0, pageCount - 1));
  return (
    <>
      {rows.length ? (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{rows.slice(p * pageSize, (p + 1) * pageSize)}</tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <div className="pagination">
              <span>
                {p * pageSize + 1}–{Math.min((p + 1) * pageSize, rows.length)}{" "}
                of {rows.length}
              </span>
              <div>
                <Button
                  variant="outline small"
                  disabled={!p}
                  onClick={() => setPage(p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline small"
                  disabled={p === pageCount - 1}
                  onClick={() => setPage(p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Empty title={empty} text="New records will appear here." />
      )}
    </>
  );
}
function OrderTable({ orders, onOpen, compact = false }) {
  return (
    <Table
      pageSize={compact ? 5 : 12}
      columns={
        compact
          ? ["Order", "Customer", "Status", "Total"]
          : [
              "Order",
              "Customer",
              "Fulfillment",
              "Date",
              "Status",
              "Payment",
              "Total",
              "",
            ]
      }
      rows={orders.map((o) => (
        <tr key={o.id}>
          <td>
            <button
              className="table-link"
              onClick={() =>
                onOpen ? onOpen(o) : go("/admin/orders?q=" + o.number)
              }
            >
              {o.number}
            </button>
          </td>
          <td>
            <div className="table-person">
              <span className="small-avatar">{o.name[0]}</span>
              <span>
                <strong>{o.name}</strong>
                {!compact && <small>{o.email}</small>}
              </span>
            </div>
          </td>
          {!compact && (
            <>
              <td>{label(o.fulfillment)}</td>
              <td>{day(o.created_at)}</td>
            </>
          )}
          <td>
            <Badge value={o.status} />
          </td>
          {!compact && (
            <td>
              <Badge
                value={
                  o.paid === o.total ? "paid" : o.paid ? "partial" : "unpaid"
                }
              />
            </td>
          )}
          <td className="amount">{money(o.total)}</td>
          {!compact && (
            <td>
              <button
                className="icon-btn"
                aria-label={`View ${o.number}`}
                onClick={() => onOpen(o)}
              >
                <ArrowUpRight size={17} />
              </button>
            </td>
          )}
        </tr>
      ))}
    />
  );
}
function Orders({ data, mutate }) {
  const { route } = useApp();
  const [search, setSearch] = useState(
      new URLSearchParams(route.split("?")[1]).get("q") || "",
    ),
    [status, setStatus] = useState("all"),
    [selected, setSelected] = useState(null);
  useEffect(
    () => setSearch(new URLSearchParams(route.split("?")[1]).get("q") || ""),
    [route],
  );
  const orders = data.orders.filter(
    (o) =>
      (status === "all" || o.status === status) &&
      (o.number + " " + o.name + " " + o.email)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title="Orders"
        text="From the first order to the final handoff."
      >
        <a className="btn outline" href="/api/admin/export?type=orders">
          <Download size={16} /> Export orders
        </a>
      </PageHeading>
      <div className="panel">
        <div className="table-toolbar">
          <SearchBox
            value={search}
            setValue={setSearch}
            placeholder="Search order or customer…"
          />
          <select
            aria-label="Filter order status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            {[
              "received",
              "confirmed",
              "preparing",
              "ready",
              "out_for_delivery",
              "completed",
              "cancelled",
            ].map((s) => (
              <option value={s} key={s}>
                {label(s)}
              </option>
            ))}
          </select>
          <span className="muted small">{orders.length} orders</span>
        </div>
        <OrderTable orders={orders} onOpen={setSelected} />
      </div>
      {selected && (
        <OrderModal
          order={data.orders.find((o) => o.id === selected.id) || selected}
          mutate={mutate}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
function SearchBox({ value, setValue, placeholder = "Search…" }) {
  return (
    <div className="search-input">
      <Search size={17} />
      <input
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}
function OrderModal({ order: o, mutate, onClose }) {
  const { user } = useApp();
  const [next, setNext] = useState(""),
    [payment, setPayment] = useState(false);
  const transitions = {
    received: ["confirmed", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready:
      o.fulfillment === "delivery"
        ? ["out_for_delivery", "cancelled"]
        : ["completed", "cancelled"],
    out_for_delivery: ["completed"],
    completed: [],
    cancelled: [],
  };
  const allowed = (transitions[o.status] || []).filter(
    (s) =>
      user.role !== "dispatch" || ["out_for_delivery", "completed"].includes(s),
  );
  return (
    <Modal title={o.number} onClose={onClose} wide>
      <OrderDetails order={o} />
      {allowed.length > 0 &&
        (user.scopes.includes("orders") ||
          user.scopes.includes("deliveries")) && (
          <div className="order-actions">
            <h3>Update fulfillment</h3>
            <div className="button-row">
              {allowed.map((s) => (
                <ConfirmButton
                  key={s}
                  message={
                    s === "cancelled"
                      ? "Cancel this order and return its reserved products to available stock?"
                      : `Move ${o.number} to ${label(s).toLowerCase()}?`
                  }
                  variant={s === "cancelled" ? "danger outline" : "outline"}
                  onConfirm={() =>
                    mutate(
                      "order-status",
                      { order_id: o.id, status: s },
                      "Order status updated",
                    )
                  }
                >
                  {label(s)}
                </ConfirmButton>
              ))}
            </div>
          </div>
        )}
      {user.scopes.includes("finance") && o.status !== "cancelled" && (
        <div className="order-actions">
          <h3>Payment records</h3>
          <p className="muted">
            Record only payments or refunds you have independently verified.
          </p>
          <PaymentForm order={o} mutate={mutate} />
        </div>
      )}
    </Modal>
  );
}
function PaymentForm({ order: o, mutate, onClose }) {
  return (
    <Form
      submit="Record transaction"
      onCancel={onClose}
      onSubmit={async (d) => {
        await mutate(
          "payments",
          { ...d, order_id: o.id, amount: cents(d.amount) },
          "Transaction recorded",
        );
        onClose?.();
      }}
    >
      <div className="field-grid">
        <Field
          label="Amount (USD)"
          name="amount"
          type="number"
          step="0.01"
          defaultValue={((o.total - o.paid) / 100).toFixed(2)}
          required
          hint="Use a negative amount for a verified refund."
        />
        <Field label="Method">
          <select name="method">
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile money</option>
            <option value="bank_transfer">Bank transfer</option>
          </select>
        </Field>
      </div>
      <Field
        label="Receipt / transfer reference"
        name="reference"
        minLength={3}
        maxLength={200}
        required
      />
    </Form>
  );
}

function ProductForm({ product: p, onClose, mutate }) {
  const { config } = useApp();
  return (
    <Modal
      title={p?.id ? "Edit product" : "Add a fresh find"}
      onClose={onClose}
      wide
    >
      <Form
        onCancel={onClose}
        submit={p?.id ? "Save product" : "Create product"}
        onSubmit={async (d) => {
          await mutate("products", {
            ...d,
            ...(p?.id ? { id: p.id } : {}),
            price: cents(d.price),
            stock: Number(d.stock || 0),
            threshold: Number(d.threshold),
            active: d.active === "on",
            featured: d.featured === "on",
          });
          onClose();
        }}
      >
        <div className="field-grid">
          <Field
            label="Product name"
            name="name"
            defaultValue={p?.name}
            required
            maxLength={120}
          />
          <Field label="Category">
            <select name="category" defaultValue={p?.category}>
              {config.categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Description">
          <textarea
            name="description"
            defaultValue={p?.description}
            required
            maxLength={2000}
            rows={3}
          />
        </Field>
        <div className="field-grid three">
          <Field
            label="Price (USD)"
            name="price"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={p?.price ? p.price / 100 : ""}
            required
          />
          <Field label="Selling unit">
            <select name="unit" defaultValue={p?.unit || "lb"}>
              {config.units.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field
            label="Low stock threshold"
            name="threshold"
            type="number"
            min="0"
            max="100000"
            defaultValue={p?.threshold ?? 10}
            required
          />
        </div>
        {!p?.id && (
          <Field
            label="Opening stock"
            name="stock"
            type="number"
            min="0"
            max="100000"
            defaultValue="0"
            required
          />
        )}
        <Field label="Product photo">
          <select name="image" defaultValue={p?.image || "/assets/lettuce.jpg"}>
            {[
              ["lettuce", "Leafy lettuce"],
              ["pig", "Live pig"],
              ["pork", "Pork cuts"],
              ["fish", "Tilapia"],
              ["peppers", "Sweet peppers"],
              ["greens", "Mixed produce"],
              ["seedlings", "Farm supplies"],
            ].map(([file, name]) => (
              <option key={file} value={"/assets/" + file + ".jpg"}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        <div className="field-grid">
          <label className="checkbox">
            <input
              type="checkbox"
              name="active"
              defaultChecked={p?.active ?? true}
            />{" "}
            Visible in the market
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={p?.featured ?? false}
            />{" "}
            Featured on the home page
          </label>
        </div>
        {p?.id && (
          <p className="fine-print">
            Use Inventory to adjust stock with a recorded reason.
          </p>
        )}
      </Form>
    </Modal>
  );
}
function Products({ data, mutate }) {
  const { route } = useApp();
  const [search, setSearch] = useState(""),
    [edit, setEdit] = useState(route.includes("new=1") ? {} : null);
  const products = data.products.filter((p) =>
    (p.name + " " + p.category).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title="Products"
        text="Your harvest, thoughtfully presented."
      >
        <Button onClick={() => setEdit({})}>
          <Plus size={17} /> Add product
        </Button>
      </PageHeading>
      <div className="panel">
        <div className="table-toolbar">
          <SearchBox
            value={search}
            setValue={setSearch}
            placeholder="Find a product…"
          />
          <span className="muted small">{products.length} products</span>
        </div>
        <Table
          columns={[
            "Product",
            "Category",
            "Price",
            "Available stock",
            "Visibility",
            "",
          ]}
          rows={products.map((p) => (
            <tr key={p.id}>
              <td>
                <div className="table-product">
                  <img src={p.image} alt="" />
                  <span>
                    <strong>{p.name}</strong>
                    <small>
                      {p.featured ? "Featured product" : "Standard listing"}
                    </small>
                  </span>
                </div>
              </td>
              <td>{p.category}</td>
              <td>
                <b>{money(p.price)}</b> / {p.unit}
              </td>
              <td>
                <span className={p.stock <= p.threshold ? "stock-low" : ""}>
                  {p.stock} {p.unit}
                </span>
              </td>
              <td>
                <Badge value={p.active ? "active" : "hidden"} />
              </td>
              <td>
                <button
                  className="icon-btn"
                  aria-label={`Edit ${p.name}`}
                  onClick={() => setEdit(p)}
                >
                  <Pencil size={17} />
                </button>
              </td>
            </tr>
          ))}
        />
      </div>
      {edit && (
        <ProductForm
          product={edit}
          mutate={mutate}
          onClose={() => setEdit(null)}
        />
      )}
    </>
  );
}
function Inventory({ data, mutate }) {
  const [search, setSearch] = useState(""),
    [lowOnly, setLowOnly] = useState(false),
    [adjust, setAdjust] = useState(null);
  const products = data.products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      (!lowOnly || p.stock <= p.threshold),
  );
  return (
    <>
      <PageHeading
        title="Inventory"
        text="A clear view of what’s in stock and what needs attention."
      >
        <a className="btn outline" href="/api/admin/export?type=inventory">
          <Download size={16} /> Export inventory
        </a>
      </PageHeading>
      <div className="metrics-grid three-metrics">
        <Metric
          title="Product lines"
          value={data.products.length}
          detail="Across all categories"
          Icon={Package}
        />
        <Metric
          title="Low stock"
          value={data.summary.low_stock}
          detail="At or below the threshold"
          Icon={AlertTriangle}
          tone="warm"
        />
        <Metric
          title="Out of stock"
          value={data.products.filter((p) => !p.stock).length}
          detail="Products needing replenishment"
          Icon={Warehouse}
        />
      </div>
      <div className="panel">
        <div className="table-toolbar">
          <SearchBox
            value={search}
            setValue={setSearch}
            placeholder="Search inventory…"
          />
          <label className="checkbox">
            <input
              type="checkbox"
              checked={lowOnly}
              onChange={(e) => setLowOnly(e.target.checked)}
            />{" "}
            Low stock only
          </label>
        </div>
        <Table
          columns={["Product", "Available", "Threshold", "Stock health", ""]}
          rows={products.map((p) => (
            <tr key={p.id}>
              <td>
                <div className="table-product">
                  <img src={p.image} alt="" />
                  <strong>{p.name}</strong>
                </div>
              </td>
              <td>
                <b>{p.stock}</b> {p.unit}
              </td>
              <td>
                {p.threshold} {p.unit}
              </td>
              <td>
                <Badge
                  value={
                    !p.stock
                      ? "out_of_stock"
                      : p.stock <= p.threshold
                        ? "low_stock"
                        : "healthy"
                  }
                />
              </td>
              <td>
                <Button variant="outline small" onClick={() => setAdjust(p)}>
                  Adjust stock
                </Button>
              </td>
            </tr>
          ))}
        />
      </div>
      <section className="panel space-top">
        <div className="panel-title">
          <div>
            <h2>Stock movement history</h2>
            <p>Every reservation, return and manual adjustment.</p>
          </div>
        </div>
        <Table
          columns={["Product", "Change", "Reason", "Date"]}
          rows={data.movements.map((m) => (
            <tr key={m.id}>
              <td>{m.product_name}</td>
              <td className={m.delta > 0 ? "positive" : "negative"}>
                {m.delta > 0 ? "+" : ""}
                {m.delta}
              </td>
              <td>{m.reason}</td>
              <td>{day(m.created_at)}</td>
            </tr>
          ))}
        />
      </section>
      {adjust && (
        <Modal title={"Adjust " + adjust.name} onClose={() => setAdjust(null)}>
          <p>
            Currently available:{" "}
            <strong>
              {adjust.stock} {adjust.unit}
            </strong>
          </p>
          <Form
            submit="Record adjustment"
            onCancel={() => setAdjust(null)}
            onSubmit={async (d) => {
              await mutate(
                "inventory",
                {
                  product_id: adjust.id,
                  delta: Number(d.delta),
                  reason: d.reason,
                },
                "Stock adjusted",
              );
              setAdjust(null);
            }}
          >
            <Field
              label="Quantity change"
              name="delta"
              type="number"
              required
              hint="Use a positive number for stock received, or a negative number for loss or correction."
            />
            <Field
              label="Reason for adjustment"
              name="reason"
              minLength={3}
              maxLength={500}
              required
              placeholder="e.g. New harvest received"
            />
          </Form>
        </Modal>
      )}
    </>
  );
}

function Customers({ data, mutate }) {
  const [search, setSearch] = useState(""),
    [selected, setSelected] = useState(null);
  const customers = data.customers.filter((c) =>
    (c.name + " " + c.email + " " + c.phone)
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title="Customers"
        text="People, relationships and the orders that bring you together."
      >
        <a className="btn outline" href="/api/admin/export?type=customers">
          <Download size={16} /> Export contacts
        </a>
      </PageHeading>
      <div className="metrics-grid three-metrics">
        <Metric
          title="Customer directory"
          value={data.customers.length}
          detail="Created from market orders"
          Icon={UsersRound}
        />
        <Metric
          title="Returning customers"
          value={data.customers.filter((c) => c.order_count > 1).length}
          detail="Customers with more than one order"
          Icon={TrendingUp}
        />
        <Metric
          title="Marketing opt-ins"
          value={data.customers.filter((c) => c.marketing_opt_in).length}
          detail="Contacts who agreed to updates"
          Icon={MessageSquare}
        />
      </div>
      <div className="panel">
        <div className="table-toolbar">
          <SearchBox
            value={search}
            setValue={setSearch}
            placeholder="Find a customer…"
          />
        </div>
        <Table
          columns={[
            "Customer",
            "Contact",
            "Orders",
            "Order value",
            "Marketing",
            "",
          ]}
          rows={customers.map((c) => (
            <tr key={c.id}>
              <td>
                <div className="table-person">
                  <span className="small-avatar">{c.name[0]}</span>
                  <strong>{c.name}</strong>
                </div>
              </td>
              <td>
                <div className="stack">
                  <span>{c.email}</span>
                  <small>{c.phone}</small>
                </div>
              </td>
              <td>{c.order_count}</td>
              <td className="amount">{money(c.lifetime_value)}</td>
              <td>
                <Badge
                  value={c.marketing_opt_in ? "opted_in" : "not_subscribed"}
                />
              </td>
              <td>
                <button
                  className="icon-btn"
                  aria-label={`View ${c.name}`}
                  onClick={() => setSelected(c)}
                >
                  <ArrowUpRight size={17} />
                </button>
              </td>
            </tr>
          ))}
        />
      </div>
      {selected && (
        <Modal title="Customer profile" wide onClose={() => setSelected(null)}>
          <div className="profile-intro">
            <span className="avatar">{selected.name[0]}</span>
            <div>
              <h2>{selected.name}</h2>
              <p>{selected.email}</p>
            </div>
          </div>
          <Form
            onSubmit={async (d) => {
              await mutate("customer", {
                ...d,
                id: selected.id,
                marketing_opt_in: d.marketing_opt_in === "on",
              });
              setSelected(null);
            }}
          >
            <div className="field-grid">
              <Field
                label="Name"
                name="name"
                defaultValue={selected.name}
                required
              />
              <Field
                label="Phone"
                name="phone"
                defaultValue={selected.phone}
                required
              />
            </div>
            <label className="checkbox">
              <input
                name="marketing_opt_in"
                type="checkbox"
                defaultChecked={selected.marketing_opt_in}
              />{" "}
              Customer has consented to receive marketing
            </label>
            <p className="fine-print">
              Change consent only after receiving the customer’s instructions.
            </p>
          </Form>
          <h3>Order history</h3>
          <OrderTable
            orders={data.orders.filter((o) => o.customer_id === selected.id)}
            compact
          />
        </Modal>
      )}
    </>
  );
}
function Deliveries({ data, mutate }) {
  const [selected, setSelected] = useState(null),
    [showCompleted, setShowCompleted] = useState(false);
  const orders = data.orders.filter(
    (o) =>
      o.fulfillment === "delivery" &&
      (showCompleted
        ? o.status === "completed"
        : !endStatuses.includes(o.status)),
  );
  const columns = showCompleted
    ? ["completed"]
    : ["preparing", "ready", "out_for_delivery"];
  return (
    <>
      <PageHeading
        title="Deliveries"
        text="The last mile deserves the same care as the first."
      >
        <Button
          variant="outline"
          onClick={() => setShowCompleted(!showCompleted)}
        >
          {showCompleted ? "Active deliveries" : "Show completed"}
        </Button>
      </PageHeading>
      <div className="delivery-summary">
        <Truck size={20} />
        <span>
          <strong>
            {orders.length} {showCompleted ? "completed" : "active"} deliveries
          </strong>{" "}
          ·{" "}
          {
            orders.filter((o) => ["received", "confirmed"].includes(o.status))
              .length
          }{" "}
          awaiting preparation
        </span>
      </div>
      <div className="delivery-board">
        {columns.map((status) => (
          <section className="delivery-column" key={status}>
            <div className="delivery-column-title">
              <span className={"board-dot " + status} />
              <h2>{label(status)}</h2>
              <b>{orders.filter((o) => o.status === status).length}</b>
            </div>
            {orders
              .filter((o) => o.status === status)
              .map((o) => (
                <article className="delivery-card" key={o.id}>
                  <div>
                    <strong>{o.number}</strong>
                    <Badge value={o.paid === o.total ? "paid" : "unpaid"} />
                  </div>
                  <h3>{o.name}</h3>
                  <p>{o.address}</p>
                  <small>
                    <CalendarDays size={13} />
                    {day(o.preferred_date)}
                  </small>
                  <small>
                    <Package size={13} />
                    {o.items.reduce((s, i) => s + i.quantity, 0)} units ·{" "}
                    {money(o.total)}
                  </small>
                  <div className="driver-select">
                    <label>
                      Assigned driver
                      <select
                        aria-label={`Driver for ${o.number}`}
                        value={o.driver_id || ""}
                        onChange={async (e) => {
                          try {
                            await mutate("assign-driver", {
                              order_id: o.id,
                              driver_id: e.target.value,
                            });
                          } catch (err) {
                            alert(err.message);
                          }
                        }}
                      >
                        <option value="" disabled>
                          Choose a driver
                        </option>
                        {data.drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <Button variant="outline" onClick={() => setSelected(o)}>
                    View delivery <ArrowRight size={15} />
                  </Button>
                </article>
              ))}
            {!orders.some((o) => o.status === status) && (
              <div className="board-empty">No deliveries here.</div>
            )}
          </section>
        ))}
      </div>
      {orders.some((o) => ["received", "confirmed"].includes(o.status)) && (
        <section className="panel space-top">
          <div className="panel-title">
            <h2>Awaiting preparation</h2>
          </div>
          <OrderTable
            orders={orders.filter((o) =>
              ["received", "confirmed"].includes(o.status),
            )}
            onOpen={setSelected}
          />
        </section>
      )}
      {selected && (
        <OrderModal
          order={data.orders.find((o) => o.id === selected.id) || selected}
          mutate={mutate}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
function Finance({ data, mutate }) {
  const [tab, setTab] = useState("orders"),
    [expense, setExpense] = useState(false),
    [payment, setPayment] = useState(null),
    [invoice, setInvoice] = useState(null);
  const r = data.reports;
  return (
    <>
      <PageHeading
        title="Finances"
        text="Keep a clear record of money coming in and going out."
      >
        <a className="btn outline" href="/api/admin/export?type=bookkeeping">
          <Download size={16} /> Export ledger
        </a>
        <Button onClick={() => setExpense(true)}>
          <Plus size={16} /> Add expense
        </Button>
      </PageHeading>
      <div className="metrics-grid">
        <Metric
          title="Cash received, net"
          value={money(r.receipts)}
          detail="Last 30 days · receipts less refunds"
          Icon={ArrowDownLeft}
          tone="highlight"
        />
        <Metric
          title="Recorded expenses"
          value={money(r.expenses)}
          detail="Last 30 days"
          Icon={ArrowUpRight}
        />
        <Metric
          title="Cash surplus"
          value={money(r.cash_surplus)}
          detail="Receipts less recorded expenses"
          Icon={TrendingUp}
        />
        <Metric
          title="Outstanding balance"
          value={money(r.outstanding)}
          detail="All uncancelled orders"
          Icon={Wallet}
        />
      </div>
      <div className="panel">
        <div className="category-tabs panel-tabs">
          {[
            ["orders", "Invoices & balances"],
            ["payments", "Payment ledger"],
            ["expenses", "Expenses"],
          ].map(([t, n]) => (
            <button
              className={tab === t ? "selected" : ""}
              key={t}
              onClick={() => setTab(t)}
            >
              {n}
            </button>
          ))}
        </div>
        {tab === "orders" ? (
          <Table
            columns={[
              "Invoice / order",
              "Customer",
              "Total",
              "Recorded",
              "Due",
              "",
            ]}
            rows={data.orders
              .filter((o) => o.status !== "cancelled")
              .map((o) => (
                <tr key={o.id}>
                  <td>
                    <button
                      className="table-link"
                      onClick={() => setInvoice(o)}
                    >
                      {o.number}
                    </button>
                  </td>
                  <td>{o.name}</td>
                  <td>{money(o.total)}</td>
                  <td className="positive">{money(o.paid)}</td>
                  <td className="amount">{money(o.total - o.paid)}</td>
                  <td>
                    <Button
                      variant="outline small"
                      onClick={() => setPayment(o)}
                    >
                      Record payment / refund
                    </Button>
                  </td>
                </tr>
              ))}
          />
        ) : tab === "payments" ? (
          <Table
            columns={["Date", "Order", "Method", "Reference", "Amount"]}
            rows={data.payments.map((p) => (
              <tr key={p.id}>
                <td>{day(p.created_at)}</td>
                <td>{p.number}</td>
                <td>{label(p.method)}</td>
                <td>{p.reference}</td>
                <td
                  className={
                    p.amount > 0 ? "positive amount" : "negative amount"
                  }
                >
                  {money(p.amount)}
                </td>
              </tr>
            ))}
          />
        ) : (
          <Table
            columns={["Date", "Description", "Category", "Amount"]}
            rows={data.expenses.map((e) => (
              <tr key={e.id}>
                <td>{day(e.date)}</td>
                <td>{e.description}</td>
                <td>
                  <Badge value={e.category.toLowerCase()} />
                </td>
                <td className="amount">{money(e.amount)}</td>
              </tr>
            ))}
          />
        )}
      </div>
      <p className="fine-print space-top">
        Cash reports use recorded transactions. Order value is not cash received
        or accounting profit. Inventory valuation, taxes, payroll and bank
        reconciliation require separate accounting processes.
      </p>
      {expense && (
        <Modal title="Record an expense" onClose={() => setExpense(false)}>
          <Form
            submit="Save expense"
            onCancel={() => setExpense(false)}
            onSubmit={async (d) => {
              await mutate(
                "expenses",
                { ...d, amount: cents(d.amount) },
                "Expense recorded",
              );
              setExpense(false);
            }}
          >
            <div className="field-grid">
              <Field
                label="Amount (USD)"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
              />
              <Field
                label="Date"
                name="date"
                type="date"
                defaultValue={today()}
                required
              />
            </div>
            <Field label="Category">
              <select name="category">
                {[
                  "Feed",
                  "Transport",
                  "Supplies",
                  "Utilities",
                  "Wages",
                  "Marketing",
                  "Other",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field
              label="Description / reference"
              name="description"
              maxLength={500}
              required
            />
          </Form>
        </Modal>
      )}
      {payment && (
        <Modal
          title={"Record transaction · " + payment.number}
          onClose={() => setPayment(null)}
        >
          <Notice>
            Only record funds you have verified. This action does not charge a
            payment account.
          </Notice>
          <PaymentForm
            order={payment}
            mutate={mutate}
            onClose={() => setPayment(null)}
          />
        </Modal>
      )}
      {invoice && (
        <Modal title="Invoice" wide onClose={() => setInvoice(null)}>
          <OrderDetails order={invoice} invoice />
        </Modal>
      )}
    </>
  );
}
function Marketing({ data, mutate }) {
  const { notify } = useApp();
  const [tab, setTab] = useState("campaigns"),
    [campaign, setCampaign] = useState(null),
    [promo, setPromo] = useState(false);
  const spent = data.campaigns.reduce((s, c) => s + c.spent, 0),
    impressions = data.campaigns.reduce((s, c) => s + c.impressions, 0),
    clicks = data.campaigns.reduce((s, c) => s + c.clicks, 0);
  return (
    <>
      <PageHeading
        title="Marketing"
        text="Tell your story. Bring the next harvest to your community."
      >
        <Button
          onClick={() =>
            tab === "campaigns" ? setCampaign({}) : setPromo(true)
          }
        >
          <Plus size={16} />{" "}
          {tab === "campaigns" ? "New campaign" : "Create promotion"}
        </Button>
      </PageHeading>
      <div className="metrics-grid three-metrics">
        <Metric
          title="Campaign spend"
          value={money(spent)}
          detail="Manually recorded across campaigns"
          Icon={Wallet}
        />
        <Metric
          title="Recorded impressions"
          value={impressions.toLocaleString()}
          detail="Enter figures from your ad accounts"
          Icon={Megaphone}
        />
        <Metric
          title="Click-through rate"
          value={
            (impressions ? (clicks / impressions) * 100 : 0).toFixed(1) + "%"
          }
          detail={`${clicks.toLocaleString()} recorded clicks`}
          Icon={TrendingUp}
        />
      </div>
      <div className="category-tabs">
        {["campaigns", "promotions"].map((t) => (
          <button
            className={tab === t ? "selected" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {label(t)}
          </button>
        ))}
      </div>
      {tab === "campaigns" ? (
        <>
          <Notice>
            Plan content here, publish through your social accounts, then record
            the results. Campaigns do not automatically publish or buy
            advertisements.
          </Notice>
          <div className="campaign-grid">
            {data.campaigns.map((c) => (
              <article className="panel campaign-card" key={c.id}>
                <div className="campaign-head">
                  <span className="campaign-channel">
                    <Megaphone size={18} />
                    {c.channel}
                  </span>
                  <Badge value={c.status} />
                </div>
                <h2>{c.name}</h2>
                <p>{c.content}</p>
                <div className="campaign-numbers">
                  <span>
                    Budget<strong>{money(c.budget)}</strong>
                  </span>
                  <span>
                    Spend<strong>{money(c.spent)}</strong>
                  </span>
                  <span>
                    Clicks<strong>{c.clicks}</strong>
                  </span>
                </div>
                <div className="campaign-footer">
                  <small>{day(c.start_date)}</small>
                  <div>
                    <button
                      className="icon-btn"
                      aria-label={`Copy ${c.name} content`}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(c.content);
                          notify("Campaign text copied");
                        } catch {
                          notify(
                            "Open the campaign and select the text to copy.",
                          );
                        }
                      }}
                    >
                      <Copy size={16} />
                    </button>
                    <Button
                      variant="outline small"
                      onClick={() => setCampaign(c)}
                    >
                      Manage campaign
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!data.campaigns.length && (
            <Empty
              title="Your next campaign starts here"
              text="Create a draft, plan the message, and track the results."
            />
          )}
        </>
      ) : (
        <div className="panel">
          <Table
            columns={["Code", "Discount", "Uses", "Expires", "Status", ""]}
            rows={data.promotions.map((p) => (
              <tr key={p.id}>
                <td>
                  <code className="promo-code">{p.code}</code>
                </td>
                <td>{p.percent}%</td>
                <td>
                  {p.uses} / {p.max_uses}
                </td>
                <td>{day(p.expires)}</td>
                <td>
                  <Badge value={p.active ? "active" : "paused"} />
                </td>
                <td>
                  <ConfirmButton
                    message={`${p.active ? "Pause" : "Activate"} this promotion?`}
                    onConfirm={() =>
                      mutate("promotion-toggle", {
                        id: p.id,
                        active: !p.active,
                      })
                    }
                  >
                    {p.active ? "Pause" : "Activate"}
                  </ConfirmButton>
                </td>
              </tr>
            ))}
          />
        </div>
      )}
      {campaign && (
        <Modal
          title={campaign.id ? "Manage campaign" : "Create a campaign"}
          wide
          onClose={() => setCampaign(null)}
        >
          <Form
            submit="Save campaign"
            onCancel={() => setCampaign(null)}
            onSubmit={async (d) => {
              await mutate("campaigns", {
                ...d,
                id: campaign.id,
                budget: cents(d.budget),
                spent: cents(d.spent),
                impressions: Number(d.impressions),
                clicks: Number(d.clicks),
              });
              setCampaign(null);
            }}
          >
            <div className="field-grid">
              <Field
                label="Campaign name"
                name="name"
                defaultValue={campaign.name}
                required
                maxLength={150}
              />
              <Field label="Channel">
                <select name="channel" defaultValue={campaign.channel}>
                  {["WhatsApp", "Facebook", "Instagram", "Email", "SMS"].map(
                    (c) => (
                      <option key={c}>{c}</option>
                    ),
                  )}
                </select>
              </Field>
            </div>
            <Field label="Campaign message">
              <textarea
                name="content"
                required
                rows={4}
                maxLength={3000}
                defaultValue={campaign.content}
              />
            </Field>
            <div className="field-grid three">
              <Field
                label="Start date"
                name="start_date"
                type="date"
                defaultValue={campaign.start_date || today()}
                required
              />
              <Field
                label="Budget (USD)"
                name="budget"
                type="number"
                min="0"
                step="0.01"
                defaultValue={(campaign.budget || 0) / 100}
                required
              />
              <Field label="Status">
                <select name="status" defaultValue={campaign.status || "draft"}>
                  {["draft", "planned", "published", "completed"].map((s) => (
                    <option key={s} value={s}>
                      {label(s)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <h3>Record campaign results</h3>
            <div className="field-grid three">
              <Field
                label="Actual spend (USD)"
                name="spent"
                type="number"
                min="0"
                step="0.01"
                defaultValue={(campaign.spent || 0) / 100}
              />
              <Field
                label="Impressions"
                name="impressions"
                type="number"
                min="0"
                defaultValue={campaign.impressions || 0}
              />
              <Field
                label="Clicks"
                name="clicks"
                type="number"
                min="0"
                defaultValue={campaign.clicks || 0}
              />
            </div>
          </Form>
        </Modal>
      )}
      {promo && (
        <Modal title="Create a promotion" onClose={() => setPromo(false)}>
          <Form
            submit="Create promotion"
            onCancel={() => setPromo(false)}
            onSubmit={async (d) => {
              await mutate("promotions", {
                ...d,
                percent: Number(d.percent),
                max_uses: Number(d.max_uses),
              });
              setPromo(false);
            }}
          >
            <Field
              label="Code"
              name="code"
              placeholder="FRESH10"
              required
              minLength={3}
              maxLength={30}
            />
            <div className="field-grid">
              <Field
                label="Discount (%)"
                name="percent"
                type="number"
                min="1"
                max="80"
                required
              />
              <Field
                label="Maximum redemptions"
                name="max_uses"
                type="number"
                min="1"
                max="100000"
                defaultValue="100"
                required
              />
            </div>
            <Field
              label="Expires"
              name="expires"
              type="date"
              min={today()}
              required
            />
          </Form>
        </Modal>
      )}
    </>
  );
}
function Messages({ data, mutate }) {
  const [tab, setTab] = useState("inbox"),
    [compose, setCompose] = useState(false),
    [thread, setThread] = useState(null);
  const threads = [
    ...new Map(
      data.conversations.map((m) => [
        m.user_id,
        { id: m.user_id, name: m.name },
      ]),
    ).values(),
  ];
  const current = thread || threads[0]?.id;
  return (
    <>
      <PageHeading
        title="Messages"
        text="Stay close to your customers, wherever the day takes you."
      >
        <Button onClick={() => setCompose(true)}>
          <Plus size={16} /> Draft a message
        </Button>
      </PageHeading>
      <div className="category-tabs">
        {[
          ["inbox", "Customer inbox"],
          ["outbox", "SMS, WhatsApp & email"],
        ].map(([t, name]) => (
          <button
            className={t === tab ? "selected" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {name}
          </button>
        ))}
      </div>
      {tab === "inbox" ? (
        <div className="panel inbox-layout">
          <div className="thread-list">
            {threads.map((t) => (
              <button
                className={current === t.id ? "active" : ""}
                key={t.id}
                onClick={() => setThread(t.id)}
              >
                <span className="small-avatar">{t.name[0]}</span>
                <span>
                  <strong>{t.name}</strong>
                  <small>Customer conversation</small>
                </span>
              </button>
            ))}
            {!threads.length && <p className="muted">No conversations yet.</p>}
          </div>
          <div className="inbox-conversation">
            {current ? (
              <>
                <div className="chat-messages">
                  {data.conversations
                    .filter((m) => m.user_id === current)
                    .map((m) => (
                      <div
                        key={m.id}
                        className={
                          "chat-bubble " + (m.from_staff ? "staff" : "")
                        }
                      >
                        <small>
                          {m.from_staff ? "REAP team" : m.name} ·{" "}
                          {day(m.created_at)}
                        </small>
                        <p>{m.body}</p>
                      </div>
                    ))}
                </div>
                <Form
                  submit="Send reply"
                  onSubmit={(d) =>
                    mutate(
                      "reply",
                      { user_id: current, body: d.body },
                      "Reply sent to the customer inbox",
                    )
                  }
                >
                  <Field label="Reply">
                    <textarea name="body" required maxLength={2000} rows={3} />
                  </Field>
                </Form>
              </>
            ) : (
              <Empty
                title="A conversation starts with a hello"
                text="Customer messages will appear here."
              />
            )}
          </div>
        </div>
      ) : (
        <>
          <Notice>
            Messages start as drafts. Provider accounts must be connected before
            sending. “Accepted” means accepted by the provider, not confirmed as
            delivered.
          </Notice>
          <div className="panel space-top">
            <Table
              columns={[
                "Recipient",
                "Channel",
                "Subject",
                "Purpose",
                "Status",
                "",
              ]}
              rows={data.messages.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.customer_name}</strong>
                    <small className="block">
                      {m.channel === "email" ? m.email : m.phone}
                    </small>
                  </td>
                  <td>{label(m.channel)}</td>
                  <td>
                    <details>
                      <summary>{m.subject}</summary>
                      <p>{m.body}</p>
                    </details>
                  </td>
                  <td>{label(m.purpose)}</td>
                  <td>
                    <Badge value={m.status} />
                  </td>
                  <td>
                    {m.status === "draft" &&
                    data.integrations?.enabled &&
                    data.integrations[m.channel] ? (
                      <ConfirmButton
                        message={`Send this ${m.channel} message to ${m.channel === "email" ? m.email : m.phone}?`}
                        onConfirm={() =>
                          mutate(
                            "send-message",
                            { id: m.id },
                            "Message accepted by provider",
                          )
                        }
                      >
                        Send message
                      </ConfirmButton>
                    ) : (
                      <span className="muted small">
                        {m.status === "draft"
                          ? "Provider required"
                          : "Recorded"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            />
          </div>
        </>
      )}
      {compose && (
        <Modal
          title="Draft a customer message"
          onClose={() => setCompose(false)}
        >
          <Form
            submit="Save draft"
            onCancel={() => setCompose(false)}
            onSubmit={async (d) => {
              await mutate("messages", d, "Message saved as draft");
              setCompose(false);
              setTab("outbox");
            }}
          >
            <Field label="Recipient">
              <select name="customer_id" required>
                <option value="">Choose a customer</option>
                {data.customers.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name} — {c.email}
                  </option>
                ))}
              </select>
            </Field>
            <div className="field-grid">
              <Field label="Channel">
                <select name="channel">
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </Field>
              <Field label="Purpose">
                <select name="purpose">
                  <option value="transactional">Order / service update</option>
                  <option value="marketing">
                    Marketing (consent required)
                  </option>
                </select>
              </Field>
            </div>
            <Field label="Subject" name="subject" required maxLength={200} />
            <Field label="Message">
              <textarea name="body" rows={5} required maxLength={3000} />
            </Field>
          </Form>
        </Modal>
      )}
    </>
  );
}
function Reports({ data }) {
  const { notify } = useApp();
  const [report, setReport] = useState(data.reports),
    [from, setFrom] = useState(data.reports.from),
    [to, setTo] = useState(data.reports.to),
    [busy, setBusy] = useState(false);
  return (
    <>
      <PageHeading
        title="Reports & analytics"
        text="Make room for better decisions."
      >
        <form
          className="report-range"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              setReport(await api("/admin/reports?from=" + from + "&to=" + to));
            } catch (e) {
              notify(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <input
            type="date"
            aria-label="Report start date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            required
          />
          <span>to</span>
          <input
            type="date"
            aria-label="Report end date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            required
          />
          <Button disabled={busy}>Apply</Button>
        </form>
      </PageHeading>
      <div className="metrics-grid">
        <Metric
          title="Order value"
          value={money(report.sales)}
          detail="Orders placed in selected dates"
          Icon={ShoppingBag}
        />
        <Metric
          title="Cash received, net"
          value={money(report.receipts)}
          detail="Receipts less refunds in selected dates"
          Icon={ArrowDownLeft}
        />
        <Metric
          title="Expenses"
          value={money(report.expenses)}
          detail="Recorded in selected dates"
          Icon={Wallet}
        />
        <Metric
          title="Cash surplus"
          value={money(report.cash_surplus)}
          detail="Net receipts less expenses"
          Icon={TrendingUp}
          tone="highlight"
        />
      </div>
      <section className="panel">
        <div className="panel-title">
          <h2>Order value over time</h2>
          <span className="muted small">
            {day(report.from)} — {day(report.to)}
          </span>
        </div>
        <SalesChart report={report} />
      </section>
      <div className="dashboard-bottom space-top">
        <section className="panel">
          <div className="panel-title">
            <h2>Product performance</h2>
          </div>
          <Table
            columns={["Product", "Units sold", "Gross item value"]}
            rows={report.top.map((p) => (
              <tr key={p.name}>
                <td>{p.name}</td>
                <td>{p.quantity}</td>
                <td className="amount">{money(p.total)}</td>
              </tr>
            ))}
          />
        </section>
        <section className="panel report-notes">
          <ChartNoAxesCombined size={28} />
          <h2>Know what the numbers mean.</h2>
          <p>
            Order value includes fulfillment fees and discounts on orders placed
            in the selected period. Item rankings show values before order-level
            discounts.
          </p>
          <p>
            Cash receipts follow payment dates. Outstanding balances include all
            uncancelled orders.
          </p>
          <p>
            Cash surplus excludes unrecorded expenses, inventory costs and
            taxes. It is not a profit statement.
          </p>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer size={16} /> Print report
          </Button>
        </section>
      </div>
    </>
  );
}
function Team({ data, mutate }) {
  const { user } = useApp();
  const [add, setAdd] = useState(false),
    [edit, setEdit] = useState(null);
  const descriptions = {
    admin: "Full workspace access, finance, team and settings.",
    manager:
      "Products, inventory, orders, customers, deliveries and marketing.",
    sales: "Orders, customer records and communications.",
    dispatch: "Delivery assignments and fulfillment updates.",
    accountant: "Payments, expenses, invoices and financial reports.",
  };
  return (
    <>
      <PageHeading
        title="Team & access"
        text="The right access for every pair of helping hands."
      >
        <Button onClick={() => setAdd(true)}>
          <Plus size={16} /> Add team member
        </Button>
      </PageHeading>
      <div className="panel">
        <Table
          columns={["Team member", "Role", "Access", ""]}
          rows={data.team.map((t) => (
            <tr key={t.id}>
              <td>
                <div className="table-person">
                  <span className="small-avatar">{t.name[0]}</span>
                  <span>
                    <strong>
                      {t.name}
                      {t.id === user.id ? " (you)" : ""}
                    </strong>
                    <small>{t.email}</small>
                  </span>
                </div>
              </td>
              <td>{label(t.role)}</td>
              <td>
                <Badge value={t.active ? "active" : "disabled"} />
              </td>
              <td>
                {t.id !== user.id && (
                  <Button variant="outline small" onClick={() => setEdit(t)}>
                    Manage access
                  </Button>
                )}
              </td>
            </tr>
          ))}
        />
      </div>
      <div className="role-grid">
        {Object.entries(descriptions).map(([r, d]) => (
          <div className="panel" key={r}>
            <ShieldCheck size={20} />
            <h3>{label(r)}</h3>
            <p>{d}</p>
          </div>
        ))}
      </div>
      {add && (
        <Modal title="Add a team member" onClose={() => setAdd(false)}>
          <Form
            submit="Create staff account"
            onCancel={() => setAdd(false)}
            onSubmit={async (d) => {
              await mutate("team", d, "Staff account created");
              setAdd(false);
            }}
          >
            <Field name="name" label="Full name" required />
            <Field name="email" label="Work email" type="email" required />
            <Field label="Role">
              <select name="role" defaultValue="sales">
                {Object.keys(descriptions).map((r) => (
                  <option value={r} key={r}>
                    {label(r)}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              name="password"
              label="Initial password"
              type="password"
              minLength={12}
              maxLength={128}
              required
              autoComplete="new-password"
              hint="At least 12 characters. Share privately with the staff member and ask them to change it in Settings."
            />
          </Form>
        </Modal>
      )}
      {edit && (
        <Modal title={"Access for " + edit.name} onClose={() => setEdit(null)}>
          <Form
            onSubmit={async (d) => {
              await mutate("team-access", {
                id: edit.id,
                role: d.role,
                active: d.active === "on",
              });
              setEdit(null);
            }}
          >
            <Field label="Role">
              <select name="role" defaultValue={edit.role}>
                {Object.keys(descriptions).map((r) => (
                  <option value={r} key={r}>
                    {label(r)}
                  </option>
                ))}
              </select>
            </Field>
            <label className="checkbox">
              <input
                name="active"
                type="checkbox"
                defaultChecked={edit.active}
              />{" "}
              Allow this staff member to sign in
            </label>
            <p className="fine-print">
              Saving changes signs this person out of every existing session.
            </p>
          </Form>
        </Modal>
      )}
    </>
  );
}
function SettingsPage({ data }) {
  const { config, user, signIn, notify } = useApp();
  return (
    <>
      <PageHeading
        title="Settings"
        text="A dependable foundation for your market."
      />
      <div className="settings-grid">
        <section className="panel settings-card">
          <div className="panel-title">
            <h2>Business profile</h2>
            <Leaf size={20} />
          </div>
          <div className="settings-value">
            <small>MARKET</small>
            <strong>{config.brand}</strong>
          </div>
          <div className="settings-value">
            <small>PICKUP ADDRESS</small>
            <strong>{config.pickup_address}</strong>
          </div>
          <div className="settings-value">
            <small>DELIVERY AREA</small>
            <strong>{config.delivery_area}</strong>
          </div>
          <div className="settings-value">
            <small>CURRENCY / DELIVERY FEE</small>
            <strong>USD / {money(config.delivery_fee)}</strong>
          </div>
          <a
            className="text-link"
            href="https://www.reapwestafrica.org/"
            target="_blank"
            rel="noreferrer"
          >
            Official REAP website <ArrowUpRight size={15} />
          </a>
        </section>
        <section className="panel settings-card">
          <div className="panel-title">
            <h2>Connected services</h2>
            <Settings size={20} />
          </div>
          {[
            ["email", "Email · Resend"],
            ["sms", "SMS · Twilio"],
            ["whatsapp", "WhatsApp · Twilio"],
          ].map(([key, n]) => (
            <div className="integration-row" key={key}>
              <span>{n}</span>
              <Badge
                value={data.integrations?.[key] ? "connected" : "not_connected"}
              />
            </div>
          ))}
          <div className="integration-row">
            <span>Payment collection</span>
            <Badge value="manual_verification" />
          </div>
          <div className="integration-row">
            <span>Social advertising</span>
            <Badge value="manual_reporting" />
          </div>
          <p className="fine-print">
            Provider credentials are configured securely on the server. Outbound
            messages are {data.integrations?.enabled ? "enabled" : "disabled"}.
          </p>
        </section>
        <section className="panel settings-card">
          <h2>Account security</h2>
          <Form
            submit="Change password"
            onSubmit={async (d) => {
              signIn(await api("/auth/password", d));
              notify("Password updated. Other sessions have been signed out.");
            }}
          >
            <Field
              label="Current password"
              name="current_password"
              type="password"
              required
              autoComplete="current-password"
            />
            <Field
              label="New password"
              name="new_password"
              type="password"
              minLength={12}
              maxLength={128}
              required
              autoComplete="new-password"
              hint="At least 12 characters."
            />
          </Form>
        </section>
        <section className="panel settings-card">
          <h2>Workspace safeguards</h2>
          {[
            "Staff permissions enforced by the server",
            "Stock reservations recorded atomically",
            "Session cookies protected from scripts",
            "Payment and stock changes recorded in the audit log",
            "Demonstration and live databases kept separate",
          ].map((t) => (
            <div className="security-check" key={t}>
              <CircleCheck size={17} />
              <span>{t}</span>
            </div>
          ))}
        </section>
      </div>
      <section className="panel space-top">
        <div className="panel-title">
          <h2>Recent audit history</h2>
          <span className="muted small">Latest 80 events</span>
        </div>
        <Table
          columns={["When", "Team member", "Action", "Details"]}
          rows={data.audit.map((a) => (
            <tr key={a.id}>
              <td>{new Date(a.created_at).toLocaleString("en-GB")}</td>
              <td>{a.actor_name || "Guest"}</td>
              <td>{label(a.action)}</td>
              <td>{a.detail || a.target}</td>
            </tr>
          ))}
        />
      </section>
    </>
  );
}

function PersonalSecurity() {
  const { signIn, notify } = useApp();
  return (
    <>
      <PageHeading
        title="Account security"
        text="Keep your workspace account protected."
      />
      <section className="panel settings-card security-panel">
        <Form
          submit="Change password"
          onSubmit={async (d) => {
            signIn(await api("/auth/password", d));
            notify("Password updated. Other sessions have been signed out.");
          }}
        >
          <Field
            label="Current password"
            name="current_password"
            type="password"
            required
            autoComplete="current-password"
          />
          <Field
            label="New password"
            name="new_password"
            type="password"
            minLength={12}
            maxLength={128}
            required
            autoComplete="new-password"
            hint="At least 12 characters."
          />
        </Form>
      </section>
    </>
  );
}
