import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { CheckCircle2, X, AlertTriangle } from "lucide-react";
import { AppContext, api, setCSRF, go } from "./context";
import { Loading, Button } from "./ui";
import { Storefront } from "./storefront";
import { Admin } from "./admin";
import "./styles.css";

class Boundary extends React.Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="fatal">
        <AlertTriangle />
        <h1>Let’s get you back to the market.</h1>
        <p>There was a problem displaying this page.</p>
        <Button
          onClick={() => {
            window.location.hash = "#/";
            window.location.reload();
          }}
        >
          Reload market
        </Button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function App() {
  const [config, setConfig] = useState(null),
    [user, setUser] = useState(null),
    [products, setProducts] = useState([]),
    [route, setRoute] = useState(location.hash.slice(1) || "/"),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const [cart, setCart] = useState(() => {
    try {
      const c = JSON.parse(localStorage.getItem("reap-cart") || "[]");
      return Array.isArray(c)
        ? c
            .filter(
              (i) =>
                typeof i.product_id === "string" &&
                Number.isInteger(i.quantity) &&
                i.quantity > 0,
            )
            .slice(0, 30)
        : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    const handler = () => {
      setRoute(location.hash.slice(1) || "/");
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    Promise.all([api("/config"), api("/session"), api("/products")])
      .then(([c, s, p]) => {
        setConfig(c);
        setUser(s.user);
        setCSRF(s.csrf);
        setProducts(p);
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("reap-cart", JSON.stringify(cart));
    } catch {}
  }, [cart]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4200);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const refreshProducts = async () => setProducts(await api("/products"));
  const signIn = (s) => {
    setCSRF(s.csrf);
    setUser(s.user);
    setToast("");
  };
  const logout = async () => {
    try {
      await api("/auth/logout", {});
      setUser(null);
      setCSRF(null);
      go("/");
      setToast("You have been signed out.");
    } catch (e) {
      setToast(e.message);
    }
  };
  const addToCart = (product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      const qty = Math.min(product.stock, (existing?.quantity || 0) + quantity);
      if (!qty) return prev;
      return existing
        ? prev.map((i) =>
            i.product_id === product.id ? { ...i, quantity: qty } : i,
          )
        : [...prev, { product_id: product.id, quantity: qty }];
    });
    setToast(`${product.name} added to your basket`);
  };
  if (error)
    return (
      <div className="fatal">
        <AlertTriangle />
        <h1>We couldn’t connect.</h1>
        <p>{error}</p>
        <Button onClick={() => location.reload()}>Try again</Button>
      </div>
    );
  if (!config) return <Loading />;
  return (
    <AppContext.Provider
      value={{
        config,
        user,
        products,
        route,
        cart,
        setCart,
        addToCart,
        refreshProducts,
        signIn,
        logout,
        notify: setToast,
      }}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {route.startsWith("/admin") ? <Admin /> : <Storefront />}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={20} />
          <span>{toast}</span>
          <button
            onClick={() => setToast("")}
            aria-label="Dismiss notification"
          >
            <X size={17} />
          </button>
        </div>
      )}
    </AppContext.Provider>
  );
}
createRoot(document.getElementById("root")).render(
  <Boundary>
    <App />
  </Boundary>,
);
