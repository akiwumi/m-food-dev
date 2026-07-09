import { createContext } from "react";

// Lets any header (AppHeader, TopBar) open the global hamburger menu without
// every screen threading a callback through its props.
export const MenuCtx = createContext<() => void>(() => {});
