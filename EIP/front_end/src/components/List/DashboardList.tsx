"use client";
import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import styles from "./DashboardList.module.css";
import Image from "next/image";
import { ApplicationStatus } from "@/enum/application-status.enum";
import { JobApply } from "@/interface/job-apply.interface";
import {
	Eye,
	Pencil,
	Archive,
	Trash2,
	Building2,
	Zap,
	Calendar,
	MapPin
} from "lucide-react";

interface ApplicationListProps {
	application: JobApply;
	isPremium: boolean;
	statusMap: Record<ApplicationStatus, string>;
	onEdit: (application: JobApply) => void;
	onDetails: (application: JobApply) => void;
	onDelete: (id: string) => void;
	onArchive: (id: string) => void;
	onToggleSelection?: (application: JobApply) => void;
}

const ApplicationList: React.FC<ApplicationListProps> = ({
	application,
	isPremium,
	statusMap,
	onEdit,
	onDetails,
	onDelete,
	onArchive,
	onToggleSelection,
}) => {
	const { t } = useLanguage();


	const getStatusStyleKey = (status: ApplicationStatus) => {
		switch (status) {
			case ApplicationStatus.OFFER_ACCEPTED: return styles.statusAccepted;
			case ApplicationStatus.PENDING: return styles.statusPending;
			case ApplicationStatus.REJECTED_BY_COMPANY: return styles.statusRefused;
			case ApplicationStatus.INTERVIEW_SCHEDULED: return styles.statusInterview;
			case ApplicationStatus.OFFER_RECEIVED: return styles.statusOffer;
			default: return "";
		}
	};


	const selectionClass = (application.isSelected && !isPremium) ? styles.listSelected : '';

	return (
		<div className={`${styles.modernApplicationListItem} ${getStatusStyleKey(application.status)} ${selectionClass}`}>
			<div className={styles.modernListContent}>

				<div className={styles.modernListLogo}>
					{application.imageUrl ? (
						<Image src={application.imageUrl} alt="logo" width={48} height={48} unoptimized />
					) : (
						<div className={styles.modernLogoPlaceholderList}><Building2 size={20} /></div>
					)}
				</div>

				<div className={styles.modernListInfo}>
					<h3 className={styles.modernCompanyNameList}>{application.company}</h3>
					<p className={styles.modernJobTitleList}>{application.title}</p>
				</div>

				<div className={styles.modernStatusBadgeList}>
					<span>{statusMap[application.status]}</span>
				</div>

				<div className={styles.modernListDetails}>
					<div className={styles.detailItemModern}>
						<Calendar size={16} />
						<span>{new Date(application.createdAt).toLocaleDateString()}</span>
					</div>
					<div className={styles.detailItemModern}>
						<MapPin size={16} />
						<span>{application.location || "N/A"}</span>
					</div>
				</div>

				<div className={styles.modernListActions}>
					{/* Bouton masqué si l'utilisateur est Premium */}
					{onToggleSelection && !isPremium && (
						<button
							className={`${styles.followButtonList} ${application.isSelected ? styles.activeZap : ""}`}
							onClick={() => onToggleSelection(application)}
						>
							<Zap size={14} fill={application.isSelected ? "currentColor" : "none"} />
							<span>{application.isSelected ? t("common.followed") : t("common.follow")}</span>
						</button>
					)}

					<button className={`${styles.modernListButton} ${styles.primary}`} onClick={() => onDetails(application)}>
						<Eye size={18} />
					</button>
					<button className={styles.modernListButton} onClick={() => onEdit(application)}>
						<Pencil size={18} />
					</button>
					<button className={styles.modernListButton} onClick={() => onArchive(application.id)}>
						<Archive size={18} />
					</button>
					<button className={`${styles.modernListButton} ${styles.danger}`} onClick={() => onDelete(application.id)}>
						<Trash2 size={18} />
					</button>
				</div>

			</div>
		</div>
	);
};

export default ApplicationList;