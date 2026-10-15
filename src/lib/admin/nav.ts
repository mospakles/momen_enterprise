import type { PermissionResource } from "./types";

export interface NavLeaf {
  href: string;
  label: string;
  icon: string;
  resource?: PermissionResource;
}

export interface NavGroup {
  label: string;
  items: NavLeaf[];
}

export const ADMIN_NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: "grid", resource: "dashboard" }],
  },
  {
    label: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", icon: "box", resource: "orders" },
      { href: "/admin/payments", label: "Payments", icon: "card", resource: "payments" },
      { href: "/admin/refunds", label: "Refunds", icon: "refresh", resource: "refunds" },
      { href: "/admin/promotions", label: "Promotions", icon: "percent", resource: "promotions" },
      { href: "/admin/discounts", label: "Discounts", icon: "percent", resource: "promotions" },
      { href: "/admin/coupons", label: "Coupons", icon: "tag", resource: "promotions" },
      { href: "/admin/gift-cards", label: "Gift Cards", icon: "gift", resource: "promotions" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", icon: "box", resource: "products" },
      { href: "/admin/collections", label: "Collections", icon: "layers", resource: "collections" },
      { href: "/admin/categories", label: "Categories", icon: "tag", resource: "collections" },
      { href: "/admin/fabrics", label: "Fabrics", icon: "layers", resource: "products" },
      { href: "/admin/colours", label: "Colours", icon: "image", resource: "products" },
      { href: "/admin/sizes", label: "Sizes", icon: "ruler", resource: "products" },
      { href: "/admin/customization-options", label: "Customization Options", icon: "settings", resource: "products" },
      { href: "/admin/inventory", label: "Inventory", icon: "archive", resource: "inventory" },
    ],
  },
  {
    label: "Customers",
    items: [
      { href: "/admin/customers", label: "Customers", icon: "users", resource: "customers" },
      { href: "/admin/measurements", label: "Measurements", icon: "ruler", resource: "measurements" },
      { href: "/admin/reviews", label: "Reviews", icon: "star", resource: "reviews" },
      { href: "/admin/wishlist", label: "Wishlist", icon: "heart", resource: "reviews" },
      { href: "/admin/stock-alerts", label: "Stock Alerts", icon: "heart", resource: "products" },
    ],
  },
  {
    label: "Fulfillment",
    items: [
      { href: "/admin/production", label: "Production", icon: "scissors", resource: "production" },
      { href: "/admin/delivery", label: "Delivery", icon: "truck", resource: "delivery" },
    ],
  },
  {
    label: "Content Management",
    items: [
      { href: "/admin/homepage", label: "Homepage", icon: "layout", resource: "content" },
      { href: "/admin/media", label: "Media Library", icon: "image", resource: "content" },
      { href: "/admin/pages", label: "Pages", icon: "file", resource: "content" },
      { href: "/admin/navigation", label: "Navigation", icon: "menu", resource: "content" },
      { href: "/admin/banners", label: "Banners", icon: "flag", resource: "content" },
      { href: "/admin/testimonials", label: "Testimonials", icon: "quote", resource: "content" },
      { href: "/admin/faqs", label: "FAQs", icon: "help", resource: "content" },
      { href: "/admin/blog", label: "Blog / Journal", icon: "book", resource: "content" },
    ],
  },
  {
    label: "Engagement",
    items: [
      { href: "/admin/notifications", label: "Notifications", icon: "bell", resource: "notifications" },
      { href: "/admin/email-templates", label: "Email Templates", icon: "mail", resource: "notifications" },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: "chart", resource: "analytics" },
      { href: "/admin/reports", label: "Reports", icon: "file", resource: "reports" },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/settings", label: "Settings", icon: "settings", resource: "settings" },
      { href: "/admin/admin-users", label: "Admin Users", icon: "userCheck", resource: "admin_users" },
      { href: "/admin/roles", label: "Roles & Permissions", icon: "shield", resource: "admin_users" },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: "list", resource: "audit_logs" },
      { href: "/admin/system-health", label: "System Health", icon: "activity", resource: "settings" },
    ],
  },
];

export const ALL_NAV_LEAVES: NavLeaf[] = ADMIN_NAV.flatMap((g) => g.items);
