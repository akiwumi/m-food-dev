import {
  Home, Search, BookOpen, Salad, ShoppingCart, CalendarDays, Users, Heart, Upload,
  Camera, BarChart3, Activity, ClipboardCheck, Sparkles, UserPlus, UserRound, Star,
  LayoutDashboard, HelpCircle, Settings2, X, Bell, ChevronRight, LogOut,
} from "lucide-react";
import type { Page } from "../appTypes";
import type { Profile } from "../store";

// Full-height slide-in drawer surfacing every part of the app, the single
// place to reach settings, food profile, camera log, health, billing, and more.
export function MainMenu({ profile, page, go, close, openNotifs, unread, logout }: { profile: Profile; page: Page; go: (p: Page) => void; close: () => void; openNotifs: () => void; unread: number; logout: () => void }) {
  const nav = (p: Page) => { go(p); close(); };
  const groups: { title: string; items: [Page, string, typeof Home][] }[] = [
    { title: "COOK & PLAN", items: [["home", "Home", Home], ["search", "Search recipes", Search], ["diary", "Diary", BookOpen], ["pantry", "My pantry", Salad], ["grocery", "Grocery", ShoppingCart], ["planner", "Planner", CalendarDays]] },
    { title: "DISCOVER", items: [["community", "Community", Users], ["friends", "Friends", UserPlus], ["favorites", "Saved recipes", Heart], ["import", "Import a recipe", Upload]] },
    { title: "TRACK", items: [["food-log", "Food photo log (camera)", Camera], ["insights", "Weekly reflections", BarChart3], ["health", "Health trends", Activity]] },
    { title: "YOUR PROFILE", items: [["food-profile", "Food profile & preferences", ClipboardCheck], ["psych-profile", "Psychological food profile", Sparkles], ["diners", "Household diners", UserPlus], ["account", "Account & public profile", UserRound]] },
    { title: "ACCOUNT & APP", items: [["billing", "Subscription & billing", Star], ["admin", "Editorial console", LayoutDashboard], ["help", "Help & FAQ", HelpCircle], ["settings", "Settings", Settings2]] },
  ];
  return <div className="panel-bg menu-bg" onClick={close}>
    <aside className="main-menu" onClick={e => e.stopPropagation()}>
      <header className="mm-head">
        <div className="mm-id">{profile.avatar ? <img src={profile.avatar} alt="" /> : <span>{(profile.name || "Y").slice(0, 1).toUpperCase()}</span>}<div><b>{profile.name || "Your profile"}</b><small>{profile.email || "MoodFood"}</small></div></div>
        <button onClick={close} aria-label="Close menu"><X /></button>
      </header>
      <button className="mm-notifs" onClick={() => { openNotifs(); close(); }}><Bell size={18} />Notifications{!!unread && <span className="mm-badge">{unread}</span>}</button>
      <div className="mm-scroll">
        {groups.map(g => <section className="mm-group" key={g.title}><small>{g.title}</small>{g.items.map(([id, label, Icon]) => <button className={page === id ? "active" : ""} onClick={() => nav(id)} key={id}><Icon size={18} /><span>{label}</span><ChevronRight size={16} /></button>)}</section>)}
      </div>
      <button className="mm-logout" onClick={() => { logout(); close(); }}><LogOut size={18} />Sign out</button>
    </aside>
  </div>;
}
