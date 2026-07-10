import { useContext } from "react";
import {
  Home, Search, ListChecks, ShoppingCart, CalendarDays, Salad, Heart, Sparkles,
  UserRound, ArrowLeft, Menu, Bell,
} from "lucide-react";
import type { Page } from "../appTypes";
import type { Profile } from "../store";
import { MenuCtx } from "./MenuCtx";

const nav = [
  ["home", "Home", Home], ["search", "Search", Search], ["results", "Results", ListChecks],
  ["grocery", "Grocery", ShoppingCart], ["planner", "Planner", CalendarDays],
] as const;

export function DesktopNav({ page, go, openMoody }: { page: Page; go: (p: Page) => void; openMoody: () => void }) {
  return <aside className="desktop-nav">
    <nav>
      {nav.map(([id, label, Icon]) => <button className={page === id ? "active" : ""} onClick={() => go(id)} key={id}><Icon size={19} />{label}</button>)}
      <button className={page === "pantry" ? "active" : ""} onClick={() => go("pantry")}><Salad size={19} />Pantry</button>
      <button className={page === "favorites" ? "active" : ""} onClick={() => go("favorites")}><Heart size={19} />Saved</button>
    </nav>
    <button className="desktop-wordmark" onClick={() => go("home")} aria-label="MoodFood home">
      <img src="/images/logo-1.png" alt="" />
      <span>MOODFOOD</span>
    </button>
    <div className="desktop-actions">
      <button className="moody-side" onClick={openMoody}><Sparkles size={18} />Ask Moody</button>
      <button className="desktop-account" onClick={() => go("settings")}><UserRound size={18} />My MoodFood</button>
    </div>
  </aside>;
}

export function BottomNav({ page, go }: { page: Page; go: (p: Page) => void }) {
  const items: [Page, string, typeof Home][] = [
    ["home", "Home", Home],
    ["search", "Search", Search],
    ["results", "Results", ListChecks],
    ["favorites", "Saved", Heart],
    ["grocery", "Grocery", ShoppingCart],
  ];
  return <nav className="bottom-nav">{items.map(([id, label, Icon]) => <button className={page === id ? "active" : ""} onClick={() => go(id)} key={id}><Icon size={19} /><span>{label}</span></button>)}</nav>;
}

export function TopBar({ title, back }: { title: string; back?: () => void }) {
  const openMenu = useContext(MenuCtx);
  return <header className="top-bar"><button onClick={back} disabled={!back}><ArrowLeft /></button><h1>{title}</h1><button onClick={openMenu} aria-label="Open menu"><Menu /></button></header>;
}

export function AppHeader({ openNotifs, unread, profile }: { openNotifs?: () => void; unread?: number; profile?: Profile }) {
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
}
