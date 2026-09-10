"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Menu, Search, Sun, Moon, Radio } from "lucide-react";
import { navigation } from "@/lib/site";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
function subscribe(callback: () => void) {
  window.addEventListener("themechange", callback);
  return () => window.removeEventListener("themechange", callback);
}
export function Navigation() {
  const path = usePathname();
  const theme = useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.theme || "dark",
    () => "dark",
  );
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("lsw-theme", next);
    } catch {}
    window.dispatchEvent(new Event("themechange"));
  }
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="Los Santos Wire home">
          <span className="brand-icon">
            <Radio size={25} />
          </span>
          <span>
            LOS SANTOS
            <span className="brand-wire">
              WIRE<span className="brand-dot">.</span>
            </span>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {navigation.map(([name, href]) => (
            <Link
              key={href}
              href={href}
              className={path === href ? "active" : ""}
            >
              {name}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link href="/search" className="icon-button" aria-label="Search">
            <Search size={20} />
          </Link>
          <button
            onClick={toggle}
            className="icon-button"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <Sheet>
            <SheetTrigger asChild>
              <button
                className="icon-button mobile-menu"
                aria-label="Open navigation"
              >
                <Menu size={22} />
              </button>
            </SheetTrigger>
            <SheetContent>
              <SheetTitle className="brand-wire">LOS SANTOS WIRE.</SheetTitle>
              <SheetDescription className="muted">
                Your independent GTA briefing.
              </SheetDescription>
              <nav className="mobile-links" aria-label="Mobile navigation">
                {navigation.map(([name, href]) => (
                  <SheetClose asChild key={href}>
                    <Link href={href}>{name}</Link>
                  </SheetClose>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
