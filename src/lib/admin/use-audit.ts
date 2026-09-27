"use client";

// Convenience wrapper so admin pages can log an action in one call instead of
// wiring actor name/id through every mutation:
//   const audit = useAudit();
//   audit("product.price_updated", "products", "Changed price...", { resourceId, before, after });

import { useCallback } from "react";
import { useAdminAuth } from "./auth-context";
import { useAdminStore } from "./store";
import type { PermissionResource } from "./types";

export function useAudit() {
  const { currentUser } = useAdminAuth();
  const { logAudit } = useAdminStore();

  return useCallback(
    (
      action: string,
      resource: PermissionResource | "system",
      summary: string,
      opts?: { resourceId?: string; before?: unknown; after?: unknown }
    ) => {
      logAudit({
        actorId: currentUser?.id ?? "system",
        actorName: currentUser?.name ?? "System",
        action,
        resource,
        summary,
        resourceId: opts?.resourceId,
        before: opts?.before,
        after: opts?.after,
        ip: "—",
        device: typeof navigator !== "undefined" ? navigator.userAgent.split(") ")[0]?.split("(")[1] ?? "—" : "—",
      });
    },
    [currentUser, logAudit]
  );
}
