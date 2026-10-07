"use client";

// Import Library
import type { ReactElement } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
// Import Components
import BackBtn from "@/src/app/components/back-btn";
// Import CSS
import "@/src/app/css/help.css";
// Import Icons
import { FiPhoneCall } from "react-icons/fi";

// Function แสดงหน้าช่วยเหลือพร้อมเบอร์ติดต่อเจ้าหน้าที่
function Help(): ReactElement {
    const t = useTranslations("Help");

    return (
        <section className="help-page">
            <div className="help-page__content">
                <div>
                    <BackBtn />
                </div>
                <div className="help-page__hero">
                    <h1 className="help-page__title">{t("title")}</h1>
                    <h3 className="help-page__subtitle">{t("subtitle")}</h3>
                    <p className="help-page__desc">
                        {t("descLine1")}
                        {t("descLine2")}
                    </p>
                </div>

                <div className="help-page__contact">
                    <div className="help-page__contact-title">{t("contactTitle")}</div>
                    <Link href="tel:+66123123456" className="help-card">
                        <span className="help-card__icon">
                            <FiPhoneCall />
                        </span>

                        <span className="help-card__text">
                            <strong>+66-123xxxxxx</strong>
                            <small>{t("contactStaff")}</small>
                        </span>
                    </Link>
                </div>
            </div>
        </section>
    );
}

export default Help;
