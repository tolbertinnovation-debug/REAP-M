import React, { useEffect, useRef, useState, useId } from "react";
import {
  X,
  ArrowRight,
  Check,
  LoaderCircle,
  AlertCircle,
  Leaf,
  PackageSearch,
  ChevronRight,
} from "lucide-react";
import { go, label } from "./context";
export function Brand({ light = false, small = false }) {
  return (
    <a
      href="#/"
      className={"brand " + (light ? "light" : "")}
      aria-label="REAP Market home"
    >
      <span className="brand-symbol">
        <Leaf size={small ? 23 : 28} strokeWidth={1.7} />
      </span>
      <span>
        <strong>
          REAP<span>Market</span>
        </strong>
        {!small && <small>GROWING GOOD, TOGETHER.</small>}
      </span>
    </a>
  );
}
export function Button({ children, variant = "", className = "", ...props }) {
  return (
    <button className={`btn ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Badge({ value, children }) {
  return (
    <span className={"badge " + (value || "").replaceAll(" ", "_")}>
      {children || label(value)}
    </span>
  );
}
export function Empty({
  title = "Nothing here yet",
  text = "Your information will appear here when it is available.",
  children,
}) {
  return (
    <div className="empty">
      <PackageSearch size={35} strokeWidth={1.4} />
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" /> Loading your market…
    </div>
  );
}
export function Notice({ children, type = "info" }) {
  return (
    <div className={"notice " + type}>
      <AlertCircle size={18} />
      <span>{children}</span>
    </div>
  );
}
export function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null),
    titleId = useId();
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={"modal " + (wide ? "wide" : "")}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-head">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-btn"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Field({ label: caption, hint, children, ...props }) {
  const generatedId = useId(),
    id = children?.props?.id || props.id || generatedId,
    hintId = id + "-hint";
  const describedBy =
    [
      children?.props?.["aria-describedby"] || props["aria-describedby"],
      hint ? hintId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;
  const control = children ? (
    React.cloneElement(children, { id, "aria-describedby": describedBy })
  ) : (
    <input {...props} id={id} aria-describedby={describedBy} />
  );
  return (
    <div className="field">
      <label htmlFor={id}>{caption}</label>
      {control}
      {hint && <small id={hintId}>{hint}</small>}
    </div>
  );
}
export function Form({
  onSubmit,
  children,
  submit = "Save changes",
  onCancel,
  extra,
  className = "",
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className={"form " + className}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const data = Object.fromEntries(new FormData(e.currentTarget));
        setError("");
        setBusy(true);
        try {
          await onSubmit(data);
        } catch (err) {
          setError(err.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
      {error && <Notice type="error">{error}</Notice>}
      <div className="form-footer">
        {extra}
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? <LoaderCircle size={17} className="spin" /> : null}
          {busy ? "Please wait…" : submit}
        </Button>
      </div>
    </form>
  );
}
export function PageHeading({ eyebrow, title, text, children }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}
export function Breadcrumb({ current }) {
  return (
    <div className="breadcrumb">
      <a href="#/">Market</a>
      <ChevronRight size={13} />
      <span>{current}</span>
    </div>
  );
}
export function ConfirmButton({
  children,
  onConfirm,
  message,
  variant = "outline",
}) {
  const [ask, setAsk] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <Button variant={variant} onClick={() => setAsk(true)}>
        {children}
      </Button>
      {ask && (
        <Modal title="Confirm action" onClose={() => setAsk(false)}>
          <p>{message}</p>
          {error && <Notice type="error">{error}</Notice>}
          <div className="form-footer">
            <Button variant="outline" onClick={() => setAsk(false)}>
              Go back
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                  setAsk(false);
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Working…" : "Confirm"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
