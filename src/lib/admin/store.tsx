"use client";

// AdminStoreProvider — the single source of truth for everything the admin
// dashboard manages *except* orders (which stay in `@/lib/orders-context`,
// shared with the storefront checkout flow that already writes there).
//
// Every slice below follows the same shape the rest of this app already
// uses for client state: seed from a constant, hydrate from localStorage on
// mount, persist on change. That means swapping to a real backend later is a
// local change per hook (replace the `usePersistentState` call with a
// query/mutation) — no consumer needs to change, because the public
// `useAdminStore()` surface stays the same.
//
// This provider wraps the WHOLE app (see `src/app/layout.tsx`), not just
// `/admin` — that's what makes admin edits visible on the storefront: both
// read the same context.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  categories as seedCategories,
  collections as seedCollections,
  colorSwatches as seedColorSwatches,
  customizationGroups as seedCustomizationGroups,
  defaultProductionSettings,
  fabrics as seedFabrics,
  measurementFieldDefs as seedMeasurementFieldDefs,
  products as seedProducts,
  sizeOptions as seedSizeOptions,
} from "@/lib/mock-data";
import type { Category, Collection, ColorSwatch, CustomizationGroup, Fabric, MeasurementFieldDef, Product, ProductionSettings, SizeOption } from "@/lib/types";
import * as seed from "./seed-data";
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

function usePersistentState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(initial);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating from localStorage on mount
      if (raw) setState(JSON.parse(raw));
    } catch {
      // ignore corrupt storage, fall back to seed
    } finally {
      setIsReady(true);
    }
  }, [key]);

  useEffect(() => {
    if (isReady) localStorage.setItem(key, JSON.stringify(state));
  }, [key, state, isReady]);

  return [state, setState, isReady] as const;
}

function genId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
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
  logNotification: (entry: Omit<NotificationLogEntry, "id" | "date">) => void;

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
  addMediaAsset: (a: Omit<MediaAsset, "id" | "uploadedAt">) => void;
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

export function AdminStoreProvider({ children }: { children: React.ReactNode }) {
  // "products.v2" (not the shared ".v1" the rest of this file uses) because
  // the catalog seed picked up fields — customizable, publishStatus, gender —
  // that a browser holding an older cached copy of `seedProducts` under the
  // old key won't have. Without this version bump those browsers keep
  // resolving `p.customizable` / `p.publishStatus` / `p.gender` to
  // `undefined` forever, which is what silently emptied the Made-to-Measure
  // and Unisex pages: stale cache masking the current seed, not a filter bug.
  // Bump this again any time a `Product` field is added that older cached
  // records won't have and shouldn't silently fall back to `undefined` for.
  const [products, setProducts, r1] = usePersistentState<Product[]>("momen.admin.products.v2", seedProducts);
  const [collections, setCollections, r2] = usePersistentState<Collection[]>(K("collections"), seedCollections);
  const [categories, setCategories, r3] = usePersistentState<Category[]>(K("categories"), seedCategories);
  const [customizationGroups, setCustomizationGroups, r20] = usePersistentState<CustomizationGroup[]>(K("customization-groups"), seedCustomizationGroups);
  const [measurementFieldDefs, setMeasurementFieldDefs, r21] = usePersistentState<MeasurementFieldDef[]>(K("measurement-fields"), seedMeasurementFieldDefs);
  const [fabrics, setFabrics, r31] = usePersistentState<Fabric[]>(K("fabrics"), seedFabrics);
  const [colorSwatches, setColorSwatches, r32] = usePersistentState<ColorSwatch[]>(K("color-swatches"), seedColorSwatches);
  const [sizeOptions, setSizeOptions, r33] = usePersistentState<SizeOption[]>(K("size-options"), seedSizeOptions);

  // Also bumped to v2, for the same reason as "products.v2" above: seeded
  // customers picked up `demoPassword`/`lastLoginAt` for storefront login
  // (see `customer-auth-context.tsx`) that an older cached copy won't have.
  const [customers, setCustomers, r4] = usePersistentState<Customer[]>("momen.admin.customers.v2", seed.customers);
  const [adminUsers, setAdminUsers, r5] = usePersistentState<AdminUser[]>(K("admin-users"), seed.adminUsers);
  const [roles, setRoles, r22] = usePersistentState<Role[]>(K("roles"), seed.roles);
  const [auditLogs, setAuditLogs, r6] = usePersistentState<AuditLogEntry[]>(K("audit-logs"), seed.auditLogs);

  const [productionStaff, setProductionStaff, r23] = usePersistentState<ProductionStaff[]>(K("production-staff"), seed.productionStaff);
  const [productionTimelineRules, setProductionTimelineRules, r24] = usePersistentState<ProductionTimelineRule[]>(K("production-timeline-rules"), seed.productionTimelineRules);
  const [deliveryZones, setDeliveryZones, r7] = usePersistentState<DeliveryZone[]>(K("delivery-zones"), seed.deliveryZones);

  const [paymentProviders, setPaymentProviders, r25] = usePersistentState<PaymentProviderConfig[]>(K("payment-providers"), seed.paymentProviders);
  const [refunds, setRefunds, r8] = usePersistentState<Refund[]>(K("refunds"), []);

  const [coupons, setCoupons, r9] = usePersistentState<Coupon[]>(K("coupons"), seed.coupons);
  const [giftCards, setGiftCards, r10] = usePersistentState<GiftCard[]>(K("gift-cards"), seed.giftCards);

  const [reviews, setReviews, r11] = usePersistentState<Review[]>(K("reviews"), seed.reviews);

  const [notificationTriggers, setNotificationTriggers, r26] = usePersistentState<NotificationTrigger[]>(K("notification-triggers"), seed.notificationTriggers);
  const [notificationLog, setNotificationLog, r27] = usePersistentState<NotificationLogEntry[]>(K("notification-log"), []);
  const [emailTemplates, setEmailTemplates, r12] = usePersistentState<EmailTemplate[]>(K("email-templates"), seed.emailTemplates);

  const [cmsPages, setCmsPages, r13] = usePersistentState<CMSPage[]>(K("cms-pages"), seed.cmsPages);
  const [faqs, setFaqs, r14] = usePersistentState<FAQItem[]>(K("faqs"), seed.faqs);
  const [testimonials, setTestimonials, r15] = usePersistentState<Testimonial[]>(K("testimonials"), seed.testimonials);
  const [blogPosts, setBlogPosts, r16] = usePersistentState<BlogPost[]>(K("blog-posts"), seed.blogPosts);
  const [banners, setBanners, r17] = usePersistentState<Banner[]>(K("banners"), seed.banners);
  const [navigationItems, setNavigationItems, r28] = usePersistentState<NavigationItem[]>(K("navigation"), seed.navigationItems);
  const [homepageSections, setHomepageSections, r18] = usePersistentState<HomepageSection[]>(K("homepage-sections"), seed.homepageSections);
  const [mediaAssets, setMediaAssets, r19] = usePersistentState<MediaAsset[]>(K("media-assets"), seed.mediaAssets);

  const [systemSettings, setSystemSettings, r29] = usePersistentState<SystemSettings>(K("system-settings"), seed.defaultSystemSettings);
  const [productionSettings, setProductionSettings, r30] = usePersistentState<ProductionSettings>(K("production-settings"), defaultProductionSettings);

  const isReady = [
    r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19,
    r20, r21, r22, r23, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33,
  ].every(Boolean);

  const upsertFabric = useCallback((f: Fabric) => {
    setFabrics((prev) => (prev.some((x) => x.id === f.id) ? prev.map((x) => (x.id === f.id ? f : x)) : [f, ...prev]));
  }, [setFabrics]);
  const deleteFabric = useCallback((id: string) => setFabrics((prev) => prev.filter((x) => x.id !== id)), [setFabrics]);

  const upsertColorSwatch = useCallback((c: ColorSwatch) => {
    setColorSwatches((prev) => (prev.some((x) => x.id === c.id) ? prev.map((x) => (x.id === c.id ? c : x)) : [c, ...prev]));
  }, [setColorSwatches]);
  const deleteColorSwatch = useCallback((id: string) => setColorSwatches((prev) => prev.filter((x) => x.id !== id)), [setColorSwatches]);

  const upsertSizeOption = useCallback((s: SizeOption) => {
    setSizeOptions((prev) => (prev.some((x) => x.id === s.id) ? prev.map((x) => (x.id === s.id ? s : x)) : [...prev, s]));
  }, [setSizeOptions]);
  const deleteSizeOption = useCallback((id: string) => setSizeOptions((prev) => prev.filter((x) => x.id !== id)), [setSizeOptions]);

  const upsertCustomizationGroup = useCallback((g: CustomizationGroup) => {
    setCustomizationGroups((prev) => (prev.some((x) => x.id === g.id) ? prev.map((x) => (x.id === g.id ? g : x)) : [...prev, g]));
  }, [setCustomizationGroups]);
  const deleteCustomizationGroup = useCallback((id: string) => setCustomizationGroups((prev) => prev.filter((x) => x.id !== id)), [setCustomizationGroups]);

  const upsertProduct = useCallback((p: Product) => {
    setProducts((prev) => (prev.some((x) => x.id === p.id) ? prev.map((x) => (x.id === p.id ? p : x)) : [p, ...prev]));
  }, [setProducts]);
  const deleteProduct = useCallback((id: string) => setProducts((prev) => prev.filter((x) => x.id !== id)), [setProducts]);
  const bulkUpdateProducts = useCallback((ids: string[], patch: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p)));
  }, [setProducts]);

  const upsertCollection = useCallback((c: Collection) => {
    setCollections((prev) => (prev.some((x) => x.id === c.id) ? prev.map((x) => (x.id === c.id ? c : x)) : [c, ...prev]));
  }, [setCollections]);
  const deleteCollection = useCallback((id: string) => setCollections((prev) => prev.filter((x) => x.id !== id)), [setCollections]);

  const upsertCategory = useCallback((c: Category) => {
    setCategories((prev) => (prev.some((x) => x.id === c.id) ? prev.map((x) => (x.id === c.id ? c : x)) : [c, ...prev]));
  }, [setCategories]);
  const deleteCategory = useCallback((id: string) => setCategories((prev) => prev.filter((x) => x.id !== id)), [setCategories]);

  const upsertCustomer = useCallback((c: Customer) => {
    setCustomers((prev) => (prev.some((x) => x.id === c.id) ? prev.map((x) => (x.id === c.id ? c : x)) : [c, ...prev]));
  }, [setCustomers]);
  const addCustomerNote = useCallback((customerId: string, author: string, message: string) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, notes: [{ id: genId("note"), author, message, date: new Date().toISOString() }, ...c.notes] } : c))
    );
  }, [setCustomers]);

  const upsertAdminUser = useCallback((u: AdminUser) => {
    setAdminUsers((prev) => (prev.some((x) => x.id === u.id) ? prev.map((x) => (x.id === u.id ? u : x)) : [u, ...prev]));
  }, [setAdminUsers]);
  const deleteAdminUser = useCallback((id: string) => setAdminUsers((prev) => prev.filter((x) => x.id !== id)), [setAdminUsers]);

  const upsertRole = useCallback((r: Role) => {
    setRoles((prev) => (prev.some((x) => x.id === r.id) ? prev.map((x) => (x.id === r.id ? r : x)) : [r, ...prev]));
  }, [setRoles]);

  const logAudit = useCallback((entry: Omit<AuditLogEntry, "id" | "date">) => {
    setAuditLogs((prev) => [{ ...entry, id: genId("log"), date: new Date().toISOString() }, ...prev].slice(0, 500));
  }, [setAuditLogs]);

  const upsertDeliveryZone = useCallback((z: DeliveryZone) => {
    setDeliveryZones((prev) => (prev.some((x) => x.id === z.id) ? prev.map((x) => (x.id === z.id ? z : x)) : [z, ...prev]));
  }, [setDeliveryZones]);
  const deleteDeliveryZone = useCallback((id: string) => setDeliveryZones((prev) => prev.filter((x) => x.id !== id)), [setDeliveryZones]);

  const requestRefund = useCallback((r: Omit<Refund, "id" | "status" | "requestedAt">) => {
    setRefunds((prev) => [{ ...r, id: genId("rf"), status: "requested", requestedAt: new Date().toISOString() }, ...prev]);
  }, [setRefunds]);
  const updateRefundStatus = useCallback((id: string, status: Refund["status"], by: string) => {
    setRefunds((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status, processedAt: status === "processed" || status === "approved" || status === "rejected" ? new Date().toISOString() : r.processedAt, processedBy: by } : r
      )
    );
  }, [setRefunds]);

  const upsertCoupon = useCallback((c: Coupon) => {
    setCoupons((prev) => (prev.some((x) => x.id === c.id) ? prev.map((x) => (x.id === c.id ? c : x)) : [c, ...prev]));
  }, [setCoupons]);
  const deleteCoupon = useCallback((id: string) => setCoupons((prev) => prev.filter((x) => x.id !== id)), [setCoupons]);

  const upsertGiftCard = useCallback((g: GiftCard) => {
    setGiftCards((prev) => (prev.some((x) => x.id === g.id) ? prev.map((x) => (x.id === g.id ? g : x)) : [g, ...prev]));
  }, [setGiftCards]);

  const updateReviewStatus = useCallback((id: string, status: Review["status"]) => {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }, [setReviews]);
  const toggleReviewFeatured = useCallback((id: string) => {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, featured: !r.featured } : r)));
  }, [setReviews]);
  const respondToReview = useCallback((id: string, message: string) => {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, response: { message, date: new Date().toISOString() } } : r)));
  }, [setReviews]);
  const deleteReview = useCallback((id: string) => setReviews((prev) => prev.filter((r) => r.id !== id)), [setReviews]);

  const logNotification = useCallback((entry: Omit<NotificationLogEntry, "id" | "date">) => {
    setNotificationLog((prev) => [{ ...entry, id: genId("notif"), date: new Date().toISOString() }, ...prev].slice(0, 300));
  }, [setNotificationLog]);
  const upsertEmailTemplate = useCallback((t: EmailTemplate) => {
    setEmailTemplates((prev) => prev.map((x) => (x.id === t.id ? { ...t, updatedAt: new Date().toISOString() } : x)));
  }, [setEmailTemplates]);

  const upsertCmsPage = useCallback((p: CMSPage) => {
    setCmsPages((prev) => (prev.some((x) => x.id === p.id) ? prev.map((x) => (x.id === p.id ? p : x)) : [p, ...prev]));
  }, [setCmsPages]);
  const deleteCmsPage = useCallback((id: string) => setCmsPages((prev) => prev.filter((x) => x.id !== id)), [setCmsPages]);

  const upsertFaq = useCallback((f: FAQItem) => {
    setFaqs((prev) => (prev.some((x) => x.id === f.id) ? prev.map((x) => (x.id === f.id ? f : x)) : [f, ...prev]));
  }, [setFaqs]);
  const deleteFaq = useCallback((id: string) => setFaqs((prev) => prev.filter((x) => x.id !== id)), [setFaqs]);

  const upsertTestimonial = useCallback((t: Testimonial) => {
    setTestimonials((prev) => (prev.some((x) => x.id === t.id) ? prev.map((x) => (x.id === t.id ? t : x)) : [t, ...prev]));
  }, [setTestimonials]);
  const deleteTestimonial = useCallback((id: string) => setTestimonials((prev) => prev.filter((x) => x.id !== id)), [setTestimonials]);

  const upsertBlogPost = useCallback((b: BlogPost) => {
    setBlogPosts((prev) => (prev.some((x) => x.id === b.id) ? prev.map((x) => (x.id === b.id ? b : x)) : [b, ...prev]));
  }, [setBlogPosts]);
  const deleteBlogPost = useCallback((id: string) => setBlogPosts((prev) => prev.filter((x) => x.id !== id)), [setBlogPosts]);

  const upsertBanner = useCallback((b: Banner) => {
    setBanners((prev) => (prev.some((x) => x.id === b.id) ? prev.map((x) => (x.id === b.id ? b : x)) : [b, ...prev]));
  }, [setBanners]);
  const deleteBanner = useCallback((id: string) => setBanners((prev) => prev.filter((x) => x.id !== id)), [setBanners]);

  const addMediaAsset = useCallback((a: Omit<MediaAsset, "id" | "uploadedAt">) => {
    setMediaAssets((prev) => [{ ...a, id: genId("media"), uploadedAt: new Date().toISOString() }, ...prev]);
  }, [setMediaAssets]);
  const deleteMediaAsset = useCallback((id: string) => setMediaAssets((prev) => prev.filter((x) => x.id !== id)), [setMediaAssets]);

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
      notificationLog, logNotification,
      emailTemplates, setEmailTemplates, upsertEmailTemplate,
      cmsPages, setCmsPages, upsertCmsPage, deleteCmsPage,
      faqs, setFaqs, upsertFaq, deleteFaq,
      testimonials, setTestimonials, upsertTestimonial, deleteTestimonial,
      blogPosts, setBlogPosts, upsertBlogPost, deleteBlogPost,
      banners, setBanners, upsertBanner, deleteBanner,
      navigationItems, setNavigationItems,
      homepageSections, setHomepageSections,
      mediaAssets, setMediaAssets, addMediaAsset, deleteMediaAsset,
      systemSettings, setSystemSettings,
      productionSettings, setProductionSettings,
      systemHealthChecks: seed.systemHealthChecks,
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
      notificationTriggers, setNotificationTriggers, notificationLog, logNotification,
      emailTemplates, setEmailTemplates, upsertEmailTemplate,
      cmsPages, setCmsPages, upsertCmsPage, deleteCmsPage, faqs, setFaqs, upsertFaq, deleteFaq,
      testimonials, setTestimonials, upsertTestimonial, deleteTestimonial,
      blogPosts, setBlogPosts, upsertBlogPost, deleteBlogPost, banners, setBanners, upsertBanner, deleteBanner,
      navigationItems, setNavigationItems, homepageSections, setHomepageSections,
      mediaAssets, setMediaAssets, addMediaAsset, deleteMediaAsset, systemSettings, setSystemSettings,
      productionSettings, setProductionSettings,
    ]
  );

  return <AdminStoreContext.Provider value={value}>{children}</AdminStoreContext.Provider>;
}

export function useAdminStore() {
  const ctx = useContext(AdminStoreContext);
  if (!ctx) throw new Error("useAdminStore must be used within AdminStoreProvider");
  return ctx;
}
