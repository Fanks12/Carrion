"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import apiService from "@/services/api";
import styles from "./Subscription.module.css";

type PlanType = "FREE" | "PRO" | "ENTERPRISE";

export default function SubscriptionClient() {
	const { t } = useLanguage();
	const { userProfile, checkAuthStatus } = useAuth();
	const [loading, setLoading] = useState(false);
	const searchParams = useSearchParams();
	const router = useRouter();

	useEffect(() => {
		if (searchParams.get("success") === "true") {
			toast.success("Paiement réussi ! Activation en cours...");
			setTimeout(() => {
				checkAuthStatus();
				toast.success("Votre abonnement est actif !");
			}, 1500);
			router.replace("/subscription");
		}

		if (searchParams.get("canceled") === "true") {
			toast.error("Le paiement a été annulé.");
			router.replace("/subscription");
		}
	}, [searchParams, router, checkAuthStatus]);


	const setCurrentPlan = () => {
		if (userProfile?.subscription?.status === "ACTIVE") {
			return "PRO";
		} else {
			return "FREE";
		}
	}

	const currentPlan: PlanType = setCurrentPlan();

	const handleSubscribe = async () => {
		setLoading(true);
		try {
			const response = await apiService.post<{ url: string }>(
				"/subscription/create-checkout-session",
				{}
			);
			if (response?.url) {
				window.location.href = response.url;
			} else {
				toast.error(t("subscription.errors.createSession") as string);
			}
		} catch (err: unknown) {
			console.error(err);
			toast.error(t("subscription.errors.generic") as string);
		} finally {
			setLoading(false);
		}
	};

	const handleContactEnterprise = () => {
		window.location.href =
			"mailto:contact@carrion.com?subject=Demande%20Enterprise";
	};

	const renderCard = (plan: PlanType) => {
		const isCurrentPlan = currentPlan === plan;
		const isPro = plan === "PRO";
		const isEnterprise = plan === "ENTERPRISE";
		const isFree = plan === "FREE";

		return (
			<div
				className={`${styles.card} ${isCurrentPlan ? styles.activeCard : ""} ${isPro && !isCurrentPlan ? styles.proHighlight : ""
					}`}
			>
				{isCurrentPlan && (
					<div className={styles.currentBadge}>
						{t("subscription.currentPlan")}
					</div>
				)}

				<div className={styles.cardHeader}>
					<h3 className={styles.planName}>
						{t(`subscription.plans.${plan.toLowerCase()}.name`)}
					</h3>
					<div className={styles.priceContainer}>
						{isEnterprise ? (
							<span className={styles.price}>
								{t("subscription.plans.enterprise.price")}
							</span>
						) : (
							<>
								<span className={styles.price}>
									{isFree ? "0€" : "3.99€"}
								</span>
								<span className={styles.period}>
									/ {t("subscription.month")}
								</span>
							</>
						)}
					</div>
					<p className={styles.description}>
						{t(`subscription.plans.${plan.toLowerCase()}.description`)}
					</p>
				</div>

				<ul className={styles.featuresList}>
					{[1, 2, 3, 4].map((i) => {
						const rawText = t(`subscription.plans.${plan.toLowerCase()}.feature${i}`) as string;

						const safeText = rawText || "";
						const hasAsterisk = safeText.endsWith(" *");
						const text = hasAsterisk ? safeText.slice(0, -2) : safeText;

						return (
							<li key={i} className={styles.featureItem}>
								<div className={styles.iconWrapper}>
									<Check size={14} strokeWidth={3} />
								</div>
								<span>
									{text}
									{hasAsterisk && <span className={styles.asterisk}>*</span>}
								</span>
							</li>
						);
					})}
				</ul>

				<div className={styles.cardFooter}>
					{isEnterprise ? (
						<button
							className={styles.buttonOutline}
							onClick={handleContactEnterprise}
						>
							<Mail size={16} style={{ marginRight: 8 }} />
							{t("subscription.contactUs")}
						</button>
					) : (
						<button
							className={isPro ? styles.buttonPrimary : styles.buttonOutline}
							onClick={isPro && !isCurrentPlan ? handleSubscribe : undefined}
							disabled={isCurrentPlan || (isPro && loading)}
						>
							{isCurrentPlan
								? t("subscription.active")
								: isPro
									? loading
										? t("subscription.processing")
										: t("subscription.upgrade")
									: t("subscription.included")}
						</button>
					)}
				</div>
			</div>
		);
	};

	return (
		<div className={styles.pageContainer}>
			<div className={styles.header}>
				<h1 className={styles.title}>{t("subscription.pageTitle")}</h1>
				<p className={styles.subtitle}>{t("subscription.pageSubtitle")}</p>
			</div>

			<div className={styles.grid}>
				{renderCard("FREE")}
				{renderCard("PRO")}
				{renderCard("ENTERPRISE")}
			</div>

			<div className={styles.disclaimer}>
				<p>{t("subscription.condition")}</p>
			</div>
		</div>
	);
}