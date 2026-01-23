"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ApiService from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./Invitation.module.css";
import Loading from "@/components/Loading/Loading";
import toast, { Toaster } from "react-hot-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import LandingHeader from "@/components/LandingHeader/LandingHeader";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { Mail, ShieldAlert, AlertCircle, LogIn, UserPlus, ArrowRight, XCircle } from "lucide-react";

interface InvitationDetails {
	email: string;
	role: string;
	organization: { name: string };
	inviter: { email: string; userProfile?: { firstName: string; lastName: string } };
}

interface ApiError {
	message?: string;
	response?: {
		data?: {
			message?: string;
		};
	};
}

function InvitationContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get("token");
	const { t } = useLanguage();
	const { userProfile, loadingAuth, organizationMemberInfo } = useAuth();

	const { openAuthModal } = useAuthModal();

	const [details, setDetails] = useState<InvitationDetails | null>(null);
	const [loadingDetails, setLoadingDetails] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isAccepting, setIsAccepting] = useState(false);

	const errorToastShown = useRef(false);
	const mismatchToastShown = useRef(false);

	useEffect(() => {
		if (!token) {
			if (!errorToastShown.current) {
				errorToastShown.current = true;
				toast.error(t("invitation.errors.missingToken") as string);
				router.push('/home');
			}
			return;
		}

		const fetchDetails = async () => {
			try {
				const response = await ApiService.get<InvitationDetails>(`/organization/invitation-details?token=${token}`);
				if (!response) throw new Error("Empty_Response");
				setDetails(response);
			} catch (err: unknown) {
				if (!errorToastShown.current) {
					errorToastShown.current = true;
					const apiError = err as ApiError;
					const msg = apiError.message || "";
					const serverMsg = apiError.response?.data?.message || "";

					let displayMessage = t("invitation.errors.invalid") as string;

					if (msg.toLowerCase().includes("expir") || serverMsg.toLowerCase().includes("expir")) {
						setError("Invitation expirée");
						displayMessage = "Ce lien d'invitation a expiré.";
					} else {
						setError("Invitation invalide");
					}

					toast.error(displayMessage);
					setTimeout(() => { router.push('/home'); }, 3000);
				}
			} finally {
				setLoadingDetails(false);
			}
		};
		fetchDetails();
	}, [token, router, t]);

	useEffect(() => {
		if (!loadingAuth && userProfile && details) {
			if (userProfile.email.toLowerCase() !== details.email.toLowerCase()) {
				if (!mismatchToastShown.current) {
					mismatchToastShown.current = true;
					toast.error(
						t("invitation.errors.emailMismatch", {
							currentEmail: userProfile.email,
							targetEmail: details.email
						}) as string,
						{ duration: 5000 }
					);
				}
			}
		}
	}, [userProfile, details, loadingAuth, router, t]);

	const handleAccept = async () => {
		if (!userProfile || !token) return;
		setIsAccepting(true);
		try {
			await ApiService.post("/organization/accept-invite", { token });
			toast.success(t("invitation.success.joined") as string);
			router.push("/organization");
		} catch (err: unknown) {
			const apiError = err as ApiError;
			const msg = apiError.response?.data?.message || (t("invitation.errors.acceptFailed") as string);
			toast.error(msg);
		} finally {
			setIsAccepting(false);
		}
	};

	const handleOpenAuth = (tab: 'login' | 'register') => {
		openAuthModal(tab, details?.email);
	};

	if (loadingAuth || loadingDetails) return <Loading />;

	if (error) {
		return (
			<div className={styles.container}>
				<LandingHeader forceVisible={true} />
				<Toaster position="top-center" />
				<div className={styles.card}>
					<div className={`${styles.icon} ${styles.iconError}`}>
						<XCircle size={40} />
					</div>
					<h1 className={styles.title}>{t("invitation.ui.invalidTitle")}</h1>
					<p className={styles.description}>{t("invitation.ui.redirecting")}</p>
				</div>
			</div>
		);
	}

	if (userProfile && details && userProfile.email.toLowerCase() !== details.email.toLowerCase()) {
		return (
			<div className={styles.container}>
				<LandingHeader forceVisible={true} />
				<Toaster position="top-center" />
				<div className={styles.card}>
					<div className={`${styles.icon} ${styles.iconError}`}>
						<ShieldAlert size={40} />
					</div>
					<h1 className={styles.title}>Compte incorrect</h1>
					<p className={styles.description}>
						Cette invitation est pour <strong>{details.email}</strong>.<br />
						Vous êtes connecté en tant que <strong>{userProfile.email}</strong>.
					</p>
					<button className={styles.secondaryButton} onClick={() => handleOpenAuth('login')}>
						<LogIn size={18} style={{ marginRight: 8 }} />
						Changer de compte
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<LandingHeader forceVisible={true} />
			<Toaster position="top-center" />
			<div className={styles.card}>
				<div className={styles.icon}>
					<Mail size={40} />
				</div>
				<h1 className={styles.title}>{t("invitation.ui.title")}</h1>
				<div className={styles.content}>
					<p><strong>{details?.inviter?.email}</strong> {t("invitation.ui.invitedBy")}</p>
					<div className={styles.orgName}>{details?.organization?.name}</div>
					<div className={styles.roleTag}>{t("invitation.ui.role")} {details?.role}</div>

					{userProfile && organizationMemberInfo && (
						<div className={styles.warningBox}>
							<div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
								<AlertCircle size={24} style={{ color: '#ef4444', flexShrink: 0 }} />
								<div style={{ textAlign: 'left' }}>
									<p style={{ margin: 0, fontWeight: 'bold' }}>{t("invitation.ui.warningTitle")}</p>
									<p style={{ margin: 0, fontSize: '0.85rem' }}>
										{t("invitation.ui.warningDescription", { org: details?.organization?.name ?? "" })}
									</p>
								</div>
							</div>
						</div>
					)}

					<p className={styles.instruction}>
						{t("invitation.ui.reservedFor")}<br /><strong>{details?.email}</strong>
					</p>
				</div>
				<div className={styles.actions}>
					{userProfile ? (
						<>
							<button
								className={styles.primaryButton}
								onClick={handleAccept}
								disabled={isAccepting || !!organizationMemberInfo}
							>
								{isAccepting ? t("invitation.buttons.validating") : t("invitation.buttons.accept")}
								{!isAccepting && <ArrowRight size={18} style={{ marginLeft: 8 }} />}
							</button>
							<button className={styles.secondaryButton} onClick={() => router.push("/dashboard")}>
								{t("invitation.buttons.ignore")}
							</button>
						</>
					) : (
						<>
							<button className={styles.primaryButton} onClick={() => handleOpenAuth('register')}>
								<UserPlus size={18} style={{ marginRight: 8 }} />
								{t("invitation.buttons.createAccount")}
							</button>
							<button className={styles.outlineButton} onClick={() => handleOpenAuth('login')}>
								<LogIn size={18} style={{ marginRight: 8 }} />
								{t("invitation.buttons.login")}
							</button>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

export default function InvitationClient() {
	return (
		<Suspense fallback={<Loading />}>
			<InvitationContent />
		</Suspense>
	);
}