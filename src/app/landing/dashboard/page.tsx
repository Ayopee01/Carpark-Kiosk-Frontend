"use client";

// Import Library
import type { ReactElement } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
// Import CSS
import "@/src/app/css/dashboard.css";
// Import Icons
import { MdOutlineImageSearch } from "react-icons/md";
import { TbScan } from "react-icons/tb";

// Function แสดงหน้าหลักของ Kiosk ให้เลือกสแกนหรือค้นหาทะเบียน
function Dashboard(): ReactElement {
    const t = useTranslations("Dashboard");

    return (
        <section className="dashboard">
            <div className="container-dashboard">
                <header className="header-dashboard">
                    <h1>Smart Carpark</h1>
                    <h3>{t("welcome")}</h3>
                    <p>{t("description")}</p>
                </header>

                <div className="card-dashboard">
                    <Link className="scan-btn" href="/landing/scan">
                        <div className="icon-scan-btn">
                            <TbScan />
                        </div>
                        <div className="text-scan-btn">
                            <h2>{t("scanTitle")}</h2>
                            <p>{t("scanSubtitle")}</p>
                        </div>
                    </Link>

                    <Link className="search-btn" href="/landing/search">
                        <div className="icon-search-btn">
                            <MdOutlineImageSearch />
                        </div>
                        <div className="text-search-btn">
                            <h2>{t("searchTitle")}</h2>
                            <p>{t("searchSubtitle")}</p>
                        </div>
                    </Link>
                </div>
            </div>
        </section>
    );
}

export default Dashboard;
