// Admin-domain types. Extends the storefront types in `@/lib/types` with the
// operational, CRM, content, and system-management entities the dashboard
// manages. Every entity here is designed to be swapped for a real API
// response shape later — the field names intentionally mirror what a REST/DB
// resource would look like.

import type { Address, MeasurementProfile, PublishStatus, SEO } from "@/lib/types";

/* ───────────────────────── Identity, roles & access ───────────────────────── */

export type PermissionAction = "view" | "create" | "edit" | "delete" | "approve" | "export" | "refund" | "publish";

export type PermissionResource =
  | "dashboard"
  | "orders"
  | "products"
  | "collections"
  | "inventory"
  | "customers"
  | "measurements"
  | "payments"
  | "refunds"
  | "production"
  | "delivery"
  | "promotions"
  | "reviews"
  | "content"
  | "notifications"
  | "analytics"
  | "reports"
  | "settings"
  | "admin_users"
  | "audit_logs";

export type RolePermissions = Partial<Record<PermissionResource, PermissionAction[]>>;

export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: RolePermissions;
}

export type AdminUserStatus = "active" | "disabled" | "invited";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  roleId: string;
  status: AdminUserStatus;
  twoFactorEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
  /** Demo-only: never do this in a real backend. Structured so it's the only
   * thing to delete when wiring real auth (hashed + server-verified). */
  demoPassword?: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  resource: PermissionResource | "system";
  resourceId?: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  date: string;
  ip?: string;
  device?: string;
}

/* ───────────────────────────── Customers / CRM ───────────────────────────── */

export type CustomerStatus = "active" | "vip" | "disabled";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: CustomerStatus;
  createdAt: string;
  addresses: Address[];
  tags: string[];
  marketingOptIn: boolean;
  notes: { id: string; author: string; message: string; date: string }[];
  /** Demo-only storefront login, same shape/caveat as `AdminUser.demoPassword`:
   * never do this in a real backend. The only thing to delete when wiring
   * real customer auth (hashed + server-verified, session becomes a signed
   * cookie/JWT instead of localStorage — see `customer-auth-context.tsx`). */
  demoPassword?: string;
  lastLoginAt?: string;
}

/* ───────────────────────────── Payments & refunds ───────────────────────────── */

export type PaymentStatus = "successful" | "pending" | "failed" | "cancelled" | "refunded" | "partially_refunded";

export interface PaymentProviderConfig {
  id: string;
  provider: "Paystack" | "Flutterwave" | "Stripe" | "Bank Transfer";
  enabled: boolean;
  mode: "test" | "live";
  currencies: string[];
  publicKeyMasked: string;
  secretKeyMasked: string;
  webhookUrl: string;
  webhookConfigured: boolean;
}

export type RefundStatus = "requested" | "approved" | "rejected" | "processed";

export interface Refund {
  id: string;
  orderId: string;
  amount: number;
  type: "full" | "partial";
  reason: string;
  status: RefundStatus;
  requestedAt: string;
  requestedBy: string;
  processedAt?: string;
  processedBy?: string;
  internalNotes?: string;
}

/* ───────────────────────────── Production ───────────────────────────── */

export interface ProductionStaff {
  id: string;
  name: string;
  role: string; // e.g. "Cutter", "Tailor", "Quality Control"
  email: string;
  activeOrders: number;
  capacityPerWeek: number;
  status: "active" | "on-leave" | "inactive";
}

export interface ProductionTimelineRule {
  id: string;
  scope: "global" | "product" | "collection" | "garment" | "country";
  scopeRef?: string; // id/slug/name the rule applies to when scope !== global
  standardDays: [number, number];
  expressDays: [number, number];
}

/* ───────────────────────────── Delivery ───────────────────────────── */

export interface DeliveryZone {
  id: string;
  name: string;
  countries: string[];
  standardFee: number;
  expressFee: number;
  freeDeliveryThreshold?: number;
  standardDays: [number, number];
  expressDays: [number, number];
  expressAvailable: boolean;
  active: boolean;
}

/* ───────────────────────────── Promotions ───────────────────────────── */

export type DiscountType = "percentage" | "fixed";
export type PromotionScope = "all" | "product" | "collection" | "first-order" | "customer";

export interface Coupon {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  scope: PromotionScope;
  scopeRefs?: string[]; // product ids / collection slugs / customer ids
  minOrderValue?: number;
  usageLimit?: number;
  usageCount: number;
  perCustomerLimit?: number;
  startsAt?: string;
  expiresAt?: string;
  active: boolean;
  createdAt: string;
}

export interface GiftCard {
  id: string;
  code: string;
  initialValue: number;
  balance: number;
  currency: "NGN";
  issuedTo?: string;
  purchasedBy?: string;
  status: "active" | "redeemed" | "expired" | "disabled";
  expiresAt?: string;
  createdAt: string;
  history: { date: string; amount: number; note: string }[];
}

/* ───────────────────────────── Reviews & wishlist ───────────────────────────── */

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface Review {
  id: string;
  productId: string;
  customerName: string;
  customerEmail: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title?: string;
  body: string;
  images?: string[];
  status: ReviewStatus;
  featured: boolean;
  response?: { message: string; date: string };
  date: string;
}

/* ───────────────────────────── Notifications & email ───────────────────────────── */

export type NotificationChannel = "email" | "in-app" | "sms";

export interface NotificationTrigger {
  id: string;
  event:
    | "order_placed"
    | "payment_successful"
    | "payment_failed"
    | "measurements_submitted"
    | "order_in_production"
    | "production_completed"
    | "order_shipped"
    | "order_delivered"
    | "refund_processed"
    | "account_created"
    | "customization_clarification_requested";
  label: string;
  description: string;
  channels: NotificationChannel[];
  enabled: boolean;
  emailTemplateId?: string;
}

export interface NotificationLogEntry {
  id: string;
  triggerId: string;
  channel: NotificationChannel;
  recipient: string;
  subject: string;
  date: string;
  status: "sent" | "failed" | "queued";
}

export interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  body: string; // supports {{variable}} tokens
  variables: string[];
  updatedAt: string;
}

/* ───────────────────────────── CMS & content ───────────────────────────── */

export interface MediaAsset {
  id: string;
  name: string;
  url: string;
  type: "image" | "video";
  folder: string;
  size: number; // bytes
  width?: number;
  height?: number;
  alt?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface CMSPage {
  id: string;
  slug: string;
  title: string;
  body: string; // rich text (HTML-ish)
  status: PublishStatus;
  publishAt?: string;
  updatedAt: string;
  seo: SEO;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role?: string;
  image?: string;
  rating?: number;
  featured: boolean;
  sortOrder: number;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  published: boolean;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverImage: string;
  author: string;
  status: PublishStatus;
  publishAt?: string;
  tags: string[];
  seo: SEO;
  updatedAt: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  ctaLabel?: string;
  ctaHref?: string;
  placement: "homepage-top" | "homepage-promo" | "shop-top" | "sitewide";
  active: boolean;
  startsAt?: string;
  endsAt?: string;
  sortOrder: number;
}

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  sortOrder: number;
  children?: NavigationItem[];
}

/** Discriminated-union homepage section for the drag/reorder page builder. */
export type HomepageSectionType =
  | "hero"
  | "featured-categories"
  | "featured-collections"
  | "featured-products"
  | "signature"
  | "made-to-measure-promo"
  | "how-it-works"
  | "promo-banner"
  | "testimonials"
  | "newsletter"
  | "brand-story";

export interface HomepageSection {
  id: string;
  type: HomepageSectionType;
  label: string;
  visible: boolean;
  sortOrder: number;
  content: Record<string, string>;
}

/* ───────────────────────────── System settings ───────────────────────────── */

export interface SystemSettings {
  general: {
    brandName: string;
    logoUrl: string;
    faviconUrl: string;
    supportEmail: string;
    supportPhone: string;
    instagram: string;
    tiktok: string;
    pinterest: string;
  };
  currency: {
    defaultCurrency: "NGN";
    supportedCurrencies: string[];
  };
  tax: {
    taxInclusive: boolean;
    defaultRatePct: number;
    regions: { region: string; ratePct: number }[];
  };
  checkout: {
    guestCheckoutEnabled: boolean;
    accountRequiredAboveValue?: number;
    minimumOrderValue: number;
  };
  notifications: {
    emailFromName: string;
    emailFromAddress: string;
    smsEnabled: boolean;
    smsProvider?: string;
  };
  integrations: {
    analyticsProvider: string;
    emailProvider: string;
    shippingProvider: string;
    cloudStorageProvider: string;
  };
}

export interface SystemHealthCheck {
  id: string;
  name: string;
  status: "operational" | "degraded" | "down";
  latencyMs?: number;
  lastCheckedAt: string;
}

/* ───────────────────────────── Measurement / customization libraries ───────────────────────────── */

export interface MeasurementProfileWithCustomer extends MeasurementProfile {
  customerName?: string;
}
