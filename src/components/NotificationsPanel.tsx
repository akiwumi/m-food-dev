import { useState } from "react";
import { CreditCard, Bell, Sparkles, Mail, X } from "lucide-react";
import type { Profile } from "../store";
import { readInbox, simulateTrialEnd, cancelScheduled, type InboxItem } from "../notifications";

export function NotificationsPanel({ close, profile, save, refresh }: { close: () => void; profile: Profile; save: (p: Profile) => void; refresh: () => void }) {
  const [, force] = useState(0);
  const items = readInbox();
  const sent = items.filter(i => i.status === "sent").sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const scheduled = items.filter(i => i.status === "scheduled").sort((a, b) => +new Date(a.scheduledFor!) - +new Date(b.scheduledFor!));
  const hasPending = scheduled.some(i => i.tag === "receipt");
  const fmt = (iso?: string) => iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
  const simulate = () => { const { charged } = simulateTrialEnd(); if (charged) save({ ...profile, subscriptionStatus: "active" }); refresh(); force(n => n + 1); };
  const cancel = () => { cancelScheduled(); save({ ...profile, subscriptionStatus: "canceled" }); refresh(); force(n => n + 1); };
  const Row = (i: InboxItem) => <div className={"notif-card" + (i.read ? "" : " unread")} key={i.id}><span className={"ic " + i.tag}>{i.tag === "receipt" ? <CreditCard size={18} /> : i.tag === "reminder" ? <Bell size={18} /> : i.tag === "welcome" ? <Sparkles size={18} /> : <Mail size={18} />}</span><div><b>{i.subject}</b><p>{i.body}</p><div className="meta"><span className="chip">{i.kind === "email" ? "Email" : "Push"}</span>{i.to && i.kind === "email" && <span>{i.to}</span>}{i.status === "scheduled" ? <span className="chip scheduled">Scheduled {fmt(i.scheduledFor)}</span> : <span>{fmt(i.createdAt)}</span>}</div></div></div>;
  return <div className="panel-bg" onClick={close}><aside className="moody-panel" onClick={e => e.stopPropagation()}>
    <header><div className="moody"><Bell size={22} /></div><div><b>Notifications</b><span>Emails &amp; reminders</span></div><button onClick={close}><X /></button></header>
    <div className="notif-list" style={{ overflowY: "auto", flex: 1 }}>
      {scheduled.map(Row)}
      {sent.map(Row)}
      {!items.length && <div className="notif-empty"><Mail /><p>No notifications yet. Create an account and start a trial to see confirmations, reminders, and receipts here.</p></div>}
    </div>
    {hasPending && profile.subscriptionStatus === "trialing" && <><button className="sim-trial" onClick={simulate}>Simulate trial ending now</button><button className="link-coral" onClick={cancel} style={{ width: "100%" }}>Cancel before trial ends</button></>}
  </aside></div>;
}
