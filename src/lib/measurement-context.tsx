"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { MeasurementProfile, MeasurementUnit, MeasurementValues } from "./types";
import { toast } from "./toast";

interface MeasurementContextValue {
  profiles: MeasurementProfile[];
  createProfile: (label: string, unit: MeasurementUnit, values: MeasurementValues) => string;
  updateProfile: (id: string, updates: Partial<Omit<MeasurementProfile, "id">>) => void;
  deleteProfile: (id: string) => void;
  isReady: boolean;
}

const MeasurementContext = createContext<MeasurementContextValue | null>(null);
const KEY = "momen.measurements.v1";

const seedProfiles: MeasurementProfile[] = [
  {
    id: "default",
    label: "Default Measurements",
    unit: "cm",
    values: { bust: 92, waist: 76, hip: 98, shoulder: 40, sleeveLength: 60, height: 168 },
    updatedAt: new Date().toISOString(),
  },
];

export function MeasurementProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<MeasurementProfile[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating profiles from localStorage on mount
      setProfiles(raw ? JSON.parse(raw) : seedProfiles);
    } catch {
      setProfiles(seedProfiles);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (isReady) localStorage.setItem(KEY, JSON.stringify(profiles));
  }, [profiles, isReady]);

  const createProfile = useCallback((label: string, unit: MeasurementUnit, values: MeasurementValues) => {
    const id = `mp-${Date.now()}`;
    setProfiles((prev) => [...prev, { id, label, unit, values, updatedAt: new Date().toISOString() }]);
    toast("Measurements saved", { description: label, variant: "success" });
    return id;
  }, []);

  const updateProfile = useCallback((id: string, updates: Partial<Omit<MeasurementProfile, "id">>) => {
    setProfiles((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const historyEntry = { values: p.values, unit: p.unit, changedAt: p.updatedAt, changedBy: "Customer" };
        return { ...p, ...updates, updatedAt: new Date().toISOString(), history: [historyEntry, ...(p.history ?? [])].slice(0, 20) };
      })
    );
    toast("Measurements updated", { variant: "success" });
  }, []);

  const deleteProfile = useCallback((id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    toast("Profile deleted");
  }, []);

  return (
    <MeasurementContext.Provider value={{ profiles, createProfile, updateProfile, deleteProfile, isReady }}>
      {children}
    </MeasurementContext.Provider>
  );
}

export function useMeasurements() {
  const ctx = useContext(MeasurementContext);
  if (!ctx) throw new Error("useMeasurements must be used within MeasurementProvider");
  return ctx;
}
