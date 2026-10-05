// Seed data — mirrors the shape (and, for roles, the exact content) of the
// frontend's demo data in `src/lib/admin/seed-data.ts` and `src/lib/mock-data.ts`,
// so both the storefront and admin dashboard have something realistic to
// develop against from the first `npm run start:dev`.
//
// Run with: npx prisma db seed

import { PrismaClient, PermissionAction, PermissionResource, PublishStatus, NotificationEvent } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ALL_ACTIONS = Object.values(PermissionAction);
const ALL_RESOURCES = Object.values(PermissionResource);

async function seedRoles() {
  const roles: { id: string; name: string; description: string; isSystem: boolean; permissions: Partial<Record<PermissionResource, PermissionAction[]>> }[] = [
    {
      id: 'super-admin',
      name: 'Super Admin',
      description: 'Full access to every module, including admin users and system settings.',
      isSystem: true,
      permissions: Object.fromEntries(ALL_RESOURCES.map((r) => [r, ALL_ACTIONS])),
    },
    {
      id: 'operations-manager',
      name: 'Operations Manager',
      description: 'Orders, production, and delivery — day-to-day fulfillment operations.',
      isSystem: true,
      permissions: {
        dashboard: ['view'],
        orders: ['view', 'create', 'edit', 'export'],
        production: ['view', 'edit', 'export'],
        delivery: ['view', 'edit'],
        customers: ['view'],
        measurements: ['view', 'edit'],
        inventory: ['view', 'edit'],
        reports: ['view', 'export'],
      },
    },
    {
      id: 'product-manager',
      name: 'Product Manager',
      description: 'Products, collections, and inventory.',
      isSystem: true,
      permissions: {
        dashboard: ['view'],
        products: ['view', 'create', 'edit', 'delete', 'publish'],
        collections: ['view', 'create', 'edit', 'delete', 'publish'],
        inventory: ['view', 'edit', 'export'],
        reports: ['view', 'export'],
      },
    },
    {
      id: 'finance',
      name: 'Finance',
      description: 'Payments, refunds, and financial reporting.',
      isSystem: true,
      permissions: {
        dashboard: ['view'],
        payments: ['view', 'export'],
        refunds: ['view', 'approve', 'refund', 'export'],
        orders: ['view'],
        reports: ['view', 'export'],
      },
    },
    {
      id: 'content-manager',
      name: 'Content Manager',
      description: 'Homepage, CMS pages, media library, and blog.',
      isSystem: true,
      permissions: { dashboard: ['view'], content: ['view', 'create', 'edit', 'delete', 'publish'], promotions: ['view', 'edit'] },
    },
    {
      id: 'customer-support',
      name: 'Customer Support',
      description: 'Customers, orders, and measurements — support-facing tools.',
      isSystem: true,
      permissions: {
        dashboard: ['view'],
        customers: ['view', 'edit'],
        orders: ['view', 'edit'],
        measurements: ['view', 'edit'],
        refunds: ['view', 'create'],
      },
    },
    {
      id: 'production-staff',
      name: 'Production Staff',
      description: 'Production orders and measurements only.',
      isSystem: true,
      permissions: { production: ['view', 'edit'], measurements: ['view'], orders: ['view'] },
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      create: {
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        permissions: {
          create: Object.entries(role.permissions).flatMap(([resource, actions]) =>
            (actions ?? []).map((action) => ({ resource: resource as PermissionResource, action })),
          ),
        },
      },
      update: { name: role.name, description: role.description },
    });
  }

  return roles;
}

async function seedSuperAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required to create the initial administrator',
    );
  }
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) return;

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.create({
    data: { name: 'Amaka Eze', email, roleId: 'super-admin', status: 'active', passwordHash },
  });
  console.log(`Seeded super admin: ${email}`);
}

async function seedMeasurementFields() {
  const fields: { key: string; label: string; description: string; garments: ('top' | 'trouser' | 'set' | 'agbada' | 'accessory')[]; sortOrder: number }[] = [
    { key: 'chest', label: 'Chest', description: 'Chest circumference.', garments: ['top', 'set', 'agbada'], sortOrder: 1 },
    { key: 'neck', label: 'Neck', description: 'Neck circumference.', garments: ['top', 'set', 'agbada'], sortOrder: 2 },
    { key: 'shoulder', label: 'Shoulder', description: 'Shoulder-to-shoulder width.', garments: ['top', 'set', 'agbada'], sortOrder: 3 },
    { key: 'sleeveLength', label: 'Sleeve Length', description: 'Shoulder seam to wrist.', garments: ['top', 'set', 'agbada'], sortOrder: 4 },
    { key: 'waist', label: 'Waist', description: 'Waist circumference.', garments: ['trouser', 'set'], sortOrder: 5 },
    { key: 'hip', label: 'Hip', description: 'Hip circumference.', garments: ['trouser', 'set'], sortOrder: 6 },
    { key: 'inseam', label: 'Inseam', description: 'Crotch to ankle.', garments: ['trouser', 'set'], sortOrder: 7 },
    { key: 'length', label: 'Length', description: 'Full garment length, nape to hem.', garments: ['top', 'set', 'agbada'], sortOrder: 8 },
  ];

  for (const field of fields) {
    await prisma.measurementFieldDef.upsert({
      where: { key: field.key },
      create: { key: field.key, label: field.label, description: field.description, garments: field.garments, unit: 'cm', required: true, sortOrder: field.sortOrder },
      update: {},
    });
  }
}

async function seedCatalog() {
  const category = await prisma.category.upsert({
    where: { slug: 'kaftans' },
    create: { slug: 'kaftans', name: 'Kaftans', sortOrder: 1, publishStatus: PublishStatus.published },
    update: {},
  });

  const collection = await prisma.collection.upsert({
    where: { slug: 'heritage' },
    create: {
      slug: 'heritage',
      name: 'Heritage',
      description: 'Traditional silhouettes, modern tailoring.',
      image: 'https://picsum.photos/seed/heritage/1200/1500',
      publishStatus: PublishStatus.published,
      sortOrder: 1,
    },
    update: {},
  });

  const fabric = await prisma.fabric.upsert({
    where: { id: 'fabric-senator-cotton' },
    create: { id: 'fabric-senator-cotton', name: 'Senator Cotton', category: 'Cotton', image: 'https://picsum.photos/seed/fabric1/600/600', description: 'Breathable, structured cotton blend.', additionalCost: 0, available: true, sortOrder: 1 },
    update: {},
  });

  const sizeM = await prisma.sizeOption.upsert({ where: { label: 'M' }, create: { label: 'M', sortOrder: 2, active: true }, update: {} });
  const sizeL = await prisma.sizeOption.upsert({ where: { label: 'L' }, create: { label: 'L', sortOrder: 3, active: true }, update: {} });

  const existingProduct = await prisma.product.findUnique({ where: { slug: 'onyeka-kaftan' } });
  if (!existingProduct) {
    await prisma.product.create({
      data: {
        slug: 'onyeka-kaftan',
        name: 'Onyeka Kaftan',
        sku: 'MOM-KAF-001',
        categoryId: category.id,
        price: 65000,
        images: ['https://picsum.photos/seed/onyeka1/1200/1500'],
        productionType: 'made_to_measure',
        productType: 'made_to_measure',
        gender: 'men',
        sizingMode: 'made_to_measure',
        garment: 'top',
        description: 'A structured kaftan in premium senator cotton, cut to measure.',
        details: ['Senator cotton', 'Hand-finished embroidery', 'Made to measure'],
        careInstructions: ['Dry clean recommended'],
        productionDaysStandardMin: 10,
        productionDaysStandardMax: 14,
        productionDaysExpressMin: 4,
        productionDaysExpressMax: 6,
        stockQuantity: 0,
        lowStockThreshold: 0,
        publishStatus: PublishStatus.published,
        expressEligible: true,
        customizable: true,
        referenceImagesAllowed: true,
        specialInstructionsAllowed: true,
        collections: { create: [{ collectionId: collection.id }] },
        fabrics: { create: [{ fabricId: fabric.id }] },
        sizes: { create: [{ sizeOptionId: sizeM.id, label: 'M', sortOrder: 1 }, { sizeOptionId: sizeL.id, label: 'L', sortOrder: 2 }] },
        colorVariants: { create: [{ name: 'Ivory', hex: '#F4F1EA', sortOrder: 1 }, { name: 'Charcoal', hex: '#36454F', sortOrder: 2 }] },
        measurementFieldDefs: { connect: [{ key: 'chest' }, { key: 'neck' }, { key: 'shoulder' }, { key: 'sleeveLength' }, { key: 'length' }] },
      },
    });
  }
}

async function seedProduction() {
  const existing = await prisma.productionStaff.findFirst({ where: { email: 'chidi.tailor@momen.studio' } });
  if (!existing) {
    await prisma.productionStaff.create({
      data: { name: 'Chidi Nwankwo', role: 'Tailor', email: 'chidi.tailor@momen.studio', capacityPerWeek: 12, status: 'active' },
    });
  }

  const existingGlobalRule = await prisma.productionTimelineRule.findFirst({ where: { scope: 'global' } });
  if (!existingGlobalRule) {
    await prisma.productionTimelineRule.create({
      data: { scope: 'global', scopeRef: null, standardDaysMin: 10, standardDaysMax: 14, expressDaysMin: 4, expressDaysMax: 6 },
    });
  }
}

async function seedPaymentProvider() {
  await prisma.paymentProviderConfig.upsert({
    where: { provider: 'paystack' },
    create: { provider: 'paystack', enabled: true, mode: 'test', currencies: ['NGN'] },
    update: {},
  });
}

async function seedDelivery() {
  // Without at least one zone covering "Nigeria", checkout can't complete
  // for the seeded product at all — DeliveryZonesService.quote rejects any
  // country with no matching zone.
  const existing = await prisma.deliveryZone.findFirst({ where: { countries: { has: 'Nigeria' } } });
  if (!existing) {
    await prisma.deliveryZone.create({
      data: {
        name: 'Nigeria',
        countries: ['Nigeria'],
        standardFee: 2000,
        expressFee: 5000,
        freeDeliveryThreshold: 100000,
        standardDaysMin: 3,
        standardDaysMax: 5,
        expressDaysMin: 1,
        expressDaysMax: 2,
        expressAvailable: true,
        active: true,
      },
    });
  }
}

async function seedPromotions() {
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    create: { code: 'WELCOME10', type: 'percentage', value: 10, scope: 'all', active: true },
    update: {},
  });
}

async function seedNotifications() {
  // Every NotificationEvent needs a trigger row or NotificationsService.dispatch
  // silently no-ops for it (findUnique returns null) — this isn't sample
  // data, it's what makes the module functional at all.
  const definitions: { event: NotificationEvent; label: string; description: string; subject: string; body: string; variables: string[] }[] = [
    { event: 'order_placed', label: 'Order placed', description: 'Sent when a customer completes checkout.', subject: 'We’ve got your order {{orderNumber}}', body: 'Thanks for your order! Your order number is {{orderNumber}}. We’ll let you know as it moves through production.', variables: ['orderNumber'] },
    { event: 'payment_successful', label: 'Payment successful', description: 'Sent when a payment is confirmed.', subject: 'Payment received for {{orderNumber}}', body: 'We’ve received your payment for order {{orderNumber}}. Production begins shortly.', variables: ['orderNumber'] },
    { event: 'payment_failed', label: 'Payment failed', description: 'Sent when a payment attempt fails.', subject: 'Payment issue with {{orderNumber}}', body: 'We couldn’t process payment for order {{orderNumber}}. Please try again or use a different payment method.', variables: ['orderNumber'] },
    { event: 'measurements_submitted', label: 'Measurements confirmed', description: 'Sent when made-to-measure measurements are confirmed.', subject: 'Measurements confirmed for {{orderNumber}}', body: 'Your measurements for order {{orderNumber}} are confirmed and ready for production.', variables: ['orderNumber'] },
    { event: 'order_in_production', label: 'Order in production', description: 'Sent when an order enters production.', subject: 'Your order {{orderNumber}} is now in production', body: 'Great news — order {{orderNumber}} is now being made.', variables: ['orderNumber'] },
    { event: 'production_completed', label: 'Production completed', description: 'Sent when an order is ready to ship.', subject: '{{orderNumber}} is ready for dispatch', body: 'Order {{orderNumber}} has finished production and is ready to ship.', variables: ['orderNumber'] },
    { event: 'order_shipped', label: 'Order shipped', description: 'Sent when an order ships.', subject: 'Your order {{orderNumber}} has shipped', body: 'Order {{orderNumber}} is on its way to you.', variables: ['orderNumber'] },
    { event: 'order_delivered', label: 'Order delivered', description: 'Sent when an order is marked delivered.', subject: '{{orderNumber}} has been delivered', body: 'Order {{orderNumber}} has been delivered. We hope you love it.', variables: ['orderNumber'] },
    { event: 'refund_processed', label: 'Refund processed', description: 'Sent when a refund is processed.', subject: 'Refund processed for {{orderNumber}}', body: 'Your refund for order {{orderNumber}} has been processed.', variables: ['orderNumber'] },
    { event: 'account_created', label: 'Account created', description: 'Sent when a new customer account is created.', subject: 'Welcome, {{customerName}}', body: 'Hi {{customerName}}, welcome to Momen — your account is ready.', variables: ['customerName'] },
    { event: 'customization_clarification_requested', label: 'Clarification requested', description: 'Sent when a custom order needs more detail before production.', subject: 'We need a little more detail on {{orderNumber}}', body: 'We need some clarification on your custom order {{orderNumber}} before we can start production. Please check your order tracking page.', variables: ['orderNumber'] },
  ];

  for (const def of definitions) {
    const template = await prisma.emailTemplate.upsert({
      where: { key: def.event },
      create: { key: def.event, name: def.label, subject: def.subject, body: def.body, variables: def.variables },
      update: {},
    });
    await prisma.notificationTrigger.upsert({
      where: { event: def.event },
      create: { event: def.event, label: def.label, description: def.description, channels: ['email'], enabled: true, emailTemplateId: template.id },
      update: {},
    });
  }
}

async function main() {
  await seedRoles();
  await seedSuperAdmin();
  await seedMeasurementFields();
  await seedCatalog();
  await seedDelivery();
  await seedPromotions();
  await seedProduction();
  await seedPaymentProvider();
  await seedNotifications();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
