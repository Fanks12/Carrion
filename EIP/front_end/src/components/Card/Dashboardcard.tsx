"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useLanguage } from "../../contexts/LanguageContext";
import styles from "./Dashboardcard.module.css";
import { ApplicationStatus } from "@/enum/application-status.enum";
import { JobApply } from "@/interface/job-apply.interface";
import { FiMapPin, FiCalendar, FiDollarSign } from "react-icons/fi";
import { Zap, Radio } from "lucide-react";

interface ApplicationCardProps {
	application: JobApply;
	isPremium: boolean;
	statusMap: Record<ApplicationStatus, string>;
	onEdit: (application: JobApply) => void;
	onDetails: (application: JobApply) => void;
	onDelete: (id: string) => void;
	onArchive: (id: string) => void;
	onToggleSelection?: (application: JobApply) => void;
}

function ApplicationCard({ application, isPremium, statusMap, onEdit, onDetails, onDelete, onArchive, onToggleSelection }: ApplicationCardProps) {
	const { t } = useLanguage();
	const pathname = usePathname();
	const isArchivePage = pathname.includes("archives");

	const getStatusClass = (status: ApplicationStatus) => {
		switch (status) {
			case ApplicationStatus.OFFER_ACCEPTED: return "status-accepted";
			case ApplicationStatus.PENDING: return "status-pending";
			case ApplicationStatus.REJECTED_BY_COMPANY: return "status-refused";
			case ApplicationStatus.INTERVIEW_SCHEDULED: return "status-interview";
			case ApplicationStatus.OFFER_RECEIVED: return "status-offer";
			default: return "";
		}
	};

	const statusClassName = styles[getStatusClass(application.status)];

	const formatDate = (date: string) => {
		if (!date) return null;
		return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
	};

	return (
		<div className={`${styles.modernApplicationCard} ${statusClassName || ''} ${application.isSelected && !isPremium ? styles.cardSelected : ''}`}>
			{/* Badge masqué si Premium */}
			{application.isSelected && !isPremium && (
				<div className={styles.selectionBadge}>
					<Radio size={14} className={styles.signalIcon} />
					<span>{t("dashboard.selection.active")}</span>
				</div>
			)}

			<div className={styles.modernCardHeader}>
				<div className={styles.companyLogoSection}>
					{application.imageUrl ? (
						<Image src={application.imageUrl} alt="logo" className={styles.modernCompanyLogo} width={48} height={48} unoptimized />
					) : (
						<div className={styles.modernLogoPlaceholder}><span>{application.company?.charAt(0).toUpperCase() || "?"}</span></div>
					)}
				</div>
				<div className={styles.companyInfoSection}>
					<div className={styles.headerTopRow}>
						<h3 className={styles.modernCompanyName}>{application.company}</h3>
						{application.contractType && <span className={styles.contractTypeBadge}>{application.contractType}</span>}
					</div>
					<p className={styles.modernJobTitle}>{application.title}</p>
					<div className={styles.modernStatusBadge}>
						<div className={styles.statusIndicator}></div>
						<span className={styles.statusText}>{statusMap[application.status]}</span>
					</div>
				</div>
			</div>

			<div className={styles.modernCardContent}>
				<div className={styles.infoGrid}>
					<div className={styles.infoItem}><FiMapPin className={styles.infoIcon} /><span>{application.location || t("dashboard.notSpecified")}</span></div>
					<div className={styles.infoItem}><FiCalendar className={styles.infoIcon} /><span>{formatDate(application.createdAt)}</span></div>
					<div className={styles.infoItem}><FiDollarSign className={styles.infoIcon} /><span>{application.salary ? `${application.salary} €` : t("dashboard.notSpecified")}</span></div>
				</div>
			</div>

			<div className={styles.modernCardActions}>
				<div className={styles.primaryActionsRow}>
					<button className={`${styles.modernActionButton} ${styles.primary}`} onClick={() => onDetails(application)}>
						{t("common.details")}
					</button>

					{/* Bouton masqué si Premium */}
					{onToggleSelection && !isArchivePage && !isPremium && (
						<button
							className={`${styles.modernActionButton} ${application.isSelected ? styles.selectedAction : styles.secondary}`}
							onClick={() => onToggleSelection(application)}
						>
							<Zap size={14} fill={application.isSelected ? "currentColor" : "none"} />
							<span>{application.isSelected ? t("common.followed") : t("common.follow")}</span>
						</button>
					)}
				</div>

				<div className={styles.secondaryActions}>
					<button className={`${styles.modernActionButton} ${styles.secondary}`} onClick={() => onEdit(application)}>{t("common.edit")}</button>
					<button className={`${styles.modernActionButton} ${styles.secondary}`} onClick={() => onArchive(application.id)}>
						{pathname.includes("archives") ? t("common.unarchive") : t("common.archive")}
					</button>
					<button className={`${styles.modernActionButton} ${styles.danger}`} onClick={() => onDelete(application.id)}>{t("common.delete")}</button>
				</div>
			</div>
		</div>
	);
}

export default ApplicationCard;