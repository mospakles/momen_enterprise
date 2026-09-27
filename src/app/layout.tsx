import type { Metadata } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/fraunces/wght-italic.css";
import "@fontsource-variable/manrope";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import { MeasurementProvider } from "@/lib/measurement-context";
import { OrdersProvider } from "@/lib/orders-context";
import { CustomerAuthProvider } from "@/lib/customer-auth-context";
import { AdminStoreProvider } from "@/lib/admin/store";
import { Toaster } from "@/components/ui/Toaster";
import StorefrontChrome from "@/components/layout/StorefrontChrome";

export const metadata: Metadata = {
  title: "Momen — Designed for the Man You Are",
  description:
    "Momen is a premium African menswear house — traditional and contemporary tailoring, made-to-measure, and a curated unisex edit. Craftsmanship. Fit. Confidence. Culture.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-ivory text-ink">
        {/* AdminStoreProvider wraps the whole app — not just /admin — so that
            admin edits (price, stock, homepage content, delivery fees, etc.)
            are immediately visible on the storefront: both read the same
            context. See src/lib/admin/store.tsx. */}
        <AdminStoreProvider>
          <CustomerAuthProvider>
            <CartProvider>
              <MeasurementProvider>
                <OrdersProvider>
                  <StorefrontChrome>{children}</StorefrontChrome>
                  <Toaster />
                </OrdersProvider>
              </MeasurementProvider>
            </CartProvider>
          </CustomerAuthProvider>
        </AdminStoreProvider>
      </body>
    </html>
  );
}
