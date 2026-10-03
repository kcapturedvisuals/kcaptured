"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Image as ImageIcon,
  Package,
  Star,
  Calendar,
  Shield,
  Settings,
  Plus,
  Search,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  GripVertical,
  X,
  Upload,
  LoaderCircle,
  Eye,
  EyeOff,
  Clock,
  MessageSquare,
  ArrowUp,
  ArrowDown,
  Check,
  DollarSign,
  TrendingUp,
} from "lucide-react";

type Section =
  | "dashboard"
  | "portfolio"
  | "packages"
  | "testimonials"
  | "bookings"
  | "trail"
  | "settings";
type BookingStatus = "Pending" | "To Confirm" | "Confirmed" | "Cancelled";
type AuditType =
  | "create"
  | "edit"
  | "delete"
  | "login"
  | "logout"
  | "status"
  | "settings";

interface PortfolioImage {
  id: string;
  title: string;
  category: string;
  date?: string;
  order: number;
  src: string;
  description?: string;
  featured: boolean;
}

interface PackageItem {
  id: string;
  category: string;
  name: string;
  price: number;
  description?: string;
  duration?: string;
  images?: number;
  sampleUrl?: string;
  features: string[];
  status: "active" | "inactive";
}

interface Testimonial {
  id: string;
  client: string;
  videoUrl: string;
  text: string;
  rating: number;
  date: string;
  published: boolean;
}

interface Booking {
  id: string;
  client: string;
  email: string;
  phone: string;
  package: string;
  preferredDate: string;
  requestDate: string;
  status: BookingStatus;
}

interface AuditEntry {
  id: number;
  datetime: string;
  activity: string;
  description: string;
  section: string;
  type: AuditType;
  prev?: string;
  next?: string;
}

const RED = "#E50914";
const MONO = "'JetBrains Mono', monospace";
const CONDENSED = "'Barlow Condensed', sans-serif";
const SANS = "'Outfit', system-ui, sans-serif";
type AdminFeedback = {
  notify: (message: string) => void;
};

const AdminFeedbackContext = React.createContext<AdminFeedback | null>(null);

function useAdminFeedback() {
  const feedback = React.useContext(AdminFeedbackContext);
  if (!feedback) throw new Error("Admin feedback is unavailable");
  return feedback;
}

const AUDIT_STYLES: Record<
  AuditType,
  { dot: string; text: string; label: string }
> = {
  create: { dot: "bg-emerald-500", text: "text-emerald-400", label: "Create" },
  edit: { dot: "bg-blue-400", text: "text-blue-400", label: "Edit" },
  delete: { dot: "bg-red-500", text: "text-red-400", label: "Delete" },
  login: { dot: "bg-zinc-500", text: "text-zinc-500", label: "Login" },
  logout: { dot: "bg-zinc-500", text: "text-zinc-500", label: "Logout" },
  status: { dot: "bg-amber-400", text: "text-amber-400", label: "Status" },
  settings: {
    dot: "bg-purple-400",
    text: "text-purple-400",
    label: "Settings",
  },
};

const BOOKING_STYLES: Record<BookingStatus, string> = {
  Pending: "bg-amber-500/10 text-amber-400 border border-amber-500/25",
  "To Confirm": "bg-orange-500/10 text-orange-400 border border-orange-500/25",
  Confirmed: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25",
  Cancelled: "bg-zinc-500/10 text-zinc-400 border border-zinc-500/25",
};

const BOOKING_STATUS_VALUES: Record<BookingStatus, string> = {
  Pending: "pending",
  "To Confirm": "to_confirm",
  Confirmed: "confirmed",
  Cancelled: "cancelled",
};

const BOOKING_STATUS_LABELS: Record<string, BookingStatus> = {
  pending: "Pending",
  to_confirm: "To Confirm",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

function PageHeader({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[#1e1e1e] bg-[#0a0a0a] px-7">
      <h1
        className="text-xs font-bold uppercase tracking-[0.2em] text-white"
        style={{
          fontFamily: CONDENSED,
          fontSize: "0.8rem",
          letterSpacing: "0.18em",
        }}
      >
        {title}
      </h1>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}

function Btn({
  onClick,
  children,
  variant = "default",
  size = "sm",
  className = "",
  type = "button",
  disabled = false,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "default" | "red" | "ghost" | "destructive";
  size?: "sm" | "xs";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const base =
    "inline-flex cursor-pointer select-none items-center gap-1.5 rounded border font-medium transition-all";
  const sizes = { sm: "px-3.5 py-2 text-sm", xs: "px-2.5 py-1.5 text-xs" };
  const variants = {
    default:
      "border-[#2e2e2e] bg-[#1a1a1a] text-zinc-300 hover:border-zinc-500 hover:text-white",
    red: "border-transparent text-white hover:opacity-90",
    ghost: "border-transparent bg-transparent text-zinc-500 hover:text-white",
    destructive:
      "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`}
      style={variant === "red" ? { background: RED } : undefined}
    >
      {children}
    </button>
  );
}

function FInput({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </label>
      <input
        {...props}
        className="rounded border border-[#272727] bg-[#0d0d0d] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-zinc-500"
        style={{ fontFamily: SANS }}
      />
    </div>
  );
}

function FTextarea({
  label,
  ...props
}: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </label>
      <textarea
        {...props}
        className="resize-none rounded border border-[#272727] bg-[#0d0d0d] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-zinc-500"
        style={{ fontFamily: SANS }}
      />
    </div>
  );
}

function FSelect({
  label,
  children,
  ...props
}: {
  label: string;
  children: React.ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </label>
      <select
        {...props}
        className="rounded border border-[#272727] bg-[#0d0d0d] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-zinc-500"
      >
        {children}
      </select>
    </div>
  );
}

function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {label && (
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={() => onChange(!value)}
        className="relative h-5 w-10 flex-shrink-0 rounded-full transition-colors"
        style={{ background: value ? RED : "#333" }}
      >
        <span
          className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
          style={{ transform: value ? "translateX(20px)" : "translateX(0)" }}
        />
      </button>
    </div>
  );
}

function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search
        size={13}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-52 rounded border border-[#272727] bg-[#0d0d0d] py-2 pl-8 pr-3 text-xs text-white placeholder-zinc-700 outline-none transition-colors focus:border-zinc-500"
      />
    </div>
  );
}

function Overlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function Modal({
  open,
  onClose,
  title,
  children,
  maxW = "480px",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxW?: string;
}) {
  if (!open) return null;

  return (
    <Overlay onClose={onClose}>
      <div
        className="flex max-h-[90vh] w-[min(90vw,theme(width))] flex-col overflow-hidden rounded border border-[#2a2a2a] bg-[#141414]"
        style={{ maxWidth: maxW }}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[#242424] px-6 py-4">
          <span
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-white"
            style={{ fontFamily: CONDENSED }}
          >
            {title}
          </span>
          <button
            onClick={onClose}
            className="p-0.5 text-zinc-600 transition-colors hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </Overlay>
  );
}

function ConfirmModal({
  open,
  onClose,
  onConfirm,
  name,
  loading = false,
  closeOnConfirm = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  name: string;
  loading?: boolean;
  closeOnConfirm?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Confirm Deletion" maxW="380px">
      <div className="flex flex-col gap-6">
        <p className="text-sm leading-relaxed text-zinc-400">
          This will permanently delete{" "}
          <span className="font-medium text-white">"{name}"</span>. This action
          cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn
            variant="red"
            disabled={loading}
            onClick={() => {
              if (loading) return;
              onConfirm();
              if (closeOnConfirm) onClose();
            }}
          >
            {loading ? (
              <>
                <LoaderCircle size={13} className="animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={11}
          className={
            i <= rating ? "fill-amber-400 text-amber-400" : "text-zinc-700"
          }
        />
      ))}
    </div>
  );
}

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hov, setHov] = useState(0);

  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          type="button"
          key={i}
          onMouseEnter={() => setHov(i)}
          onMouseLeave={() => setHov(0)}
          onClick={() => onChange(i)}
        >
          <Star
            size={20}
            className={
              (hov || value) >= i
                ? "fill-amber-400 text-amber-400"
                : "text-zinc-700 hover:text-zinc-500"
            }
          />
        </button>
      ))}
    </div>
  );
}

function SectionCard({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded border border-[#222] ${className}`}
      style={{ background: "#141414" }}
    >
      {title && (
        <div className="border-b border-[#1e1e1e] px-5 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            {title}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

const NAV: { id: Section; label: string; Icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "portfolio", label: "Portfolio", Icon: ImageIcon },
  { id: "packages", label: "Packages", Icon: Package },
  { id: "testimonials", label: "Testimonials", Icon: MessageSquare },
  { id: "bookings", label: "Bookings", Icon: Calendar },
  { id: "trail", label: "Trail", Icon: Shield },
  { id: "settings", label: "Settings", Icon: Settings },
];

function Sidebar({
  active,
  onNavigate,
}: {
  active: Section;
  onNavigate: (s: Section) => void;
}) {
  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-[#1a1a1a] bg-[#0d0d0d]">
      <div className="flex items-center gap-3 border-b border-[#1a1a1a] px-5 py-5">
        <img
          src="/kcaptured-logo.png"
          alt="KCAPTURED logo"
          className="h-7 w-7 flex-shrink-0 rounded object-cover"
        />
        <div>
          <div
            className="text-sm font-bold uppercase tracking-[0.25em] text-white"
            style={{ fontFamily: CONDENSED }}
          >
            KCAPTURED admin
          </div>
          <div className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-zinc-700">
            KCAPTURED Studios
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-5">
        {NAV.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className="group relative flex w-full items-center gap-3 rounded px-3 py-2.5 text-left text-sm transition-all"
              style={isActive ? { background: "#1c1c1c" } : undefined}
            >
              {isActive && (
                <span
                  className="absolute inset-y-1 left-0 w-[2px] rounded-r"
                  style={{ background: RED }}
                />
              )}
              <Icon
                size={14}
                className={
                  isActive
                    ? ""
                    : "text-zinc-600 transition-colors group-hover:text-zinc-400"
                }
                style={isActive ? { color: RED } : undefined}
              />
              <span
                className={`font-medium transition-colors ${isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"}`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-[#1a1a1a] px-5 py-4">
        <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-600">
          v1.0.0
        </div>
      </div>
    </aside>
  );
}

function DashboardPage({
  portfolio,
  packages,
  testimonials,
  bookings,
  audit,
  onNavigate,
}: {
  portfolio: PortfolioImage[];
  packages: PackageItem[];
  testimonials: Testimonial[];
  bookings: Booking[];
  audit: AuditEntry[];
  onNavigate: (s: Section) => void;
}) {
  const [showTrend, setShowTrend] = useState(false);
  const [chartType, setChartType] = useState<"line" | "bar" | "pie">("line");
  const [duration, setDuration] = useState<"month" | "3m" | "6m" | "12m">("month");
  const [selectedBucket, setSelectedBucket] = useState<{
    label: string;
    value: number;
    bookings: Booking[];
  } | null>(null);

  const packagePriceMap = new Map(
    packages.map((pkg) => [pkg.name.toLowerCase(), Number(pkg.price ?? 0)]),
  );

  const durationMonths = {
    month: 1,
    "3m": 3,
    "6m": 6,
    "12m": 12,
  } as const;

  const monthlyTrendData = Array.from(
    { length: durationMonths[duration] },
    (_, index) => {
      const monthDate = new Date();
      monthDate.setDate(1);
      monthDate.setMonth(
        monthDate.getMonth() - (durationMonths[duration] - 1 - index),
      );
      const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
      const relevantBookings = bookings.filter((booking) => {
        if (booking.status === "Cancelled") return false;
        const bookingDate = new Date(
          booking.requestDate || booking.preferredDate || "",
        );
        if (Number.isNaN(bookingDate.getTime())) return false;
        const bookingKey = `${bookingDate.getFullYear()}-${String(bookingDate.getMonth() + 1).padStart(2, "0")}`;
        return bookingKey === key;
      });

      const total = relevantBookings.reduce((sum, booking) => {
        const packageName = booking.package.trim().toLowerCase();
        const price = packagePriceMap.get(packageName) ?? 0;
        return sum + price;
      }, 0);

      return {
        label: monthDate.toLocaleDateString("en-US", { month: "short" }),
        value: total,
        bookings: relevantBookings,
      };
    },
  );

  const pieTrendData = [
    "Pending",
    "To Confirm",
    "Confirmed",
  ].map((status) => {
    const bookingsInStatus = bookings.filter((booking) => {
      if (booking.status === "Cancelled") return false;
      const bookingDate = new Date(
        booking.requestDate || booking.preferredDate || "",
      );
      if (Number.isNaN(bookingDate.getTime())) return false;
      const now = new Date();
      now.setDate(1);
      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - (durationMonths[duration] - 1));
      return (
        booking.status === status &&
        bookingDate >= startDate &&
        bookingDate <= now
      );
    });

    const value = bookingsInStatus.reduce((sum, booking) => {
      const packageName = booking.package.trim().toLowerCase();
      return sum + (packagePriceMap.get(packageName) ?? 0);
    }, 0);

    return {
      label: status,
      value,
      bookings: bookingsInStatus,
    };
  });

  const trendEntries = chartType === "pie" ? pieTrendData : monthlyTrendData;
  const maxTrendValue = Math.max(...trendEntries.map((entry) => entry.value), 1);

  const expectedRevenue = bookings
    .filter((b) => b.status !== "Cancelled")
    .reduce((sum, booking) => {
      const packageName = booking.package.trim().toLowerCase();
      const price = packagePriceMap.get(packageName) ?? 0;
      return sum + price;
    }, 0);

  const totalIncome = bookings
    .filter((b) => b.status === "Confirmed")
    .reduce((sum, booking) => {
      const packageName = booking.package.trim().toLowerCase();
      const price = packagePriceMap.get(packageName) ?? 0;
      return sum + price;
    }, 0);

  const stats = [
    {
      label: "Portfolio Images",
      value: portfolio.length,
      sub: `${portfolio.filter((p) => p.featured).length} featured`,
      Icon: ImageIcon,
    },
    {
      label: "Packages",
      value: packages.length,
      sub: `${packages.filter((p) => p.status === "active").length} active`,
      Icon: Package,
    },
    {
      label: "Testimonials",
      value: testimonials.length,
      sub: `${testimonials.filter((t) => t.published).length} published`,
      Icon: MessageSquare,
    },
    {
      label: "Total Expected Revenue",
      value: `$${expectedRevenue.toLocaleString()}`,
      sub: `${bookings.filter((b) => b.status !== "Cancelled").length} active bookings`,
      Icon: DollarSign,
    },
    {
      label: "Total Income",
      value: `$${totalIncome.toLocaleString()}`,
      sub: `${bookings.filter((b) => b.status === "Confirmed").length} confirmed`,
      Icon: Check,
    },
    {
      label: "Cancelled",
      value: bookings.filter((b) => b.status === "Cancelled").length,
      sub: "0 if no cancellations",
      Icon: X,
    },
    {
      label: "Pending",
      value: bookings.filter((b) => b.status === "Pending").length,
      sub: "awaiting review",
      Icon: Clock,
    },
    {
      label: "To Confirm",
      value: bookings.filter((b) => b.status === "To Confirm").length,
      sub: "needs action",
      Icon: Calendar,
    },
    {
      label: "Confirmed",
      value: bookings.filter((b) => b.status === "Confirmed").length,
      sub: "secured bookings",
      Icon: Check,
    },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader title="Dashboard" />
      <div className="flex-shrink-0 border-b border-[#1e1e1e] bg-[#0a0a0a] px-6 py-4">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
          Quick Actions
        </div>
        <div className="flex flex-wrap gap-3">
          <Btn variant="red" onClick={() => onNavigate("portfolio")}>
            <Plus size={13} />
            Add Portfolio Image
          </Btn>
          <Btn onClick={() => onNavigate("packages")}>
            <Plus size={13} />
            Add Package
          </Btn>
          <Btn onClick={() => onNavigate("testimonials")}>
            <Plus size={13} />
            Add Testimonial
          </Btn>
          <Btn onClick={() => onNavigate("bookings")}>
            <Calendar size={13} />
            View Bookings
          </Btn>
          <Btn onClick={() => setShowTrend((current) => !current)}>
            <TrendingUp size={13} />
            {showTrend ? "Hide Trend" : "Income Trend"}
          </Btn>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-6">
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}
          >
            {stats.map(({ label, value, sub, Icon }) => (
              <div
                key={label}
                className="flex flex-col gap-3 rounded border border-[#222] bg-[#141414] p-4"
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-500 leading-tight">
                    {label}
                  </span>
                  <Icon
                    size={13}
                    className="mt-0.5 flex-shrink-0 text-zinc-700"
                  />
                </div>
                <div>
                  <div
                    className="text-[2rem] font-bold leading-none text-white"
                    style={{ fontFamily: CONDENSED }}
                  >
                    {value}
                  </div>
                  <div className="mt-1 text-[10px] text-zinc-600">{sub}</div>
                </div>
              </div>
            ))}
          </div>

          {showTrend && (
            <SectionCard title="Income Trend">
              <div className="p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {(["line", "bar", "pie"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setChartType(option);
                          setSelectedBucket(null);
                        }}
                        className="rounded border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] transition-all"
                        style={{
                          background: chartType === option ? RED : "transparent",
                          color: chartType === option ? "white" : "#8a8a8a",
                          borderColor: chartType === option ? "transparent" : "#2a2a2a",
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["month", "3m", "6m", "12m"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setDuration(option);
                          setSelectedBucket(null);
                        }}
                        className="rounded border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] transition-all"
                        style={{
                          background: duration === option ? "#1c1c1c" : "transparent",
                          color: duration === option ? "white" : "#8a8a8a",
                          borderColor: duration === option ? "#4a4a4a" : "#2a2a2a",
                        }}
                      >
                        {option === "month" ? "Current month" : option.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {chartType === "line" && (
                  <svg
                    viewBox="0 0 640 220"
                    className="h-56 w-full overflow-visible"
                    role="img"
                    aria-label="Income trend chart"
                  >
                    {[0, 1, 2, 3].map((line) => {
                      const y = 24 + line * 44;
                      return (
                        <line
                          key={line}
                          x1="24"
                          x2="620"
                          y1={y}
                          y2={y}
                          stroke="#2a2a2a"
                          strokeDasharray="4 6"
                        />
                      );
                    })}
                    <polyline
                      fill="none"
                      stroke="#E50914"
                      strokeWidth="3"
                      points={monthlyTrendData
                        .map((entry, index) => {
                          const x = 40 + (index * 520) / Math.max(monthlyTrendData.length - 1, 1);
                          const y = 180 - (entry.value / maxTrendValue) * 120;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                    />
                    {monthlyTrendData.map((entry, index) => {
                      const x = 40 + (index * 520) / Math.max(monthlyTrendData.length - 1, 1);
                      const y = 180 - (entry.value / maxTrendValue) * 120;
                      const isActive = selectedBucket?.label === entry.label;
                      return (
                        <g key={entry.label} onClick={() => setSelectedBucket(entry)} style={{ cursor: "pointer" }}>
                          <circle cx={x} cy={y} r={isActive ? 6 : 4} fill={isActive ? "#fff" : "#E50914"} stroke="#E50914" strokeWidth="2" />
                          <text x={x} y="200" textAnchor="middle" fill="#8b8b8b" fontSize="11">
                            {entry.label}
                          </text>
                          <text x={x} y={y - 12} textAnchor="middle" fill="#f2f2f2" fontSize="10">
                            ${entry.value.toLocaleString()}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                )}

                {chartType === "bar" && (
                  <div className="h-56 w-full">
                    <div className="flex h-full items-end gap-3">
                      {monthlyTrendData.map((entry, index) => {
                        const height = Math.max((entry.value / maxTrendValue) * 150, entry.value > 0 ? 18 : 0);
                        const isActive = selectedBucket?.label === entry.label;
                        return (
                          <button
                            key={entry.label}
                            type="button"
                            onClick={() => setSelectedBucket(entry)}
                            className="flex h-full flex-1 items-end justify-center"
                            style={{ minWidth: 40 }}
                          >
                            <div className="flex w-full flex-col items-center justify-end gap-2">
                              <span className="text-[10px] text-zinc-400">${entry.value.toLocaleString()}</span>
                              <div
                                className="w-full rounded-t border border-[#3a3a3a] transition-all"
                                style={{
                                  height: `${height}px`,
                                  background: isActive ? "#fff" : "#E50914",
                                  opacity: entry.value === 0 ? 0.35 : 1,
                                }}
                              />
                              <span className="text-[10px] text-zinc-500">{entry.label}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {chartType === "pie" && (
                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <svg
                      viewBox="0 0 260 220"
                      className="h-56 w-full max-w-[260px]"
                      role="img"
                      aria-label="Income by status chart"
                    >
                      <circle cx="110" cy="110" r="72" fill="transparent" stroke="#1c1c1c" strokeWidth="26" />
                      {(() => {
                        const radius = 72;
                        const circumference = 2 * Math.PI * radius;
                        let offset = 0;
                        const palette = ["#E50914", "#f97316", "#22c55e", "#a3a3a3"];
                        return pieTrendData.map((slice, index) => {
                          const ratio = slice.value / Math.max(pieTrendData.reduce((sum, entry) => sum + entry.value, 0), 1);
                          const length = ratio * circumference;
                          const isActive = selectedBucket?.label === slice.label;
                          const circle = (
                            <circle
                              key={slice.label}
                              cx="110"
                              cy="110"
                              r={radius}
                              fill="transparent"
                              stroke={palette[index % palette.length]}
                              strokeWidth="26"
                              strokeDasharray={`${length} ${circumference - length}`}
                              strokeDashoffset={-offset}
                              strokeLinecap="round"
                              transform="rotate(-90 110 110)"
                              style={{ cursor: "pointer", opacity: isActive ? 1 : 0.85 }}
                              onClick={() => setSelectedBucket(slice)}
                            />
                          );
                          offset += length;
                          return circle;
                        });
                      })()}
                      <text x="110" y="108" textAnchor="middle" fill="#f2f2f2" fontSize="12" fontWeight="700">
                        {pieTrendData.reduce((sum, entry) => sum + entry.value, 0).toLocaleString()}
                      </text>
                      <text x="110" y="128" textAnchor="middle" fill="#8a8a8a" fontSize="10">
                        total
                      </text>
                    </svg>
                    <div className="flex-1 space-y-2">
                      {pieTrendData.map((slice, index) => {
                        const palette = ["#E50914", "#f97316", "#22c55e", "#a3a3a3"];
                        const total = pieTrendData.reduce((sum, entry) => sum + entry.value, 0) || 1;
                        return (
                          <button
                            key={slice.label}
                            type="button"
                            onClick={() => setSelectedBucket(slice)}
                            className="flex w-full items-center justify-between rounded border border-[#2a2a2a] px-3 py-2 text-left"
                            style={{ borderColor: selectedBucket?.label === slice.label ? palette[index % palette.length] : "#2a2a2a" }}
                          >
                            <span className="flex items-center gap-2 text-xs text-zinc-300">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ background: palette[index % palette.length] }} />
                              {slice.label}
                            </span>
                            <span className="text-xs text-zinc-500">${slice.value.toLocaleString()} ({Math.round((slice.value / total) * 100)}%)</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedBucket && (
                  <div className="mt-5 rounded border border-[#2a2a2a] bg-[#0d0d0d] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Selected
                        </div>
                        <div className="mt-1 text-lg font-semibold text-white">{selectedBucket.label}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Total
                        </div>
                        <div className="mt-1 text-lg font-semibold text-white">${selectedBucket.value.toLocaleString()}</div>
                      </div>
                    </div>
                    {selectedBucket.bookings.length === 0 ? (
                      <div className="text-sm text-zinc-500">No matching bookings in this period.</div>
                    ) : (
                      <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                        {selectedBucket.bookings.map((booking) => (
                          <div key={booking.id} className="flex items-center justify-between gap-3 border-b border-[#1a1a1a] pb-2 last:border-b-0 last:pb-0">
                            <div>
                              <div className="text-sm text-white">{booking.client}</div>
                              <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">{booking.package}</div>
                            </div>
                            <div className="text-right text-xs text-zinc-400">
                              <div>{booking.preferredDate}</div>
                              <div className="mt-0.5 text-zinc-500">{booking.status}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "1fr 280px" }}
          >
            <SectionCard title="Recent Portfolio">
              <div className="flex gap-3 overflow-x-auto p-4">
                {portfolio.slice(0, 6).map((img) => (
                  <div
                    key={img.id}
                    className="w-36 shrink-0 overflow-hidden rounded border border-[#1e1e1e] bg-[#0d0d0d]"
                  >
                    <img
                      src={img.src}
                      alt={img.title}
                      className="h-24 w-full object-cover bg-zinc-900"
                    />
                    <div className="p-2.5">
                      <div className="truncate text-xs font-medium text-white">
                        {img.title}
                      </div>
                      <div className="mt-0.5 text-[10px] text-zinc-600">
                        {img.category}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Recent Activity">
              <div className="flex flex-col">
                {audit.slice(0, 7).map((entry, i) => {
                  const s = AUDIT_STYLES[entry.type];
                  return (
                    <div
                      key={entry.id}
                      className={`flex items-start gap-3 px-4 py-3 ${i < 6 ? "border-b border-[#1a1a1a]" : ""}`}
                    >
                      <div
                        className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${s.dot}`}
                      />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium leading-snug text-white">
                          {entry.activity}
                        </div>
                        <div
                          className="mt-0.5 text-[10px] text-zinc-600"
                          style={{ fontFamily: MONO }}
                        >
                          {entry.datetime.slice(0, 10)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>

        </div>
      </div>
    </div>
  );
}

const emptyImgForm = () => ({
  title: "",
  category: "Lifestyle",
  date: "",
  description: "",
  featured: false,
});

function PortfolioPage({
  portfolio,
  packages,
  setPortfolio,
  addAudit,
}: {
  portfolio: PortfolioImage[];
  packages: PackageItem[];
  setPortfolio: React.Dispatch<React.SetStateAction<PortfolioImage[]>>;
  addAudit: (e: Omit<AuditEntry, "id" | "datetime">) => void;
}) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<PortfolioImage | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [deleting, setDeleting] = useState<PortfolioImage | null>(null);
  const [form, setForm] = useState(emptyImgForm());
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkFeatured, setBulkFeatured] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(
    () => new Set(),
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkFileRef = useRef<HTMLInputElement>(null);

  const packageCategoryOptions = Array.from(
    new Set(
      packages
        .map((pkg) => pkg.category)
        .filter((value) => typeof value === "string" && value.trim().length > 0),
    ),
  ).sort();

  const categories = Array.from(
    new Set(portfolio.map((image) => image.category)),
  ).sort();
  const categoryOptions = ["All", ...categories];
  const effectiveCategoryOptions =
    packageCategoryOptions.length > 0 ? packageCategoryOptions : categories;

  React.useEffect(() => {
    if (category !== "All" && !categories.includes(category)) {
      setCategory("All");
    }
  }, [category, categories]);

  const filtered = portfolio
    .filter((p) => category === "All" || p.category === category)
    .filter((p) => p.title.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => {
    setForm(emptyImgForm());
    setPreviewUrl("");
    setSelectedFile(null);
    setSaveError("");
    setIsAdding(true);
  };

  const openBulkUpload = () => {
    const nextCategory =
      packageCategoryOptions[0] ??
      categories[0] ??
      "Lifestyle";
    setBulkCategory(nextCategory);
    setBulkFiles([]);
    setBulkFeatured(false);
    setBulkError("");
    setIsBulkUploadOpen(true);
  };

  const closeBulkUpload = () => {
    setIsBulkUploadOpen(false);
    setBulkCategory("");
    setBulkFiles([]);
    setBulkFeatured(false);
    setBulkError("");
    if (bulkFileRef.current) {
      bulkFileRef.current.value = "";
    }
  };

  const openEdit = (img: PortfolioImage) => {
    setEditing(img);
    setSaveError("");
    setForm({
      title: img.title,
      category: img.category,
      date: img.date ?? "",
      description: img.description ?? "",
      featured: img.featured,
    });
    setPreviewUrl(img.src);
    setSelectedFile(null);
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditing(null);
    setSaveError("");
  };

  const adminHeaders = () => ({
    Authorization: `Bearer ${window.sessionStorage.getItem("uploadToken") ?? ""}`,
    "x-upload-source": "kc-upload",
  });

  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) {
      setBulkError("Select at least one image to upload.");
      return;
    }

    setBulkSaving(true);
    setBulkError("");

    try {
      const uploaded: PortfolioImage[] = [];
      for (const file of bulkFiles) {
        const title = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[-_]+/g, " ")
          .trim() || "Untitled Image";

        const uploadData = new FormData();
        uploadData.append("file", file);
        uploadData.append("category", bulkCategory.toLowerCase());
        uploadData.append("title", title);
        uploadData.append("caption", "");
        uploadData.append("featured", String(bulkFeatured));

        const response = await fetch("/api/upload", {
          method: "POST",
          headers: adminHeaders(),
          body: uploadData,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(
            body.error ?? `Upload failed for ${file.name} (${response.status})`,
          );
        }

        const body = await response.json();
        const item = body.item;
        uploaded.push({
          id: String(item.id),
          title: item.title,
          category: item.category,
          date: String(item.created_at ?? "").slice(0, 10),
          order: Number(item.sort_order),
          src: item.cloudinaryUrl,
          description: item.caption ?? undefined,
          featured: Boolean(item.featured),
        });
      }

      if (uploaded.length > 0) {
        setPortfolio((prev) => [...prev, ...uploaded]);
      }

      addAudit({
        activity: "Portfolio Bulk Upload",
        description: `${uploaded.length} image${uploaded.length === 1 ? "" : "s"} uploaded to ${bulkCategory}`,
        section: "Portfolio",
        type: "create",
      });

      closeBulkUpload();
    } catch (error) {
      setBulkError(
        error instanceof Error ? error.message : "Bulk upload failed.",
      );
    } finally {
      setBulkSaving(false);
    }
  };

  const handleSave = async () => {
    setSaveError("");
    setSaving(true);
    try {
      if (isAdding) {
        if (!selectedFile) {
          setSaving(false);
          return;
        }
        const uploadData = new FormData();
        uploadData.append("file", selectedFile);
        uploadData.append("category", form.category.toLowerCase());
        uploadData.append("title", form.title);
        uploadData.append("caption", form.description);
        uploadData.append("featured", String(form.featured));
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: adminHeaders(),
          body: uploadData,
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? `Upload failed (${response.status})`);
        }
        const body = await response.json();
        const item = body.item;
        const newImg: PortfolioImage = {
          id: String(item.id),
          title: item.title,
          category: item.category,
          date: String(item.created_at ?? "").slice(0, 10),
          order: Number(item.sort_order),
          src: item.cloudinaryUrl,
          description: item.caption ?? undefined,
          featured: Boolean(item.featured),
        };
        setPortfolio((prev) => [...prev, newImg]);
        addAudit({
          activity: "Portfolio Image Added",
          description: `"${form.title}" added to ${form.category}`,
          section: "Portfolio",
          type: "create",
        });
      } else if (editing) {
        if (selectedFile) {
          const uploadData = new FormData();
          uploadData.append("file", selectedFile);
          uploadData.append("category", form.category.toLowerCase());
          uploadData.append("title", form.title);
          uploadData.append("caption", form.description);
          uploadData.append("featured", String(form.featured));
          const uploadResponse = await fetch("/api/upload", {
            method: "POST",
            headers: adminHeaders(),
            body: uploadData,
          });
          if (!uploadResponse.ok) {
            const body = await uploadResponse.json().catch(() => ({}));
            throw new Error(
              body.error ?? `Upload failed (${uploadResponse.status})`,
            );
          }
          const uploadBody = await uploadResponse.json();
          const oldDelete = await fetch("/api/portfolio-delete", {
            method: "POST",
            headers: { ...adminHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ id: editing.id }),
          });
          if (!oldDelete.ok) return;
          const item = uploadBody.item;
          setPortfolio((prev) =>
            prev.map((p) =>
              p.id === editing.id
                ? {
                    id: String(item.id),
                    title: item.title,
                    category: item.category,
                    date: String(item.created_at ?? "").slice(0, 10),
                    order: Number(item.sort_order),
                    src: item.cloudinaryUrl,
                    description: item.caption ?? undefined,
                    featured: Boolean(item.featured),
                  }
                : p,
            ),
          );
          addAudit({
            activity: "Portfolio Image Edited",
            description: `"${form.title}" image replaced`,
            section: "Portfolio",
            type: "edit",
          });
          closeForm();
          return;
        }
        const response = await fetch("/api/portfolio-item", {
          method: "PATCH",
          headers: { ...adminHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editing.id,
            title: form.title,
            category: form.category.toLowerCase(),
            caption: form.description,
            featured: form.featured,
          }),
        });
        if (!response.ok) return;
        setPortfolio((prev) =>
          prev.map((p) => (p.id === editing.id ? { ...p, ...form } : p)),
        );
        addAudit({
          activity: "Portfolio Image Edited",
          description: `"${form.title}" updated`,
          section: "Portfolio",
          type: "edit",
        });
      }
      closeForm();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (img: PortfolioImage) => {
    setDeletingId(img.id);
    try {
      const response = await fetch("/api/portfolio-delete", {
        method: "POST",
        headers: { ...adminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ id: img.id }),
      });
      if (!response.ok) return;
      setPortfolio((prev) => prev.filter((p) => p.id !== img.id));
      addAudit({
        activity: "Portfolio Image Deleted",
        description: `"${img.title}" removed from ${img.category}`,
        section: "Portfolio",
        type: "delete",
        prev: img.title,
      });
      setDeleting(null);
    } finally {
      setDeletingId(null);
    }
  };

  const moveItem = async (id: string, dir: -1 | 1) => {
    const reordered = [...portfolio];
    const i = reordered.findIndex((p) => p.id === id);
    const j = i + dir;
    if (j < 0 || j >= reordered.length) return;
    [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
    setReorderingId(id);
    try {
      const response = await fetch("/api/portfolio-reorder", {
        method: "POST",
        headers: { ...adminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((item) => item.id) }),
      });
      if (!response.ok) return;
      setPortfolio(reordered.map((p, idx) => ({ ...p, order: idx + 1 })));
      addAudit({
        activity: "Portfolio Reordered",
        description: "Portfolio image order updated",
        section: "Portfolio",
        type: "edit",
      });
    } finally {
      setReorderingId(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader title="Portfolio">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search images..."
        />
        <div className="flex overflow-hidden rounded border border-[#272727]">
          {(
            [
              ["grid", LayoutGrid],
              ["list", List],
            ] as const
          ).map(([v, Icon]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-2 transition-colors ${view === v ? "text-white" : "text-zinc-600 hover:text-zinc-400"}`}
              style={{ background: view === v ? "#1a1a1a" : "#0d0d0d" }}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
        <Btn variant="red" onClick={openBulkUpload}>
          <Upload size={13} />
          Bulk Upload
        </Btn>
        <Btn variant="red" onClick={openAdd}>
          <Plus size={13} />
          Add Image
        </Btn>
      </PageHeader>

      <div className="flex flex-shrink-0 gap-1 overflow-x-auto border-b border-[#1e1e1e] bg-[#0a0a0a] px-6 py-3">
        {categoryOptions.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className="whitespace-nowrap rounded px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              background: category === cat ? RED : "transparent",
              color: category === cat ? "white" : "#666",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center rounded border border-dashed border-[#2a2a2a] text-xs uppercase tracking-[0.2em] text-zinc-600">
            No portfolio images
          </div>
        ) : view === "grid" ? (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            }}
          >
            {filtered.map((img) => (
              <div
                key={img.id}
                className="group relative overflow-hidden rounded border border-[#222] bg-[#141414]"
              >
                <div
                  className="relative bg-zinc-900"
                  style={{ aspectRatio: "4/3" }}
                >
                  {!loadedImages.has(img.id) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                      <LoaderCircle
                        size={18}
                        className="animate-spin text-zinc-600"
                      />
                    </div>
                  )}
                  <img
                    src={img.src}
                    alt={img.title}
                    onLoad={() =>
                      setLoadedImages((current) => new Set(current).add(img.id))
                    }
                    className={`h-full w-full object-cover transition-opacity ${loadedImages.has(img.id) ? "opacity-100" : "opacity-0"}`}
                  />
                  <div
                    className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ background: "rgba(0,0,0,0.65)" }}
                  >
                    <button
                      onClick={() => openEdit(img)}
                      className="rounded border border-white/10 p-2 text-white transition-colors hover:bg-white/10"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => setDeleting(img)}
                      className="rounded border border-white/10 p-2 text-white transition-colors hover:bg-white/10"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="absolute left-2 top-2 cursor-grab text-white/30 transition-colors hover:text-white/60">
                    <GripVertical size={13} />
                  </div>
                  {img.featured && (
                    <div
                      className="absolute right-2 top-2 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white"
                      style={{ background: RED }}
                    >
                      Featured
                    </div>
                  )}
                </div>
                <div className="px-3 py-2.5">
                  <div className="truncate text-sm font-medium text-white">
                    {img.title}
                  </div>
                  <div className="mt-0.5 text-[10px] text-zinc-600">
                    {img.category}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <SectionCard>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  {[
                    "Image",
                    "Title",
                    "Category",
                    "Date Added",
                    "Order",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-600"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((img) => (
                  <tr
                    key={img.id}
                    className="border-b border-[#181818] transition-colors hover:bg-[#191919]"
                  >
                    <td className="px-4 py-3">
                      <div className="relative h-9 w-14 overflow-hidden rounded bg-zinc-900">
                        {!loadedImages.has(`table-${img.id}`) && (
                          <LoaderCircle
                            size={12}
                            className="absolute inset-0 m-auto animate-spin text-zinc-600"
                          />
                        )}
                        <img
                          src={img.src}
                          alt={img.title}
                          onLoad={() =>
                            setLoadedImages((current) =>
                              new Set(current).add(`table-${img.id}`),
                            )
                          }
                          className={`h-full w-full object-cover transition-opacity ${loadedImages.has(`table-${img.id}`) ? "opacity-100" : "opacity-0"}`}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">{img.title}</div>
                      {img.featured && (
                        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-red-400">
                          Featured
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {img.category}
                    </td>
                    <td
                      className="px-4 py-3 text-xs text-zinc-500"
                      style={{ fontFamily: MONO }}
                    >
                      {img.date}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-5 text-center text-sm text-zinc-400"
                          style={{ fontFamily: MONO }}
                        >
                          {img.order}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => moveItem(img.id, -1)}
                            disabled={reorderingId === img.id}
                            className="text-zinc-600 transition-colors hover:text-white"
                          >
                            <ArrowUp size={10} />
                          </button>
                          <button
                            onClick={() => moveItem(img.id, 1)}
                            disabled={reorderingId === img.id}
                            className="text-zinc-600 transition-colors hover:text-white"
                          >
                            <ArrowDown size={10} />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(img)}
                          className="p-1.5 text-zinc-600 transition-colors hover:text-white"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => setDeleting(img)}
                          className="p-1.5 text-zinc-600 transition-colors hover:text-red-400"
                        >
                          <Trash2 size={13} />
                        </button>
                        <GripVertical
                          size={13}
                          className="ml-1 cursor-grab text-zinc-700"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        )}
      </div>

      <Modal
        open={isBulkUploadOpen}
        onClose={closeBulkUpload}
        title="Bulk Upload"
        maxW="520px"
      >
        <div className="flex flex-col gap-5">
          <FSelect
            label="Category"
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
          >
            {effectiveCategoryOptions.map((c) => (
              <option key={c} value={c} style={{ background: "#141414" }}>
                {c}
              </option>
            ))}
          </FSelect>

          <div>
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Images
            </label>
            <div
              className="cursor-pointer rounded-lg border-2 border-dashed border-[#2a2a2a] p-4 transition-colors hover:border-zinc-600"
              onClick={() => bulkFileRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <Upload size={18} className="text-zinc-600" />
                <div className="text-sm text-zinc-500">
                  {bulkFiles.length > 0
                    ? `${bulkFiles.length} file${bulkFiles.length === 1 ? "" : "s"} selected`
                    : "Choose multiple images"}
                </div>
                <div className="text-xs text-zinc-700">
                  JPG, PNG, WEBP
                </div>
              </div>
            </div>
            <input
              ref={bulkFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setBulkFiles(files);
                setBulkError("");
              }}
            />
          </div>

          <Toggle
            label="Featured Images"
            value={bulkFeatured}
            onChange={setBulkFeatured}
          />

          {bulkError && (
            <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {bulkError}
            </div>
          )}

          <div className="flex gap-3 border-t border-[#222] pt-3">
            <Btn onClick={closeBulkUpload} className="flex-1 justify-center">
              Cancel
            </Btn>
            <Btn
              variant="red"
              onClick={handleBulkUpload}
              disabled={bulkSaving || bulkFiles.length === 0}
              className="flex-1 justify-center"
            >
              {bulkSaving ? (
                <>
                  <LoaderCircle size={13} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload Images"
              )}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal
        open={isAdding || !!editing}
        onClose={closeForm}
        title={isAdding ? "Add Image" : "Edit Image"}
        maxW="520px"
      >
        <div className="flex flex-col gap-5">
          <div>
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Image
            </label>
            <div
              className="cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-[#2a2a2a] transition-colors hover:border-zinc-600"
              style={{ minHeight: 160 }}
              onClick={() => fileRef.current?.click()}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full object-cover"
                  style={{ maxHeight: 200 }}
                />
              ) : (
                <div className="flex flex-col items-center gap-3 py-10">
                  <Upload size={18} className="text-zinc-600" />
                  <div className="text-center">
                    <div className="text-sm text-zinc-500">
                      Drop image or click to upload
                    </div>
                    <div className="mt-1 text-xs text-zinc-700">
                      JPG, PNG, WEBP
                    </div>
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setSelectedFile(f);
                  setPreviewUrl(URL.createObjectURL(f));
                }
              }}
            />
          </div>

          <FInput
            label="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Image title"
          />

          <FSelect
            label="Category"
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value }))
            }
          >
            {effectiveCategoryOptions.map((c) => (
              <option key={c} value={c} style={{ background: "#141414" }}>
                {c}
              </option>
            ))}
          </FSelect>

          <FTextarea
            label="Description / Caption"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Brief description or caption..."
            rows={3}
          />

          <Toggle
            label="Featured Image"
            value={form.featured}
            onChange={(v) => setForm((f) => ({ ...f, featured: v }))}
          />

          {saveError && (
            <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {saveError}
            </div>
          )}

          <div className="flex gap-3 border-t border-[#222] pt-3">
            <Btn onClick={closeForm} className="flex-1 justify-center">
              Cancel
            </Btn>
            <Btn
              variant="red"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 justify-center"
            >
              {saving ? (
                <>
                  <LoaderCircle size={13} className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Image"
              )}
            </Btn>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && handleDelete(deleting)}
        name={deleting?.title || ""}
        loading={!!deleting && deletingId === deleting.id}
        closeOnConfirm={false}
      />
    </div>
  );
}

const emptyPkgForm = () => ({
  category: "lifestyle",
  name: "",
  price: 0,
  description: "",
  duration: "",
  images: 0,
  sampleUrl: "",
  features: "",
  status: "active" as "active" | "inactive",
});

function PackagesPage({
  packages,
  setPackages,
  addAudit,
}: {
  packages: PackageItem[];
  setPackages: React.Dispatch<React.SetStateAction<PackageItem[]>>;
  addAudit: (e: Omit<AuditEntry, "id" | "datetime">) => void;
}) {
  const [editing, setEditing] = useState<PackageItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleting, setDeleting] = useState<PackageItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyPkgForm());
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const openAdd = () => {
    setForm(emptyPkgForm());
    setPreviewUrl("");
    setSelectedFile(null);
    setIsAdding(true);
  };

  const openEdit = (pkg: PackageItem) => {
    setEditing(pkg);
    setForm({
      category: pkg.category,
      name: pkg.name,
      price: pkg.price,
      description: pkg.description ?? "",
      duration: pkg.duration ?? "",
      images: pkg.images ?? 0,
      sampleUrl: pkg.sampleUrl ?? "",
      features: pkg.features.join("\n"),
      status: pkg.status,
    });
    setPreviewUrl(pkg.sampleUrl ?? "");
    setSelectedFile(null);
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditing(null);
    setPreviewUrl("");
    setSelectedFile(null);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const adminHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${window.sessionStorage.getItem("uploadToken") ?? ""}`,
    "x-upload-source": "kc-upload",
  });

  const uploadHeaders = () => ({
    Authorization: `Bearer ${window.sessionStorage.getItem("uploadToken") ?? ""}`,
    "x-upload-source": "kc-upload",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const features = form.features
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean);

      const packageId = editing?.id ?? crypto.randomUUID();
      let sampleUrl = form.sampleUrl || undefined;

      if (selectedFile) {
        const uploadData = new FormData();
        uploadData.append("file", selectedFile);
        uploadData.append("target", "package");
        uploadData.append("category", form.category);
        uploadData.append("title", form.name);
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          headers: uploadHeaders(),
          body: uploadData,
        });
        if (!uploadResponse.ok) {
          const uploadBody = await uploadResponse.json().catch(() => ({}));
          throw new Error(uploadBody.error ?? `Upload failed (${uploadResponse.status})`);
        }
        const uploadBody = await uploadResponse.json();
        sampleUrl = uploadBody.url ?? uploadBody.sampleUrl ?? uploadBody.item?.sampleUrl ?? undefined;
        if (!sampleUrl) {
          throw new Error("Image upload succeeded but no Cloudinary URL was returned.");
        }
      }

      const payload = {
        id: packageId,
        category: form.category,
        name: form.name,
        price: form.price,
        duration: form.duration,
        description: form.description,
        editedImages: form.images,
        features,
        sampleUrl,
        active: form.status === "active",
      };

      const response = await fetch("/api/package", {
        method: isAdding ? "POST" : "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Save failed (${response.status})`);
      }
      const body = await response.json();
      const item = body.item;
      const mapped = {
        id: String(item.id),
        category: item.category,
        name: item.name,
        price: Number(item.price),
        duration: item.duration ?? undefined,
        description: item.description ?? undefined,
        images:
          item.edited_images == null ? undefined : Number(item.edited_images),
        sampleUrl: item.sample_url ?? item.sampleUrl ?? undefined,
        features: Array.isArray(item.features) ? item.features : [],
        status: item.active ? ("active" as const) : ("inactive" as const),
      };
      setPackages((prev) =>
        isAdding
          ? [...prev, mapped]
          : prev.map((p) => (p.id === editing?.id ? mapped : p)),
      );
      addAudit({
        activity: isAdding ? "Package Added" : "Package Edited",
        description: `"${form.name}" ${isAdding ? "created" : "updated"}`,
        section: "Packages",
        type: isAdding ? "create" : "edit",
      });
      closeForm();
    } catch (error) {
      console.error("Failed to save package", error);
      const message = error instanceof Error ? error.message : "Save failed";
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pkg: PackageItem) => {
    setDeletingId(pkg.id);
    try {
      const response = await fetch("/api/package-delete", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ id: pkg.id }),
      });
      if (!response.ok) return;
      setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
      addAudit({
        activity: "Package Deleted",
        description: `"${pkg.name}" package removed`,
        section: "Packages",
        type: "delete",
      });
      setDeleting(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader title="Packages">
        <Btn variant="red" onClick={openAdd}>
          <Plus size={13} />
          Add Package
        </Btn>
      </PageHeader>
      <div className="flex-1 overflow-y-auto p-6">
        {packages.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center rounded border border-dashed border-[#2a2a2a] text-xs uppercase tracking-[0.2em] text-zinc-600">
            No packages
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            }}
          >
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="flex flex-col gap-4 rounded border border-[#222] bg-[#141414] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        className="text-white"
                        style={{
                          fontFamily: CONDENSED,
                          fontSize: "1.15rem",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {pkg.name}
                      </span>
                      <span
                        className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] ${pkg.status === "active" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-zinc-500/20 bg-zinc-500/10 text-zinc-500"}`}
                      >
                        {pkg.status}
                      </span>
                    </div>
                    {pkg.description && (
                      <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                        {pkg.description}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div
                      className="text-2xl font-bold text-white"
                      style={{ fontFamily: CONDENSED }}
                    >
                      ${pkg.price.toLocaleString()}
                    </div>
                  </div>
                </div>

                {pkg.sampleUrl && (
                  <div className="overflow-hidden rounded border border-[#222] bg-[#0d0d0d]">
                    <img
                      src={pkg.sampleUrl}
                      alt={pkg.name}
                      className="h-28 w-full object-cover"
                    />
                  </div>
                )}

                <div className="flex gap-4">
                  <div>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                      Duration
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-300">
                      {pkg.duration || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                      Images
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-300">
                      {pkg.images == null ? "—" : `${pkg.images} edited`}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {pkg.features.map((f) => (
                    <span
                      key={f}
                      className="rounded border border-[#2a2a2a] px-2 py-0.5 text-[10px] text-zinc-500"
                    >
                      {f}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 border-t border-[#1e1e1e] pt-3">
                  <Btn size="xs" onClick={() => openEdit(pkg)}>
                    <Edit2 size={11} />
                    Edit
                  </Btn>
                  <Btn
                    size="xs"
                    variant="destructive"
                    onClick={() => setDeleting(pkg)}
                  >
                    <Trash2 size={11} />
                    Delete
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={isAdding || !!editing}
        onClose={closeForm}
        title={isAdding ? "Add Package" : "Edit Package"}
        maxW="480px"
      >
        <div className="flex flex-col gap-5">
          <FInput
            label="Category"
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value }))
            }
            placeholder="e.g. lifestyle"
          />
          <FInput
            label="Package Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Wedding Day"
          />
          <div className="grid grid-cols-2 gap-4">
            <FInput
              label="Price ($)"
              type="number"
              value={form.price}
              onChange={(e) =>
                setForm((f) => ({ ...f, price: Number(e.target.value) }))
              }
              placeholder="0"
            />
            <FInput
              label="Duration"
              value={form.duration}
              onChange={(e) =>
                setForm((f) => ({ ...f, duration: e.target.value }))
              }
              placeholder="e.g. 4 hours"
            />
          </div>
          <FInput
            label="Edited Images"
            type="number"
            value={form.images}
            onChange={(e) =>
              setForm((f) => ({ ...f, images: Number(e.target.value) }))
            }
            placeholder="0"
          />

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Package Image
            </label>
            <div className="flex items-center gap-3">
              <Btn
                type="button"
                onClick={() => fileRef.current?.click()}
                size="xs"
              >
                <Upload size={12} />
                Choose Image
              </Btn>
              <span className="text-xs text-zinc-500">
                {selectedFile ? selectedFile.name : "No file selected"}
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setSelectedFile(file);
                if (file) {
                  setPreviewUrl(URL.createObjectURL(file));
                }
              }}
            />
            {(previewUrl || form.sampleUrl) && (
              <div className="overflow-hidden rounded border border-[#2a2a2a] bg-[#0d0d0d]">
                <img
                  src={previewUrl || form.sampleUrl || ""}
                  alt="Package preview"
                  className="h-40 w-full object-cover"
                />
              </div>
            )}
          </div>

          <FTextarea
            label="Description"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            rows={3}
            placeholder="Package description..."
          />
          <FTextarea
            label="Features (one per line)"
            value={form.features}
            onChange={(e) =>
              setForm((f) => ({ ...f, features: e.target.value }))
            }
            rows={5}
            placeholder={"Online gallery\nHigh-res downloads\nBasic retouching"}
          />
          <FSelect
            label="Status"
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                status: e.target.value as "active" | "inactive",
              }))
            }
          >
            <option value="active" style={{ background: "#141414" }}>
              Active
            </option>
            <option value="inactive" style={{ background: "#141414" }}>
              Inactive
            </option>
          </FSelect>
          <div className="flex gap-3 border-t border-[#222] pt-3">
            <Btn onClick={closeForm} className="flex-1 justify-center">
              Cancel
            </Btn>
            <Btn
              variant="red"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 justify-center"
            >
              {saving ? (
                <>
                  <LoaderCircle size={13} className="animate-spin" /> Saving...
                </>
              ) : (
                "Save Package"
              )}
            </Btn>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && handleDelete(deleting)}
        name={deleting?.name || ""}
        loading={!!deleting && deletingId === deleting.id}
        closeOnConfirm={false}
      />
    </div>
  );
}

const emptyTestiForm = () => ({
  client: "",
  videoUrl: "",
  text: "",
  rating: 5,
  date: "",
  published: false,
});

function TestimonialsPage({
  testimonials,
  setTestimonials,
  addAudit,
}: {
  testimonials: Testimonial[];
  setTestimonials: React.Dispatch<React.SetStateAction<Testimonial[]>>;
  addAudit: (e: Omit<AuditEntry, "id" | "datetime">) => void;
}) {
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleting, setDeleting] = useState<Testimonial | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [form, setForm] = useState(emptyTestiForm());

  const openAdd = () => {
    setForm(emptyTestiForm());
    setIsAdding(true);
  };

  const openEdit = (t: Testimonial) => {
    setEditing(t);
    setForm({
      client: t.client,
      videoUrl: t.videoUrl,
      text: t.text,
      rating: t.rating,
      date: t.date,
      published: t.published,
    });
  };

  const handleVideoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      window.alert("Please upload a video file for the testimonial.");
      event.target.value = "";
      return;
    }

    setVideoUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("target", "testimonial");

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: adminHeaders(),
        body: uploadData,
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.url) {
        throw new Error(body.error ?? "Video upload failed");
      }

      setForm((current) => ({ ...current, videoUrl: String(body.url) }));
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Unable to upload the testimonial video.",
      );
    } finally {
      setVideoUploading(false);
      event.target.value = "";
    }
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditing(null);
  };

  const adminHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${window.sessionStorage.getItem("uploadToken") ?? ""}`,
    "x-upload-source": "kc-upload",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        clientName: form.client,
        videoUrl: form.videoUrl,
        content: form.text,
        rating: form.rating,
        date: form.date,
        clientRole: "",
        published: form.published,
      };
      const response = await fetch("/api/testimonials", {
        method: isAdding ? "POST" : "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify(
          isAdding ? payload : { ...payload, id: editing?.id },
        ),
      });
      const body = await response.json();
      if (!response.ok || !body.testimonial) return;
      setTestimonials((prev) =>
        isAdding
          ? [
              ...prev,
              {
                id: body.testimonial.id,
                client: body.testimonial.clientName,
                videoUrl: body.testimonial.videoUrl ?? "",
                text: body.testimonial.content,
                rating: body.testimonial.rating,
                date:
                  body.testimonial.date ??
                  String(body.testimonial.createdAt).slice(0, 10),
                published: body.testimonial.published,
              },
            ]
          : prev.map((t) =>
              t.id === editing?.id
                ? { ...t, client: form.client, videoUrl: form.videoUrl, text: form.text, rating: form.rating, date: form.date, published: form.published }
                : t,
            ),
      );
      addAudit({
        activity: isAdding ? "Testimonial Added" : "Testimonial Edited",
        description: `${form.client}'s testimonial ${isAdding ? "created" : "updated"}`,
        section: "Testimonials",
        type: isAdding ? "create" : "edit",
      });
      closeForm();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: Testimonial) => {
    setDeletingId(t.id);
    try {
      const response = await fetch("/api/testimonials", {
        method: "DELETE",
        headers: adminHeaders(),
        body: JSON.stringify({ id: t.id }),
      });
      if (!response.ok) return;
      setTestimonials((prev) => prev.filter((x) => x.id !== t.id));
      addAudit({
        activity: "Testimonial Deleted",
        description: `${t.client}'s testimonial removed`,
        section: "Testimonials",
        type: "delete",
      });
      setDeleting(null);
    } finally {
      setDeletingId(null);
    }
  };

  const togglePublish = async (t: Testimonial) => {
    const published = !t.published;
    setPublishingId(t.id);
    try {
      const response = await fetch("/api/testimonials", {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ id: t.id, published }),
      });
      if (!response.ok) return;
      setTestimonials((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, published } : x)),
      );
      addAudit({
        activity: "Testimonial Publication Changed",
        description: `${t.client}'s testimonial ${t.published ? "unpublished" : "published"}`,
        section: "Testimonials",
        type: "edit",
        prev: t.published ? "Published" : "Unpublished",
        next: t.published ? "Unpublished" : "Published",
      });
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader title="Testimonials">
        <Btn variant="red" onClick={openAdd}>
          <Plus size={13} />
          Add Testimonial
        </Btn>
      </PageHeader>
      <div className="flex-1 overflow-y-auto p-6">
        {testimonials.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center rounded border border-dashed border-[#2a2a2a] text-xs uppercase tracking-[0.2em] text-zinc-600">
            No testimonials
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            }}
          >
            {testimonials.map((t) => (
              <div
                key={t.id}
                className="flex flex-col gap-4 rounded border border-[#222] bg-[#141414] p-5"
              >
                <div className="flex items-start gap-3.5">
                  {t.videoUrl ? (
                    <video
                      src={t.videoUrl}
                      className="h-14 w-20 flex-shrink-0 rounded object-cover bg-zinc-800"
                      muted
                      playsInline
                    />
                  ) : (
                    <div className="flex h-14 w-20 flex-shrink-0 items-center justify-center rounded bg-zinc-800 text-[9px] uppercase tracking-[0.2em] text-zinc-500">
                      Video
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white">
                        {t.client}
                      </span>
                      <span
                        className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] ${t.published ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-zinc-500/20 bg-zinc-500/10 text-zinc-500"}`}
                      >
                        {t.published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <StarDisplay rating={t.rating} />
                      <span
                        className="text-[10px] text-zinc-600"
                        style={{ fontFamily: MONO }}
                      >
                        {t.date}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm italic leading-relaxed text-zinc-400">
                  "{t.text}"
                </p>
                <div className="flex gap-2 border-t border-[#1e1e1e] pt-3">
                  <Btn
                    size="xs"
                    onClick={() => togglePublish(t)}
                    disabled={publishingId === t.id}
                  >
                    {publishingId === t.id && (
                      <LoaderCircle size={11} className="animate-spin" />
                    )}
                    {t.published ? <EyeOff size={11} /> : <Eye size={11} />}
                    {t.published ? "Unpublish" : "Publish"}
                  </Btn>
                  <Btn size="xs" onClick={() => openEdit(t)}>
                    <Edit2 size={11} />
                    Edit
                  </Btn>
                  <Btn
                    size="xs"
                    variant="destructive"
                    onClick={() => setDeleting(t)}
                  >
                    <Trash2 size={11} />
                    Delete
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={isAdding || !!editing}
        onClose={closeForm}
        title={isAdding ? "Add Testimonial" : "Edit Testimonial"}
        maxW="480px"
      >
        <div className="flex flex-col gap-5">
          <FInput
            label="Client Name"
            value={form.client}
            onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))}
            placeholder="Client full name"
          />
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Client Video
            </label>
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center justify-center rounded border border-[#2a2a2a] bg-[#0d0d0d] px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500">
                {videoUploading ? "Uploading..." : "Upload Video"}
                <input
                  type="file"
                  accept="video/*"
                  hidden
                  onChange={handleVideoUpload}
                />
              </label>
              <span className="text-xs text-zinc-500">
                {form.videoUrl ? "Video attached" : "No video uploaded yet"}
              </span>
            </div>
            {form.videoUrl && (
              <video
                src={form.videoUrl}
                controls
                className="h-28 w-full rounded border border-[#2a2a2a] bg-black object-cover"
              />
            )}
          </div>
          <FTextarea
            label="Testimonial"
            value={form.text}
            onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
            rows={4}
            placeholder="What the client said..."
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Rating
            </label>
            <StarPicker
              value={form.rating}
              onChange={(v) => setForm((f) => ({ ...f, rating: v }))}
            />
          </div>
          <FInput
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
          <Toggle
            label="Published"
            value={form.published}
            onChange={(v) => setForm((f) => ({ ...f, published: v }))}
          />
          <div className="flex gap-3 border-t border-[#222] pt-3">
            <Btn onClick={closeForm} className="flex-1 justify-center">
              Cancel
            </Btn>
            <Btn
              variant="red"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 justify-center"
            >
              {saving ? (
                <>
                  <LoaderCircle size={13} className="animate-spin" /> Saving...
                </>
              ) : (
                "Save Testimonial"
              )}
            </Btn>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && handleDelete(deleting)}
        name={deleting?.client || ""}
        loading={!!deleting && deletingId === deleting.id}
        closeOnConfirm={false}
      />
    </div>
  );
}

function BookingsPage({
  bookings,
  packages,
  setBookings,
  addAudit,
}: {
  bookings: Booking[];
  packages: PackageItem[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  addAudit: (e: Omit<AuditEntry, "id" | "datetime">) => void;
}) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"All" | BookingStatus>("All");
  const [showCancelled, setShowCancelled] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newBooking, setNewBooking] = useState({
    client: "",
    email: "",
    phone: "",
    package: packages[0]?.name ?? "",
    preferredDate: "",
    notes: "",
    status: "Pending" as BookingStatus,
  });

  const statusOptions: Array<"All" | BookingStatus> = [
    "All",
    "Pending",
    "To Confirm",
    "Confirmed",
    "Cancelled",
  ];

  const filteredBookings =
    statusFilter === "All"
      ? bookings.filter(
          (booking) => showCancelled || booking.status !== "Cancelled",
        )
      : bookings.filter((booking) => booking.status === statusFilter);

  const resetCreateForm = () => {
    setNewBooking({
      client: "",
      email: "",
      phone: "",
      package: packages[0]?.name ?? "",
      preferredDate: "",
      notes: "",
      status: "Pending",
    });
    setCreateError("");
  };

  const handleCreateBooking = async () => {
    if (!newBooking.client.trim()) {
      setCreateError("Client name is required.");
      return;
    }

    if (!newBooking.email.trim() && !newBooking.phone.trim()) {
      setCreateError("Add at least one contact method.");
      return;
    }

    setCreating(true);
    setCreateError("");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${window.sessionStorage.getItem("uploadToken") ?? ""}`,
          "x-upload-source": "kc-upload",
        },
        body: JSON.stringify({
          clientName: newBooking.client.trim(),
          email: newBooking.email.trim(),
          phone: newBooking.phone.trim(),
          packageName: newBooking.package.trim(),
          preferredDate: newBooking.preferredDate || null,
          notes: newBooking.notes.trim(),
          status: BOOKING_STATUS_VALUES[newBooking.status],
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? `Create booking failed (${response.status})`);
      }

      const created = body.booking;
      const nextBooking: Booking = {
        id: String(created.id),
        client: String(created.client ?? ""),
        email: String(created.email ?? ""),
        phone: String(created.phone ?? ""),
        package: String(created.package ?? ""),
        preferredDate: created.preferredDate
          ? String(created.preferredDate).slice(0, 10)
          : "—",
        requestDate: created.requestDate
          ? String(created.requestDate).slice(0, 10)
          : "—",
        status: BOOKING_STATUS_LABELS[String(created.status)] ?? "Pending",
      };

      setBookings((prev) => [nextBooking, ...prev]);
      addAudit({
        activity: "Booking Created",
        description: `${nextBooking.client} booking added manually`,
        section: "Bookings",
        type: "create",
      });
      setIsCreateOpen(false);
      resetCreateForm();
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Unable to create booking.",
      );
    } finally {
      setCreating(false);
    }
  };

  const changeStatus = async (
    id: string,
    prev: BookingStatus,
    next: BookingStatus,
  ) => {
    if (prev === next) return;
    const statusValues: Record<BookingStatus, string> = {
      Pending: "pending",
      "To Confirm": "to_confirm",
      Confirmed: "confirmed",
      Cancelled: "cancelled",
    };
    setUpdatingId(id);
    try {
      const response = await fetch("/api/bookings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${window.sessionStorage.getItem("uploadToken") ?? ""}`,
          "x-upload-source": "kc-upload",
        },
        body: JSON.stringify({ id, status: statusValues[next] }),
      });
      if (!response.ok) return;
      setBookings((b) =>
        b.map((bk) => (bk.id === id ? { ...bk, status: next } : bk)),
      );
      const bk = bookings.find((b) => b.id === id);
      addAudit({
        activity: "Booking Status Changed",
        description: `${bk?.client} booking updated`,
        section: "Bookings",
        type: "status",
        prev,
        next,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader title="Bookings">
        <Btn variant="red" onClick={() => {
          resetCreateForm();
          setIsCreateOpen(true);
        }}>
          <Plus size={13} />
          Create Booking
        </Btn>
      </PageHeader>
      <div className="flex-shrink-0 border-b border-[#1e1e1e] bg-[#0a0a0a] px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatusFilter(option)}
                className="whitespace-nowrap rounded px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] transition-all"
                style={{
                  background: statusFilter === option ? RED : "transparent",
                  color: statusFilter === option ? "white" : "#8a8a8a",
                  border: statusFilter === option ? "1px solid transparent" : "1px solid #272727",
                }}
              >
                {option}
              </button>
            ))}
          </div>
          <label className="ml-auto inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-zinc-500">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
              className="h-3.5 w-3.5 rounded border border-[#3a3a3a] bg-[#111] accent-red-500"
            />
            Show cancelled
          </label>
        </div>
        {statusFilter === "All" && !showCancelled && (
          <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-zinc-600">
            Cancelled hidden by default
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {filteredBookings.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center rounded border border-dashed border-[#2a2a2a] text-xs uppercase tracking-[0.2em] text-zinc-600">
            {statusFilter === "All" ? "No bookings" : `No ${statusFilter.toLowerCase()} bookings`}
          </div>
        ) : (
          <SectionCard>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  {[
                    "Client",
                    "Contact",
                    "Package",
                    "Preferred Date",
                    "Request Date",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-600"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((bk) => (
                  <tr
                    key={bk.id}
                    className="border-b border-[#181818] transition-colors hover:bg-[#191919]"
                  >
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium text-white">
                        {bk.client}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-xs text-zinc-400">{bk.email}</div>
                      <div className="mt-0.5 text-xs text-zinc-600">
                        {bk.phone}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-zinc-300">
                      {bk.package}
                    </td>
                    <td
                      className="px-5 py-4 text-xs text-zinc-400"
                      style={{ fontFamily: MONO }}
                    >
                      {bk.preferredDate}
                    </td>
                    <td
                      className="px-5 py-4 text-xs text-zinc-500"
                      style={{ fontFamily: MONO }}
                    >
                      {bk.requestDate}
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={bk.status}
                        onChange={(e) =>
                          changeStatus(
                            bk.id,
                            bk.status,
                            e.target.value as BookingStatus,
                          )
                        }
                        disabled={updatingId === bk.id}
                        className={`cursor-pointer rounded border px-2.5 py-1.5 text-xs font-semibold outline-none transition-colors ${BOOKING_STYLES[bk.status]}`}
                        style={{ background: "transparent" }}
                      >
                        {updatingId === bk.id ? (
                          <option
                            value={bk.status}
                            style={{
                              background: "#141414",
                              color: "#f2f2f2",
                            }}
                          >
                            Saving...
                          </option>
                        ) : (
                          (
                            [
                              "Pending",
                              "To Confirm",
                              "Confirmed",
                              "Cancelled",
                            ] as BookingStatus[]
                          ).map((s) => (
                            <option
                              key={s}
                              value={s}
                              style={{
                                background: "#141414",
                                color: "#f2f2f2",
                              }}
                            >
                              {s}
                            </option>
                          ))
                        )}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        )}
      </div>

      <Modal
        open={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          resetCreateForm();
        }}
        title="Create Booking"
        maxW="560px"
      >
        <div className="flex flex-col gap-5">
          <FInput
            label="Client Name"
            value={newBooking.client}
            onChange={(e) =>
              setNewBooking((f) => ({ ...f, client: e.target.value }))
            }
            placeholder="Jane Doe"
          />

          <div className="grid grid-cols-2 gap-4">
            <FInput
              label="Email"
              type="email"
              value={newBooking.email}
              onChange={(e) =>
                setNewBooking((f) => ({ ...f, email: e.target.value }))
              }
              placeholder="jane@email.com"
            />
            <FInput
              label="Phone"
              value={newBooking.phone}
              onChange={(e) =>
                setNewBooking((f) => ({ ...f, phone: e.target.value }))
              }
              placeholder="(555) 555-0000"
            />
          </div>

          <FSelect
            label="Package"
            value={newBooking.package}
            onChange={(e) =>
              setNewBooking((f) => ({ ...f, package: e.target.value }))
            }
          >
            {packages.length === 0 ? (
              <option value="">No packages available</option>
            ) : (
              packages.map((pkg) => (
                <option key={pkg.id} value={pkg.name} style={{ background: "#141414" }}>
                  {pkg.name}
                </option>
              ))
            )}
          </FSelect>

          <div className="grid grid-cols-2 gap-4">
            <FInput
              label="Preferred Date"
              type="date"
              value={newBooking.preferredDate}
              onChange={(e) =>
                setNewBooking((f) => ({ ...f, preferredDate: e.target.value }))
              }
            />
            <FSelect
              label="Status"
              value={newBooking.status}
              onChange={(e) =>
                setNewBooking((f) => ({
                  ...f,
                  status: e.target.value as BookingStatus,
                }))
              }
            >
              {(["Pending", "To Confirm", "Confirmed", "Cancelled"] as BookingStatus[]).map(
                (status) => (
                  <option key={status} value={status} style={{ background: "#141414" }}>
                    {status}
                  </option>
                ),
              )}
            </FSelect>
          </div>

          <FTextarea
            label="Notes"
            value={newBooking.notes}
            onChange={(e) =>
              setNewBooking((f) => ({ ...f, notes: e.target.value }))
            }
            rows={4}
            placeholder="Trip details, client notes, or anything relevant..."
          />

          {createError && (
            <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {createError}
            </div>
          )}

          <div className="flex gap-3 border-t border-[#222] pt-3">
            <Btn
              onClick={() => {
                setIsCreateOpen(false);
                resetCreateForm();
              }}
              className="flex-1 justify-center"
            >
              Cancel
            </Btn>
            <Btn
              variant="red"
              onClick={handleCreateBooking}
              disabled={creating}
              className="flex-1 justify-center"
            >
              {creating ? (
                <>
                  <LoaderCircle size={13} className="animate-spin" /> Saving...
                </>
              ) : (
                "Save Booking"
              )}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function AuditTrailPage({ audit }: { audit: AuditEntry[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const filtered = audit
    .filter((e) => typeFilter === "All" || e.type === typeFilter)
    .filter(
      (e) =>
        e.activity.toLowerCase().includes(search.toLowerCase()) ||
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        e.section.toLowerCase().includes(search.toLowerCase()),
    );

  const auditTypes: (AuditType | "All")[] = [
    "All",
    "create",
    "edit",
    "delete",
    "login",
    "logout",
    "status",
    "settings",
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader title="Audit Trail">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search activity..."
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded border border-[#272727] bg-[#0d0d0d] px-3 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-500"
        >
          {auditTypes.map((t) => (
            <option key={t} value={t} style={{ background: "#0d0d0d" }}>
              {t === "All"
                ? "All Types"
                : AUDIT_STYLES[t as AuditType]?.label || t}
            </option>
          ))}
        </select>
      </PageHeader>

      <div className="flex-shrink-0 border-b border-[#1a1a1a] bg-[#0a0a0a] px-7 py-2.5">
        <p className="text-xs text-zinc-600">
          Track recent activity and changes made within the dashboard.
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <SectionCard>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  {[
                    "Date & Time",
                    "Activity",
                    "Description",
                    "Section",
                    "Type",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-600"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => {
                  const s = AUDIT_STYLES[entry.type];
                  const isSel = selected?.id === entry.id;
                  return (
                    <tr
                      key={entry.id}
                      className={`cursor-pointer border-b border-[#181818] transition-colors ${isSel ? "bg-[#1c1c1c]" : "hover:bg-[#181818]"}`}
                      onClick={() => setSelected(isSel ? null : entry)}
                    >
                      <td
                        className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap"
                        style={{ fontFamily: MONO }}
                      >
                        {entry.datetime}
                      </td>
                      <td className="px-4 py-3 text-sm text-white">
                        {entry.activity}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-xs text-zinc-400">
                        {entry.description}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {entry.section}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-1.5 w-1.5 rounded-full ${s.dot}`}
                          />
                          <span className={`text-xs ${s.text}`}>{s.label}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-sm text-zinc-600"
                    >
                      No activity matches your filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </SectionCard>
        </div>

        {selected && (
          <div className="flex w-72 shrink-0 flex-col border-l border-[#1e1e1e] bg-[#0d0d0d]">
            <div className="flex items-center justify-between border-b border-[#1e1e1e] px-5 py-4">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-white"
                style={{ fontFamily: CONDENSED }}
              >
                Activity Detail
              </span>
              <button
                onClick={() => setSelected(null)}
                className="p-0.5 text-zinc-600 transition-colors hover:text-white"
              >
                <X size={13} />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
              {(
                [
                  { label: "Timestamp", value: selected.datetime },
                  { label: "Activity", value: selected.activity },
                  { label: "Description", value: selected.description },
                  { label: "Section", value: selected.section },
                ] as const
              ).map(({ label, value }) => (
                <div key={label}>
                  <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                    {label}
                  </div>
                  <div className="text-xs leading-relaxed text-zinc-300">
                    {value}
                  </div>
                </div>
              ))}

              {(selected.prev || selected.next) && (
                <div className="flex flex-col gap-3 border-t border-[#222] pt-4">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                    Changes
                  </div>
                  {selected.prev && (
                    <div>
                      <div className="mb-1.5 text-[9px] text-zinc-600">
                        Previous Value
                      </div>
                      <div className="rounded border border-red-500/20 bg-red-500/5 px-2.5 py-2 text-xs leading-relaxed text-red-400">
                        {selected.prev}
                      </div>
                    </div>
                  )}
                  {selected.next && (
                    <div>
                      <div className="mb-1.5 text-[9px] text-zinc-600">
                        New Value
                      </div>
                      <div className="rounded border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-2 text-xs leading-relaxed text-emerald-400">
                        {selected.next}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <div
                  className={`h-2 w-2 rounded-full ${AUDIT_STYLES[selected.type].dot}`}
                />
                <span
                  className={`text-xs font-medium ${AUDIT_STYLES[selected.type].text}`}
                >
                  {AUDIT_STYLES[selected.type].label}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsPage({
  addAudit,
}: {
  addAudit: (e: Omit<AuditEntry, "id" | "datetime">) => void;
}) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    studioName: "KCAPTURED Studios",
    email: "",
    phone: "",
    location: "",
    instagram: "",
    bookingEmail: "",
    bookingMessage: "",
    maxBookings: "10",
    heroLabel: 'KCAPTURED VISUALS',
    portfolioView: 'current',
    paymentInstructions: "",
  });

  useEffect(() => {
    fetch("/api/settings", {
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem("uploadToken") ?? ""}`,
        "x-upload-source": "kc-upload",
      },
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        return body;
      })
        .then((settings) =>
        setForm((current) => ({
          ...current,
          studioName: settings.studioName,
          email: settings.email ?? "",
          phone: settings.phone ?? "",
          instagram: settings.instagramHandle ?? "",
          bookingEmail: settings.bookingEmail ?? "",
          maxBookings: String(settings.maxConcurrentBookings ?? 10),
          heroLabel: settings.heroLabel ?? 'KCAPTURED VISUALS',
          portfolioView: settings.portfolioView ?? 'current',
          paymentInstructions: settings.paymentInstructions ?? "",
        })),
      )
      .catch((loadError) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load settings",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setError("");
    setSaving(true);
    let response: Response;
    try {
      response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${window.sessionStorage.getItem("uploadToken") ?? ""}`,
          "x-upload-source": "kc-upload",
        },
        body: JSON.stringify({
          studioName: form.studioName,
          email: form.email,
          phone: form.phone,
          instagramHandle: form.instagram,
          bookingEmail: form.bookingEmail,
          maxConcurrentBookings: form.maxBookings,
          heroLabel: form.heroLabel,
          portfolioView: form.portfolioView,
          paymentInstructions: form.paymentInstructions,
        }),
      });
    } catch {
      setError("Failed to save settings");
      setSaving(false);
      return;
    }
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Failed to save settings");
      setSaving(false);
      return;
    }
    addAudit({
      activity: "Settings Updated",
      description: "Studio settings saved",
      section: "Settings",
      type: "settings",
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
    setSaving(false);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader title="Settings" />
      <div className="flex-1 overflow-y-auto p-6">
        {loading && (
          <div className="mb-5 text-xs uppercase tracking-[0.2em] text-zinc-600">
            Loading settings...
          </div>
        )}
        {error && <div className="mb-5 text-sm text-red-400">{error}</div>}
        <div className="flex max-w-[520px] flex-col gap-5">
          <SectionCard title="Studio Information">
            <div className="flex flex-col gap-4 p-5">
              <FInput
                label="Studio Name"
                value={form.studioName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, studioName: e.target.value }))
                }
              />
              <FInput
                label="Contact Email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
              <FInput
                label="Phone"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
              <FInput
                label="Instagram Handle"
                value={form.instagram}
                onChange={(e) =>
                  setForm((f) => ({ ...f, instagram: e.target.value }))
                }
              />
              <FInput
                label="Booking Email"
                type="email"
                value={form.bookingEmail}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bookingEmail: e.target.value }))
                }
              />
              <FInput
                label="Hero Label"
                value={form.heroLabel}
                onChange={(e) => setForm((f) => ({ ...f, heroLabel: e.target.value }))}
              />
              <div>
                <label className="block mb-2 text-sm font-medium">Portfolio View</label>
                <select
                  value={form.portfolioView}
                  onChange={(e) => setForm((f) => ({ ...f, portfolioView: e.target.value }))}
                  className="w-full rounded-md border bg-transparent px-3 py-2"
                >
                  <option value="current">Current (default)</option>
                  <option value="masonry">Masonry (no gaps)</option>
                </select>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Booking Settings">
            <div className="flex flex-col gap-4 p-5">
              <FInput
                label="Max Concurrent Bookings"
                type="number"
                value={form.maxBookings}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxBookings: e.target.value }))
                }
              />
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="payment-instructions"
                  className="text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-500"
                >
                  Payment Instructions
                </label>
                <textarea
                  id="payment-instructions"
                  rows={5}
                  maxLength={2000}
                  value={form.paymentInstructions}
                  placeholder="Sent in the confirmation email and shown on the client's booking page once confirmed. Leave empty to use the default deposit, Cash App and Zelle details."
                  onChange={(e) =>
                    setForm((f) => ({ ...f, paymentInstructions: e.target.value }))
                  }
                  className="w-full resize-y rounded-md border border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                />
              </div>
            </div>
          </SectionCard>

          <div>
            <Btn
              variant="red"
              onClick={handleSave}
              disabled={saving}
              className="min-w-[140px] justify-center"
            >
              {saved ? (
                <>
                  <Check size={13} />
                  Saved
                </>
              ) : saving ? (
                <>
                  <LoaderCircle size={13} className="animate-spin" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FigmaAdmin({
  initialSection = "dashboard",
}: {
  initialSection?: Section;
}) {
  const [section, setSection] = useState<Section>(initialSection);
  const [portfolio, setPortfolio] = useState<PortfolioImage[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [feedback, setFeedback] = useState("");

  const notify = (message: string) => {
    setFeedback(message);
    window.setTimeout(
      () => setFeedback((current) => (current === message ? "" : current)),
      2800,
    );
  };

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const adminHeaders = {
          Authorization: `Bearer ${window.sessionStorage.getItem("uploadToken") ?? ""}`,
          "x-upload-source": "kc-upload",
        };
        const [
          packagesResponse,
          portfolioResponse,
          testimonialsResponse,
          bookingsResponse,
          auditResponse,
        ] = await Promise.all([
          fetch("/api/packages?includeInactive=true"),
          fetch("/api/portfolio-images"),
          fetch("/api/testimonials?includeDrafts=true", {
            headers: adminHeaders,
          }),
          fetch("/api/bookings", { headers: adminHeaders }),
          fetch("/api/audit", { headers: adminHeaders }),
        ]);
        if (
          !packagesResponse.ok ||
          !portfolioResponse.ok ||
          !testimonialsResponse.ok ||
          !bookingsResponse.ok ||
          !auditResponse.ok
        )
          throw new Error(
            "Admin data could not be loaded. Verify your admin session.",
          );

        const [
          packageRows,
          portfolioRows,
          testimonialRows,
          bookingRows,
          auditRows,
        ] = await Promise.all([
          packagesResponse.json(),
          portfolioResponse.json(),
          testimonialsResponse.ok
            ? testimonialsResponse.json()
            : Promise.resolve([]),
          bookingsResponse.ok ? bookingsResponse.json() : Promise.resolve([]),
          auditResponse.json(),
        ]);

        if (!mounted) return;
        setPackages(
          (Array.isArray(packageRows) ? packageRows : []).map((row) => ({
            id: String(row.id),
            category: String(row.category ?? ""),
            name: String(row.name ?? ""),
            price: Number(row.price ?? 0),
            duration: row.duration ?? undefined,
            description: row.description ?? undefined,
            images:
              row.editedImages == null ? undefined : Number(row.editedImages),
            features: Array.isArray(row.features)
              ? row.features.map(String)
              : [],
            status: row.active ? "active" : "inactive",
          })),
        );
        setPortfolio(
          (Array.isArray(portfolioRows) ? portfolioRows : []).map(
            (row, index) => ({
              id: String(row.id),
              title: String(row.title ?? ""),
              category: String(row.category ?? ""),
              date: row.created_at
                ? String(row.created_at).slice(0, 10)
                : undefined,
              order: Number(row.sort_order ?? index + 1),
              src: String(row.cloudinaryUrl ?? ""),
              description: row.caption ?? undefined,
              featured: Boolean(row.featured),
            }),
          ),
        );
        setTestimonials(
          (Array.isArray(testimonialRows) ? testimonialRows : []).map(
            (row) => ({
              id: String(row.id),
              client: String(row.clientName ?? ""),
              videoUrl: row.videoUrl ?? "",
              text: String(row.content ?? ""),
              rating: Number(row.rating ?? 5),
              date:
                row.date ??
                (row.createdAt ? String(row.createdAt).slice(0, 10) : ""),
              published: Boolean(row.published),
            }),
          ),
        );
        const statusLabels: Record<string, BookingStatus> = {
          pending: "Pending",
          to_confirm: "To Confirm",
          confirmed: "Confirmed",
          cancelled: "Cancelled",
        };
        setBookings(
          (Array.isArray(bookingRows) ? bookingRows : []).map((row) => ({
            id: String(row.id),
            client: String(row.client ?? ""),
            email: String(row.email ?? ""),
            phone: String(row.phone ?? ""),
            package: String(row.package ?? ""),
            preferredDate: row.preferredDate
              ? String(row.preferredDate).slice(0, 10)
              : "—",
            requestDate: row.requestDate
              ? String(row.requestDate).slice(0, 10)
              : "—",
            status: statusLabels[row.status] ?? "Pending",
          })),
        );
        setAudit(
          (Array.isArray(auditRows) ? auditRows : []).map((row) => ({
            ...row,
            id: String(row.id),
            datetime: String(row.datetime),
            type: row.type as AuditType,
          })),
        );
      } catch (error) {
        console.error(
          "[figma-admin] failed to load packages or portfolio",
          error,
        );
        if (mounted) {
          setDataError(
            error instanceof Error
              ? error.message
              : "Admin data could not be loaded",
          );
          setPackages([]);
          setPortfolio([]);
        }
      } finally {
        if (mounted) setDataLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const addAudit = (entry: Omit<AuditEntry, "id" | "datetime">) => {
    const action =
      entry.type === "create"
        ? "created"
        : entry.type === "delete"
          ? "deleted"
          : entry.type === "edit"
            ? "edited"
            : entry.type === "status"
              ? "status_changed"
              : entry.type;
    void fetch("/api/audit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${window.sessionStorage.getItem("uploadToken") ?? ""}`,
        "x-upload-source": "kc-upload",
      },
      body: JSON.stringify({
        action,
        entityType: entry.section,
        description: entry.description,
      }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Audit write failed");
        return response.json();
      })
      .then((record) => setAudit((prev) => [record, ...prev]))
      .catch((error) =>
        console.error("[figma-admin] audit write failed", error),
      );
    notify(`${entry.activity} successfully`);
  };

  return (
    <AdminFeedbackContext.Provider value={{ notify }}>
      {feedback && (
        <div
          className="fixed right-5 top-5 z-[100] flex items-center gap-2 rounded border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-300 shadow-lg shadow-black/30"
          role="status"
        >
          <Check size={15} />
          {feedback}
        </div>
      )}

      <style>{`
        * { font-family: 'Outfit', system-ui, sans-serif; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #3a3a3a; }
      `}</style>

      <div className="flex h-screen overflow-hidden bg-[#080808] text-[#f2f2f2]">
        <Sidebar active={section} onNavigate={setSection} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {dataError && (
            <div className="border-b border-red-500/20 bg-red-500/10 px-6 py-3 text-sm text-red-300">
              {dataError}
            </div>
          )}
          {dataLoading ? (
            <div className="flex flex-1 items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] text-zinc-600">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
              Loading data...
            </div>
          ) : dataError ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-red-300">
              {dataError}
            </div>
          ) : (
            <>
              {section === "dashboard" && (
                <DashboardPage
                  portfolio={portfolio}
                  packages={packages}
                  testimonials={testimonials}
                  bookings={bookings}
                  audit={audit}
                  onNavigate={setSection}
                />
              )}
              {section === "portfolio" && (
                <PortfolioPage
                  portfolio={portfolio}
                  packages={packages}
                  setPortfolio={setPortfolio}
                  addAudit={addAudit}
                />
              )}
              {section === "packages" && (
                <PackagesPage
                  packages={packages}
                  setPackages={setPackages}
                  addAudit={addAudit}
                />
              )}
            </>
          )}
          {section === "testimonials" && (
            <TestimonialsPage
              testimonials={testimonials}
              setTestimonials={setTestimonials}
              addAudit={addAudit}
            />
          )}
          {section === "bookings" && (
            <BookingsPage
              bookings={bookings}
              packages={packages}
              setBookings={setBookings}
              addAudit={addAudit}
            />
          )}
          {section === "trail" && <AuditTrailPage audit={audit} />}
          {section === "settings" && <SettingsPage addAudit={addAudit} />}
        </div>
      </div>
    </AdminFeedbackContext.Provider>
  );
}
