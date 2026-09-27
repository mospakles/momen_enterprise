"use client";

import CouponManager from "@/components/admin/CouponManager";

export default function AdminCouponsPage() {
  return <CouponManager title="Coupons" description="One-time and bulk coupon codes, with usage limits and expiry." scopeFilterDefault="any" />;
}
