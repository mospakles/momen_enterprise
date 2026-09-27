"use client";

import CouponManager from "@/components/admin/CouponManager";

export default function AdminPromotionsPage() {
  return <CouponManager title="Promotions" description="Sitewide campaigns, first-order offers, and collection promotions." scopeFilterDefault="any" />;
}
