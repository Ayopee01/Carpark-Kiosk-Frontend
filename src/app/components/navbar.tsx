"use client";

// Import Library
import { useState, type ReactElement } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
// Import Components
import LangButton from "@/src/app/components/lang-button";
import SideMenu from "@/src/app/components/side-menu";
// Import Providers
import { useKioskTheme } from "@/src/app/providers/kiosk-theme-realtime-provider";
// Import CSS
import "@/src/app/css/navbar.css";
// Import Icons
import { CiCircleQuestion } from "react-icons/ci";
import { HiMenu, HiMenuAlt2 } from "react-icons/hi";

// Function แสดง Navbar พร้อม logo จาก theme (ต่อ updatedAt เป็น query version ให้ Browser โหลด logo ใหม่)
function Navbar(): ReactElement {
    const [isOpen, setIsOpen] = useState(false);
    const [failedLogoSrc, setFailedLogoSrc] = useState<string | null>(null);
    const t = useTranslations("Navbar");

    const { theme, systemName, refreshTheme } = useKioskTheme();
    const logoSrc = theme?.logoUrl
        ? theme.updatedAt
            ? `${theme.logoUrl}${theme.logoUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(theme.updatedAt)}`
            : theme.logoUrl
        : null;
    const shouldShowLogo = Boolean(logoSrc && failedLogoSrc !== logoSrc);

    return (
        <>
            <nav className="navbar">
                <div className="inner">
                    <div className="content-left">
                        {shouldShowLogo && logoSrc ? (
                            <img
                                key={logoSrc}
                                src={logoSrc}
                                alt={systemName ?? "Logo"}
                                className="navbarLogo"
                                onError={() => {
                                    setFailedLogoSrc(logoSrc);
                                    void refreshTheme();
                                }}
                            />
                        ) : null}
                    </div>

                    <div className="content-right">
                        <LangButton variant="nav" />

                        <div>
                            <Link className="helpButton" href="/landing/help">
                                <CiCircleQuestion />
                                {t("help")}
                            </Link>
                        </div>
                    </div>

                    <button type="button" className={`hamburger ${isOpen ? "active" : ""}`} onClick={() => setIsOpen(!isOpen)}>
                        <span className="hamburger__icon">{isOpen ? <HiMenuAlt2 /> : <HiMenu />}</span>
                    </button>
                </div>
            </nav>

            <SideMenu open={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}

export default Navbar;
