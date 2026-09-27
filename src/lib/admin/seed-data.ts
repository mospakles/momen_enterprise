// Realistic seed/demo data for every admin domain that isn't already covered
// by `@/lib/mock-data` (catalog) or `@/lib/orders-context` (orders). Every
// array here is the *initial* value for a slice of `AdminStoreProvider` —
// once the app runs, edits are persisted to localStorage on top of this seed,
// exactly like the existing cart/orders/measurement contexts. Swapping to a
// real backend means replacing the initial `useState`/`useReducer` seed with
// a fetch and keeping the action/reducer shape as-is.

import { products, collections } from "@/lib/mock-data";
import type {
  AdminUser,
  AuditLogEntry,
  Banner,
  BlogPost,
  CMSPage,
  Coupon,
  Customer,
  DeliveryZone,
  EmailTemplate,
  FAQItem,
  GiftCard,
  HomepageSection,
  MediaAsset,
  NavigationItem,
  NotificationTrigger,
  PaymentProviderConfig,
  ProductionStaff,
  ProductionTimelineRule,
  Review,
  Role,
  SystemHealthCheck,
  SystemSettings,
  Testimonial,
} from "./types";

const img = (seed: string, w = 1200, h = 1500) => `https://picsum.photos/seed/${seed}/${w}/${h}`;
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

/* ───────────────────────────── Roles & permissions ───────────────────────────── */

const ALL_ACTIONS = ["view", "create", "edit", "delete", "approve", "export", "refund", "publish"] as const;

export const roles: Role[] = [
  {
    id: "super-admin",
    name: "Super Admin",
    description: "Full access to every module, including admin users and system settings.",
    isSystem: true,
    permissions: Object.fromEntries(
      [
        "dashboard", "orders", "products", "collections", "inventory", "customers", "measurements",
        "payments", "refunds", "production", "delivery", "promotions", "reviews", "content",
        "notifications", "analytics", "reports", "settings", "admin_users", "audit_logs",
      ].map((r) => [r, [...ALL_ACTIONS]])
    ) as Role["permissions"],
  },
  {
    id: "operations-manager",
    name: "Operations Manager",
    description: "Orders, production, and delivery — day-to-day fulfillment operations.",
    isSystem: true,
    permissions: {
      dashboard: ["view"],
      orders: ["view", "create", "edit", "export"],
      production: ["view", "edit", "export"],
      delivery: ["view", "edit"],
      customers: ["view"],
      measurements: ["view", "edit"],
      inventory: ["view", "edit"],
      reports: ["view", "export"],
    },
  },
  {
    id: "product-manager",
    name: "Product Manager",
    description: "Products, collections, and inventory.",
    isSystem: true,
    permissions: {
      dashboard: ["view"],
      products: ["view", "create", "edit", "delete", "publish"],
      collections: ["view", "create", "edit", "delete", "publish"],
      inventory: ["view", "edit", "export"],
      reports: ["view", "export"],
    },
  },
  {
    id: "finance",
    name: "Finance",
    description: "Payments, refunds, and financial reporting.",
    isSystem: true,
    permissions: {
      dashboard: ["view"],
      payments: ["view", "export"],
      refunds: ["view", "approve", "refund", "export"],
      orders: ["view"],
      reports: ["view", "export"],
    },
  },
  {
    id: "content-manager",
    name: "Content Manager",
    description: "Homepage, CMS pages, media library, and blog.",
    isSystem: true,
    permissions: {
      dashboard: ["view"],
      content: ["view", "create", "edit", "delete", "publish"],
      promotions: ["view", "edit"],
    },
  },
  {
    id: "customer-support",
    name: "Customer Support",
    description: "Customers, orders, and measurements — support-facing tools.",
    isSystem: true,
    permissions: {
      dashboard: ["view"],
      customers: ["view", "edit"],
      orders: ["view", "edit"],
      measurements: ["view", "edit"],
      refunds: ["view", "create"],
    },
  },
  {
    id: "production-staff",
    name: "Production Staff",
    description: "Production orders and measurements only.",
    isSystem: true,
    permissions: {
      production: ["view", "edit"],
      measurements: ["view"],
      orders: ["view"],
    },
  },
];

/* ───────────────────────────── Admin users ───────────────────────────── */
// Demo-only credentials — never do this in production. Structured so wiring
// real auth means deleting `demoPassword` and pointing login at an API.

export const adminUsers: AdminUser[] = [
  { id: "au-1", name: "Amaka Eze", email: "amaka@momen.studio", roleId: "super-admin", status: "active", twoFactorEnabled: true, lastLoginAt: daysAgo(0), createdAt: daysAgo(400), demoPassword: "momen2026" },
  { id: "au-2", name: "Chinedu Okoro", email: "chinedu@momen.studio", roleId: "operations-manager", status: "active", twoFactorEnabled: true, lastLoginAt: daysAgo(1), createdAt: daysAgo(300), demoPassword: "momen2026" },
  { id: "au-3", name: "Halima Bello", email: "halima@momen.studio", roleId: "product-manager", status: "active", twoFactorEnabled: false, lastLoginAt: daysAgo(2), createdAt: daysAgo(260), demoPassword: "momen2026" },
  { id: "au-4", name: "Segun Adewale", email: "segun@momen.studio", roleId: "finance", status: "active", twoFactorEnabled: true, lastLoginAt: daysAgo(1), createdAt: daysAgo(220), demoPassword: "momen2026" },
  { id: "au-5", name: "Nkechi Umeh", email: "nkechi@momen.studio", roleId: "content-manager", status: "active", twoFactorEnabled: false, lastLoginAt: daysAgo(5), createdAt: daysAgo(190), demoPassword: "momen2026" },
  { id: "au-6", name: "Tolu Fashina", email: "tolu@momen.studio", roleId: "customer-support", status: "active", twoFactorEnabled: false, lastLoginAt: daysAgo(0), createdAt: daysAgo(150), demoPassword: "momen2026" },
  { id: "au-7", name: "Bashir Yusuf", email: "bashir@momen.studio", roleId: "production-staff", status: "invited", twoFactorEnabled: false, createdAt: daysAgo(10), demoPassword: "momen2026" },
];

/* ───────────────────────────── Customers ───────────────────────────── */

export const customers: Customer[] = [
  { id: "cus-1", name: "Ifeoma Chukwu", email: "ifeoma.chukwu@gmail.com", phone: "+234 803 555 0142", status: "vip", createdAt: daysAgo(340), addresses: [{ fullName: "Ifeoma Chukwu", country: "Nigeria", state: "Lagos", city: "Lekki", address: "12 Admiralty Way", postalCode: "101245", phone: "+234 803 555 0142" }], tags: ["VIP", "Repeat"], marketingOptIn: true, notes: [{ id: "n1", author: "Tolu Fashina", message: "Prefers WhatsApp updates over email.", date: daysAgo(60) }], demoPassword: "momen2026" },
  { id: "cus-2", name: "David Okonkwo", email: "d.okonkwo@outlook.com", phone: "+234 806 222 9081", status: "active", createdAt: daysAgo(280), addresses: [{ fullName: "David Okonkwo", country: "Nigeria", state: "Abuja (FCT)", city: "Abuja", address: "4 Aso Drive", postalCode: "900211", phone: "+234 806 222 9081" }], tags: [], marketingOptIn: true, notes: [] },
  { id: "cus-3", name: "Amara Nwosu", email: "amara.nwosu@yahoo.com", phone: "+234 701 444 2210", status: "active", createdAt: daysAgo(200), addresses: [{ fullName: "Amara Nwosu", country: "Nigeria", state: "Lagos", city: "Victoria Island", address: "9 Ozumba Mbadiwe Ave", postalCode: "101241", phone: "+234 701 444 2210" }], tags: ["Newsletter"], marketingOptIn: true, notes: [] },
  { id: "cus-4", name: "Grace Adeyemi", email: "grace.adeyemi@gmail.com", phone: "+234 812 900 3345", status: "vip", createdAt: daysAgo(410), addresses: [{ fullName: "Grace Adeyemi", country: "United Kingdom", state: "London", city: "London", address: "22 Baker Street", postalCode: "NW1 5RT", phone: "+44 7700 900123" }], tags: ["VIP", "International"], marketingOptIn: false, notes: [{ id: "n2", author: "Amaka Eze", message: "Sensitive to shipping delays — always confirm timeline before dispatch.", date: daysAgo(120) }] },
  { id: "cus-5", name: "Michael Bassey", email: "m.bassey@icloud.com", phone: "+234 909 111 7765", status: "active", createdAt: daysAgo(150), addresses: [{ fullName: "Michael Bassey", country: "Nigeria", state: "Rivers", city: "Port Harcourt", address: "15 Aba Road", postalCode: "500272", phone: "+234 909 111 7765" }], tags: [], marketingOptIn: true, notes: [] },
  { id: "cus-6", name: "Funmilayo Ade", email: "funmilayo.ade@gmail.com", phone: "+234 815 322 6689", status: "active", createdAt: daysAgo(95), addresses: [{ fullName: "Funmilayo Ade", country: "Nigeria", state: "Oyo", city: "Ibadan", address: "3 Bodija Estate", postalCode: "200285", phone: "+234 815 322 6689" }], tags: ["Newsletter"], marketingOptIn: true, notes: [] },
  { id: "cus-7", name: "Priscilla Danjuma", email: "priscilla.d@hotmail.com", phone: "+234 703 888 4471", status: "disabled", createdAt: daysAgo(500), addresses: [], tags: ["Chargeback risk"], marketingOptIn: false, notes: [{ id: "n3", author: "Segun Adewale", message: "Disabled after a disputed chargeback on order MOM-118420. Contact finance before re-enabling.", date: daysAgo(30) }] },
  { id: "cus-8", name: "Emeka Obi", email: "emeka.obi@gmail.com", phone: "+234 802 771 5533", status: "active", createdAt: daysAgo(60), addresses: [{ fullName: "Emeka Obi", country: "Ghana", state: "Greater Accra", city: "Accra", address: "7 Independence Ave", postalCode: "GA-184", phone: "+233 24 555 0192" }], tags: ["International"], marketingOptIn: true, notes: [] },
  { id: "cus-9", name: "Bola Shonibare", email: "bola.shonibare@gmail.com", phone: "+234 813 200 6612", status: "active", createdAt: daysAgo(20), addresses: [{ fullName: "Bola Shonibare", country: "Nigeria", state: "Lagos", city: "Ikoyi", address: "18 Bourdillon Road", postalCode: "101233", phone: "+234 813 200 6612" }], tags: ["New"], marketingOptIn: true, notes: [] },
  { id: "cus-10", name: "Kelechi Nnamdi", email: "kelechi.nnamdi@gmail.com", phone: "+234 706 455 8820", status: "active", createdAt: daysAgo(5), addresses: [{ fullName: "Kelechi Nnamdi", country: "United States", state: "New York", city: "Brooklyn", address: "88 Flatbush Ave", postalCode: "11217", phone: "+1 917 555 0199" }], tags: ["New", "International"], marketingOptIn: true, notes: [] },
];

/* ───────────────────────────── Production ───────────────────────────── */

export const productionStaff: ProductionStaff[] = [
  { id: "ps-1", name: "Uche Anyanwu", role: "Master Cutter", email: "uche@momen.studio", activeOrders: 4, capacityPerWeek: 12, status: "active" },
  { id: "ps-2", name: "Ronke Alade", role: "Tailor", email: "ronke@momen.studio", activeOrders: 6, capacityPerWeek: 10, status: "active" },
  { id: "ps-3", name: "Peter Effiong", role: "Tailor", email: "peter@momen.studio", activeOrders: 5, capacityPerWeek: 10, status: "active" },
  { id: "ps-4", name: "Aisha Suleiman", role: "Embroidery Specialist", email: "aisha@momen.studio", activeOrders: 2, capacityPerWeek: 6, status: "active" },
  { id: "ps-5", name: "Godwin Etim", role: "Quality Control", email: "godwin@momen.studio", activeOrders: 3, capacityPerWeek: 20, status: "active" },
  { id: "ps-6", name: "Chiamaka Obasi", role: "Finisher", email: "chiamaka@momen.studio", activeOrders: 3, capacityPerWeek: 15, status: "on-leave" },
];

export const productionTimelineRules: ProductionTimelineRule[] = [
  { id: "ptr-global", scope: "global", standardDays: [7, 14], expressDays: [3, 5] },
  { id: "ptr-limited", scope: "collection", scopeRef: "limited-edition", standardDays: [14, 21], expressDays: [7, 10] },
  { id: "ptr-set", scope: "garment", scopeRef: "set", standardDays: [10, 18], expressDays: [5, 9] },
  { id: "ptr-intl", scope: "country", scopeRef: "United States", standardDays: [10, 17], expressDays: [5, 7] },
];

/* ───────────────────────────── Delivery ───────────────────────────── */

export const deliveryZones: DeliveryZone[] = [
  { id: "dz-1", name: "Nigeria", countries: ["Nigeria"], standardFee: 3500, expressFee: 25000, freeDeliveryThreshold: 250000, standardDays: [2, 4], expressDays: [1, 2], expressAvailable: true, active: true },
  { id: "dz-2", name: "West Africa", countries: ["Ghana", "Benin", "Togo", "Côte d'Ivoire"], standardFee: 18000, expressFee: 45000, freeDeliveryThreshold: 400000, standardDays: [5, 9], expressDays: [3, 5], expressAvailable: true, active: true },
  { id: "dz-3", name: "United Kingdom & Europe", countries: ["United Kingdom", "France", "Germany", "Ireland"], standardFee: 32000, expressFee: 68000, freeDeliveryThreshold: 600000, standardDays: [7, 12], expressDays: [4, 6], expressAvailable: true, active: true },
  { id: "dz-4", name: "North America", countries: ["United States", "Canada"], standardFee: 38000, expressFee: 75000, freeDeliveryThreshold: 600000, standardDays: [8, 14], expressDays: [4, 7], expressAvailable: true, active: true },
  { id: "dz-5", name: "Rest of World", countries: ["United Arab Emirates", "South Africa", "Australia"], standardFee: 45000, expressFee: 0, standardDays: [10, 18], expressDays: [0, 0], expressAvailable: false, active: true },
];

export const paymentProviders: PaymentProviderConfig[] = [
  { id: "pp-1", provider: "Paystack", enabled: true, mode: "live", currencies: ["NGN", "USD"], publicKeyMasked: "pk_live_••••••••••••4f2a", secretKeyMasked: "sk_live_••••••••••••9c31", webhookUrl: "https://momen.studio/api/webhooks/paystack", webhookConfigured: true },
  { id: "pp-2", provider: "Flutterwave", enabled: true, mode: "test", currencies: ["NGN", "USD", "GBP"], publicKeyMasked: "FLWPUBK_TEST-••••••••-X", secretKeyMasked: "FLWSECK_TEST-••••••••-X", webhookUrl: "https://momen.studio/api/webhooks/flutterwave", webhookConfigured: true },
  { id: "pp-3", provider: "Stripe", enabled: false, mode: "test", currencies: ["USD", "GBP", "EUR"], publicKeyMasked: "pk_test_••••••••••••1a7e", secretKeyMasked: "sk_test_••••••••••••88db", webhookUrl: "https://momen.studio/api/webhooks/stripe", webhookConfigured: false },
  { id: "pp-4", provider: "Bank Transfer", enabled: true, mode: "live", currencies: ["NGN"], publicKeyMasked: "—", secretKeyMasked: "—", webhookUrl: "—", webhookConfigured: false },
];

/* ───────────────────────────── Promotions ───────────────────────────── */

export const coupons: Coupon[] = [
  { id: "cp-1", code: "WELCOME10", type: "percentage", value: 10, scope: "first-order", minOrderValue: 40000, usageLimit: undefined, usageCount: 214, perCustomerLimit: 1, active: true, createdAt: daysAgo(300) },
  { id: "cp-2", code: "MOMEN25K", type: "fixed", value: 25000, scope: "all", minOrderValue: 150000, usageLimit: 500, usageCount: 88, active: true, createdAt: daysAgo(120) },
  { id: "cp-3", code: "SIGNATURE15", type: "percentage", value: 15, scope: "collection", scopeRefs: ["signature"], usageCount: 41, active: true, createdAt: daysAgo(60), expiresAt: daysAgo(-30) },
  { id: "cp-4", code: "VIP-IFEOMA", type: "percentage", value: 20, scope: "customer", scopeRefs: ["cus-1"], usageLimit: 5, usageCount: 2, active: true, createdAt: daysAgo(40) },
  { id: "cp-5", code: "LAUNCH2025", type: "percentage", value: 20, scope: "all", usageLimit: 1000, usageCount: 1000, active: false, createdAt: daysAgo(500), expiresAt: daysAgo(200) },
  { id: "cp-6", code: "GOWN-30", type: "fixed", value: 30000, scope: "product", scopeRefs: ["p5"], usageLimit: 50, usageCount: 6, active: true, createdAt: daysAgo(15) },
];

export const giftCards: GiftCard[] = [
  { id: "gc-1", code: "MOMEN-GC-8213-4471", initialValue: 100000, balance: 100000, currency: "NGN", issuedTo: "grace.adeyemi@gmail.com", status: "active", createdAt: daysAgo(20), history: [{ date: daysAgo(20), amount: 100000, note: "Issued — purchased by David Okonkwo as a gift." }] },
  { id: "gc-2", code: "MOMEN-GC-1190-5528", initialValue: 50000, balance: 12000, currency: "NGN", issuedTo: "amara.nwosu@yahoo.com", status: "active", createdAt: daysAgo(90), history: [{ date: daysAgo(90), amount: 50000, note: "Issued." }, { date: daysAgo(40), amount: -38000, note: "Redeemed against order MOM-402118." }] },
  { id: "gc-3", code: "MOMEN-GC-7702-0093", initialValue: 75000, balance: 0, currency: "NGN", issuedTo: "michael.bassey@icloud.com", status: "redeemed", createdAt: daysAgo(200), history: [{ date: daysAgo(200), amount: 75000, note: "Issued." }, { date: daysAgo(150), amount: -75000, note: "Fully redeemed against order MOM-355210." }] },
  { id: "gc-4", code: "MOMEN-GC-4451-9982", initialValue: 30000, balance: 30000, currency: "NGN", status: "expired", createdAt: daysAgo(400), expiresAt: daysAgo(35), history: [{ date: daysAgo(400), amount: 30000, note: "Issued, never redeemed." }] },
];

/* ───────────────────────────── Reviews ───────────────────────────── */

export const reviews: Review[] = [
  { id: "rv-1", productId: products[0]?.id ?? "p1", customerName: "Ifeoma Chukwu", customerEmail: "ifeoma.chukwu@gmail.com", rating: 5, title: "Impeccable fit", body: "The measurements process was so thorough — the shirt fit perfectly on the first try. Fabric feels luxurious.", status: "approved", featured: true, date: daysAgo(50), response: { message: "Thank you, Ifeoma! So glad it fit perfectly first time.", date: daysAgo(48) } },
  { id: "rv-2", productId: products[1]?.id ?? "p2", customerName: "Grace Adeyemi", customerEmail: "grace.adeyemi@gmail.com", rating: 5, title: "Worth the wait", body: "Beautiful wrap dress, exactly as pictured. Production took 12 days which was communicated clearly throughout.", status: "approved", featured: true, date: daysAgo(80) },
  { id: "rv-3", productId: products[3]?.id ?? "p4", customerName: "David Okonkwo", customerEmail: "d.okonkwo@outlook.com", rating: 4, body: "Great trousers, though the waistband ran slightly loose. Support team offered a free adjustment.", status: "approved", featured: false, date: daysAgo(35) },
  { id: "rv-4", productId: products[4]?.id ?? "p5", customerName: "Funmilayo Ade", customerEmail: "funmilayo.ade@gmail.com", rating: 5, title: "Show-stopping", body: "Wore this to a wedding — got so many compliments. The boning structure holds beautifully.", status: "pending", featured: false, date: daysAgo(3) },
  { id: "rv-5", productId: products[0]?.id ?? "p1", customerName: "Michael Bassey", customerEmail: "m.bassey@icloud.com", rating: 3, body: "Nice shirt but delivery took longer than the estimate.", status: "pending", featured: false, date: daysAgo(2) },
  { id: "rv-6", productId: products[6]?.id ?? "p7", customerName: "Emeka Obi", customerEmail: "emeka.obi@gmail.com", rating: 2, body: "Sizing ran small for the ready-to-wear trouser.", status: "rejected", featured: false, date: daysAgo(10) },
  { id: "rv-7", productId: products[7]?.id ?? "p8", customerName: "Bola Shonibare", customerEmail: "bola.shonibare@gmail.com", rating: 5, title: "My go-to set", body: "Second time ordering this set in a different colourway. Consistent quality every time.", status: "approved", featured: true, date: daysAgo(15) },
  { id: "rv-8", productId: products[2]?.id ?? "p3", customerName: "Kelechi Nnamdi", customerEmail: "kelechi.nnamdi@gmail.com", rating: 4, body: "Shipped to Brooklyn without issue, fits true to my measurements.", status: "approved", featured: false, date: daysAgo(6) },
];

/* ───────────────────────────── Notifications & email ───────────────────────────── */

export const notificationTriggers: NotificationTrigger[] = [
  { id: "nt-1", event: "order_placed", label: "Order Placed", description: "Sent immediately after checkout.", channels: ["email", "in-app"], enabled: true, emailTemplateId: "et-order-placed" },
  { id: "nt-2", event: "payment_successful", label: "Payment Successful", description: "Sent once payment clears.", channels: ["email", "in-app"], enabled: true, emailTemplateId: "et-payment-successful" },
  { id: "nt-3", event: "payment_failed", label: "Payment Failed", description: "Sent when a payment attempt fails.", channels: ["email"], enabled: true, emailTemplateId: "et-payment-failed" },
  { id: "nt-4", event: "measurements_submitted", label: "Measurements Submitted", description: "Sent when a customer submits made-to-measure details.", channels: ["in-app"], enabled: true },
  { id: "nt-5", event: "order_in_production", label: "Order Entered Production", description: "Sent when an order moves into the production queue.", channels: ["email", "in-app"], enabled: true, emailTemplateId: "et-in-production" },
  { id: "nt-6", event: "production_completed", label: "Production Completed", description: "Sent when garment production and QC are complete.", channels: ["email", "in-app"], enabled: true },
  { id: "nt-7", event: "order_shipped", label: "Order Shipped", description: "Sent with tracking information.", channels: ["email", "sms", "in-app"], enabled: true, emailTemplateId: "et-order-shipped" },
  { id: "nt-8", event: "order_delivered", label: "Order Delivered", description: "Sent on confirmed delivery.", channels: ["email", "in-app"], enabled: true, emailTemplateId: "et-order-delivered" },
  { id: "nt-9", event: "refund_processed", label: "Refund Processed", description: "Sent once a refund has been issued.", channels: ["email"], enabled: true, emailTemplateId: "et-refund-processed" },
  { id: "nt-10", event: "account_created", label: "Account Created", description: "Sent on new customer signup.", channels: ["email"], enabled: true, emailTemplateId: "et-account-created" },
  { id: "nt-11", event: "customization_clarification_requested", label: "Custom Order Needs Clarification", description: "Sent when the atelier requests more detail on a custom order before production can proceed.", channels: ["email", "in-app"], enabled: true, emailTemplateId: "et-clarification-requested" },
];

export const emailTemplates: EmailTemplate[] = [
  { id: "et-order-placed", key: "order_placed", name: "Order Confirmation", subject: "We've received your order, {{customerName}}", body: "Hi {{customerName}},\n\nThank you for your order {{orderNumber}}. We're preparing it now and will notify you at every step.\n\nOrder total: {{totalAmount}}\n\n— Momen", variables: ["customerName", "orderNumber", "totalAmount"], updatedAt: daysAgo(90) },
  { id: "et-payment-successful", key: "payment_successful", name: "Payment Successful", subject: "Payment received for {{orderNumber}}", body: "Hi {{customerName}},\n\nYour payment of {{totalAmount}} for order {{orderNumber}} was successful.\n\n— Momen", variables: ["customerName", "orderNumber", "totalAmount"], updatedAt: daysAgo(90) },
  { id: "et-payment-failed", key: "payment_failed", name: "Payment Failed", subject: "There was a problem with your payment", body: "Hi {{customerName}},\n\nWe couldn't process payment for order {{orderNumber}}. Please retry or contact us for help.\n\n— Momen", variables: ["customerName", "orderNumber"], updatedAt: daysAgo(90) },
  { id: "et-in-production", key: "order_in_production", name: "Order In Production", subject: "{{orderNumber}} has entered production", body: "Hi {{customerName}},\n\nYour {{productName}} has entered production. Expected completion: {{productionDate}}.\n\n— Momen", variables: ["customerName", "orderNumber", "productName", "productionDate"], updatedAt: daysAgo(60) },
  { id: "et-order-shipped", key: "order_shipped", name: "Order Shipped", subject: "{{orderNumber}} is on its way", body: "Hi {{customerName}},\n\nYour order has shipped. Tracking number: {{trackingNumber}}. Estimated delivery: {{deliveryDate}}.\n\n— Momen", variables: ["customerName", "orderNumber", "trackingNumber", "deliveryDate"], updatedAt: daysAgo(60) },
  { id: "et-order-delivered", key: "order_delivered", name: "Order Delivered", subject: "Your order has arrived", body: "Hi {{customerName}},\n\nOrder {{orderNumber}} was delivered. We hope you love it — leave us a review!\n\n— Momen", variables: ["customerName", "orderNumber"], updatedAt: daysAgo(60) },
  { id: "et-refund-processed", key: "refund_processed", name: "Refund Processed", subject: "Your refund has been processed", body: "Hi {{customerName}},\n\nWe've processed a refund of {{totalAmount}} for order {{orderNumber}}. It may take 5–10 business days to reflect.\n\n— Momen", variables: ["customerName", "orderNumber", "totalAmount"], updatedAt: daysAgo(30) },
  { id: "et-account-created", key: "account_created", name: "Welcome / Account Created", subject: "Welcome to Momen, {{customerName}}", body: "Hi {{customerName}},\n\nYour Momen account is ready. Save your measurements once and check out faster next time.\n\n— Momen", variables: ["customerName"], updatedAt: daysAgo(200) },
  { id: "et-clarification-requested", key: "customization_clarification_requested", name: "Custom Order Needs Clarification", subject: "We need a little more detail on {{orderNumber}}", body: "Hi {{customerName}},\n\nOur atelier is reviewing your custom order {{orderNumber}} and needs a bit more detail before production can begin:\n\n{{clarificationNote}}\n\nPlease reply or update your order to keep things moving.\n\n— Momen", variables: ["customerName", "orderNumber", "clarificationNote"], updatedAt: daysAgo(5) },
];

/* ───────────────────────────── CMS & content ───────────────────────────── */

export const cmsPages: CMSPage[] = [
  { id: "pg-about", slug: "about", title: "About Momen", body: "<p>Momen is a made-to-measure fashion house based in Lagos...</p>", status: "published", updatedAt: daysAgo(120), seo: { title: "About Momen", description: "Learn about the Momen made-to-measure fashion house.", slug: "about" } },
  { id: "pg-contact", slug: "contact", title: "Contact Us", body: "<p>Reach the Momen studio for fitting appointments and support.</p>", status: "published", updatedAt: daysAgo(120), seo: { title: "Contact Momen", description: "Get in touch with the Momen team.", slug: "contact" } },
  { id: "pg-privacy", slug: "privacy-policy", title: "Privacy Policy", body: "<p>How Momen collects, uses, and protects your data.</p>", status: "published", updatedAt: daysAgo(200), seo: { title: "Privacy Policy | Momen", description: "Momen's privacy policy.", slug: "privacy-policy" } },
  { id: "pg-terms", slug: "terms-and-conditions", title: "Terms & Conditions", body: "<p>Terms governing use of the Momen website and services.</p>", status: "published", updatedAt: daysAgo(200), seo: { title: "Terms & Conditions | Momen", description: "Momen's terms of service.", slug: "terms-and-conditions" } },
  { id: "pg-shipping", slug: "shipping-policy", title: "Shipping Policy", body: "<p>Delivery zones, fees, and timelines for Momen orders.</p>", status: "published", updatedAt: daysAgo(45), seo: { title: "Shipping Policy | Momen", description: "How Momen ships orders worldwide.", slug: "shipping-policy" } },
  { id: "pg-returns", slug: "returns-policy", title: "Returns Policy", body: "<p>Because pieces are made-to-measure, returns are handled case by case.</p>", status: "published", updatedAt: daysAgo(45), seo: { title: "Returns Policy | Momen", description: "Momen's returns and exchanges policy.", slug: "returns-policy" } },
  { id: "pg-measure-guide", slug: "measurement-guide", title: "Measurement Guide", body: "<p>Step-by-step illustrated guide to taking your own measurements at home.</p>", status: "published", updatedAt: daysAgo(30), seo: { title: "Measurement Guide | Momen", description: "How to measure yourself for made-to-measure pieces.", slug: "measurement-guide" } },
  { id: "pg-care-guide", slug: "care-guide", title: "Care Guide", body: "<p>How to care for your Momen garments so they last.</p>", status: "published", updatedAt: daysAgo(30), seo: { title: "Care Guide | Momen", description: "Garment care instructions.", slug: "care-guide" } },
  { id: "pg-lp-wedding", slug: "wedding-edit", title: "The Wedding Edit", body: "<p>A curated landing page for wedding-season occasion wear.</p>", status: "draft", updatedAt: daysAgo(4), seo: { title: "The Wedding Edit | Momen", description: "Occasion wear for wedding season.", slug: "wedding-edit" } },
];

export const faqs: FAQItem[] = [
  { id: "faq-1", question: "How does made-to-measure work?", answer: "Submit your measurements at checkout — either from a saved profile or our guided step-by-step flow — and we cut your garment to those exact numbers.", category: "Made-to-Measure", sortOrder: 0, published: true },
  { id: "faq-2", question: "How long does production take?", answer: "Standard production is 7–14 business days; Express is 3–5 business days. Exact timelines vary by product and are shown at checkout.", category: "Production", sortOrder: 1, published: true },
  { id: "faq-3", question: "Can I change my measurements after ordering?", answer: "Yes, as long as your order hasn't entered production. Contact support or update your measurement profile.", category: "Made-to-Measure", sortOrder: 2, published: true },
  { id: "faq-4", question: "What countries do you ship to?", answer: "We currently ship to Nigeria, West Africa, the UK, Europe, and North America. See our delivery page for full zone details.", category: "Delivery", sortOrder: 3, published: true },
  { id: "faq-5", question: "What is Express production?", answer: "Express prioritizes your order at the front of the production queue for a faster turnaround, for an additional fee.", category: "Production", sortOrder: 4, published: true },
  { id: "faq-6", question: "Can I return a made-to-measure piece?", answer: "Because each piece is cut to your measurements, made-to-measure items are final sale unless there's a manufacturing defect.", category: "Returns", sortOrder: 5, published: true },
  { id: "faq-7", question: "Do you offer gift cards?", answer: "Yes — Momen gift cards can be purchased in any amount and redeemed at checkout.", category: "Orders", sortOrder: 6, published: true },
  { id: "faq-8", question: "How do I track my order?", answer: "Use the tracking link in your confirmation email, or view live status from your account's Orders tab.", category: "Orders", sortOrder: 7, published: true },
];

export const testimonials: Testimonial[] = [
  { id: "ts-1", quote: "The fit is unlike anything off-the-rack. Worth every day of the wait.", author: "Ifeoma C.", role: "Lagos", rating: 5, featured: true, sortOrder: 0 },
  { id: "ts-2", quote: "Ordered from London and the sizing was perfect on arrival.", author: "Grace A.", role: "London", rating: 5, featured: true, sortOrder: 1 },
  { id: "ts-3", quote: "Customer support walked me through my measurements over a video call. Excellent service.", author: "David O.", role: "Abuja", rating: 5, featured: true, sortOrder: 2 },
  { id: "ts-4", quote: "My third order and still consistently excellent quality.", author: "Bola S.", role: "Lagos", rating: 5, featured: false, sortOrder: 3 },
];

export const blogPosts: BlogPost[] = [
  { id: "bp-1", slug: "how-to-measure-yourself-at-home", title: "How to Measure Yourself at Home", excerpt: "A step-by-step guide to getting studio-accurate measurements with just a tape measure and a mirror.", body: "<p>Full guide...</p>", coverImage: img("journal-measure", 1600, 1000), author: "Nkechi Umeh", status: "published", tags: ["Guide", "Made-to-Measure"], seo: { title: "How to Measure Yourself at Home | Momen Journal" }, updatedAt: daysAgo(40) },
  { id: "bp-2", slug: "inside-the-lagos-atelier", title: "Inside the Lagos Atelier", excerpt: "A look at the cutting tables, fabric library, and hands behind every Momen piece.", body: "<p>Full story...</p>", coverImage: img("journal-atelier", 1600, 1000), author: "Amaka Eze", status: "published", tags: ["Behind the Scenes"], seo: { title: "Inside the Lagos Atelier | Momen Journal" }, updatedAt: daysAgo(75) },
  { id: "bp-3", slug: "fabric-guide-cotton-vs-silk-blend", title: "Fabric Guide: Cotton vs. Silk-Blend", excerpt: "Choosing the right fabric upgrade for climate, occasion, and care routine.", body: "<p>Full guide...</p>", coverImage: img("journal-fabric", 1600, 1000), author: "Nkechi Umeh", status: "published", tags: ["Guide"], seo: { title: "Fabric Guide | Momen Journal" }, updatedAt: daysAgo(20) },
  { id: "bp-4", slug: "spring-wedding-edit-preview", title: "Spring Wedding Edit — A Preview", excerpt: "A first look at the upcoming occasion capsule ahead of wedding season.", body: "<p>Coming soon...</p>", coverImage: img("journal-wedding", 1600, 1000), author: "Amaka Eze", status: "draft", tags: ["Occasion"], seo: {}, updatedAt: daysAgo(2) },
];

export const banners: Banner[] = [
  { id: "bn-1", title: "Men's Accessories, Made to Complete the Look", subtitle: "Pam sandals, belts, caps, and considered finishing details", image: img("banner-accessories-men", 1800, 700), ctaLabel: "Shop Accessories", ctaHref: "/shop?category=footwear", placement: "homepage-promo", active: true, sortOrder: 0 },
  { id: "bn-2", title: "Express Production Available", subtitle: "3–5 business days on select styles", image: img("banner-express-men", 1800, 700), ctaLabel: "See Express Styles", ctaHref: "/shop", placement: "homepage-top", active: true, sortOrder: 1 },
  { id: "bn-3", title: "The Unisex Edit", subtitle: "Contemporary African pieces, shared across the wardrobe", image: img("banner-unisex", 1800, 700), ctaLabel: "Explore Unisex", ctaHref: "/unisex", placement: "shop-top", active: true, sortOrder: 2 },
];

// Secondary/footer quick links — the primary storefront menu is the
// structured mega-menu in `Navbar.tsx` (Clothing/Collections/Accessories
// dropdowns), which is intentionally more structured than a flat list.
export const navigationItems: NavigationItem[] = [
  { id: "nav-1", label: "Shop", href: "/shop", sortOrder: 0 },
  { id: "nav-2", label: "Collections", href: "/collections", sortOrder: 1 },
  { id: "nav-3", label: "Made-to-Measure", href: "/made-to-measure", sortOrder: 2 },
  { id: "nav-4", label: "Unisex", href: "/unisex", sortOrder: 3 },
  { id: "nav-5", label: "About", href: "/about", sortOrder: 4 },
  { id: "nav-6", label: "Contact", href: "/contact", sortOrder: 5 },
];

export const homepageSections: HomepageSection[] = [
  {
    id: "hs-1", type: "hero", label: "Hero", visible: true, sortOrder: 0,
    content: {
      headline: "Designed for the Man You Are.",
      subheading: "Contemporary menswear, thoughtfully crafted for confidence, comfort and individuality.",
      ctaLabel: "Shop Men's Collection", ctaHref: "/shop",
      ctaLabel2: "Explore Made-to-Measure", ctaHref2: "/made-to-measure",
      image: img("hero-momen-men", 2000, 1200),
    },
  },
  { id: "hs-2", type: "featured-categories", label: "Featured Categories", visible: true, sortOrder: 1, content: { headline: "Shop by Category" } },
  { id: "hs-3", type: "featured-products", label: "New Arrivals", visible: true, sortOrder: 2, content: { headline: "New Arrivals" } },
  { id: "hs-4", type: "signature", label: "The Momen Signature", visible: true, sortOrder: 3, content: { headline: "The Momen Signature", subheading: "Distinctive silhouettes. Refined fabrics. Made for the modern African man.", ctaLabel: "Explore Signature", ctaHref: "/collections/signature" } },
  {
    id: "hs-5", type: "made-to-measure-promo", label: "Made-to-Measure Promo", visible: true, sortOrder: 4,
    content: { headline: "Your Style. Your Measurements. Your Momen.", subheading: "Choose a design, select fabric and colour, provide your measurements, and add the details only you would think of.", ctaLabel: "Create Your Custom Look", ctaHref: "/made-to-measure" },
  },
  { id: "hs-6", type: "how-it-works", label: "How It Works", visible: true, sortOrder: 5, content: { headline: "How Momen Works" } },
  { id: "hs-7", type: "promo-banner", label: "Promotional Banner", visible: true, sortOrder: 6, content: { bannerId: "bn-1" } },
  { id: "hs-8", type: "testimonials", label: "Testimonials", visible: true, sortOrder: 7, content: { headline: "In Their Words" } },
  { id: "hs-9", type: "newsletter", label: "Newsletter Signup", visible: true, sortOrder: 8, content: { headline: "Stay in the Loop", subheading: "New arrivals, fabric drops, and studio news." } },
];

export const mediaAssets: MediaAsset[] = [
  ...products.slice(0, 6).flatMap((p, i) =>
    p.images.slice(0, 2).map((url, j) => ({
      id: `media-p${i}-${j}`,
      name: `${p.name} — ${j === 0 ? "Main" : "Detail"}.jpg`,
      url,
      type: "image" as const,
      folder: "Products",
      size: 480_000 + j * 60_000,
      width: 1200,
      height: 1500,
      alt: p.name,
      uploadedAt: daysAgo(200 - i * 10),
      uploadedBy: "Halima Bello",
    }))
  ),
  ...collections.slice(0, 4).map((c, i) => ({
    id: `media-c${i}`,
    name: `${c.name}.jpg`,
    url: c.image,
    type: "image" as const,
    folder: "Collections",
    size: 610_000,
    width: 1600,
    height: 1000,
    alt: c.name,
    uploadedAt: daysAgo(180 - i * 5),
    uploadedBy: "Nkechi Umeh",
  })),
  { id: "media-logo", name: "momen-logo.svg", url: img("momen-logo", 400, 160), type: "image", folder: "Brand", size: 12_000, uploadedAt: daysAgo(400), uploadedBy: "Amaka Eze" },
  { id: "media-hero", name: "hero-momen.jpg", url: img("hero-momen", 2000, 1200), type: "image", folder: "Homepage", size: 920_000, width: 2000, height: 1200, uploadedAt: daysAgo(30), uploadedBy: "Nkechi Umeh" },
];

/* ───────────────────────────── Audit logs ───────────────────────────── */

export const auditLogs: AuditLogEntry[] = [
  { id: "log-1", actorId: "au-3", actorName: "Halima Bello", action: "product.price_updated", resource: "products", resourceId: "p2", summary: "Changed Adaeze Wrap Dress price from ₦125,000 to ₦132,000.", date: daysAgo(18), ip: "102.89.23.4" },
  { id: "log-2", actorId: "au-4", actorName: "Segun Adewale", action: "refund.processed", resource: "refunds", resourceId: "MOM-118420", summary: "Processed a full refund for order MOM-118420.", date: daysAgo(30), ip: "197.211.55.9" },
  { id: "log-3", actorId: "au-2", actorName: "Chinedu Okoro", action: "production.timeline_updated", resource: "production", summary: "Updated Express production timeline from 4–6 to 3–5 business days.", date: daysAgo(55), ip: "102.89.23.10" },
  { id: "log-4", actorId: "au-6", actorName: "Tolu Fashina", action: "customer.measurements_updated", resource: "measurements", resourceId: "cus-2", summary: "Updated saved measurements for David Okonkwo at customer's request.", date: daysAgo(12), ip: "105.112.9.61" },
  { id: "log-5", actorId: "au-5", actorName: "Nkechi Umeh", action: "content.homepage_reordered", resource: "content", summary: "Reordered homepage sections — moved Testimonials above Newsletter.", date: daysAgo(9), ip: "102.89.23.15" },
  { id: "log-6", actorId: "au-1", actorName: "Amaka Eze", action: "admin_user.role_changed", resource: "admin_users", resourceId: "au-7", summary: "Assigned Bashir Yusuf the Production Staff role.", date: daysAgo(10), ip: "102.89.23.1" },
  { id: "log-7", actorId: "au-4", actorName: "Segun Adewale", action: "payment.provider_updated", resource: "payments", summary: "Switched Flutterwave from live to test mode for maintenance.", date: daysAgo(4), ip: "197.211.55.9" },
  { id: "log-8", actorId: "au-3", actorName: "Halima Bello", action: "collection.published", resource: "collections", resourceId: "col-new-season", summary: "Published the New Season collection.", date: daysAgo(70), ip: "102.89.23.4" },
];

/* ───────────────────────────── System ───────────────────────────── */

export const systemHealthChecks: SystemHealthCheck[] = [
  { id: "sh-1", name: "Storefront (Web)", status: "operational", latencyMs: 118, lastCheckedAt: daysAgo(0) },
  { id: "sh-2", name: "Admin Dashboard", status: "operational", latencyMs: 94, lastCheckedAt: daysAgo(0) },
  { id: "sh-3", name: "Payment Webhooks", status: "operational", latencyMs: 210, lastCheckedAt: daysAgo(0) },
  { id: "sh-4", name: "Email Delivery", status: "degraded", latencyMs: 1450, lastCheckedAt: daysAgo(0) },
  { id: "sh-5", name: "Image CDN", status: "operational", latencyMs: 45, lastCheckedAt: daysAgo(0) },
  { id: "sh-6", name: "Search Index", status: "operational", latencyMs: 62, lastCheckedAt: daysAgo(0) },
];

export const defaultSystemSettings: SystemSettings = {
  general: {
    brandName: "Momen",
    logoUrl: img("momen-logo", 400, 160),
    faviconUrl: "/favicon.ico",
    supportEmail: "hello@momen.studio",
    supportPhone: "+234 1 700 6636",
    instagram: "https://instagram.com/momen",
    tiktok: "https://tiktok.com/@momen",
    pinterest: "https://pinterest.com/momen",
  },
  currency: {
    defaultCurrency: "NGN",
    supportedCurrencies: ["NGN", "USD", "GBP"],
  },
  tax: {
    taxInclusive: true,
    defaultRatePct: 7.5,
    regions: [
      { region: "Nigeria", ratePct: 7.5 },
      { region: "United Kingdom", ratePct: 0 },
      { region: "United States", ratePct: 0 },
    ],
  },
  checkout: {
    guestCheckoutEnabled: true,
    accountRequiredAboveValue: undefined,
    minimumOrderValue: 0,
  },
  notifications: {
    emailFromName: "Momen",
    emailFromAddress: "orders@momen.studio",
    smsEnabled: false,
    smsProvider: "Termii",
  },
  integrations: {
    analyticsProvider: "Plausible",
    emailProvider: "Postmark",
    shippingProvider: "Self-managed / DHL",
    cloudStorageProvider: "Cloudinary",
  },
};
