"use client";

// AdminStoreProvider — the single source of truth for everything the admin
// dashboard manages *except* orders (which stay in `@/lib/orders-context`,
// shared with the storefront checkout flow that already writes there).
//
// The public surface intentionally remains stable while the implementation
// hydrates from the API. That lets the existing storefront/admin components
// share one coherent server-backed cache without retaining demo localStorage.
//
// This provider wraps the WHOLE app (see `src/app/layout.tsx`), not just
// `/admin` — that's what makes admin edits visible on the storefront: both
// read the same context.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Category, Collection, ColorSwatch, CustomizationGroup, Fabric, MeasurementFieldDef, Product, ProductionSettings, SizeOption } from "@/lib/types";
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
  NotificationLogEntry,
  NotificationTrigger,
  PaymentProviderConfig,
  ProductionStaff,
  ProductionTimelineRule,
  Refund,
  Review,
  Role,
  SystemHealthCheck,
  SystemSettings,
  Testimonial,
} from "./types";
import { apiAssetUrl, apiRequest } from "@/lib/api";
import { resolveImage, withCurrentImages } from "@/lib/brand-images";
import { toast } from "@/lib/toast";

function usePersistentState<T>(_key: string, initial: T) {
  const [state, setState] = useState<T>(() => (Array.isArray(initial) ? ([] as T) : initial));
  return [state, setState, true] as const;
}

const EMPTY_SYSTEM_SETTINGS: SystemSettings = {
  general: { brandName: "Momen", logoUrl: "", faviconUrl: "/favicon.ico", supportEmail: "", supportPhone: "", instagram: "", tiktok: "", pinterest: "" },
  currency: { defaultCurrency: "NGN", supportedCurrencies: ["NGN"] },
  tax: { taxInclusive: false, defaultRatePct: 0, regions: [] },
  checkout: { guestCheckoutEnabled: true, minimumOrderValue: 0 },
  notifications: { emailFromName: "Momen", emailFromAddress: "", smsEnabled: false },
  integrations: { analyticsProvider: "", emailProvider: "", shippingProvider: "", cloudStorageProvider: "" },
};

const EMPTY_PRODUCTION_SETTINGS: ProductionSettings = {
  standardDays: [0, 0], expressDays: [0, 0], standardFee: 0, expressFee: 0, regions: [],
};

function mutationFailed(error: unknown) {
  toast("Change was not saved", {
    description: error instanceof Error ? error.message : "Please try again.",
    variant: "error",
  });
}

interface AdminStoreValue {
  isReady: boolean;

  // Catalog
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  upsertProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  bulkUpdateProducts: (ids: string[], patch: Partial<Product>) => void;

  collections: Collection[];
  setCollections: React.Dispatch<React.SetStateAction<Collection[]>>;
  upsertCollection: (c: Collection) => void;
  deleteCollection: (id: string) => void;

  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  upsertCategory: (c: Category) => void;
  deleteCategory: (id: string) => void;

  customizationGroups: CustomizationGroup[];
  setCustomizationGroups: React.Dispatch<React.SetStateAction<CustomizationGroup[]>>;
  upsertCustomizationGroup: (g: CustomizationGroup) => void;
  deleteCustomizationGroup: (id: string) => void;

  measurementFieldDefs: MeasurementFieldDef[];
  setMeasurementFieldDefs: React.Dispatch<React.SetStateAction<MeasurementFieldDef[]>>;

  fabrics: Fabric[];
  setFabrics: React.Dispatch<React.SetStateAction<Fabric[]>>;
  upsertFabric: (f: Fabric) => void;
  deleteFabric: (id: string) => void;

  colorSwatches: ColorSwatch[];
  setColorSwatches: React.Dispatch<React.SetStateAction<ColorSwatch[]>>;
  upsertColorSwatch: (c: ColorSwatch) => void;
  deleteColorSwatch: (id: string) => void;

  sizeOptions: SizeOption[];
  setSizeOptions: React.Dispatch<React.SetStateAction<SizeOption[]>>;
  upsertSizeOption: (s: SizeOption) => void;
  deleteSizeOption: (id: string) => void;

  // CRM
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  upsertCustomer: (c: Customer) => void;
  addCustomerNote: (customerId: string, author: string, message: string) => void;

  // People & access
  adminUsers: AdminUser[];
  setAdminUsers: React.Dispatch<React.SetStateAction<AdminUser[]>>;
  upsertAdminUser: (u: AdminUser) => void;
  deleteAdminUser: (id: string) => void;

  roles: Role[];
  setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
  upsertRole: (r: Role) => void;

  auditLogs: AuditLogEntry[];
  logAudit: (entry: Omit<AuditLogEntry, "id" | "date">) => void;

  // Production & delivery
  productionStaff: ProductionStaff[];
  setProductionStaff: React.Dispatch<React.SetStateAction<ProductionStaff[]>>;

  productionTimelineRules: ProductionTimelineRule[];
  setProductionTimelineRules: React.Dispatch<React.SetStateAction<ProductionTimelineRule[]>>;

  deliveryZones: DeliveryZone[];
  setDeliveryZones: React.Dispatch<React.SetStateAction<DeliveryZone[]>>;
  upsertDeliveryZone: (z: DeliveryZone) => void;
  deleteDeliveryZone: (id: string) => void;

  // Payments
  paymentProviders: PaymentProviderConfig[];
  setPaymentProviders: React.Dispatch<React.SetStateAction<PaymentProviderConfig[]>>;

  refunds: Refund[];
  setRefunds: React.Dispatch<React.SetStateAction<Refund[]>>;
  requestRefund: (r: Omit<Refund, "id" | "status" | "requestedAt">) => void;
  updateRefundStatus: (id: string, status: Refund["status"], by: string) => void;

  // Promotions
  coupons: Coupon[];
  setCoupons: React.Dispatch<React.SetStateAction<Coupon[]>>;
  upsertCoupon: (c: Coupon) => void;
  deleteCoupon: (id: string) => void;

  giftCards: GiftCard[];
  setGiftCards: React.Dispatch<React.SetStateAction<GiftCard[]>>;
  upsertGiftCard: (g: GiftCard) => void;

  // Reviews
  reviews: Review[];
  setReviews: React.Dispatch<React.SetStateAction<Review[]>>;
  updateReviewStatus: (id: string, status: Review["status"]) => void;
  toggleReviewFeatured: (id: string) => void;
  respondToReview: (id: string, message: string) => void;
  deleteReview: (id: string) => void;

  // Notifications & email
  notificationTriggers: NotificationTrigger[];
  setNotificationTriggers: React.Dispatch<React.SetStateAction<NotificationTrigger[]>>;

  notificationLog: NotificationLogEntry[];
  emailTemplates: EmailTemplate[];
  setEmailTemplates: React.Dispatch<React.SetStateAction<EmailTemplate[]>>;
  upsertEmailTemplate: (t: EmailTemplate) => void;

  // CMS / content
  cmsPages: CMSPage[];
  setCmsPages: React.Dispatch<React.SetStateAction<CMSPage[]>>;
  upsertCmsPage: (p: CMSPage) => void;
  deleteCmsPage: (id: string) => void;

  faqs: FAQItem[];
  setFaqs: React.Dispatch<React.SetStateAction<FAQItem[]>>;
  upsertFaq: (f: FAQItem) => void;
  deleteFaq: (id: string) => void;

  testimonials: Testimonial[];
  setTestimonials: React.Dispatch<React.SetStateAction<Testimonial[]>>;
  upsertTestimonial: (t: Testimonial) => void;
  deleteTestimonial: (id: string) => void;

  blogPosts: BlogPost[];
  setBlogPosts: React.Dispatch<React.SetStateAction<BlogPost[]>>;
  upsertBlogPost: (b: BlogPost) => void;
  deleteBlogPost: (id: string) => void;

  banners: Banner[];
  setBanners: React.Dispatch<React.SetStateAction<Banner[]>>;
  upsertBanner: (b: Banner) => void;
  deleteBanner: (id: string) => void;

  navigationItems: NavigationItem[];
  setNavigationItems: React.Dispatch<React.SetStateAction<NavigationItem[]>>;

  homepageSections: HomepageSection[];
  setHomepageSections: React.Dispatch<React.SetStateAction<HomepageSection[]>>;

  mediaAssets: MediaAsset[];
  setMediaAssets: React.Dispatch<React.SetStateAction<MediaAsset[]>>;
  uploadMediaAsset: (file: File, folder?: string, alt?: string) => void;
  addExternalMediaAsset: (name: string, url: string, folder?: string, alt?: string) => void;
  deleteMediaAsset: (id: string) => void;

  // System
  systemSettings: SystemSettings;
  setSystemSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;

  /** Global standard/express production timeline + fee defaults — the base
   * case for checkout when no more-specific `productionTimelineRules` /
   * `deliveryZones` entry applies. Editing this updates the storefront. */
  productionSettings: ProductionSettings;
  setProductionSettings: React.Dispatch<React.SetStateAction<ProductionSettings>>;

  systemHealthChecks: SystemHealthCheck[];
}

const AdminStoreContext = createContext<AdminStoreValue | null>(null);

const K = (name: string) => `momen.admin.${name}.v1`;

function numberValue(value: unknown) {
  return Number(value ?? 0);
}

function normalizeFabric(value: Fabric & { additionalCost: number | string }): Fabric {
  return { ...value, additionalCost: numberValue(value.additionalCost), image: apiAssetUrl(value.image) };
}

function normalizeCustomizationGroup(group: CustomizationGroup): CustomizationGroup {
  return {
    ...group,
    choices: group.choices.map((choice) => ({ ...choice, additionalCost: numberValue(choice.additionalCost), image: apiAssetUrl(choice.image) || undefined })),
  };
}

function normalizeDeliveryZone(value: Record<string, unknown>): DeliveryZone {
  return {
    id: String(value.id),
    name: String(value.name),
    countries: value.countries as string[],
    standardFee: numberValue(value.standardFee),
    expressFee: numberValue(value.expressFee),
    freeDeliveryThreshold: value.freeDeliveryThreshold == null ? undefined : numberValue(value.freeDeliveryThreshold),
    standardDays: [numberValue(value.standardDaysMin), numberValue(value.standardDaysMax)],
    expressDays: [numberValue(value.expressDaysMin), numberValue(value.expressDaysMax)],
    expressAvailable: Boolean(value.expressAvailable),
    pickupAvailable: Boolean(value.pickupAvailable),
    pickupLocation: value.pickupLocation ? String(value.pickupLocation) : undefined,
    pickupFee: numberValue(value.pickupFee ?? 0),
    active: Boolean(value.active),
  };
}

function normalizeTimelineRule(value: Record<string, unknown>): ProductionTimelineRule {
  return {
    id: String(value.id),
    scope: value.scope as ProductionTimelineRule["scope"],
    scopeRef: value.scopeRef ? String(value.scopeRef) : undefined,
    standardDays: [numberValue(value.standardDaysMin), numberValue(value.standardDaysMax)],
    expressDays: [numberValue(value.expressDaysMin), numberValue(value.expressDaysMax)],
  };
}

function normalizeRole(value: Record<string, unknown>): Role {
  const permissions: Role["permissions"] = {};
  for (const row of (value.permissions ?? []) as { resource: keyof Role["permissions"]; action: string }[]) {
    const list = permissions[row.resource] ?? [];
    permissions[row.resource] = [...list, row.action as never];
  }
  return { id: String(value.id), name: String(value.name), description: String(value.description), isSystem: Boolean(value.isSystem), permissions };
}

function normalizeCustomer(value: Record<string, unknown>): Customer {
  const notes = ((value.notes ?? []) as Record<string, unknown>[]).map((note) => ({
    id: String(note.id),
    author: String(note.authorName ?? note.author ?? "Admin"),
    message: String(note.message),
    date: String(note.createdAt ?? note.date),
  }));
  return {
    id: String(value.id),
    name: String(value.name),
    email: String(value.email),
    phone: value.phone ? String(value.phone) : undefined,
    status: value.status as Customer["status"],
    createdAt: String(value.createdAt),
    addresses: (value.addresses ?? []) as Customer["addresses"],
    tags: (value.tags ?? []) as string[],
    marketingOptIn: Boolean(value.marketingOptIn),
    notes,
    lastLoginAt: value.lastLoginAt ? String(value.lastLoginAt) : undefined,
  };
}

export function AdminStoreProvider({ children }: { children: React.ReactNode }) {
  const [apiReady, setApiReady] = useState(false);
  const [healthChecks, setHealthChecks] = useState<SystemHealthCheck[]>([]);
  const [products, setProducts, r1] = usePersistentState<Product[]>(K("products"), []);
  const [collections, setCollections, r2] = usePersistentState<Collection[]>(K("collections"), []);
  const [categories, setCategories, r3] = usePersistentState<Category[]>(K("categories"), []);
  const [customizationGroups, setCustomizationGroups, r20] = usePersistentState<CustomizationGroup[]>(K("customization-groups"), []);
  const [measurementFieldDefs, setMeasurementFieldDefs, r21] = usePersistentState<MeasurementFieldDef[]>(K("measurement-fields"), []);
  const [fabrics, setFabrics, r31] = usePersistentState<Fabric[]>(K("fabrics"), []);
  const [colorSwatches, setColorSwatches, r32] = usePersistentState<ColorSwatch[]>(K("color-swatches"), []);
  const [sizeOptions, setSizeOptions, r33] = usePersistentState<SizeOption[]>(K("size-options"), []);

  const [customers, setCustomers, r4] = usePersistentState<Customer[]>(K("customers"), []);
  const [adminUsers, setAdminUsers, r5] = usePersistentState<AdminUser[]>(K("admin-users"), []);
  const [roles, setRoles, r22] = usePersistentState<Role[]>(K("roles"), []);
  const [auditLogs, setAuditLogs, r6] = usePersistentState<AuditLogEntry[]>(K("audit-logs"), []);

  const [productionStaff, setProductionStaff, r23] = usePersistentState<ProductionStaff[]>(K("production-staff"), []);
  const [productionTimelineRules, setProductionTimelineRules, r24] = usePersistentState<ProductionTimelineRule[]>(K("production-timeline-rules"), []);
  const [deliveryZones, setDeliveryZones, r7] = usePersistentState<DeliveryZone[]>(K("delivery-zones"), []);

  const [paymentProviders, setPaymentProviders, r25] = usePersistentState<PaymentProviderConfig[]>(K("payment-providers"), []);
  const [refunds, setRefunds, r8] = usePersistentState<Refund[]>(K("refunds"), []);

  const [coupons, setCoupons, r9] = usePersistentState<Coupon[]>(K("coupons"), []);
  const [giftCards, setGiftCards, r10] = usePersistentState<GiftCard[]>(K("gift-cards"), []);

  const [reviews, setReviews, r11] = usePersistentState<Review[]>(K("reviews"), []);

  const [notificationTriggers, setNotificationTriggers, r26] = usePersistentState<NotificationTrigger[]>(K("notification-triggers"), []);
  const [notificationLog, setNotificationLog, r27] = usePersistentState<NotificationLogEntry[]>(K("notification-log"), []);
  const [emailTemplates, setEmailTemplates, r12] = usePersistentState<EmailTemplate[]>(K("email-templates"), []);

  const [cmsPages, setCmsPages, r13] = usePersistentState<CMSPage[]>(K("cms-pages"), []);
  const [faqs, setFaqs, r14] = usePersistentState<FAQItem[]>(K("faqs"), []);
  const [testimonials, setTestimonials, r15] = usePersistentState<Testimonial[]>(K("testimonials"), []);
  const [blogPosts, setBlogPosts, r16] = usePersistentState<BlogPost[]>(K("blog-posts"), []);
  const [banners, setBanners, r17] = usePersistentState<Banner[]>(K("banners"), []);
  const [navigationItems, setNavigationItems, r28] = usePersistentState<NavigationItem[]>(K("navigation"), []);
  const [homepageSections, setHomepageSections, r18] = usePersistentState<HomepageSection[]>(K("homepage-sections"), []);
  const [mediaAssets, setMediaAssets, r19] = usePersistentState<MediaAsset[]>(K("media-assets"), []);

  const [systemSettings, setSystemSettings, r29] = usePersistentState<SystemSettings>(K("system-settings"), EMPTY_SYSTEM_SETTINGS);
  const [productionSettings, setProductionSettings, r30] = usePersistentState<ProductionSettings>(K("production-settings"), EMPTY_PRODUCTION_SETTINGS);

  const localStateReady = [
    r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19,
    r20, r21, r22, r23, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33,
  ].every(Boolean);
  const isReady = apiReady && localStateReady;

  const loadPublicData = useCallback(async () => {
    const results = await Promise.all([
      apiRequest<{ items: Product[] }>("/products?pageSize=1000"),
      apiRequest<Collection[]>("/collections"),
      apiRequest<Category[]>("/categories"),
      apiRequest<Fabric[]>("/fabrics"),
      apiRequest<ColorSwatch[]>("/color-swatches"),
      apiRequest<SizeOption[]>("/size-options"),
      apiRequest<CustomizationGroup[]>("/customization-groups"),
      apiRequest<MeasurementFieldDef[]>("/measurement-fields"),
      apiRequest<Record<string, unknown>[]>("/delivery-zones"),
      apiRequest<HomepageSection[]>("/homepage-sections"),
      apiRequest<Banner[]>("/banners"),
      apiRequest<Testimonial[]>("/testimonials"),
      apiRequest<FAQItem[]>("/faqs"),
      apiRequest<BlogPost[]>("/blog"),
      apiRequest<NavigationItem[]>("/navigation"),
      apiRequest<SystemSettings>("/settings/public"),
    ]);
    const [
      productPage,
      loadedCollections,
      loadedCategories,
      loadedFabrics,
      loadedColors,
      loadedSizes,
      loadedCustomization,
      loadedMeasurements,
      loadedDelivery,
      loadedHomepage,
      loadedBanners,
      loadedTestimonials,
      loadedFaqs,
      loadedBlog,
      loadedNavigation,
      loadedSettings,
    ] = results;
    setProducts(productPage.items.map(withCurrentImages));
    setCollections(loadedCollections.map((item) => ({ ...item, image: resolveImage(item.image), seo: item.seo ?? {} })));
    setCategories(loadedCategories.map((item) => ({ ...item, image: resolveImage(item.image), seo: item.seo ?? {} })));
    setFabrics(loadedFabrics.map(normalizeFabric));
    setColorSwatches(loadedColors);
    setSizeOptions(loadedSizes);
    setCustomizationGroups(loadedCustomization.map(normalizeCustomizationGroup));
    setMeasurementFieldDefs(loadedMeasurements);
    setDeliveryZones(loadedDelivery.map(normalizeDeliveryZone));
    setHomepageSections(loadedHomepage);
    setBanners(loadedBanners.map((item) => ({ ...item, image: apiAssetUrl(item.image) })));
    setTestimonials(loadedTestimonials.map((item) => ({ ...item, image: apiAssetUrl(item.image) || undefined })));
    setFaqs(loadedFaqs);
    setBlogPosts(loadedBlog.map((item) => ({ ...item, coverImage: apiAssetUrl(item.coverImage) })));
    setNavigationItems(loadedNavigation);
    setSystemSettings(loadedSettings);
  }, [
    setProducts, setCollections, setCategories, setFabrics, setColorSwatches, setSizeOptions,
    setCustomizationGroups, setMeasurementFieldDefs, setDeliveryZones, setHomepageSections,
    setBanners, setTestimonials, setFaqs, setBlogPosts, setNavigationItems, setSystemSettings,
  ]);

  const loadAdminData = useCallback(async () => {
    // Signed-out visitors (e.g. on /admin/login) would otherwise fire ~30
    // requests that all 401 — check the session once first.
    try {
      await apiRequest("/admin/auth/me");
    } catch {
      return;
    }
    const requests = await Promise.allSettled([
      apiRequest<{ items: Product[] }>("/admin/products?pageSize=1000"),
      apiRequest<Collection[]>("/admin/collections"),
      apiRequest<Category[]>("/admin/categories"),
      apiRequest<Record<string, unknown>[]>("/admin/customers"),
      apiRequest<AdminUser[]>("/admin/admin-users"),
      apiRequest<Record<string, unknown>[]>("/admin/roles"),
      apiRequest<Record<string, unknown>[]>("/admin/audit-logs"),
      apiRequest<ProductionStaff[]>("/admin/production-staff"),
      apiRequest<Record<string, unknown>[]>("/admin/production-timeline-rules"),
      apiRequest<Record<string, unknown>[]>("/admin/delivery-zones"),
      apiRequest<Record<string, unknown>[]>("/admin/payment-providers"),
      apiRequest<Record<string, unknown>[]>("/admin/refunds"),
      apiRequest<Record<string, unknown>[]>("/admin/coupons"),
      apiRequest<Record<string, unknown>[]>("/admin/gift-cards"),
      apiRequest<Record<string, unknown>[]>("/admin/reviews"),
      apiRequest<NotificationTrigger[]>("/admin/notification-triggers"),
      apiRequest<Record<string, unknown>[]>("/admin/notification-log"),
      apiRequest<EmailTemplate[]>("/admin/email-templates"),
      apiRequest<CMSPage[]>("/admin/pages"),
      apiRequest<FAQItem[]>("/admin/faqs"),
      apiRequest<Testimonial[]>("/admin/testimonials"),
      apiRequest<BlogPost[]>("/admin/blog"),
      apiRequest<Banner[]>("/admin/banners"),
      apiRequest<NavigationItem[]>("/admin/navigation"),
      apiRequest<HomepageSection[]>("/admin/homepage-sections"),
      apiRequest<Record<string, unknown>[]>("/admin/media"),
      apiRequest<SystemSettings>("/admin/settings"),
      apiRequest<{ checks: SystemHealthCheck[] }>("/admin/system-health"),
    ]);
    const value = <T,>(index: number): T | undefined => requests[index].status === "fulfilled" ? requests[index].value as T : undefined;
    const adminProducts = value<{ items: Product[] }>(0);
    if (adminProducts) setProducts(adminProducts.items.map(withCurrentImages));
    const adminCollections = value<Collection[]>(1);
    if (adminCollections) setCollections(adminCollections.map((item) => ({ ...item, image: resolveImage(item.image), seo: item.seo ?? {} })));
    const adminCategories = value<Category[]>(2);
    if (adminCategories) setCategories(adminCategories.map((item) => ({ ...item, image: resolveImage(item.image), seo: item.seo ?? {} })));
    const loadedCustomers = value<Record<string, unknown>[]>(3);
    if (loadedCustomers) setCustomers(loadedCustomers.map(normalizeCustomer));
    const loadedUsers = value<AdminUser[]>(4);
    if (loadedUsers) setAdminUsers(loadedUsers.map((item) => ({ ...item, avatar: (item as AdminUser & { avatarUrl?: string }).avatarUrl })));
    const loadedRoles = value<Record<string, unknown>[]>(5);
    if (loadedRoles) setRoles(loadedRoles.map(normalizeRole));
    const loadedAudit = value<Record<string, unknown>[]>(6);
    if (loadedAudit) setAuditLogs(loadedAudit.map((item) => ({ ...item, date: String(item.createdAt), resource: (item.resource ?? "system") as AuditLogEntry["resource"] })) as AuditLogEntry[]);
    const loadedStaff = value<ProductionStaff[]>(7);
    if (loadedStaff) setProductionStaff(loadedStaff.map((item) => ({ ...item, status: String(item.status) === "on_leave" ? "on-leave" : item.status })));
    const loadedRules = value<Record<string, unknown>[]>(8);
    if (loadedRules) setProductionTimelineRules(loadedRules.map(normalizeTimelineRule));
    const adminDelivery = value<Record<string, unknown>[]>(9);
    if (adminDelivery) setDeliveryZones(adminDelivery.map(normalizeDeliveryZone));
    const providers = value<Record<string, unknown>[]>(10);
    if (providers) setPaymentProviders(providers.map((item) => ({ ...item, provider: String(item.provider).replace(/(^|_)(\w)/g, (_, __, letter: string) => letter.toUpperCase()).replace("Bank-transfer", "Bank Transfer"), publicKeyMasked: item.publicKeyMasked ?? "", secretKeyMasked: item.secretKeyMasked ?? "", webhookUrl: item.webhookUrl ?? "" })) as PaymentProviderConfig[]);
    const loadedRefunds = value<Record<string, unknown>[]>(11);
    if (loadedRefunds) setRefunds(loadedRefunds.map((item) => ({ ...item, amount: numberValue(item.amount), requestedAt: item.requestedAt, requestedBy: item.requestedByName, processedBy: item.processedByName })) as Refund[]);
    const loadedCoupons = value<Record<string, unknown>[]>(12);
    if (loadedCoupons) setCoupons(loadedCoupons.map((item) => ({ ...item, value: numberValue(item.value), minOrderValue: item.minOrderValue == null ? undefined : numberValue(item.minOrderValue) })) as Coupon[]);
    const loadedGiftCards = value<Record<string, unknown>[]>(13);
    if (loadedGiftCards) setGiftCards(loadedGiftCards.map((item) => ({ ...item, initialValue: numberValue(item.initialValue), balance: numberValue(item.balance), history: ((item.history ?? []) as Record<string, unknown>[]).map((h) => ({ date: String(h.createdAt), amount: numberValue(h.amount), note: String(h.note) })) })) as GiftCard[]);
    const loadedReviews = value<Record<string, unknown>[]>(14);
    if (loadedReviews) setReviews(loadedReviews.map((item) => ({ ...item, date: String(item.createdAt), response: item.responseMessage ? { message: String(item.responseMessage), date: String(item.respondedAt) } : undefined })) as Review[]);
    const triggers = value<NotificationTrigger[]>(15);
    if (triggers) setNotificationTriggers(triggers.map((trigger) => ({ ...trigger, channels: trigger.channels.map((channel) => String(channel) === "in_app" ? "in-app" : channel) })));
    const logs = value<Record<string, unknown>[]>(16);
    if (logs) setNotificationLog(logs.map((item) => ({ ...item, date: String(item.createdAt) })) as NotificationLogEntry[]);
    const templates = value<EmailTemplate[]>(17);
    if (templates) setEmailTemplates(templates);
    const pages = value<CMSPage[]>(18);
    if (pages) setCmsPages(pages.map((item) => ({ ...item, seo: item.seo ?? {} })));
    const adminFaqs = value<FAQItem[]>(19); if (adminFaqs) setFaqs(adminFaqs);
    const adminTestimonials = value<Testimonial[]>(20); if (adminTestimonials) setTestimonials(adminTestimonials);
    const adminBlog = value<BlogPost[]>(21); if (adminBlog) setBlogPosts(adminBlog.map((item) => ({ ...item, seo: item.seo ?? {} })));
    const adminBanners = value<Banner[]>(22); if (adminBanners) setBanners(adminBanners);
    const adminNavigation = value<NavigationItem[]>(23); if (adminNavigation) setNavigationItems(adminNavigation);
    const adminHomepage = value<HomepageSection[]>(24); if (adminHomepage) setHomepageSections(adminHomepage);
    const media = value<Record<string, unknown>[]>(25);
    if (media) setMediaAssets(media.map((item) => ({ ...item, url: apiAssetUrl(String(item.url)), uploadedAt: String(item.createdAt), uploadedBy: String(item.uploadedByName) })) as MediaAsset[]);
    const settings = value<SystemSettings>(26); if (settings) setSystemSettings(settings);
    const health = value<{ checks: SystemHealthCheck[] }>(27); if (health) setHealthChecks(health.checks);
  }, [
    setProducts, setCollections, setCategories, setCustomers, setAdminUsers, setRoles, setAuditLogs,
    setProductionStaff, setProductionTimelineRules, setDeliveryZones, setPaymentProviders, setRefunds,
    setCoupons, setGiftCards, setReviews, setNotificationTriggers, setNotificationLog, setEmailTemplates,
    setCmsPages, setFaqs, setTestimonials, setBlogPosts, setBanners, setNavigationItems,
    setHomepageSections, setMediaAssets, setSystemSettings,
  ]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        await loadPublicData();
        if (window.location.pathname.startsWith("/admin")) await loadAdminData();
      } catch (error) {
        toast("Could not load application data", { description: error instanceof Error ? error.message : "API unavailable", variant: "error" });
      } finally {
        if (active) setApiReady(true);
      }
    };
    void load();
    const onAuth = () => {
      if (window.location.pathname.startsWith("/admin")) void loadAdminData();
    };
    window.addEventListener("momen:auth-changed", onAuth);
    return () => { active = false; window.removeEventListener("momen:auth-changed", onAuth); };
  }, [loadPublicData, loadAdminData]);

  const upsertFabric = useCallback((f: Fabric) => {
    const exists = fabrics.some((x) => x.id === f.id);
    const { id: _id, ...body } = f;
    void apiRequest<Fabric>(exists ? `/admin/fabrics/${f.id}` : "/admin/fabrics", { method: exists ? "PUT" : "POST", body })
      .then((saved) => setFabrics((prev) => exists ? prev.map((x) => x.id === f.id ? normalizeFabric(saved) : x) : [normalizeFabric(saved), ...prev]))
      .catch(mutationFailed);
  }, [fabrics, setFabrics]);
  const deleteFabric = useCallback((id: string) => {
    void apiRequest(`/admin/fabrics/${id}`, { method: "DELETE" }).then(() => setFabrics((prev) => prev.filter((x) => x.id !== id))).catch(mutationFailed);
  }, [setFabrics]);

  const upsertColorSwatch = useCallback((c: ColorSwatch) => {
    const exists = colorSwatches.some((x) => x.id === c.id);
    const { id: _id, ...body } = c;
    void apiRequest<ColorSwatch>(exists ? `/admin/color-swatches/${c.id}` : "/admin/color-swatches", { method: exists ? "PUT" : "POST", body })
      .then((saved) => setColorSwatches((prev) => exists ? prev.map((x) => x.id === c.id ? saved : x) : [saved, ...prev])).catch(mutationFailed);
  }, [colorSwatches, setColorSwatches]);
  const deleteColorSwatch = useCallback((id: string) => {
    void apiRequest(`/admin/color-swatches/${id}`, { method: "DELETE" }).then(() => setColorSwatches((prev) => prev.filter((x) => x.id !== id))).catch(mutationFailed);
  }, [setColorSwatches]);

  const upsertSizeOption = useCallback((s: SizeOption) => {
    const exists = sizeOptions.some((x) => x.id === s.id);
    const { id: _id, ...body } = s;
    void apiRequest<SizeOption>(exists ? `/admin/size-options/${s.id}` : "/admin/size-options", { method: exists ? "PUT" : "POST", body })
      .then((saved) => setSizeOptions((prev) => exists ? prev.map((x) => x.id === s.id ? saved : x) : [...prev, saved])).catch(mutationFailed);
  }, [sizeOptions, setSizeOptions]);
  const deleteSizeOption = useCallback((id: string) => {
    void apiRequest(`/admin/size-options/${id}`, { method: "DELETE" }).then(() => setSizeOptions((prev) => prev.filter((x) => x.id !== id))).catch(mutationFailed);
  }, [setSizeOptions]);

  const upsertCustomizationGroup = useCallback((g: CustomizationGroup) => {
    const exists = customizationGroups.some((x) => x.id === g.id);
    const body = { name: g.name, description: g.description, choices: g.choices.map(({ id: _id, ...choice }) => choice) };
    void apiRequest<CustomizationGroup>(exists ? `/admin/customization-groups/${g.id}` : "/admin/customization-groups", { method: exists ? "PUT" : "POST", body })
      .then((saved) => setCustomizationGroups((prev) => exists ? prev.map((x) => x.id === g.id ? normalizeCustomizationGroup(saved) : x) : [...prev, normalizeCustomizationGroup(saved)])).catch(mutationFailed);
  }, [customizationGroups, setCustomizationGroups]);
  const deleteCustomizationGroup = useCallback((id: string) => {
    void apiRequest(`/admin/customization-groups/${id}`, { method: "DELETE" }).then(() => setCustomizationGroups((prev) => prev.filter((x) => x.id !== id))).catch(mutationFailed);
  }, [setCustomizationGroups]);

  const upsertProduct = useCallback((p: Product) => {
    const exists = products.some((x) => x.id === p.id);
    const categoryId = categories.find((item) => item.slug === p.category)?.id;
    if (!categoryId) return mutationFailed(new Error("Select a valid category."));
    const body = {
      slug: p.slug, name: p.name, sku: p.sku, categoryId,
      collectionIds: p.collectionSlugs.map((slug) => collections.find((item) => item.slug === slug)?.id).filter(Boolean),
      tagNames: p.tags, price: p.price, compareAtPrice: p.compareAtPrice, salePrice: p.salePrice,
      images: p.images, hoverImage: p.hoverImage, videos: p.videos ?? [], spinImages: p.spinImages ?? [],
      colorVariants: p.colors.map((color, sortOrder) => ({ ...color, sortOrder })),
      sizes: p.sizes.map((label, sortOrder) => ({ label, sortOrder, sizeOptionId: sizeOptions.find((item) => item.label === label)?.id, stockQuantity: p.sizeInventory?.[label] ?? null })),
      productionType: p.productionType, productType: p.productType, gender: p.gender, sizingMode: p.sizingMode, garment: p.garment,
      fabricIds: p.fabricIds ?? [], description: p.description, shortDescription: p.shortDescription,
      details: p.details, careInstructions: p.careInstructions,
      productionDaysStandardMin: p.productionDays.standard[0], productionDaysStandardMax: p.productionDays.standard[1],
      productionDaysExpressMin: p.productionDays.express[0], productionDaysExpressMax: p.productionDays.express[1],
      isNew: p.isNew, isFeatured: p.isFeatured, isSignature: p.isSignature,
      stockQuantity: p.stockQuantity, lowStockThreshold: p.lowStockThreshold,
      publishStatus: p.publishStatus, publishAt: p.publishAt, expressEligible: p.expressEligible,
      customizable: p.customizable, referenceImagesAllowed: p.referenceImagesAllowed,
      specialInstructionsAllowed: p.specialInstructionsAllowed, crossSellCategorySlugs: p.crossSellCategorySlugs ?? [],
      sizeChart: p.sizeChart, seo: p.seo, customizations: p.customization,
      measurementFieldKeys: p.measurementFieldKeys ?? [],
    };
    void apiRequest<Product>(exists ? `/admin/products/${p.id}` : "/admin/products", { method: exists ? "PATCH" : "POST", body })
      .then((saved) => setProducts((prev) => exists ? prev.map((x) => x.id === p.id ? saved : x) : [saved, ...prev])).catch(mutationFailed);
  }, [products, categories, collections, sizeOptions, setProducts]);
  const deleteProduct = useCallback((id: string) => {
    void apiRequest(`/admin/products/${id}`, { method: "DELETE" }).then(() => setProducts((prev) => prev.filter((x) => x.id !== id))).catch(mutationFailed);
  }, [setProducts]);
  const bulkUpdateProducts = useCallback((ids: string[], patch: Partial<Product>) => {
    void apiRequest<Product[]>("/admin/products/bulk", { method: "PATCH", body: { ids, ...patch } })
      .then((saved) => setProducts((prev) => prev.map((p) => saved.find((item) => item.id === p.id) ?? p))).catch(mutationFailed);
  }, [setProducts]);

  const upsertCollection = useCallback((c: Collection) => {
    const exists = collections.some((x) => x.id === c.id);
    const { id: _id, productSlugs: _productSlugs, ...body } = c;
    void apiRequest<Collection>(exists ? `/admin/collections/${c.id}` : "/admin/collections", { method: exists ? "PUT" : "POST", body })
      .then((saved) => setCollections((prev) => exists ? prev.map((x) => x.id === c.id ? { ...saved, seo: saved.seo ?? {} } : x) : [{ ...saved, seo: saved.seo ?? {} }, ...prev])).catch(mutationFailed);
  }, [collections, setCollections]);
  const deleteCollection = useCallback((id: string) => {
    void apiRequest(`/admin/collections/${id}`, { method: "DELETE" }).then(() => setCollections((prev) => prev.filter((x) => x.id !== id))).catch(mutationFailed);
  }, [setCollections]);

  const upsertCategory = useCallback((c: Category) => {
    const exists = categories.some((x) => x.id === c.id);
    const { id: _id, ...body } = c;
    void apiRequest<Category>(exists ? `/admin/categories/${c.id}` : "/admin/categories", { method: exists ? "PUT" : "POST", body })
      .then((saved) => setCategories((prev) => exists ? prev.map((x) => x.id === c.id ? { ...saved, seo: saved.seo ?? {} } : x) : [{ ...saved, seo: saved.seo ?? {} }, ...prev])).catch(mutationFailed);
  }, [categories, setCategories]);
  const deleteCategory = useCallback((id: string) => {
    void apiRequest(`/admin/categories/${id}`, { method: "DELETE" }).then(() => setCategories((prev) => prev.filter((x) => x.id !== id))).catch(mutationFailed);
  }, [setCategories]);

  const upsertCustomer = useCallback((c: Customer) => {
    void apiRequest<Record<string, unknown>>(`/admin/customers/${c.id}`, { method: "PATCH", body: { status: c.status, tags: c.tags } })
      .then((saved) => setCustomers((prev) => prev.map((x) => x.id === c.id ? { ...x, ...normalizeCustomer(saved), addresses: x.addresses, notes: x.notes } : x))).catch(mutationFailed);
  }, [setCustomers]);
  const addCustomerNote = useCallback((customerId: string, author: string, message: string) => {
    void apiRequest<Record<string, unknown>>(`/admin/customers/${customerId}/notes`, { method: "POST", body: { message } })
      .then((saved) => setCustomers((prev) => prev.map((c) => c.id === customerId ? normalizeCustomer(saved) : c))).catch(mutationFailed);
    void author;
  }, [setCustomers]);

  const upsertAdminUser = useCallback((u: AdminUser) => {
    const exists = adminUsers.some((x) => x.id === u.id);
    const body = exists ? { name: u.name, roleId: u.roleId, status: u.status } : { name: u.name, email: u.email, roleId: u.roleId };
    void apiRequest<{ user?: AdminUser } | AdminUser>(exists ? `/admin/admin-users/${u.id}` : "/admin/admin-users", { method: exists ? "PATCH" : "POST", body })
      .then((result) => {
        const saved = "user" in result && result.user ? result.user : result as AdminUser;
        setAdminUsers((prev) => exists ? prev.map((x) => x.id === u.id ? saved : x) : [saved, ...prev]);
      }).catch(mutationFailed);
  }, [adminUsers, setAdminUsers]);
  const deleteAdminUser = useCallback((id: string) => {
    void apiRequest(`/admin/admin-users/${id}`, { method: "DELETE" }).then(() => setAdminUsers((prev) => prev.filter((x) => x.id !== id))).catch(mutationFailed);
  }, [setAdminUsers]);

  const upsertRole = useCallback((r: Role) => {
    const exists = roles.some((x) => x.id === r.id);
    void apiRequest<Record<string, unknown>>(exists ? `/admin/roles/${r.id}` : "/admin/roles", { method: exists ? "PUT" : "POST", body: { name: r.name, description: r.description, isSystem: r.isSystem, permissions: r.permissions } })
      .then((saved) => setRoles((prev) => exists ? prev.map((x) => x.id === r.id ? normalizeRole(saved) : x) : [normalizeRole(saved), ...prev])).catch(mutationFailed);
  }, [roles, setRoles]);

  const logAudit = useCallback((entry: Omit<AuditLogEntry, "id" | "date">) => {
    const { actorId: _actorId, actorName: _actorName, ip: _ip, resource, ...body } = entry;
    void apiRequest<Record<string, unknown>>("/admin/audit-logs", {
      method: "POST",
      body: { ...body, ...(resource === "system" ? {} : { resource }) },
    }).then((saved) => {
      setAuditLogs((prev) => [{ ...saved, date: String(saved.createdAt), resource: (saved.resource ?? "system") as AuditLogEntry["resource"] } as AuditLogEntry, ...prev].slice(0, 500));
    }).catch(mutationFailed);
  }, [setAuditLogs]);

  const upsertDeliveryZone = useCallback((z: DeliveryZone) => {
    const exists = deliveryZones.some((x) => x.id === z.id);
    const body = { name: z.name, countries: z.countries, standardFee: z.standardFee, expressFee: z.expressFee, freeDeliveryThreshold: z.freeDeliveryThreshold, standardDaysMin: z.standardDays[0], standardDaysMax: z.standardDays[1], expressDaysMin: z.expressDays[0], expressDaysMax: z.expressDays[1], expressAvailable: z.expressAvailable, pickupAvailable: z.pickupAvailable ?? false, pickupLocation: z.pickupLocation || undefined, pickupFee: z.pickupFee ?? 0, active: z.active };
    void apiRequest<Record<string, unknown>>(exists ? `/admin/delivery-zones/${z.id}` : "/admin/delivery-zones", { method: exists ? "PUT" : "POST", body })
      .then((saved) => setDeliveryZones((prev) => exists ? prev.map((x) => x.id === z.id ? normalizeDeliveryZone(saved) : x) : [normalizeDeliveryZone(saved), ...prev])).catch(mutationFailed);
  }, [deliveryZones, setDeliveryZones]);
  const deleteDeliveryZone = useCallback((id: string) => {
    void apiRequest(`/admin/delivery-zones/${id}`, { method: "DELETE" }).then(() => setDeliveryZones((prev) => prev.filter((x) => x.id !== id))).catch(mutationFailed);
  }, [setDeliveryZones]);

  const requestRefund = useCallback((r: Omit<Refund, "id" | "status" | "requestedAt">) => {
    void apiRequest<Record<string, unknown>>(`/admin/refunds/orders/${r.orderId}`, { method: "POST", body: { amount: r.type === "partial" ? r.amount : undefined, type: r.type, reason: r.reason } })
      .then((saved) => setRefunds((prev) => [{ ...saved, amount: numberValue(saved.amount), requestedBy: saved.requestedByName, requestedAt: String(saved.requestedAt) } as Refund, ...prev])).catch(mutationFailed);
  }, [setRefunds]);
  const updateRefundStatus = useCallback((id: string, status: Refund["status"], by: string) => {
    const path = status === "processed" ? `/admin/refunds/${id}/process` : `/admin/refunds/${id}/${status}`;
    const method = status === "processed" ? "POST" : "PATCH";
    void apiRequest<Record<string, unknown>>(path, { method, body: status === "rejected" ? { reason: "Rejected by administrator" } : {} })
      .then((saved) => setRefunds((prev) => prev.map((r) => r.id === id ? { ...r, ...saved, amount: numberValue(saved.amount), processedBy: String(saved.processedByName ?? by) } as Refund : r))).catch(mutationFailed);
  }, [setRefunds]);

  const upsertCoupon = useCallback((c: Coupon) => {
    const exists = coupons.some((x) => x.id === c.id);
    const { id: _id, usageCount: _usageCount, createdAt: _createdAt, ...body } = c;
    void apiRequest<Record<string, unknown>>(exists ? `/admin/coupons/${c.id}` : "/admin/coupons", { method: exists ? "PUT" : "POST", body })
      .then((saved) => setCoupons((prev) => {
        const normalized = { ...saved, value: numberValue(saved.value), minOrderValue: saved.minOrderValue == null ? undefined : numberValue(saved.minOrderValue) } as Coupon;
        return exists ? prev.map((x) => x.id === c.id ? normalized : x) : [normalized, ...prev];
      })).catch(mutationFailed);
  }, [coupons, setCoupons]);
  const deleteCoupon = useCallback((id: string) => {
    void apiRequest(`/admin/coupons/${id}`, { method: "DELETE" }).then(() => setCoupons((prev) => prev.filter((x) => x.id !== id))).catch(mutationFailed);
  }, [setCoupons]);

  const upsertGiftCard = useCallback((g: GiftCard) => {
    const exists = giftCards.some((x) => x.id === g.id);
    const request = exists
      ? apiRequest<Record<string, unknown>>(`/admin/gift-cards/${g.id}/status`, { method: "PATCH", body: { status: g.status } })
      : apiRequest<Record<string, unknown>>("/admin/gift-cards", { method: "POST", body: { initialValue: g.initialValue, issuedTo: g.issuedTo, purchasedBy: g.purchasedBy, expiresAt: g.expiresAt } });
    void request.then((saved) => setGiftCards((prev) => {
      const normalized = { ...g, ...saved, initialValue: numberValue(saved.initialValue), balance: numberValue(saved.balance), history: g.history ?? [] } as GiftCard;
      return exists ? prev.map((x) => x.id === g.id ? normalized : x) : [normalized, ...prev];
    })).catch(mutationFailed);
  }, [giftCards, setGiftCards]);

  const updateReviewStatus = useCallback((id: string, status: Review["status"]) => {
    void apiRequest(`/admin/reviews/${id}/status`, { method: "PATCH", body: { status } }).then(() => setReviews((prev) => prev.map((r) => r.id === id ? { ...r, status } : r))).catch(mutationFailed);
  }, [setReviews]);
  const toggleReviewFeatured = useCallback((id: string) => {
    void apiRequest<Record<string, unknown>>(`/admin/reviews/${id}/featured`, { method: "PATCH", body: {} }).then((saved) => setReviews((prev) => prev.map((r) => r.id === id ? { ...r, featured: Boolean(saved.featured) } : r))).catch(mutationFailed);
  }, [setReviews]);
  const respondToReview = useCallback((id: string, message: string) => {
    void apiRequest<Record<string, unknown>>(`/admin/reviews/${id}/respond`, { method: "POST", body: { message } }).then((saved) => setReviews((prev) => prev.map((r) => r.id === id ? { ...r, response: { message, date: String(saved.respondedAt) } } : r))).catch(mutationFailed);
  }, [setReviews]);
  const deleteReview = useCallback((id: string) => {
    void apiRequest(`/admin/reviews/${id}`, { method: "DELETE" }).then(() => setReviews((prev) => prev.filter((r) => r.id !== id))).catch(mutationFailed);
  }, [setReviews]);

  const upsertEmailTemplate = useCallback((t: EmailTemplate) => {
    const exists = emailTemplates.some((x) => x.id === t.id);
    const { id: _id, updatedAt: _updatedAt, ...body } = t;
    void apiRequest<EmailTemplate>(exists ? `/admin/email-templates/${t.id}` : "/admin/email-templates", { method: exists ? "PUT" : "POST", body })
      .then((saved) => setEmailTemplates((prev) => exists ? prev.map((x) => x.id === t.id ? saved : x) : [saved, ...prev])).catch(mutationFailed);
  }, [emailTemplates, setEmailTemplates]);

  const upsertCmsPage = useCallback((p: CMSPage) => {
    const exists = cmsPages.some((x) => x.id === p.id);
    const { id: _id, updatedAt: _updatedAt, ...body } = p;
    void apiRequest<CMSPage>(exists ? `/admin/pages/${p.id}` : "/admin/pages", { method: exists ? "PUT" : "POST", body })
      .then((saved) => setCmsPages((prev) => exists ? prev.map((x) => x.id === p.id ? { ...saved, seo: saved.seo ?? {} } : x) : [{ ...saved, seo: saved.seo ?? {} }, ...prev])).catch(mutationFailed);
  }, [cmsPages, setCmsPages]);
  const deleteCmsPage = useCallback((id: string) => {
    void apiRequest(`/admin/pages/${id}`, { method: "DELETE" }).then(() => setCmsPages((prev) => prev.filter((x) => x.id !== id))).catch(mutationFailed);
  }, [setCmsPages]);

  const upsertFaq = useCallback((f: FAQItem) => {
    const exists = faqs.some((x) => x.id === f.id);
    const { id: _id, ...body } = f;
    void apiRequest<FAQItem>(exists ? `/admin/faqs/${f.id}` : "/admin/faqs", { method: exists ? "PUT" : "POST", body })
      .then((saved) => setFaqs((prev) => exists ? prev.map((x) => x.id === f.id ? saved : x) : [saved, ...prev])).catch(mutationFailed);
  }, [faqs, setFaqs]);
  const deleteFaq = useCallback((id: string) => {
    void apiRequest(`/admin/faqs/${id}`, { method: "DELETE" }).then(() => setFaqs((prev) => prev.filter((x) => x.id !== id))).catch(mutationFailed);
  }, [setFaqs]);

  const upsertTestimonial = useCallback((t: Testimonial) => {
    const exists = testimonials.some((x) => x.id === t.id);
    const { id: _id, ...body } = t;
    void apiRequest<Testimonial>(exists ? `/admin/testimonials/${t.id}` : "/admin/testimonials", { method: exists ? "PUT" : "POST", body })
      .then((saved) => setTestimonials((prev) => exists ? prev.map((x) => x.id === t.id ? saved : x) : [saved, ...prev])).catch(mutationFailed);
  }, [testimonials, setTestimonials]);
  const deleteTestimonial = useCallback((id: string) => {
    void apiRequest(`/admin/testimonials/${id}`, { method: "DELETE" }).then(() => setTestimonials((prev) => prev.filter((x) => x.id !== id))).catch(mutationFailed);
  }, [setTestimonials]);

  const upsertBlogPost = useCallback((b: BlogPost) => {
    const exists = blogPosts.some((x) => x.id === b.id);
    const { id: _id, updatedAt: _updatedAt, ...body } = b;
    void apiRequest<BlogPost>(exists ? `/admin/blog/${b.id}` : "/admin/blog", { method: exists ? "PUT" : "POST", body })
      .then((saved) => setBlogPosts((prev) => exists ? prev.map((x) => x.id === b.id ? { ...saved, seo: saved.seo ?? {} } : x) : [{ ...saved, seo: saved.seo ?? {} }, ...prev])).catch(mutationFailed);
  }, [blogPosts, setBlogPosts]);
  const deleteBlogPost = useCallback((id: string) => {
    void apiRequest(`/admin/blog/${id}`, { method: "DELETE" }).then(() => setBlogPosts((prev) => prev.filter((x) => x.id !== id))).catch(mutationFailed);
  }, [setBlogPosts]);

  const upsertBanner = useCallback((b: Banner) => {
    const exists = banners.some((x) => x.id === b.id);
    const { id: _id, ...body } = b;
    void apiRequest<Banner>(exists ? `/admin/banners/${b.id}` : "/admin/banners", { method: exists ? "PUT" : "POST", body })
      .then((saved) => setBanners((prev) => exists ? prev.map((x) => x.id === b.id ? saved : x) : [saved, ...prev])).catch(mutationFailed);
  }, [banners, setBanners]);
  const deleteBanner = useCallback((id: string) => {
    void apiRequest(`/admin/banners/${id}`, { method: "DELETE" }).then(() => setBanners((prev) => prev.filter((x) => x.id !== id))).catch(mutationFailed);
  }, [setBanners]);

  const normalizeMediaAsset = useCallback((saved: Record<string, unknown>): MediaAsset => ({
    ...saved,
    id: String(saved.id),
    name: String(saved.name),
    url: apiAssetUrl(String(saved.url)),
    type: saved.type as MediaAsset["type"],
    folder: String(saved.folder),
    size: numberValue(saved.size),
    alt: saved.alt ? String(saved.alt) : undefined,
    uploadedAt: String(saved.createdAt),
    uploadedBy: String(saved.uploadedByName),
  }), []);
  const uploadMediaAsset = useCallback((file: File, folder = "Uploads", alt?: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);
    if (alt) form.append("alt", alt);
    void apiRequest<Record<string, unknown>>("/admin/media", { method: "POST", body: form })
      .then((saved) => setMediaAssets((prev) => [normalizeMediaAsset(saved), ...prev]))
      .catch(mutationFailed);
  }, [normalizeMediaAsset, setMediaAssets]);
  const addExternalMediaAsset = useCallback((name: string, url: string, folder = "External", alt?: string) => {
    void apiRequest<Record<string, unknown>>("/admin/media/external", { method: "POST", body: { name, url, folder, alt } })
      .then((saved) => setMediaAssets((prev) => [normalizeMediaAsset(saved), ...prev]))
      .catch(mutationFailed);
  }, [normalizeMediaAsset, setMediaAssets]);
  const deleteMediaAsset = useCallback((id: string) => {
    void apiRequest(`/admin/media/${id}`, { method: "DELETE" }).then(() => setMediaAssets((prev) => prev.filter((x) => x.id !== id))).catch(mutationFailed);
  }, [setMediaAssets]);

  const value = useMemo<AdminStoreValue>(
    () => ({
      isReady,
      products, setProducts, upsertProduct, deleteProduct, bulkUpdateProducts,
      collections, setCollections, upsertCollection, deleteCollection,
      categories, setCategories, upsertCategory, deleteCategory,
      customizationGroups, setCustomizationGroups, upsertCustomizationGroup, deleteCustomizationGroup,
      measurementFieldDefs, setMeasurementFieldDefs,
      fabrics, setFabrics, upsertFabric, deleteFabric,
      colorSwatches, setColorSwatches, upsertColorSwatch, deleteColorSwatch,
      sizeOptions, setSizeOptions, upsertSizeOption, deleteSizeOption,
      customers, setCustomers, upsertCustomer, addCustomerNote,
      adminUsers, setAdminUsers, upsertAdminUser, deleteAdminUser,
      roles, setRoles, upsertRole,
      auditLogs, logAudit,
      productionStaff, setProductionStaff,
      productionTimelineRules, setProductionTimelineRules,
      deliveryZones, setDeliveryZones, upsertDeliveryZone, deleteDeliveryZone,
      paymentProviders, setPaymentProviders,
      refunds, setRefunds, requestRefund, updateRefundStatus,
      coupons, setCoupons, upsertCoupon, deleteCoupon,
      giftCards, setGiftCards, upsertGiftCard,
      reviews, setReviews, updateReviewStatus, toggleReviewFeatured, respondToReview, deleteReview,
      notificationTriggers, setNotificationTriggers,
      notificationLog,
      emailTemplates, setEmailTemplates, upsertEmailTemplate,
      cmsPages, setCmsPages, upsertCmsPage, deleteCmsPage,
      faqs, setFaqs, upsertFaq, deleteFaq,
      testimonials, setTestimonials, upsertTestimonial, deleteTestimonial,
      blogPosts, setBlogPosts, upsertBlogPost, deleteBlogPost,
      banners, setBanners, upsertBanner, deleteBanner,
      navigationItems, setNavigationItems,
      homepageSections, setHomepageSections,
      mediaAssets, setMediaAssets, uploadMediaAsset, addExternalMediaAsset, deleteMediaAsset,
      systemSettings, setSystemSettings,
      productionSettings, setProductionSettings,
      systemHealthChecks: healthChecks,
    }),
    [
      isReady, products, setProducts, upsertProduct, deleteProduct, bulkUpdateProducts,
      collections, setCollections, upsertCollection, deleteCollection,
      categories, setCategories, upsertCategory, deleteCategory,
      customizationGroups, setCustomizationGroups, upsertCustomizationGroup, deleteCustomizationGroup, measurementFieldDefs, setMeasurementFieldDefs,
      fabrics, setFabrics, upsertFabric, deleteFabric, colorSwatches, setColorSwatches, upsertColorSwatch, deleteColorSwatch,
      sizeOptions, setSizeOptions, upsertSizeOption, deleteSizeOption,
      customers, setCustomers, upsertCustomer, addCustomerNote,
      adminUsers, setAdminUsers, upsertAdminUser, deleteAdminUser, roles, setRoles, upsertRole,
      auditLogs, logAudit, productionStaff, setProductionStaff, productionTimelineRules, setProductionTimelineRules,
      deliveryZones, setDeliveryZones, upsertDeliveryZone, deleteDeliveryZone,
      paymentProviders, setPaymentProviders, refunds, setRefunds, requestRefund, updateRefundStatus,
      coupons, setCoupons, upsertCoupon, deleteCoupon, giftCards, setGiftCards, upsertGiftCard,
      reviews, setReviews, updateReviewStatus, toggleReviewFeatured, respondToReview, deleteReview,
      notificationTriggers, setNotificationTriggers, notificationLog,
      emailTemplates, setEmailTemplates, upsertEmailTemplate,
      cmsPages, setCmsPages, upsertCmsPage, deleteCmsPage, faqs, setFaqs, upsertFaq, deleteFaq,
      testimonials, setTestimonials, upsertTestimonial, deleteTestimonial,
      blogPosts, setBlogPosts, upsertBlogPost, deleteBlogPost, banners, setBanners, upsertBanner, deleteBanner,
      navigationItems, setNavigationItems, homepageSections, setHomepageSections,
      mediaAssets, setMediaAssets, uploadMediaAsset, addExternalMediaAsset, deleteMediaAsset, systemSettings, setSystemSettings,
      productionSettings, setProductionSettings, healthChecks,
    ]
  );

  return <AdminStoreContext.Provider value={value}>{children}</AdminStoreContext.Provider>;
}

export function useAdminStore() {
  const ctx = useContext(AdminStoreContext);
  if (!ctx) throw new Error("useAdminStore must be used within AdminStoreProvider");
  return ctx;
}
