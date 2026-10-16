export type ProductionType = "ready-to-wear" | "made-to-measure";

/** Broader admin-facing product type — richer than the binary `productionType`,
 * which is kept for backward-compat with existing measurement-trigger logic
 * and is derived from this. */
export type ProductType = "ready-to-wear" | "made-to-measure" | "customizable" | "accessory";

export type Gender = "men" | "unisex" | "women";

/** Whether a product is sold in fixed sizes, cut to measurement, or both. */
export type SizingMode = "standard" | "made-to-measure" | "both" | "one-size";

/** Measurement "families" — what a garment needs measured is driven by which
 * family it belongs to, configured per product/category by the admin. */
export type Garment = "top" | "trouser" | "set" | "agbada" | "accessory";

export interface ProductColor {
  name: string;
  hex: string;
  /** Gallery shown when this colour is selected (falls back to `images`). */
  images?: string[];
}

export type PublishStatus = "draft" | "scheduled" | "published" | "archived";

export interface SEO {
  title?: string;
  description?: string;
  slug?: string;
  canonicalUrl?: string;
  ogImage?: string;
  socialTitle?: string;
  socialDescription?: string;
  noIndex?: boolean;
}

/** A reusable, admin-defined customization option group (e.g. "Sleeve Style"). */
export interface CustomizationChoice {
  id: string;
  label: string;
  description?: string;
  image?: string;
  additionalCost: number;
  available: boolean;
  sortOrder: number;
}

export interface CustomizationGroup {
  id: string;
  name: string;
  description?: string;
  choices: CustomizationChoice[];
}

/** Per-product enablement of a global customization group. */
export interface ProductCustomization {
  groupId: string;
  enabled: boolean;
  required: boolean;
}

/** Admin-configurable fabric library entry, selectable during made-to-measure
 * customization (Section 15 — Fabric). */
export interface Fabric {
  id: string;
  name: string;
  category: string; // "Cotton" | "Linen" | "Wool" | "Senator" | "Ankara" | "Aso-Oke" | "Other" (free text, admin-managed)
  image: string;
  description: string;
  additionalCost: number;
  available: boolean;
  sortOrder: number;
}

/** Predefined colour library used for primary/secondary/contrast selection —
 * a native colour picker is also offered alongside these swatches. Centralized
 * so a colour is only ever defined once, never redefined per product. */
export interface ColorSwatch {
  id: string;
  name: string;
  hex: string;
  sortOrder: number;
}

/** Admin-managed canonical size label (Section 13) — products reference these
 * by label rather than each re-typing "XS/S/M/L…" freehand, though free-text
 * entry (shoe sizes, "One Size", numeric waists) is still supported per
 * product for garments that don't use the standard run. */
export interface SizeOption {
  id: string;
  label: string;
  sortOrder: number;
  active: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  sku: string;
  category: string;
  collectionSlugs: string[];
  tags: string[];
  price: number;
  compareAtPrice?: number;
  salePrice?: number;
  currency: "NGN";
  images: string[];
  hoverImage?: string;
  videos?: string[];
  /** Ordered frames for the 360° viewer. */
  spinImages?: string[];
  /** Units available per size, for sizes tracked individually. */
  sizeStock?: Record<string, number>;
  /** Raw per-size stock counts (admin editing). */
  sizeInventory?: Record<string, number>;
  colors: ProductColor[];
  sizes: string[];
  productionType: ProductionType;
  productType: ProductType;
  gender: Gender;
  sizingMode: SizingMode;
  garment: Garment;
  fabric: string;
  fabricIds?: string[];
  description: string;
  shortDescription?: string;
  details: string[];
  careInstructions: string[];
  productionDays: { standard: [number, number]; express: [number, number] };
  isNew?: boolean;
  isFeatured?: boolean;
  isSignature?: boolean;
  stock: "in-stock" | "low-stock" | "made-to-order" | "out-of-stock";
  stockQuantity: number;
  lowStockThreshold: number;
  reservedQuantity?: number;
  publishStatus: PublishStatus;
  publishAt?: string;
  expressEligible: boolean;
  customization: ProductCustomization[];
  measurementFieldKeys?: MeasurementField[];
  /** Enables the full multi-step customization wizard (design → customize →
   * measurements → preferences → review) rather than a simple measurement
   * capture on the product page. */
  customizable: boolean;
  referenceImagesAllowed: boolean;
  specialInstructionsAllowed: boolean;
  /** Accessory category slugs to suggest under "Complete the Look". */
  crossSellCategorySlugs?: string[];
  /** Simple admin-authored size guide (HTML/text), shown on the storefront
   * product page. Configurable per product rather than hardcoded. */
  sizeChart?: string;
  seo: SEO;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  heroVideo?: string;
  tag?: string;
  productSlugs?: string[];
  publishStatus: PublishStatus;
  expressEligible: boolean;
  sortOrder: number;
  seo: SEO;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description?: string;
  image?: string;
  parentId?: string;
  sortOrder: number;
  publishStatus: PublishStatus;
  seo: SEO;
}

export type MeasurementField =
  | "chest"
  | "neck"
  | "waist"
  | "hip"
  | "shoulder"
  | "sleeveLength"
  | "bicep"
  | "armhole"
  | "wrist"
  | "length"
  | "thigh"
  | "knee"
  | "inseam"
  | "outseam"
  | "trouserLength"
  | "height"
  | (string & {});

export type MeasurementUnit = "cm" | "in";

export type MeasurementValues = Partial<Record<MeasurementField, number>>;

/** Admin-configurable definition of a single measurement input. */
export interface MeasurementFieldDef {
  key: MeasurementField;
  label: string;
  description?: string;
  instructions?: string;
  commonMistakes?: string;
  illustration?: string;
  videoUrl?: string;
  unit: MeasurementUnit;
  required: boolean;
  garments: Garment[];
  sortOrder: number;
  /** Reasonable range in cm, used to warn (not block) on unusual values. */
  minCm?: number;
  maxCm?: number;
}

export interface MeasurementHistoryEntry {
  values: MeasurementValues;
  unit: MeasurementUnit;
  changedAt: string;
  changedBy: string;
}

export interface MeasurementProfile {
  id: string;
  customerId?: string;
  label: string;
  unit: MeasurementUnit;
  values: MeasurementValues;
  updatedAt: string;
  createdAt?: string;
  history?: MeasurementHistoryEntry[];
}

export interface CartMeasurement {
  mode: "profile" | "manual" | "pending";
  profileId?: string;
  values?: MeasurementValues;
  unit: MeasurementUnit;
}

/** Everything captured by the advanced Made-to-Measure wizard beyond size/
 * colour/quantity — fabric, colourway, reference images, and freeform notes. */
export interface CustomOrderDetails {
  fabricId?: string;
  primaryColor?: string;
  secondaryColor?: string;
  contrastColor?: string;
  referenceImages?: string[];
  referenceNotes?: string;
  specialInstructions?: string;
}

export interface CartItem {
  id: string;
  product: Product;
  size: string;
  color: string;
  quantity: number;
  measurement?: CartMeasurement;
  /** How a made-to-measure piece is cut: a standard size from the size guide
   * (no measurements needed) or to the customer's measurements. */
  fit?: "standard" | "measure";
  customizations?: Record<string, string>; // groupId -> choiceId
  customOrder?: CustomOrderDetails;
  customizationCost?: number;
}

export type ProductionSpeed = "standard" | "express";

export type OrderStage =
  | "Order Placed"
  | "Payment Confirmed"
  | "Customization Review"
  | "Awaiting Measurements"
  | "Measurements Confirmed"
  | "Production Queue"
  | "In Production"
  | "Quality Check"
  | "Ready for Dispatch"
  | "Shipped"
  | "Delivered";

/** Exception statuses that sit outside the linear fulfillment timeline. */
export type OrderExceptionStatus =
  | "Payment Failed"
  | "Cancelled"
  | "Refund Requested"
  | "Refunded"
  | "Partially Refunded"
  | "On Hold"
  | "Awaiting Customer Response";

export type OrderStatus = OrderStage | OrderExceptionStatus;

export interface OrderTimelineEntry {
  stage: OrderStage;
  date: string;
  message?: string;
  complete: boolean;
}

export interface OrderNote {
  id: string;
  author: string;
  message: string;
  date: string;
}

export interface OrderProductionInfo {
  assignedStaffId?: string;
  priority: number; // higher = more urgent; express orders auto-boosted
  startDate?: string;
  expectedCompletionDate?: string;
  actualCompletionDate?: string;
  notes: OrderNote[];
}

/** Approval workflow for orders containing a custom order that goes beyond
 * the standard configured options — reference images and/or special
 * instructions:
 *   Submitted → Under Review → Approved → Awaiting Customer Confirmation
 *   → Confirmed (production proceeds), with Clarification Requested /
 *   Rejected as exits along the way. */
export type CustomizationApprovalStatus =
  | "not_applicable"
  | "submitted"
  | "under_review"
  | "approved"
  | "awaiting_customer_confirmation"
  | "confirmed"
  | "clarification_requested"
  | "rejected";

export interface Order {
  id: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  expressFee: number;
  discount: number;
  couponCode?: string;
  total: number;
  productionSpeed: ProductionSpeed;
  deliveryMethod?: "delivery" | "pickup";
  estimatedCompletion: string;
  estimatedDelivery: string;
  paymentStatus: "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
  paymentMethod?: "card" | "transfer" | "gift-card" | "cod";
  paymentProvider?: string;
  transactionId?: string;
  address: Address;
  timeline: OrderTimelineEntry[];
  status?: OrderStatus;
  customerId?: string;
  customerEmail?: string;
  internalNotes?: OrderNote[];
  customerNotes?: OrderNote[];
  production?: OrderProductionInfo;
  cancelledAt?: string;
  cancelledReason?: string;
  channel?: "web" | "admin" | "phone";
  customizationStatus?: CustomizationApprovalStatus;
}

export interface Address {
  fullName: string;
  country: string;
  state: string;
  city: string;
  address: string;
  apartment?: string;
  postalCode: string;
  phone: string;
}

export interface ProductionSettings {
  standardDays: [number, number];
  expressDays: [number, number];
  standardFee: number;
  expressFee: number;
  regions: string[];
}
