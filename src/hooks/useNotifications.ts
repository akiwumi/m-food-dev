import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { runDue, markAllRead } from "../notifications";
import type { Profile } from "../store";

// Owns the notifications panel + the write-only re-render tick that keeps
// unreadCount() fresh in the render. The mount-only runDue() also flips
// subscriptionStatus to active when a scheduled charge comes due.
export function useNotifications(setProfile: Dispatch<SetStateAction<Profile>>) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [, setNotifTick] = useState(0);
  const refreshNotifs = () => setNotifTick(t => t + 1);
  useEffect(() => { const { charged } = runDue(); if (charged) setProfile(p => ({ ...p, subscriptionStatus: "active" })); refreshNotifs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const openNotifs = () => { markAllRead(); setNotifOpen(true); refreshNotifs(); };
  return { notifOpen, setNotifOpen, openNotifs, refreshNotifs };
}
