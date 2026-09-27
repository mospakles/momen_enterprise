import Link from "next/link";
import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline-light";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-body font-medium tracking-wide transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-ivory hover:bg-brass",
  secondary: "bg-transparent text-ink border border-ink hover:border-brass hover:text-brass",
  ghost: "bg-transparent text-ink hover:text-brass underline underline-offset-4",
  "outline-light": "bg-transparent text-ivory border border-ivory hover:bg-ivory hover:text-ink",
};

const sizes: Record<Size, string> = {
  sm: "text-xs px-4 py-2",
  md: "text-sm px-6 py-3",
  lg: "text-sm px-8 py-4",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  href?: string;
}

export function Button({ variant = "primary", size = "md", href, className = "", children, ...props }: ButtonProps) {
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
  if (href) {
    const { onClick, ...anchorProps } = props;
    return (
      <Link href={href} className={cls} onClick={onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>} {...(anchorProps as Record<string, unknown>)}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}
