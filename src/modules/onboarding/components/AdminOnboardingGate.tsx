"use client";

import { useEffect, useState } from "react";
import { AdminOnboardingModal } from "./AdminOnboardingModal";

const STORAGE_KEY = "osbb_admin_onboarding_v1_completed";

export function AdminOnboardingGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const completed = window.localStorage.getItem(STORAGE_KEY);

      if (!completed) {
        setOpen(true);
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  function handleClose() {
    window.localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  }

  if (!open) return null;

  return <AdminOnboardingModal onClose={handleClose} />;
}
