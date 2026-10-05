"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { MeasurementProfile, MeasurementUnit, MeasurementValues } from "./types";
import { apiRequest } from "./api";
import { useCustomerAuth } from "./customer-auth-context";
import { toast } from "./toast";

interface MeasurementContextValue {
  profiles: MeasurementProfile[];
  createProfile: (label: string, unit: MeasurementUnit, values: MeasurementValues) => Promise<string | undefined>;
  updateProfile: (id: string, updates: Partial<Omit<MeasurementProfile, "id">>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  refreshProfiles: () => Promise<void>;
  isReady: boolean;
}

type ApiProfile = Omit<MeasurementProfile, "history"> & {
  history?: Array<{
    values: MeasurementValues;
    unit: MeasurementUnit;
    changedAt: string;
    changedBy?: string;
    changedByName?: string;
  }>;
};

const MeasurementContext = createContext<MeasurementContextValue | null>(null);

function normalize(profile: ApiProfile): MeasurementProfile {
  return {
    ...profile,
    history: profile.history?.map((entry) => ({
      values: entry.values,
      unit: entry.unit,
      changedAt: entry.changedAt,
      changedBy: entry.changedBy ?? entry.changedByName ?? "Customer",
    })),
  };
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "The measurement profile could not be saved.";
}

export function MeasurementProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useCustomerAuth();
  const [profiles, setProfiles] = useState<MeasurementProfile[]>([]);
  const [isReady, setIsReady] = useState(false);

  const refreshProfiles = useCallback(async () => {
    const isAdmin = window.location.pathname.startsWith("/admin");
    if (!isAdmin && !currentUser) {
      setProfiles([]);
      setIsReady(true);
      return;
    }
    try {
      const path = isAdmin ? "/admin/measurement-profiles" : "/measurement-profiles";
      const rows = await apiRequest<ApiProfile[]>(path);
      setProfiles(rows.map(normalize));
    } catch {
      setProfiles([]);
    } finally {
      setIsReady(true);
    }
  }, [currentUser]);

  useEffect(() => {
    void refreshProfiles();
    const reload = () => void refreshProfiles();
    window.addEventListener("momen:auth-changed", reload);
    return () => window.removeEventListener("momen:auth-changed", reload);
  }, [refreshProfiles]);

  const createProfile = useCallback(async (label: string, unit: MeasurementUnit, values: MeasurementValues) => {
    if (!currentUser) {
      toast("Sign in to save measurements", { variant: "error" });
      return undefined;
    }
    try {
      const saved = normalize(await apiRequest<ApiProfile>("/measurement-profiles", {
        method: "POST",
        body: { label, unit, values },
      }));
      setProfiles((previous) => [saved, ...previous]);
      toast("Measurements saved", { description: label, variant: "success" });
      return saved.id;
    } catch (error) {
      toast("Could not save measurements", { description: errorText(error), variant: "error" });
      return undefined;
    }
  }, [currentUser]);

  const updateProfile = useCallback(async (id: string, updates: Partial<Omit<MeasurementProfile, "id">>) => {
    const existing = profiles.find((profile) => profile.id === id);
    if (!existing) return;
    const isAdmin = window.location.pathname.startsWith("/admin");
    const customerId = existing.customerId;
    if (isAdmin && !customerId) {
      toast("Could not identify this profile's customer", { variant: "error" });
      return;
    }
    try {
      const path = isAdmin
        ? `/admin/customers/${encodeURIComponent(customerId!)}/measurement-profiles/${encodeURIComponent(id)}`
        : `/measurement-profiles/${encodeURIComponent(id)}`;
      const saved = normalize(await apiRequest<ApiProfile>(path, {
        method: "PUT",
        body: {
          label: updates.label ?? existing.label,
          unit: updates.unit ?? existing.unit,
          values: updates.values ?? existing.values,
        },
      }));
      setProfiles((previous) => previous.map((profile) => (profile.id === id ? { ...existing, ...saved } : profile)));
      toast("Measurements updated", { variant: "success" });
    } catch (error) {
      toast("Could not update measurements", { description: errorText(error), variant: "error" });
    }
  }, [profiles]);

  const deleteProfile = useCallback(async (id: string) => {
    const existing = profiles.find((profile) => profile.id === id);
    if (!existing) return;
    const isAdmin = window.location.pathname.startsWith("/admin");
    const path = isAdmin
      ? `/admin/customers/${encodeURIComponent(existing.customerId ?? "")}/measurement-profiles/${encodeURIComponent(id)}`
      : `/measurement-profiles/${encodeURIComponent(id)}`;
    try {
      await apiRequest(path, { method: "DELETE" });
      setProfiles((previous) => previous.filter((profile) => profile.id !== id));
      toast("Profile deleted", { variant: "success" });
    } catch (error) {
      toast("Could not delete profile", { description: errorText(error), variant: "error" });
    }
  }, [profiles]);

  const value = useMemo<MeasurementContextValue>(() => ({
    profiles,
    createProfile,
    updateProfile,
    deleteProfile,
    refreshProfiles,
    isReady,
  }), [profiles, createProfile, updateProfile, deleteProfile, refreshProfiles, isReady]);

  return <MeasurementContext.Provider value={value}>{children}</MeasurementContext.Provider>;
}

export function useMeasurements() {
  const context = useContext(MeasurementContext);
  if (!context) throw new Error("useMeasurements must be used within MeasurementProvider");
  return context;
}
