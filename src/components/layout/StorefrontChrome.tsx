"use client";

// The admin dashboard is a distinct application shell (its own sidebar/topbar
// come from `src/app/admin/layout.tsx`) — this keeps the storefront's
// Navbar/Footer from wrapping it.

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function StorefrontChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
