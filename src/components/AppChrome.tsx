import { memo, useContext } from "react";
import {
  Home, Search, Users, ShoppingCart, Heart,
  UserRound, ArrowLeft, Menu, Bell,
} from "lucide-react";
import type { Page } from "../appTypes";
import type { Profile } from "../store";
import { MenuCtx } from "./MenuCtx";

export const CORE_NAV_ITEMS = [
  ["home", "Home", Home],
  ["search", "Search", Search],
  ["community", "Community", Users],
  ["favorites", "Saved", Heart],
  ["grocery", "Grocery", ShoppingCart],
] as const;

// memo'd: the nav/header chrome persists across page changes, so it should skip
// re-rendering when unrelated App state changes (given a stable go prop).
export const DesktopNav = memo(function DesktopNav({ page, go }: { page: Page; go: (p: Page) => void }) {
  return <aside className="desktop-nav">
    <nav>
      {CORE_NAV_ITEMS.map(([id, label, Icon]) => <button className={page === id ? "active" : ""} onClick={() => go(id)} key={id}><Icon size={19} />{label}</button>)}
    </nav>
    <button className="desktop-wordmark" onClick={() => go("home")} aria-label="MoodFood home">
      <img src="/images/logo-1.png" alt="" />
      <span>MOODFOOD</span>
    </button>
    <div className="desktop-actions">
      <button className="desktop-account" onClick={() => go("settings")}><UserRound size={18} />My MoodFood</button>
    </div>
  </aside>;
});

export const BottomNav = memo(function BottomNav({ page, go }: { page: Page; go: (p: Page) => void }) {
  return <nav className="bottom-nav">{CORE_NAV_ITEMS.map(([id, label, Icon]) => <button className={page === id ? "active" : ""} onClick={() => go(id)} key={id}><Icon size={19} /><span>{label}</span></button>)}</nav>;
});

export const TopBar = memo(function TopBar({ title, back }: { title: string; back?: () => void }) {
  const openMenu = useContext(MenuCtx);
  return <header className="top-bar"><button onClick={back} disabled={!back}><ArrowLeft /></button><h1>{title}</h1><button onClick={openMenu} aria-label="Open menu"><Menu /></button></header>;
});

export const AppHeader = memo(function AppHeader({ openNotifs, unread, profile }: { openNotifs?: () => void; unread?: number; profile?: Profile }) {
  const openMenu = useContext(MenuCtx);
  return (
    <header className="app-header">
      {profile?.avatar
        ? <div className="user-avatar-ring"><img src={profile.avatar} alt={profile.name} /></div>
        : <div className="logo-ring"><img src="/images/logo-1.png" alt="MoodFood" /></div>}
      <div className="header-meta">
        <span className="header-name">{profile?.name ? `Hey, ${profile.name.split(" ")[0]}.` : "MoodFood"}</span>
        <span className="header-sub">Good food. Better mood.</span>
      </div>
      <button className="icon-btn notif-bell" aria-label="Notifications" onClick={openNotifs}>
        <Bell size={20} />{!!unread && <span className="notif-dot">{unread}</span>}
      </button>
      <button className="icon-btn" aria-label="Open menu" onClick={openMenu}><Menu size={20} /></button>
    </header>
  );
});
