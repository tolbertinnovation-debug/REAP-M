import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  ShoppingBag,
  UserRound,
  MapPin,
  Truck,
  Leaf,
  Fish,
  Beef,
  Sprout,
  Package,
  ShieldCheck,
  Menu,
  X,
  Plus,
  Minus,
  Trash2,
  Check,
  ChevronRight,
  Heart,
  Clock,
  MessageCircle,
  Mail,
  Copy,
  Printer,
  LogOut,
  SlidersHorizontal,
  ArrowLeft,
  CalendarDays,
  Building2,
} from "lucide-react";
import { useApp, api, money, day, today, go, label } from "./context";
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
  Breadcrumb,
} from "./ui";

const categoryIcons = {
  "Pork & livestock": Beef,
  "Fish & aquaculture": Fish,
  Aquaponics: Sprout,
  "Fresh produce": Leaf,
  "Farm supplies": Package,
  Services: Building2,
};
export function Storefront() {
  const { route, config } = useApp();
  const page = route.split("?")[0];
  return (
    <>
      <Header />
      {config.demo && (
        <div className="demo-ribbon">
          <span className="status-dot" />
          Demo market · Sample prices & orders · No real payments{" "}
          <a href="#/admin">
            Explore dashboard <ArrowUpRight size={13} />
          </a>
        </div>
      )}
      <main id="main-content">
        {page === "/" ? (
          <Home />
        ) : page === "/shop" ? (
          <Shop />
        ) : page === "/basket" ? (
          <Basket />
        ) : page === "/track" ? (
          <Track />
        ) : page === "/account" ? (
          <Account />
        ) : page === "/about" ? (
          <About />
        ) : page === "/help" ? (
          <Help />
        ) : page === "/privacy" ? (
          <Privacy />
        ) : page === "/credits" ? (
          <Credits />
        ) : (
          <div className="container section">
            <Empty
              title="Page not found"
              text="Let’s find what you’re looking for."
            >
              <Button onClick={() => go("/")}>Back to the market</Button>
            </Empty>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
function Header() {
  const { user, cart, route } = useApp();
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [route]);
  return (
    <>
      <div className="topbar">
        <span>
          <Sprout size={14} /> Rooted in Liberia. Growing opportunity.
        </span>
        <a href="#/help">
          Pickup & delivery <ArrowRight size={13} />
        </a>
      </div>
      <header className="store-header">
        <div className="header-inner">
          <Brand />
          <nav className={menu ? "open" : ""} aria-label="Main navigation">
            <a className={route === "/" ? "active" : ""} href="#/">
              Home
            </a>
            <a
              className={route.startsWith("/shop") ? "active" : ""}
              href="#/shop"
            >
              Shop the harvest
            </a>
            <a className={route === "/about" ? "active" : ""} href="#/about">
              Our purpose
            </a>
            <a className={route === "/track" ? "active" : ""} href="#/track">
              Track an order
            </a>
          </nav>
          <div className="header-tools">
            <a
              href="#/account"
              className="account-link"
              aria-label="My account"
            >
              <UserRound size={20} />
              <span>
                {user?.role === "customer"
                  ? user.name.split(" ")[0]
                  : "Account"}
              </span>
            </a>
            <a
              href="#/basket"
              className="basket-link"
              aria-label={`Basket, ${cart.reduce((n, i) => n + i.quantity, 0)} items`}
            >
              <ShoppingBag size={20} />
              <span>Basket</span>
              <b>{cart.reduce((n, i) => n + i.quantity, 0)}</b>
            </a>
            <button
              className="icon-btn menu-toggle"
              onClick={() => setMenu(!menu)}
              aria-label="Toggle navigation"
              aria-expanded={menu}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
function Home() {
  const { products, config } = useApp();
  const [query, setQuery] = useState("");
  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="small-line" /> FROM OUR COMMUNITY TO YOUR TABLE
          </div>
          <h1>
            Good food.
            <br />
            <em>Greater purpose.</em>
          </h1>
          <p>
            Fresh harvests. Locally raised livestock.
            <br className="desktop-break" /> A marketplace that grows with our
            community.
          </p>
          <div className="hero-actions">
            <Button onClick={() => go("/shop")}>
              Shop the harvest <ArrowUpRight size={18} />
            </Button>
            <a className="text-link" href="#/about">
              Discover our story <ArrowRight size={16} />
            </a>
          </div>
          <div className="hero-note">
            <div className="mini-leaf">
              <Sprout size={25} />
            </div>
            <span>
              Rooted in Bentol City, Liberia
              <br />
              <strong>Part of the REAP community</strong>
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <img
            src="/assets/hero.jpg"
            alt="A colourful selection of fresh farm produce"
            fetchPriority="high"
          />
          <div className="hero-shade" />
          <div className="harvest-label">
            <span className="status-dot" /> A FRESH WAY TO SHOP LOCAL
          </div>
          <div className="hero-image-caption">
            <span>
              Small beginnings.
              <br />
              <strong>A better tomorrow.</strong>
            </span>
            <a href="#/shop" aria-label="Explore our products">
              <ArrowUpRight size={28} />
            </a>
          </div>
          <div className="round-stamp">
            <Sprout size={24} />
            <span>
              GROWING
              <br />
              WITH PURPOSE
            </span>
          </div>
        </div>
      </section>
      <section className="benefits container" aria-label="Market benefits">
        {[
          [Leaf, "From farm to you", "A thoughtfully selected harvest"],
          [Truck, "Your order, your way", "Choose delivery or farm pickup"],
          [ShieldCheck, "Stay in the know", "Follow your order at every step"],
          [Heart, "A purpose in every purchase", "Connected to our community"],
        ].map(([Icon, title, text]) => (
          <div key={title}>
            <Icon size={26} strokeWidth={1.5} />
            <span>
              <strong>{title}</strong>
              <small>{text}</small>
            </span>
          </div>
        ))}
      </section>
      <section className="container section">
        <div className="section-title">
          <div>
            <span className="eyebrow">FIND YOUR FRESH</span>
            <h2>Something good for every table.</h2>
          </div>
          <a className="text-link" href="#/shop">
            Explore all products <ArrowRight size={17} />
          </a>
        </div>
        <div className="category-grid">
          {[
            ["Pork & livestock", "Live pigs & fresh cuts", Beef, "peach"],
            ["Fish & aquaculture", "Fresh from the water", Fish, "blue"],
            ["Aquaponics", "Thoughtfully grown greens", Sprout, "sage"],
            ["Fresh produce", "The colours of the harvest", Leaf, "yellow"],
          ].map(([name, sub, Icon, color]) => (
            <a
              href={"#/shop?category=" + encodeURIComponent(name)}
              className={"category-card " + color}
              key={name}
            >
              <span className="category-icon">
                <Icon size={32} strokeWidth={1.4} />
              </span>
              <div>
                <h3>{name}</h3>
                <p>{sub}</p>
              </div>
              <ArrowUpRight size={19} />
            </a>
          ))}
        </div>
      </section>
      <section className="container products-section">
        <div className="section-title">
          <div>
            <span className="eyebrow">THE MARKET EDIT</span>
            <h2>Meet your next fresh favourites.</h2>
          </div>
          <a href="#/shop" className="text-link">
            Shop all <ArrowRight size={17} />
          </a>
        </div>
        {products.length ? (
          <div className="product-grid">
            {products
              .filter((p) => p.featured)
              .slice(0, 4)
              .map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
          </div>
        ) : (
          <Empty
            title="The next harvest is on its way"
            text="Our team is preparing the catalogue. Please check back soon."
          />
        )}
      </section>
      <section className="purpose-banner container">
        <div className="purpose-photo">
          <img
            src="/assets/reap-community.jpg"
            alt="Members of the REAP community in Liberia"
            loading="lazy"
          />
          <span>THE PEOPLE BEHIND THE PURPOSE</span>
        </div>
        <div className="purpose-copy">
          <span className="eyebrow">MORE THAN A MARKETPLACE</span>
          <h2>
            When a community grows,
            <br />
            <em>we all grow.</em>
          </h2>
          <p>
            REAP connects education, practical skills and agricultural
            opportunity in Liberia. This marketplace brings that spirit to the
            everyday choices we make.
          </p>
          <a href="#/about" className="btn cream">
            Get to know REAP <ArrowUpRight size={18} />
          </a>
        </div>
      </section>
      <section className="container how-section">
        <span className="eyebrow">FRESH MADE SIMPLE</span>
        <h2>From your first click to your doorstep.</h2>
        <div className="how-grid">
          {[
            [
              "01",
              "Find your favourites",
              "Browse livestock, fish, fresh produce and farm supplies.",
              ShoppingBag,
            ],
            [
              "02",
              "Make it your order",
              "Choose quantities, your preferred date and delivery or pickup.",
              CalendarDays,
            ],
            [
              "03",
              "We’ll take it from here",
              "Keep your tracking code and follow your order’s progress.",
              Truck,
            ],
          ].map(([n, title, text, Icon]) => (
            <div key={n}>
              <span className="step-number" aria-hidden="true">
                {n}
              </span>
              <Icon size={25} />
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
export function ProductCard({ product: p }) {
  const { addToCart } = useApp();
  const [detail, setDetail] = useState(false);
  return (
    <article className="product-card">
      <button
        className="product-image"
        onClick={() => setDetail(true)}
        aria-label={`View ${p.name}`}
      >
        <img src={p.image} alt={p.name} loading="lazy" />
        <span className={"product-tag " + (p.stock === 0 ? "sold" : "")}>
          {p.stock === 0
            ? "Out of stock"
            : p.category === "Aquaponics"
              ? "Grown with care"
              : p.stock <= p.threshold
                ? "Limited harvest"
                : "Farm selection"}
        </span>
        <span className="product-detail-arrow">
          <ArrowUpRight size={18} />
        </span>
      </button>
      <div className="product-info">
        <span className="product-category">{p.category}</span>
        <button className="product-title" onClick={() => setDetail(true)}>
          {p.name}
        </button>
        <div className="product-bottom">
          <span>
            <strong>{money(p.price)}</strong>
            <small> / {p.unit}</small>
          </span>
          <button
            className="add-btn"
            onClick={() => addToCart(p)}
            disabled={!p.stock}
            aria-label={`Add ${p.name} to basket`}
          >
            <Plus size={21} />
          </button>
        </div>
      </div>
      {detail && (
        <Modal title={p.name} onClose={() => setDetail(false)}>
          <img className="detail-image" src={p.image} alt={p.name} />
          <Badge value={p.stock ? "available" : "out_of_stock"} />
          <p>{p.description}</p>
          <div className="detail-price">
            {money(p.price)} <small>per {p.unit}</small>
          </div>
          <p className="muted">
            {p.stock} {p.unit} available · USD
          </p>
          <Button
            disabled={!p.stock}
            onClick={() => {
              addToCart(p);
              setDetail(false);
            }}
          >
            Add to basket <Plus size={18} />
          </Button>
        </Modal>
      )}
    </article>
  );
}
function Shop() {
  const { products, route, config } = useApp();
  const params = new URLSearchParams(route.split("?")[1]);
  const [category, setCategory] = useState(
      params.get("category") || "All products",
    ),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("featured");
  useEffect(() => {
    setCategory(
      new URLSearchParams(route.split("?")[1]).get("category") ||
        "All products",
    );
  }, [route]);
  const visible = products
    .filter(
      (p) =>
        (category === "All products" || p.category === category) &&
        (p.name + " " + p.description)
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "price-low"
        ? a.price - b.price
        : sort === "price-high"
          ? b.price - a.price
          : sort === "name"
            ? a.name.localeCompare(b.name)
            : b.featured - a.featured,
    );
  return (
    <div className="container shop-page">
      <Breadcrumb current="Shop the harvest" />
      <div className="shop-intro">
        <span className="eyebrow">FRESH FINDS. LOCAL ROOTS.</span>
        <h1>
          The good things
          <br />
          <em>start here.</em>
        </h1>
        <p>
          Explore our harvest, meet your favourites,
          <br />
          and make room for something fresh.
        </p>
        <Sprout className="shop-sprout" strokeWidth={0.7} />
      </div>
      <div className="shop-toolbar">
        <div className="search-input">
          <Search size={18} />
          <input
            aria-label="Search products"
            placeholder="What’s on your shopping list?"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="sort-label">
          Sort by{" "}
          <select
            aria-label="Sort products"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="featured">Featured</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>
      <div
        className="category-tabs"
        role="group"
        aria-label="Product categories"
      >
        {["All products", ...config.categories].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={c === category ? "selected" : ""}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="results-caption">
        <span>{visible.length} products</span>
        <span>Prices in USD · Sold by the listed unit</span>
      </div>
      {visible.length ? (
        <div className="product-grid shop-grid">
          {visible.map((p) => (
            <ProductCard product={p} key={p.id} />
          ))}
        </div>
      ) : (
        <Empty
          title="No products found"
          text="Try another category or a different search."
        >
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setCategory("All products");
            }}
          >
            Clear filters
          </Button>
        </Empty>
      )}
      <div className="bulk-banner">
        <Building2 size={30} />
        <div>
          <h3>A bigger order in mind?</h3>
          <p>Planning for a restaurant, event or business? Talk to our team.</p>
        </div>
        <a href="#/help" className="btn outline">
          Let’s talk <ArrowUpRight size={17} />
        </a>
      </div>
    </div>
  );
}

function Basket() {
  const { cart, setCart, products, user, config, refreshProducts, notify } =
    useApp();
  const [step, setStep] = useState(1),
    [fulfillment, setFulfillment] = useState("pickup"),
    [promo, setPromo] = useState(""),
    [quote, setQuote] = useState(null),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(null),
    [requestId] = useState(() => crypto.randomUUID());
  const items = cart
    .map((c) => ({
      ...products.find((p) => p.id === c.product_id),
      quantity: c.quantity,
    }))
    .filter((p) => p.id);
  const subtotal = items.reduce((s, p) => s + p.price * p.quantity, 0);
  useEffect(() => {
    setQuote(null);
    setError("");
  }, [cart, fulfillment, promo]);
  const totals = quote || {
    subtotal,
    discount: 0,
    delivery_fee: fulfillment === "delivery" ? config.delivery_fee : 0,
    total: subtotal + (fulfillment === "delivery" ? config.delivery_fee : 0),
  };
  async function review() {
    try {
      setQuote(
        await api("/quote", { items: cart, fulfillment, promo_code: promo }),
      );
      setError("");
      setStep(2);
    } catch (e) {
      setError(e.message);
    }
  }
  if (success)
    return (
      <div className="container confirmation">
        <div className="success-icon">
          <Check size={37} />
        </div>
        <span className="eyebrow">THANK YOU FOR SHOPPING LOCAL</span>
        <h1>Your order is in.</h1>
        <p>
          We’ve received <strong>{success.number}</strong>. Our team will review
          your order and confirm the arrangements.
        </p>
        {config.demo && (
          <Notice>
            This is a demonstration order. No real goods or payments are
            involved.
          </Notice>
        )}
        <div className="tracking-code">
          <span>SAVE YOUR PRIVATE TRACKING CODE</span>
          <code>{success.tracking_token}</code>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(success.tracking_token);
                notify("Tracking code copied");
              } catch {
                notify("Select and copy the tracking code.");
              }
            }}
          >
            <Copy size={16} /> Copy code
          </Button>
          <small>
            Keep this code safe. Anyone with it can view your order.
          </small>
        </div>
        <OrderDetails order={success} />
        <div className="center-actions">
          <Button onClick={() => go("/shop")}>
            Continue shopping <ArrowRight size={17} />
          </Button>
        </div>
      </div>
    );
  return (
    <div className="container basket-page">
      <Breadcrumb current="Your basket" />
      <div className="section-title">
        <div>
          <span className="eyebrow">A LITTLE FRESHNESS GOES A LONG WAY</span>
          <h1>
            Your basket<span className="count-label">{cart.length}</span>
          </h1>
        </div>
        <a className="text-link" href="#/shop">
          <ArrowLeft size={15} /> Keep shopping
        </a>
      </div>
      {!items.length ? (
        <Empty
          title="Your next fresh find is waiting"
          text="Add something good to your basket to get started."
        >
          <Button onClick={() => go("/shop")}>
            Explore the harvest <ArrowRight size={17} />
          </Button>
        </Empty>
      ) : (
        <>
          <div className="checkout-steps">
            <span className={step === 1 ? "current" : "done"}>
              <b>{step === 1 ? "1" : <Check size={13} />}</b> Your basket
            </span>
            <ChevronRight size={16} />
            <span className={step === 2 ? "current" : ""}>
              <b>2</b> Contact & checkout
            </span>
          </div>
          <div className="checkout-layout">
            <div>
              {step === 1 ? (
                <>
                  <div className="basket-items">
                    {items.map((p) => (
                      <div className="basket-item" key={p.id}>
                        <img src={p.image} alt={p.name} />
                        <div>
                          <small>{p.category}</small>
                          <h3>{p.name}</h3>
                          <p>
                            {money(p.price)} / {p.unit}
                          </p>
                          <div className="quantity-picker">
                            <button
                              onClick={() =>
                                setCart(
                                  cart.map((i) =>
                                    i.product_id === p.id
                                      ? {
                                          ...i,
                                          quantity: Math.max(1, i.quantity - 1),
                                        }
                                      : i,
                                  ),
                                )
                              }
                              aria-label={`Reduce ${p.name} quantity`}
                            >
                              <Minus size={14} />
                            </button>
                            <span>{p.quantity}</span>
                            <button
                              disabled={p.quantity >= p.stock}
                              onClick={() =>
                                setCart(
                                  cart.map((i) =>
                                    i.product_id === p.id
                                      ? { ...i, quantity: i.quantity + 1 }
                                      : i,
                                  ),
                                )
                              }
                              aria-label={`Increase ${p.name} quantity`}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="basket-item-end">
                          <strong>{money(p.price * p.quantity)}</strong>
                          <button
                            className="icon-btn"
                            aria-label={`Remove ${p.name}`}
                            onClick={() =>
                              setCart(cart.filter((i) => i.product_id !== p.id))
                            }
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="fulfillment">
                    <h3>How would you like your order?</h3>
                    <div className="delivery-options">
                      {[
                        [
                          "pickup",
                          MapPin,
                          "Farm pickup",
                          "Collect from REAP in Bentol City",
                        ],
                        ["delivery", Truck, "Delivery", config.delivery_area],
                      ].map(([value, Icon, title, text]) => (
                        <label
                          className={fulfillment === value ? "selected" : ""}
                          key={value}
                        >
                          <input
                            type="radio"
                            name="fulfillment"
                            value={value}
                            checked={fulfillment === value}
                            onChange={() => setFulfillment(value)}
                          />
                          <Icon size={22} />
                          <span>
                            <strong>{title}</strong>
                            <small>{text}</small>
                          </span>
                          <b>
                            {value === "pickup"
                              ? "Free"
                              : money(config.delivery_fee)}
                          </b>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="checkout-form">
                  <button className="text-link" onClick={() => setStep(1)}>
                    <ArrowLeft size={16} /> Back to basket
                  </button>
                  <h2>A few details, and you’re set.</h2>
                  <Form
                    submit={config.demo ? "Place demo order" : "Place order"}
                    onSubmit={async (d) => {
                      const o = await api("/orders", {
                        ...d,
                        email: user?.role === "customer" ? user.email : d.email,
                        items: cart,
                        fulfillment,
                        promo_code: promo,
                        marketing_opt_in: d.marketing_opt_in === "on",
                        idempotency_key: requestId,
                      });
                      setSuccess(o);
                      setCart([]);
                      await refreshProducts();
                      window.scrollTo(0, 0);
                    }}
                  >
                    <div className="field-grid">
                      <Field
                        label="Full name"
                        name="name"
                        defaultValue={
                          user?.role === "customer" ? user.name : ""
                        }
                        autoComplete="name"
                        required
                        maxLength={100}
                      />
                      <Field
                        label="Email address"
                        name="email"
                        type="email"
                        defaultValue={
                          user?.role === "customer" ? user.email : ""
                        }
                        readOnly={user?.role === "customer"}
                        autoComplete="email"
                        required
                      />
                    </div>
                    <div className="field-grid">
                      <Field
                        label="Phone number"
                        name="phone"
                        type="tel"
                        placeholder="+231…"
                        autoComplete="tel"
                        required
                        minLength={7}
                        maxLength={30}
                      />
                      <Field
                        label="Preferred date"
                        name="preferred_date"
                        type="date"
                        min={today()}
                        max={new Date(Date.now() + 90 * 86400000)
                          .toISOString()
                          .slice(0, 10)}
                        defaultValue={today()}
                        required
                      />
                    </div>
                    {fulfillment === "delivery" ? (
                      <Field
                        label="Delivery address"
                        hint={`Service area: ${config.delivery_area}. Include your area and a nearby landmark.`}
                      >
                        <textarea
                          name="address"
                          required
                          minLength={10}
                          maxLength={500}
                          rows={3}
                        />
                      </Field>
                    ) : (
                      <Notice>
                        <strong>Farm pickup:</strong> {config.pickup_address}.
                        Our team will confirm when your order is ready.
                      </Notice>
                    )}
                    <Field label="Payment method">
                      <select name="payment_method" defaultValue="cash">
                        <option value="cash">Cash on delivery / pickup</option>
                        <option value="mobile_money">
                          Mobile money — arrange with REAP
                        </option>
                        <option value="bank_transfer">
                          Bank transfer — arrange with REAP
                        </option>
                      </select>
                    </Field>
                    <p className="fine-print">
                      Your order starts as unpaid. Our team will provide
                      verified payment instructions and confirm receipt. The
                      platform does not collect card details.
                    </p>
                    <Field
                      label="Anything else we should know?"
                      hint="Preferred cuts, collection details or special requests."
                    >
                      <textarea name="notes" rows={3} maxLength={1000} />
                    </Field>
                    <label className="checkbox">
                      <input type="checkbox" name="marketing_opt_in" />{" "}
                      <span>
                        I would like to receive harvest updates and offers.
                        Optional.
                      </span>
                    </label>
                    <label className="checkbox">
                      <input type="checkbox" required />{" "}
                      <span>
                        I have reviewed my order and the{" "}
                        <a href="#/privacy" target="_blank">
                          privacy information
                        </a>
                        . Requested dates are subject to confirmation.
                      </span>
                    </label>
                  </Form>
                </div>
              )}
            </div>
            <aside className="order-summary">
              <span className="eyebrow">THE GOOD STUFF</span>
              <h2>Order summary</h2>
              <div className="summary-line">
                <span>Subtotal</span>
                <strong>{money(totals.subtotal)}</strong>
              </div>
              <div className="summary-line">
                <span>
                  {fulfillment === "pickup" ? "Farm pickup" : "Delivery"}
                </span>
                <strong>
                  {totals.delivery_fee ? money(totals.delivery_fee) : "Free"}
                </strong>
              </div>
              {totals.discount > 0 && (
                <div className="summary-line discount">
                  <span>Promotion</span>
                  <strong>−{money(totals.discount)}</strong>
                </div>
              )}
              <div className="promo-input">
                <input
                  placeholder="Have a promo code?"
                  aria-label="Promotion code"
                  value={promo}
                  onChange={(e) => {
                    setPromo(e.target.value.toUpperCase());
                    setStep(1);
                  }}
                />
                <button
                  onClick={async () => {
                    try {
                      setQuote(
                        await api("/quote", {
                          items: cart,
                          fulfillment,
                          promo_code: promo,
                        }),
                      );
                      setError("");
                      notify("Promotion applied");
                    } catch (e) {
                      setError(e.message);
                    }
                  }}
                >
                  Apply
                </button>
              </div>
              <div className="summary-total">
                <span>
                  Total <small>USD</small>
                </span>
                <strong>{money(totals.total)}</strong>
              </div>
              {error && <Notice type="error">{error}</Notice>}
              {step === 1 && (
                <Button onClick={review}>
                  Continue to checkout <ArrowRight size={18} />
                </Button>
              )}
              <div className="summary-trust">
                <ShieldCheck size={17} />
                <span>Confirm your order before paying.</span>
              </div>
              {config.demo && (
                <p className="fine-print">
                  Demonstration prices. No real payment is collected.
                </p>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

export function OrderDetails({ order: o, invoice = false }) {
  const steps =
    o.fulfillment === "delivery"
      ? [
          "received",
          "confirmed",
          "preparing",
          "ready",
          "out_for_delivery",
          "completed",
        ]
      : ["received", "confirmed", "preparing", "ready", "completed"];
  return (
    <div className={"order-detail " + (invoice ? "invoice" : "")}>
      <div className="order-detail-heading">
        <div>
          <span className="eyebrow">
            {invoice ? "INVOICE / ORDER SUMMARY" : "ORDER DETAILS"}
          </span>
          <h2>{o.number}</h2>
          <small>Placed {day(o.created_at)}</small>
        </div>
        <Badge value={o.status} />
      </div>
      {o.status !== "cancelled" && (
        <ol className="order-timeline">
          {steps.map((s, i) => (
            <li
              key={s}
              className={steps.indexOf(o.status) >= i ? "complete" : ""}
            >
              <span>
                {steps.indexOf(o.status) >= i ? <Check size={13} /> : i + 1}
              </span>
              <div>
                <strong>{label(s)}</strong>
                <small>
                  {o.events.find((e) => e.status === s)
                    ? day(o.events.find((e) => e.status === s).created_at)
                    : "Upcoming"}
                </small>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className="order-contact-grid">
        <div>
          <small>CUSTOMER</small>
          <strong>{o.name}</strong>
          <span>{o.email}</span>
          <span>{o.phone}</span>
        </div>
        <div>
          <small>
            {o.fulfillment === "delivery"
              ? "DELIVERY ADDRESS"
              : "PICKUP LOCATION"}
          </small>
          <strong>{o.address}</strong>
          <span>Preferred: {day(o.preferred_date)}</span>
        </div>
      </div>
      <div className="order-lines">
        {o.items.map((i, n) => (
          <div key={n}>
            <span>
              {i.name}
              <small>
                {i.quantity} {i.unit} × {money(i.price)}
              </small>
            </span>
            <strong>{money(i.quantity * i.price)}</strong>
          </div>
        ))}
      </div>
      <div className="invoice-totals">
        <div>
          <span>Subtotal</span>
          <b>{money(o.subtotal)}</b>
        </div>
        {o.discount > 0 && (
          <div>
            <span>Discount</span>
            <b>−{money(o.discount)}</b>
          </div>
        )}
        <div>
          <span>Delivery</span>
          <b>{money(o.delivery_fee)}</b>
        </div>
        <div className="grand">
          <span>Total (USD)</span>
          <b>{money(o.total)}</b>
        </div>
        <div>
          <span>Payments recorded</span>
          <b>{money(o.paid)}</b>
        </div>
        <div>
          <span>Amount due</span>
          <b>{money(o.total - o.paid)}</b>
        </div>
      </div>
      {o.notes && <p className="muted">Order notes: {o.notes}</p>}
      <p className="fine-print">
        REAP Market · Bentol City, Liberia. This is an order summary; payment is
        confirmed only when recorded by REAP.
      </p>
      <Button variant="outline no-print" onClick={() => window.print()}>
        <Printer size={16} /> Print / save invoice
      </Button>
    </div>
  );
}
function Track() {
  const [order, setOrder] = useState(null);
  return (
    <div className="container narrow-page">
      <Breadcrumb current="Track an order" />
      <div className="center-heading">
        <span className="round-icon">
          <Truck />
        </span>
        <span className="eyebrow">FROM FARM TO YOU</span>
        <h1>Follow the freshness.</h1>
        <p>Enter the private tracking code from your order confirmation.</p>
      </div>
      <div className="panel">
        <Form
          submit="Find my order"
          onSubmit={async (d) =>
            setOrder(await api("/track", { token: d.token.trim() }))
          }
        >
          <Field
            label="Tracking code"
            name="token"
            placeholder="Paste your 64-character tracking code"
            required
            minLength={64}
            maxLength={64}
            autoComplete="off"
          />
        </Form>
      </div>
      {order && <OrderDetails order={order} />}
      <p className="center muted">
        Have an account? <a href="#/account">View your order history</a>.
      </p>
    </div>
  );
}

export function Login({ staff = false }) {
  const { config, signIn, notify } = useApp();
  const [register, setRegister] = useState(false);
  return (
    <div className="login-layout">
      <div className="login-art">
        <Brand light />
        <div>
          <span className="eyebrow">GROWING GOOD, TOGETHER.</span>
          <h1>
            {staff ? (
              <>
                A little clarity.
                <br />
                <em>A lot of possibility.</em>
              </>
            ) : (
              <>
                Your market.
                <br />
                <em>Your community.</em>
              </>
            )}
          </h1>
          <p>
            {staff
              ? "Your orders, people and operations. All in one place."
              : "Fresh finds, order updates and a direct connection to the people behind your harvest."}
          </p>
        </div>
        <Sprout size={130} strokeWidth={0.7} />
      </div>
      <div className="login-form">
        <a className="text-link" href="#/">
          <ArrowLeft size={15} /> Back to market
        </a>
        <span className="eyebrow">
          {staff ? "REAP BUSINESS" : "WELCOME TO REAP MARKET"}
        </span>
        <h2>
          {register
            ? "Make yourself at home."
            : staff
              ? "Welcome to your workspace."
              : "Good to see you."}
        </h2>
        <p>
          {register
            ? "Create an account to keep your orders in one place."
            : "Sign in to pick up where you left off."}
        </p>
        <Form
          submit={register ? "Create account" : "Sign in"}
          onSubmit={async (d) => {
            const s = await api(register ? "/auth/register" : "/auth/login", d);
            signIn(s);
            notify("Welcome, " + s.user.name);
            go(staff && s.user.role !== "customer" ? "/admin" : "/account");
          }}
        >
          {register && (
            <Field
              label="Full name"
              name="name"
              autoComplete="name"
              required
              maxLength={100}
            />
          )}
          <Field
            label="Email address"
            type="email"
            name="email"
            required
            autoComplete="email"
          />
          <Field
            label="Password"
            type="password"
            name="password"
            minLength={register ? 12 : 1}
            maxLength={128}
            required
            autoComplete={register ? "new-password" : "current-password"}
            hint={register ? "Use at least 12 characters." : undefined}
          />
        </Form>
        {!staff && (
          <p className="center">
            {register ? "Already part of the community?" : "New to the market?"}{" "}
            <button className="link" onClick={() => setRegister(!register)}>
              {register ? "Sign in" : "Create an account"}
            </button>
          </p>
        )}
        {config.demo && (
          <div className="demo-login">
            <span>EXPLORE THE DEMONSTRATION</span>
            <p>Use sample data to try the platform.</p>
            <div>
              {(staff
                ? ["admin", "sales", "dispatch", "accountant"]
                : ["customer"]
              ).map((role) => (
                <Button
                  variant="outline"
                  key={role}
                  onClick={async () => {
                    try {
                      const s = await api("/auth/demo", { role });
                      signIn(s);
                      go(staff ? "/admin" : "/account");
                    } catch (e) {
                      notify(e.message);
                    }
                  }}
                >
                  {role === "admin"
                    ? "Open admin demo"
                    : role === "customer"
                      ? "Try customer demo"
                      : label(role)}
                </Button>
              ))}
            </div>
          </div>
        )}
        <p className="fine-print">
          Need account help? Contact your REAP administrator. Staff access is
          granted by an administrator.
        </p>
      </div>
    </div>
  );
}
function Account() {
  const { user, logout, notify, signIn } = useApp();
  const [orders, setOrders] = useState(null),
    [messages, setMessages] = useState([]),
    [selected, setSelected] = useState(null),
    [tab, setTab] = useState("orders"),
    [error, setError] = useState("");
  useEffect(() => {
    if (user?.role === "customer")
      Promise.all([api("/my/orders"), api("/my/messages")])
        .then(([o, m]) => {
          setOrders(o);
          setMessages(m);
        })
        .catch((e) => setError(e.message));
  }, [user, tab]);
  if (!user) return <Login />;
  if (user.role !== "customer")
    return (
      <div className="container narrow-page">
        <Empty
          title={`Welcome, ${user.name}`}
          text="Your staff account has access to the operations workspace."
        >
          <Button onClick={() => go("/admin")}>
            Open dashboard <ArrowRight size={17} />
          </Button>
          <Button variant="outline" onClick={logout}>
            Sign out
          </Button>
        </Empty>
      </div>
    );
  return (
    <div className="container account-page">
      <div className="section-title">
        <div>
          <span className="eyebrow">YOUR CORNER OF THE MARKET</span>
          <h1>Hello, {user.name.split(" ")[0]}.</h1>
          <p>Fresh orders, familiar faces. Welcome back.</p>
        </div>
        <Button variant="outline" onClick={logout}>
          <LogOut size={16} /> Sign out
        </Button>
      </div>
      <div className="category-tabs">
        {["orders", "messages", "security"].map((t) => (
          <button
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
            key={t}
          >
            {label(t)}
          </button>
        ))}
      </div>
      {error && <Notice type="error">{error}</Notice>}
      {tab === "orders" ? (
        <>
          {orders === null ? (
            <Loading />
          ) : orders.length ? (
            <div className="account-orders">
              {orders.map((o) => (
                <button
                  className="account-order"
                  key={o.id}
                  onClick={() => setSelected(o)}
                >
                  <span className="order-icon">
                    <Package />
                  </span>
                  <span>
                    <strong>{o.number}</strong>
                    <small>
                      {day(o.created_at)} · {o.items.length} product
                      {o.items.length !== 1 ? "s" : ""}
                    </small>
                  </span>
                  <Badge value={o.status} />
                  <b>{money(o.total)}</b>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title="Your first harvest is waiting"
              text="Your account orders will appear here. Guest orders can be found with their tracking code."
            >
              <Button onClick={() => go("/shop")}>Shop the harvest</Button>
            </Empty>
          )}
        </>
      ) : tab === "messages" ? (
        <div className="panel message-panel">
          <h2>A direct line to our team.</h2>
          <div className="chat-messages">
            {messages.length ? (
              messages.map((m) => (
                <div
                  className={"chat-bubble " + (m.from_staff ? "staff" : "")}
                  key={m.id}
                >
                  <small>
                    {m.from_staff ? "REAP team" : "You"} · {day(m.created_at)}
                  </small>
                  <p>{m.body}</p>
                </div>
              ))
            ) : (
              <p className="muted">
                Send a question about your order, collection or the harvest.
              </p>
            )}
          </div>
          <Form
            submit="Send message"
            onSubmit={async (d) => {
              await api("/my/messages", d);
              setMessages(await api("/my/messages"));
              notify("Message sent to the REAP inbox");
            }}
          >
            <Field label="Your message">
              <textarea name="body" required maxLength={2000} rows={3} />
            </Field>
          </Form>
        </div>
      ) : (
        <div className="panel security-panel">
          <h2>Change your password</h2>
          <Form
            submit="Update password"
            onSubmit={async (d) => {
              signIn(await api("/auth/password", d));
              notify("Password updated. Other sessions have been signed out.");
            }}
          >
            <Field
              name="current_password"
              label="Current password"
              type="password"
              required
              autoComplete="current-password"
            />
            <Field
              name="new_password"
              label="New password"
              type="password"
              required
              minLength={12}
              maxLength={128}
              hint="At least 12 characters."
              autoComplete="new-password"
            />
          </Form>
        </div>
      )}
      {selected && (
        <Modal title="Your order" wide onClose={() => setSelected(null)}>
          <OrderDetails order={selected} />
        </Modal>
      )}
    </div>
  );
}
function About() {
  return (
    <div className="container about-page">
      <Breadcrumb current="Our purpose" />
      <div className="about-intro">
        <span className="eyebrow">ROOTED IN LIBERIA. BUILT AROUND PEOPLE.</span>
        <h1>
          Growing opportunity.
          <br />
          <em>One community at a time.</em>
        </h1>
        <p>
          Good food is just the beginning. REAP’s story is about practical
          skills, shared possibility and the people who make a community thrive.
        </p>
      </div>
      <img
        className="about-image"
        src="/assets/reap-community.jpg"
        alt="REAP community members gathered in Liberia"
      />
      <div className="about-story">
        <div>
          <span className="eyebrow">THE ORGANIZATION BEHIND THE MARKET</span>
          <h2>Restoration of Educational Advancement Programs.</h2>
          <img
            className="official-logo"
            src="/assets/reap-logo.jpg"
            alt="Official REAP logo"
          />
        </div>
        <div>
          <p>
            REAP is a Liberian nonprofit social enterprise based in Children
            Home, Bentol City, Montserrado County. Its work connects education,
            vocational training, entrepreneurship and agricultural opportunity.
          </p>
          <p>
            The organization’s mission includes equipping children, young
            people, rural farmers, women and entrepreneurs with the skills and
            resources to strengthen their livelihoods.
          </p>
          <p>
            REAP Market brings products, customer relationships and daily
            business operations into one accessible place.
          </p>
          <a
            className="text-link"
            href="https://www.reapwestafrica.org/"
            target="_blank"
            rel="noreferrer"
          >
            Visit REAP’s official website <ArrowUpRight size={17} />
          </a>
        </div>
      </div>
      <div className="about-values">
        {[
          [
            Sprout,
            "Practical opportunity",
            "Connecting the harvest with the people who need it.",
          ],
          [
            Heart,
            "Community at the centre",
            "A platform that reflects REAP’s commitment to people.",
          ],
          [
            Leaf,
            "Room to grow",
            "Making daily operations easier for a growing enterprise.",
          ],
        ].map(([Icon, title, text]) => (
          <div key={title}>
            <Icon size={28} />
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
function Help() {
  const { config } = useApp();
  return (
    <div className="container narrow-page">
      <div className="center-heading">
        <span className="eyebrow">A LITTLE HELP GOES A LONG WAY</span>
        <h1>Let’s make it simple.</h1>
        <p>Everything you need to know about shopping with us.</p>
      </div>
      {[
        [
          "How do I place an order?",
          "Browse the harvest, add products to your basket, then choose pickup or delivery. Enter your contact details and preferred date. Save your private tracking code when your order is confirmed.",
        ],
        [
          "Where can I collect my order?",
          config.pickup_address +
            ". Please wait until your order is marked ready before travelling.",
        ],
        [
          "How does delivery work?",
          `Delivery is available within ${config.delivery_area}. The current fee is ${money(config.delivery_fee)}. Provide a clear address and landmark. Your preferred date is a request; the team confirms arrangements.`,
        ],
        [
          "How do I pay?",
          "Choose cash, mobile money or bank transfer at checkout. A REAP staff member will confirm payment arrangements. Never send funds to an unverified contact. Your order remains unpaid until payment is recorded.",
        ],
        [
          "Can I change or cancel my order?",
          "Send a message through your account inbox or contact REAP using its official website. Include your order number. Changes depend on preparation and fulfillment status.",
        ],
        [
          "How are meat and live animals sold?",
          "Each product shows its selling unit: pound, head, bunch or another unit. Discuss specific animal sizes and meat weights with the team before fulfillment. The final agreed order should be confirmed before payment.",
        ],
      ].map(([q, a]) => (
        <details className="faq" key={q}>
          <summary>
            {q}
            <Plus size={18} />
          </summary>
          <p>{a}</p>
        </details>
      ))}
      <div className="help-contact">
        <MessageCircle size={28} />
        <h2>Real questions. Real people.</h2>
        <p>
          Send a message through your account, or reach REAP through its
          official contact page.
        </p>
        <div className="center-actions">
          <Button onClick={() => go("/account")}>
            Open my account <ArrowRight size={16} />
          </Button>
          <a
            href="https://www.reapwestafrica.org/contact"
            className="btn outline"
            target="_blank"
            rel="noreferrer"
          >
            Contact REAP <ArrowUpRight size={16} />
          </a>
          {config.support_whatsapp && (
            <a
              className="btn outline"
              href={
                "https://wa.me/" + config.support_whatsapp.replace(/\D/g, "")
              }
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
function Privacy() {
  return (
    <div className="container narrow-page legal">
      <h1>Your information, explained.</h1>
      <p className="muted">REAP Market privacy information</p>
      <h2>What the platform stores</h2>
      <p>
        Account names and email addresses, securely hashed passwords, order and
        delivery details, contact information, payment records entered by staff,
        messages and your marketing preference. The basket is stored in your
        browser. A secure session cookie keeps you signed in.
      </p>
      <h2>How it is used</h2>
      <p>
        To manage your account, process orders, arrange fulfillment, answer
        questions and maintain business records. Only authorized staff roles can
        access the relevant business records. Payment card details are not
        collected.
      </p>
      <h2>Messages and marketing</h2>
      <p>
        Marketing is optional. Ask the REAP team to update your preference or
        remove your contact from marketing. If external messaging services are
        connected, the information needed to deliver the message is sent to that
        provider.
      </p>
      <h2>Private tracking codes</h2>
      <p>
        Your tracking code grants access to your order details. Keep it private.
        Do not post it in public messages or social media.
      </p>
      <h2>Your choices</h2>
      <p>
        Contact REAP through{" "}
        <a
          href="https://www.reapwestafrica.org/contact"
          target="_blank"
          rel="noreferrer"
        >
          its official contact page
        </a>{" "}
        to request access, correction or deletion of personal information.
        Business records may need to be retained for legitimate recordkeeping.
      </p>
      <h2>Demonstration environment</h2>
      <p>
        The demonstration uses sample catalogue prices and fictional business
        records. Use sample personal information while exploring it.
      </p>
    </div>
  );
}
function Credits() {
  return (
    <div className="container narrow-page legal">
      <h1>Photography & sources</h1>
      <p>
        REAP’s logo and community photograph come from{" "}
        <a href="https://www.reapwestafrica.org/">REAP’s official website</a>.
        Market product photographs are illustrative and do not represent
        verified REAP inventory.
      </p>
      <p>
        Produce imagery is supplied by Unsplash. The tilapia illustration is by
        Raver Duane, U.S. Fish and Wildlife Service, in the public domain via
        Wikimedia Commons. Raw pork photography is by Ari Kurniawan on Unsplash.
        Full image and font sources are documented in the repository’s ASSETS.md
        file. Replace illustrative product imagery with current farm photographs
        before a commercial launch.
      </p>
    </div>
  );
}
function Footer() {
  return (
    <footer className="store-footer">
      <div className="container footer-grid">
        <div>
          <Brand light />
          <p>
            Good food. Greater purpose.
            <br />
            Growing good, together in Liberia.
          </p>
          <span className="footer-location">
            <MapPin size={15} /> Bentol City, Liberia
          </span>
        </div>
        <div>
          <h3>Explore the market</h3>
          <a href="#/shop">Shop the harvest</a>
          <a href="#/about">Our purpose</a>
          <a href="#/track">Track your order</a>
        </div>
        <div>
          <h3>Here to help</h3>
          <a href="#/help">Pickup & delivery</a>
          <a href="#/account">My account</a>
          <a
            href="https://www.reapwestafrica.org/contact"
            target="_blank"
            rel="noreferrer"
          >
            Contact REAP
          </a>
        </div>
        <div className="footer-purpose">
          <Sprout size={28} />
          <h3>Rooted in something bigger.</h3>
          <p>Discover the education and community work behind REAP.</p>
          <a
            href="https://www.reapwestafrica.org/"
            target="_blank"
            rel="noreferrer"
          >
            Meet REAP <ArrowUpRight size={15} />
          </a>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} REAP Market. All rights reserved.
        </span>
        <div>
          <a href="#/privacy">Privacy</a>
          <a href="#/credits">Photo credits</a>
          <a href="#/admin">
            Staff workspace <ArrowUpRight size={13} />
          </a>
        </div>
      </div>
    </footer>
  );
}
