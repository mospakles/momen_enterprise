"use client";

import CouponManager from "@/components/admin/CouponManager";

export default function AdminDiscountsPage() {
  return <CouponManager title="Discounts" description="Percentage and fixed-amount discounts, scoped to products, collections, or customers." scopeFilterDefault="any" />;
}
