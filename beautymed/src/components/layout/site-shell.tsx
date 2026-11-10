import type { ReactNode } from "react";
import { Footer } from "./footer";
import { Header, type HeaderAccount } from "./header";

const guestAccount: HeaderAccount = { href: "/login", label: "ورود" };

export function SiteShell({ children, account = guestAccount }: { children: ReactNode; account?: HeaderAccount }) {
  return (
    <>
      <Header account={account} />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
