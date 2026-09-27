import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Documents that a route is intentionally open — guest checkout, browsing
 * published products, etc. Every route in this app opts into auth
 * explicitly via `@UseGuards(...)` (there's no global default-deny guard,
 * since routes need one of two different JWT strategies or none at all), so
 * this decorator doesn't change runtime behavior — a route with no
 * `@UseGuards` is already reachable. It exists so a reviewer scanning a
 * controller can immediately tell "no guard" apart from "forgot a guard." */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
