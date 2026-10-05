-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PermissionResource" AS ENUM ('dashboard', 'orders', 'products', 'collections', 'inventory', 'customers', 'measurements', 'payments', 'refunds', 'production', 'delivery', 'promotions', 'reviews', 'content', 'notifications', 'analytics', 'reports', 'settings', 'admin_users', 'audit_logs');

-- CreateEnum
CREATE TYPE "PermissionAction" AS ENUM ('view', 'create', 'edit', 'delete', 'approve', 'export', 'refund', 'publish');

-- CreateEnum
CREATE TYPE "AdminUserStatus" AS ENUM ('active', 'disabled', 'invited');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('active', 'vip', 'disabled');

-- CreateEnum
CREATE TYPE "ProductionType" AS ENUM ('ready-to-wear', 'made-to-measure');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('ready-to-wear', 'made-to-measure', 'customizable', 'accessory');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('men', 'unisex');

-- CreateEnum
CREATE TYPE "SizingMode" AS ENUM ('standard', 'made-to-measure', 'both', 'one-size');

-- CreateEnum
CREATE TYPE "Garment" AS ENUM ('top', 'trouser', 'set', 'agbada', 'accessory');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('draft', 'scheduled', 'published', 'archived');

-- CreateEnum
CREATE TYPE "MeasurementUnit" AS ENUM ('cm', 'in');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('Order Placed', 'Payment Confirmed', 'Customization Review', 'Awaiting Measurements', 'Measurements Confirmed', 'Production Queue', 'In Production', 'Quality Check', 'Ready for Dispatch', 'Shipped', 'Delivered', 'Payment Failed', 'Cancelled', 'Refund Requested', 'Refunded', 'Partially Refunded', 'On Hold', 'Awaiting Customer Response');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded', 'partially_refunded');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('card', 'transfer', 'gift-card', 'cod');

-- CreateEnum
CREATE TYPE "ProductionSpeed" AS ENUM ('standard', 'express');

-- CreateEnum
CREATE TYPE "OrderChannel" AS ENUM ('web', 'admin', 'phone');

-- CreateEnum
CREATE TYPE "CustomizationApprovalStatus" AS ENUM ('not_applicable', 'submitted', 'under_review', 'approved', 'awaiting_customer_confirmation', 'confirmed', 'clarification_requested', 'rejected');

-- CreateEnum
CREATE TYPE "NoteAudience" AS ENUM ('internal', 'customer');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ProductionStaffStatus" AS ENUM ('active', 'on-leave', 'inactive');

-- CreateEnum
CREATE TYPE "TimelineRuleScope" AS ENUM ('global', 'product', 'collection', 'garment', 'country');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('paystack', 'flutterwave', 'stripe', 'bank-transfer');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('requested', 'approved', 'rejected', 'processed');

-- CreateEnum
CREATE TYPE "RefundType" AS ENUM ('full', 'partial');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'fixed');

-- CreateEnum
CREATE TYPE "PromotionScope" AS ENUM ('all', 'product', 'collection', 'first-order', 'customer');

-- CreateEnum
CREATE TYPE "GiftCardStatus" AS ENUM ('active', 'redeemed', 'expired', 'disabled');

-- CreateEnum
CREATE TYPE "MediaAssetType" AS ENUM ('image', 'video');

-- CreateEnum
CREATE TYPE "BannerPlacement" AS ENUM ('homepage-top', 'homepage-promo', 'shop-top', 'sitewide');

-- CreateEnum
CREATE TYPE "HomepageSectionType" AS ENUM ('hero', 'featured-categories', 'featured-collections', 'featured-products', 'signature', 'made-to-measure-promo', 'how-it-works', 'promo-banner', 'testimonials', 'newsletter', 'brand-story');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('email', 'in-app', 'sms');

-- CreateEnum
CREATE TYPE "NotificationEvent" AS ENUM ('order_placed', 'payment_successful', 'payment_failed', 'measurements_submitted', 'order_in_production', 'production_completed', 'order_shipped', 'order_delivered', 'refund_processed', 'account_created', 'customization_clarification_requested');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('sent', 'failed', 'queued');

-- CreateEnum
CREATE TYPE "ContactMessageStatus" AS ENUM ('new', 'in_progress', 'resolved');

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "resource" "PermissionResource" NOT NULL,
    "action" "PermissionAction" NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "passwordHash" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "status" "AdminUserStatus" NOT NULL DEFAULT 'invited',
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminRefreshToken" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminRefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminPasswordReset" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminPasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'active',
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAddress" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "apartment" TEXT,
    "postalCode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerNote" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerSocialAccount" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerSocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerRefreshToken" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerRefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerPasswordReset" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerPasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "publishStatus" "PublishStatus" NOT NULL DEFAULT 'draft',
    "seo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "heroVideo" TEXT,
    "tag" TEXT,
    "publishStatus" "PublishStatus" NOT NULL DEFAULT 'draft',
    "expressEligible" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "seo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCollection" (
    "productId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,

    CONSTRAINT "ProductCollection_pkey" PRIMARY KEY ("productId","collectionId")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTag" (
    "productId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ProductTag_pkey" PRIMARY KEY ("productId","tagId")
);

-- CreateTable
CREATE TABLE "SizeOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SizeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSize" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sizeOptionId" TEXT,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductSize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColorSwatch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hex" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ColorSwatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductColorVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hex" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductColorVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fabric" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "additionalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Fabric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductFabric" (
    "productId" TEXT NOT NULL,
    "fabricId" TEXT NOT NULL,

    CONSTRAINT "ProductFabric_pkey" PRIMARY KEY ("productId","fabricId")
);

-- CreateTable
CREATE TABLE "CustomizationGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "CustomizationGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomizationChoice" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "additionalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CustomizationChoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCustomization" (
    "productId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "required" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProductCustomization_pkey" PRIMARY KEY ("productId","groupId")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "compareAtPrice" DECIMAL(12,2),
    "salePrice" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "images" TEXT[],
    "hoverImage" TEXT,
    "videos" TEXT[],
    "productionType" "ProductionType" NOT NULL,
    "productType" "ProductType" NOT NULL,
    "gender" "Gender" NOT NULL,
    "sizingMode" "SizingMode" NOT NULL,
    "garment" "Garment" NOT NULL,
    "description" TEXT NOT NULL,
    "shortDescription" TEXT,
    "details" TEXT[],
    "careInstructions" TEXT[],
    "productionDaysStandardMin" INTEGER NOT NULL,
    "productionDaysStandardMax" INTEGER NOT NULL,
    "productionDaysExpressMin" INTEGER NOT NULL,
    "productionDaysExpressMax" INTEGER NOT NULL,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isSignature" BOOLEAN NOT NULL DEFAULT false,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 0,
    "publishStatus" "PublishStatus" NOT NULL DEFAULT 'draft',
    "publishAt" TIMESTAMP(3),
    "expressEligible" BOOLEAN NOT NULL DEFAULT false,
    "customizable" BOOLEAN NOT NULL DEFAULT false,
    "referenceImagesAllowed" BOOLEAN NOT NULL DEFAULT false,
    "specialInstructionsAllowed" BOOLEAN NOT NULL DEFAULT false,
    "crossSellCategorySlugs" TEXT[],
    "sizeChart" TEXT,
    "seo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeasurementFieldDef" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "commonMistakes" TEXT,
    "illustration" TEXT,
    "videoUrl" TEXT,
    "unit" "MeasurementUnit" NOT NULL DEFAULT 'cm',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "garments" "Garment"[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "minCm" DOUBLE PRECISION,
    "maxCm" DOUBLE PRECISION,

    CONSTRAINT "MeasurementFieldDef_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "MeasurementProfile" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "label" TEXT NOT NULL,
    "unit" "MeasurementUnit" NOT NULL,
    "values" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeasurementProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeasurementProfileHistory" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "unit" "MeasurementUnit" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" TEXT,
    "changedByName" TEXT NOT NULL,

    CONSTRAINT "MeasurementProfileHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "customerEmail" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'Order Placed',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "paymentMethod" "PaymentMethod",
    "paymentProvider" TEXT,
    "transactionId" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "deliveryFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "expressFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "couponCode" TEXT,
    "total" DECIMAL(12,2) NOT NULL,
    "productionSpeed" "ProductionSpeed" NOT NULL DEFAULT 'standard',
    "estimatedCompletion" TIMESTAMP(3),
    "estimatedDelivery" TIMESTAMP(3),
    "addressSnapshot" JSONB NOT NULL,
    "channel" "OrderChannel" NOT NULL DEFAULT 'web',
    "customizationStatus" "CustomizationApprovalStatus" NOT NULL DEFAULT 'not_applicable',
    "cancelledAt" TIMESTAMP(3),
    "cancelledReason" TEXT,
    "productionPriority" INTEGER NOT NULL DEFAULT 40,
    "productionStartDate" TIMESTAMP(3),
    "productionExpectedCompletionDate" TIMESTAMP(3),
    "productionActualCompletionDate" TIMESTAMP(3),
    "assignedStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLineItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "productImage" TEXT,
    "sku" TEXT NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "size" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "customizations" JSONB,
    "customizationCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "customOrder" JSONB,
    "measurementMode" TEXT NOT NULL,
    "measurementProfileId" TEXT,
    "measurementValues" JSONB,
    "measurementUnit" "MeasurementUnit",

    CONSTRAINT "OrderLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderTimelineEntry" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "stage" "OrderStatus" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "message" TEXT,
    "complete" BOOLEAN NOT NULL DEFAULT false,
    "actorId" TEXT,
    "actorName" TEXT,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "OrderTimelineEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderNote" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "audience" "NoteAudience" NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "images" TEXT[],
    "status" "ReviewStatus" NOT NULL DEFAULT 'pending',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "responseMessage" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionStaff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "capacityPerWeek" INTEGER NOT NULL,
    "status" "ProductionStaffStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionTimelineRule" (
    "id" TEXT NOT NULL,
    "scope" "TimelineRuleScope" NOT NULL,
    "scopeRef" TEXT,
    "standardDaysMin" INTEGER NOT NULL,
    "standardDaysMax" INTEGER NOT NULL,
    "expressDaysMin" INTEGER NOT NULL,
    "expressDaysMax" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionTimelineRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProviderConfig" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "mode" TEXT NOT NULL DEFAULT 'test',
    "currencies" TEXT[],
    "publicKey" TEXT,
    "secretKey" TEXT,
    "webhookUrl" TEXT,
    "webhookConfigured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerRef" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "PaymentStatus" NOT NULL,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "RefundType" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'requested',
    "requestedById" TEXT,
    "requestedByName" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedById" TEXT,
    "processedByName" TEXT,
    "processedAt" TIMESTAMP(3),
    "internalNotes" TEXT,
    "providerRefundRef" TEXT,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countries" TEXT[],
    "standardFee" DECIMAL(12,2) NOT NULL,
    "expressFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "freeDeliveryThreshold" DECIMAL(12,2),
    "standardDaysMin" INTEGER NOT NULL,
    "standardDaysMax" INTEGER NOT NULL,
    "expressDaysMin" INTEGER NOT NULL,
    "expressDaysMax" INTEGER NOT NULL,
    "expressAvailable" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "DiscountType" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "scope" "PromotionScope" NOT NULL,
    "scopeRefs" TEXT[],
    "minOrderValue" DECIMAL(12,2),
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "perCustomerLimit" INTEGER,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCard" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "initialValue" DECIMAL(12,2) NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "issuedTo" TEXT,
    "purchasedBy" TEXT,
    "status" "GiftCardStatus" NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCardTransaction" (
    "id" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCardTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "MediaAssetType" NOT NULL,
    "folder" TEXT NOT NULL DEFAULT 'uncategorized',
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt" TEXT,
    "uploadedById" TEXT,
    "uploadedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CMSPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'draft',
    "publishAt" TIMESTAMP(3),
    "seo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CMSPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "image" TEXT NOT NULL,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "placement" "BannerPlacement" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "role" TEXT,
    "image" TEXT,
    "rating" INTEGER,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQItem" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FAQItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "coverImage" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'draft',
    "publishAt" TIMESTAMP(3),
    "tags" TEXT[],
    "seo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NavigationItem" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,

    CONSTRAINT "NavigationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomepageSection" (
    "id" TEXT NOT NULL,
    "type" "HomepageSectionType" NOT NULL,
    "label" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "content" JSONB NOT NULL,

    CONSTRAINT "HomepageSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTrigger" (
    "id" TEXT NOT NULL,
    "event" "NotificationEvent" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "channels" "NotificationChannel"[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "emailTemplateId" TEXT,

    CONSTRAINT "NotificationTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "variables" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLogEntry" (
    "id" TEXT NOT NULL,
    "triggerId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLogEntry" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" "PermissionResource",
    "resourceId" TEXT,
    "summary" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "device" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ContactMessageStatus" NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CategoryMeasurementFields" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CategoryMeasurementFields_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProductMeasurementFields" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProductMeasurementFields_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_resource_action_key" ON "RolePermission"("roleId", "resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminRefreshToken_tokenHash_key" ON "AdminRefreshToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "AdminPasswordReset_tokenHash_key" ON "AdminPasswordReset"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSocialAccount_provider_providerAccountId_key" ON "CustomerSocialAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerRefreshToken_tokenHash_key" ON "CustomerRefreshToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPasswordReset_tokenHash_key" ON "CustomerPasswordReset"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SizeOption_label_key" ON "SizeOption"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_publishStatus_idx" ON "Product"("publishStatus");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_customerId_productId_key" ON "WishlistItem"("customerId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionTimelineRule_scope_scopeRef_key" ON "ProductionTimelineRule"("scope", "scopeRef");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProviderConfig_provider_key" ON "PaymentProviderConfig"("provider");

-- CreateIndex
CREATE INDEX "PaymentTransaction_orderId_idx" ON "PaymentTransaction"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_provider_providerRef_key" ON "PaymentTransaction"("provider", "providerRef");

-- CreateIndex
CREATE INDEX "Refund_orderId_idx" ON "Refund"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_orderId_key" ON "CouponRedemption"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_code_key" ON "GiftCard"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CMSPage_slug_key" ON "CMSPage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTrigger_event_key" ON "NotificationTrigger"("event");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_key_key" ON "EmailTemplate"("key");

-- CreateIndex
CREATE INDEX "NotificationLogEntry_triggerId_idx" ON "NotificationLogEntry"("triggerId");

-- CreateIndex
CREATE INDEX "AuditLogEntry_resource_resourceId_idx" ON "AuditLogEntry"("resource", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE INDEX "ContactMessage_status_createdAt_idx" ON "ContactMessage"("status", "createdAt");

-- CreateIndex
CREATE INDEX "_CategoryMeasurementFields_B_index" ON "_CategoryMeasurementFields"("B");

-- CreateIndex
CREATE INDEX "_ProductMeasurementFields_B_index" ON "_ProductMeasurementFields"("B");

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRefreshToken" ADD CONSTRAINT "AdminRefreshToken_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminPasswordReset" ADD CONSTRAINT "AdminPasswordReset_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSocialAccount" ADD CONSTRAINT "CustomerSocialAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRefreshToken" ADD CONSTRAINT "CustomerRefreshToken_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPasswordReset" ADD CONSTRAINT "CustomerPasswordReset_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCollection" ADD CONSTRAINT "ProductCollection_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCollection" ADD CONSTRAINT "ProductCollection_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTag" ADD CONSTRAINT "ProductTag_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTag" ADD CONSTRAINT "ProductTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSize" ADD CONSTRAINT "ProductSize_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSize" ADD CONSTRAINT "ProductSize_sizeOptionId_fkey" FOREIGN KEY ("sizeOptionId") REFERENCES "SizeOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductColorVariant" ADD CONSTRAINT "ProductColorVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFabric" ADD CONSTRAINT "ProductFabric_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFabric" ADD CONSTRAINT "ProductFabric_fabricId_fkey" FOREIGN KEY ("fabricId") REFERENCES "Fabric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomizationChoice" ADD CONSTRAINT "CustomizationChoice_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CustomizationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCustomization" ADD CONSTRAINT "ProductCustomization_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCustomization" ADD CONSTRAINT "ProductCustomization_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CustomizationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeasurementProfile" ADD CONSTRAINT "MeasurementProfile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeasurementProfileHistory" ADD CONSTRAINT "MeasurementProfileHistory_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MeasurementProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "ProductionStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLineItem" ADD CONSTRAINT "OrderLineItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLineItem" ADD CONSTRAINT "OrderLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLineItem" ADD CONSTRAINT "OrderLineItem_measurementProfileId_fkey" FOREIGN KEY ("measurementProfileId") REFERENCES "MeasurementProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTimelineEntry" ADD CONSTRAINT "OrderTimelineEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderNote" ADD CONSTRAINT "OrderNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardTransaction" ADD CONSTRAINT "GiftCardTransaction_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardTransaction" ADD CONSTRAINT "GiftCardTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NavigationItem" ADD CONSTRAINT "NavigationItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "NavigationItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationTrigger" ADD CONSTRAINT "NotificationTrigger_emailTemplateId_fkey" FOREIGN KEY ("emailTemplateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryMeasurementFields" ADD CONSTRAINT "_CategoryMeasurementFields_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryMeasurementFields" ADD CONSTRAINT "_CategoryMeasurementFields_B_fkey" FOREIGN KEY ("B") REFERENCES "MeasurementFieldDef"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductMeasurementFields" ADD CONSTRAINT "_ProductMeasurementFields_A_fkey" FOREIGN KEY ("A") REFERENCES "MeasurementFieldDef"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductMeasurementFields" ADD CONSTRAINT "_ProductMeasurementFields_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
