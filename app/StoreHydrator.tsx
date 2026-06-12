// app/StoreHydrator.tsx
"use client";

import { useEffect } from "react";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";

export default function StoreHydrator() {
  useEffect(() => {
    useCareerStore.persist.rehydrate();
    useThemeStore.persist.rehydrate();
  }, []);

  return null;
}