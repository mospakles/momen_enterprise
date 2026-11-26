import type { Metadata } from "next";
import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource-variable/fraunces/opsz-italic.css";
import "@fontsource-variable/manrope";
import "./globals.css";
import { DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";
import { campaignHero } from "@/lib/campaign-images";
import { CartProvider } from "@/lib/cart-context";
import { MeasurementProvider } from "@/lib/measurement-context";
import { OrdersProvider } from "@/lib/orders-context";
import { CustomerAuthProvider } from "@/lib/customer-auth-context";
import { AdminStoreProvider } from "@/lib/admin/store";
import { Toaster } from "@/components/ui/Toaster";
import StorefrontChrome from "@/components/layout/StorefrontChrome";
import { MotionProvider } from "@/lib/motion/MotionProvider";
import { CurtainProvider } from "@/lib/motion/Curtain";
import { UIProvider } from "@/lib/ui-context";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "momen. | Contemporary Nigerian menswear", template: "%s | momen." },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_NG",
    url: "/",
    title: "momen. | Contemporary Nigerian menswear",
    description: DEFAULT_DESCRIPTION,
    images: [{ url: DEFAULT_OG_IMAGE, alt: campaignHero.alt }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
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
                  <MotionProvider>
                    <UIProvider>
                      <CurtainProvider>
                        <StorefrontChrome>{children}</StorefrontChrome>
                        <Toaster />
                      </CurtainProvider>
                    </UIProvider>
                  </MotionProvider>
                </OrdersProvider>
              </MeasurementProvider>
            </CartProvider>
          </CustomerAuthProvider>
        </AdminStoreProvider>
      </body>
    </html>
  );
}
