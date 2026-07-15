import {
  Home, Search, BookOpen, Salad, ShoppingCart, CalendarDays, Users, Heart, Upload,
  Camera, BarChart3, Activity, ClipboardCheck, Sparkles, UserPlus, UserRound, Star,
  LayoutDashboard, HelpCircle, Settings2, X, Bell, ChevronRight, LogOut,
} from "lucide-react";
import type { Page } from "../appTypes";
import type { Profile } from "../store";

export const MENU_GROUPS: { title: string; items: [Page, string, typeof Home][] }[] = [
  { title: "CORE", items: [["home", "Home", Home], ["search", "Search with Moody", Search], ["community", "Community", Users], ["favorites", "Saved recipes", Heart], ["grocery", "Grocery", ShoppingCart]] },
  { title: "MORE / MATURITY", items: [["planner", "Planner", CalendarDays], ["pantry", "My pantry", Salad], ["import", "Import a recipe", Upload], ["health", "Health trends", Activity], ["insights", "Weekly reflections", BarChart3], ["diners", "Household diners", UserPlus], ["admin", "Editorial console", LayoutDashboard]] },
  { title: "PROFILE & ACCOUNT", items: [["friends", "Friends & suggestions", UserPlus], ["diary", "Diary", BookOpen], ["food-log", "Food photo log", Camera], ["food-profile", "Food profile & preferences", ClipboardCheck], ["psych-profile", "Psychological food profile", Sparkles], ["account", "Account & public profile", UserRound], ["billing", "Subscription & billing", Star], ["help", "Help & FAQ", HelpCircle], ["settings", "Settings", Settings2]] },
];

// Full-height slide-in drawer surfacing every part of the app, the single
// place to reach settings, food profile, camera log, health, billing, and more.
export function MainMenu({ profile, page, go, close, openNotifs, unread, logout }: { profile: Profile; page: Page; go: (p: Page) => void; close: () => void; openNotifs: () => void; unread: number; logout: () => void }) {
  const nav = (p: Page) => { go(p); close(); };
  return <div className="panel-bg menu-bg" onClick={close}>
    <aside className="main-menu" onClick={e => e.stopPropagation()}>
      <header className="mm-head">
        <div className="mm-id">{profile.avatar ? <img src={profile.avatar} alt="" /> : <span>{(profile.name || "Y").slice(0, 1).toUpperCase()}</span>}<div><b>{profile.name || "Your profile"}</b><small>{profile.email || "MoodFood"}</small></div></div>
        <button onClick={close} aria-label="Close menu"><X /></button>
      </header>
      <button className="mm-notifs" onClick={() => { openNotifs(); close(); }}><Bell size={18} />Notifications{!!unread && <span className="mm-badge">{unread}</span>}</button>
      <div className="mm-scroll">
        {MENU_GROUPS.map(g => <section className="mm-group" key={g.title}><small>{g.title}</small>{g.items.map(([id, label, Icon]) => <button className={page === id ? "active" : ""} onClick={() => nav(id)} key={id}><Icon size={18} /><span>{label}</span><ChevronRight size={16} /></button>)}</section>)}
      </div>
      <button className="mm-logout" onClick={() => { logout(); close(); }}><LogOut size={18} />Sign out</button>
    </aside>
  </div>;
}
