import { useState, type PointerEvent } from "react";
import { CreditCard, Bell, Sparkles, Mail, X, MessageCircle, Users, Trash2 } from "lucide-react";
import type { Profile } from "../store";
import { readInbox, simulateTrialEnd, cancelScheduled, dismissInboxItem, type InboxItem } from "../notifications";

const DISMISS_THRESHOLD = -92;
const MAX_DRAG = -132;

export function NotificationsPanel({ close, profile, save, refresh }: { close: () => void; profile: Profile; save: (p: Profile) => void; refresh: () => void }) {
  const [, force] = useState(0);
  const [dragging, setDragging] = useState<{ id: string; startX: number; x: number } | null>(null);
  const items = readInbox();
  const sent = items.filter(i => i.status === "sent").sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const scheduled = items.filter(i => i.status === "scheduled").sort((a, b) => +new Date(a.scheduledFor!) - +new Date(b.scheduledFor!));
  const hasPending = scheduled.some(i => i.tag === "receipt");
  const fmt = (iso?: string) => iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
  const simulate = () => { const { charged } = simulateTrialEnd(); if (charged) save({ ...profile, subscriptionStatus: "active" }); refresh(); force(n => n + 1); };
  const cancel = () => { cancelScheduled(); save({ ...profile, subscriptionStatus: "canceled" }); refresh(); force(n => n + 1); };
  const dismiss = (id: string) => {
    dismissInboxItem(id);
    refresh();
    force(n => n + 1);
  };
  const beginDrag = (event: PointerEvent<HTMLDivElement>, id: string) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging({ id, startX: event.clientX, x: 0 });
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>, id: string) => {
    setDragging(current => {
      if (!current || current.id !== id) return current;
      return { ...current, x: Math.max(MAX_DRAG, Math.min(16, event.clientX - current.startX)) };
    });
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>, id: string) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const x = dragging?.id === id ? dragging.x : 0;
    setDragging(null);
    if (x <= DISMISS_THRESHOLD) dismiss(id);
  };
  const icon = (i: InboxItem) => i.tag === "receipt" ? <CreditCard size={18} />
    : i.tag === "reminder" ? <Bell size={18} />
      : i.tag === "welcome" ? <Sparkles size={18} />
        : i.tag === "post" ? <Users size={18} />
          : i.tag === "message" ? <MessageCircle size={18} />
            : <Mail size={18} />;
  const Row = (i: InboxItem) => {
    const offset = dragging?.id === i.id ? dragging.x : 0;
    return <div className="notif-swipe" key={i.id}>
      <div className="notif-delete"><Trash2 size={16} /><span>Delete</span></div>
      <div
        className={"notif-card" + (i.read ? "" : " unread") + (offset < 0 ? " dragging" : "")}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={event => beginDrag(event, i.id)}
        onPointerMove={event => moveDrag(event, i.id)}
        onPointerUp={event => endDrag(event, i.id)}
        onPointerCancel={event => endDrag(event, i.id)}
      >
        <span className={"ic " + i.tag}>{icon(i)}</span><div><b>{i.subject}</b><p>{i.body}</p><div className="meta"><span className="chip">{i.kind === "email" ? "Email" : "Push"}</span>{i.to && i.kind === "email" && <span>{i.to}</span>}{i.status === "scheduled" ? <span className="chip scheduled">Scheduled {fmt(i.scheduledFor)}</span> : <span>{fmt(i.createdAt)}</span>}</div></div>
      </div>
    </div>;
  };
  return <div className="panel-bg" onClick={close}><aside className="moody-panel" onClick={e => e.stopPropagation()}>
    <header><div className="moody"><Bell size={22} /></div><div><b>Notifications</b><span>Emails &amp; reminders</span></div><button onClick={close}><X /></button></header>
    <div className="notif-list" style={{ overflowY: "auto", flex: 1 }}>
      {scheduled.map(Row)}
      {sent.map(Row)}
      {!items.length && <div className="notif-empty"><Mail /><p>No notifications yet. Community posts, replies, confirmations, reminders, and receipts will appear here.</p></div>}
    </div>
    {hasPending && profile.subscriptionStatus === "trialing" && <><button className="sim-trial" onClick={simulate}>Simulate trial ending now</button><button className="link-coral" onClick={cancel} style={{ width: "100%" }}>Cancel before trial ends</button></>}
  </aside></div>;
}
