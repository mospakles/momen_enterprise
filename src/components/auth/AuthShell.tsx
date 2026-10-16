import Image from "next/image";
import type { MediaSlot } from "@/components/journey/media";
import { focal } from "@/components/journey/media";
import { placeholderFor } from "@/lib/brand-images";

/** Sign-in, sign-up and recovery pages: the form beside a tall brand
 * photograph (image hidden on small screens so the form comes first). */
export default function AuthShell({ image, children }: { image: MediaSlot; children: React.ReactNode }) {
  return (
    <div className="lg:grid lg:min-h-[calc(100vh-4.5rem)] lg:grid-cols-2">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-16 sm:px-6">{children}</div>
      <div className="relative hidden bg-bone lg:block">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="50vw"
          placeholder={placeholderFor(image.src)}
          style={focal(image).style}
          className={`object-cover ${focal(image).className}`}
        />
      </div>
    </div>
  );
}
