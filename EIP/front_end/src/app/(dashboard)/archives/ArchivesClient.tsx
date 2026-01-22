"use client";

import React, { useState, useMemo } from "react";
import { Search, FileText } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import apiService from "@/services/api";
import ApplicationCard from "@/components/Card/Dashboardcard";
import ApplicationList from "@/components/List/DashboardList";
import EditApplicationModal from "@/components/EditApplicationModal";
import DetailsModal from "@/components/DetailsModal";
import { Application } from "@/interface/application.interface";
import { ApplicationStatus } from "@/enum/application-status.enum";
import { JobApply } from "@/interface/job-apply.interface";

import styles from "./Archives.module.css";

interface ArchivesClientProps {
	initialApplications: Application[];
	error: string | null;
}

export default function ArchivesClient({
	initialApplications,
	error: initialError,
}: ArchivesClientProps) {
	const { t } = useLanguage();
	const { userProfile } = useAuth();
	const [applications, setApplications] = useState<Application[]>(initialApplications);
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [viewMode] = useState<"grid" | "list">("grid");
	const [sortBy, setSortBy] = useState<"date" | "status">("date");
	const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());
	const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
	const [popupType, setPopupType] = useState<"edit" | "details" | null>(null);

	// Détermination du statut Premium
	const isPremium = useMemo(() => {
		const sub = userProfile?.subscription;
		if (!sub) return false;
		const isNotExpired = !sub.currentPeriodEnd || new Date(sub.currentPeriodEnd) > new Date();
		return sub.status === "ACTIVE" && isNotExpired;
	}, [userProfile]);

	const statusMap: Record<ApplicationStatus, string> = useMemo(
		() => ({
			[ApplicationStatus.OFFER_ACCEPTED]: t("dashboard.statuses.ACCEPTED"),
			[ApplicationStatus.PENDING]: t("dashboard.statuses.PENDING"),
			[ApplicationStatus.REJECTED_BY_COMPANY]: t("dashboard.statuses.REJECTED_BY_COMPANY"),
			[ApplicationStatus.INTERVIEW_SCHEDULED]: t("dashboard.statuses.INTERVIEW_SCHEDULED"),
			[ApplicationStatus.OFFER_RECEIVED]: t("dashboard.statuses.OFFER"),
		} as Record<ApplicationStatus, string>),
		[t]
	);

	const handleUpdateApplication = async () => {
		if (!selectedApplication) return;
		try {
			const updatedApp = await apiService.put<Application>(
				`/job_applies/${selectedApplication.id}/archived-status`,
				{
					company: selectedApplication.company,
					contractType: selectedApplication.contractType,
					imageUrl: selectedApplication.imageUrl,
					interviewDate: selectedApplication.interviewDate ? new Date(selectedApplication.interviewDate) : null,
					location: selectedApplication.location,
					salary: selectedApplication.salary,
					status: selectedApplication.status,
					title: selectedApplication.title,
				}
			);
			if (updatedApp) {
				setApplications((prev) =>
					prev.map((app) => (app.id === updatedApp.id ? updatedApp : app))
				);
			}
			closePopup();
		} catch (err: unknown) {
			console.error(t("dashboard.errors.updateError"), err);
		}
	};

	const handleUnarchiveApplication = async (id: string) => {
		try {
			await apiService.post(`/job_applies/${id}/unarchive`, {});
			setApplications((prev) => prev.filter((app) => app.id !== id));
		} catch (err: unknown) {
			console.error(t("dashboard.errors.archiveError"), err);
		}
	};

	const handleDeleteApplication = async (id: string) => {
		try {
			await apiService.delete(`/job_applies/${id}/archived`, {});
			setApplications((prev) => prev.filter((app) => app.id !== id));
		} catch (err: unknown) {
			console.error(t("dashboard.errors.deleteError"), err);
		}
	};

	const handleStatusChange = (statusKey: string) => {
		setSelectedStatuses((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(statusKey)) {
				newSet.delete(statusKey);
			} else {
				newSet.add(statusKey);
			}
			return newSet;
		});
	};

	const sortedAndFilteredApplications = useMemo(() => {
		const lowercasedSearchTerm = searchTerm.toLowerCase();
		return applications
			.filter(
				(app) =>
					(selectedStatuses.size === 0 || selectedStatuses.has(app.status)) &&
					(app.company?.toLowerCase().includes(lowercasedSearchTerm) ||
						app.title?.toLowerCase().includes(lowercasedSearchTerm))
			)
			.sort((a, b) => {
				if (sortBy === "date")
					return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
				const statusA = statusMap[a.status as ApplicationStatus] || "";
				const statusB = statusMap[b.status as ApplicationStatus] || "";
				return statusA.localeCompare(statusB);
			});
	}, [applications, selectedStatuses, sortBy, searchTerm, statusMap]);

	const closePopup = () => {
		setSelectedApplication(null);
		setPopupType(null);
	};

	const stats = useMemo(
		() => ({
			total: applications.length,
			pending: applications.filter((app) => app.status === ApplicationStatus.PENDING).length,
			offerReceived: applications.filter((app) => app.status === ApplicationStatus.OFFER_RECEIVED).length,
			refused: applications.filter((app) => app.status === ApplicationStatus.REJECTED_BY_COMPANY).length,
		}),
		[applications]
	);

	if (initialError) return <main className={styles.archivesErrorState}><p>{initialError}</p></main>;

	return (
		<main className={styles.archives}>
			<div className={styles.container}>
				<header className={styles.banner}>
					<div className={styles.bannerContent}>
						<h1 className={styles.bannerTitle}>{t("archives.title")}</h1>
						<p className={styles.bannerText}>{t("archives.description")}</p>
					</div>
					<div className={styles.searchContainer}>
						<input
							type="text"
							className={styles.searchInput}
							placeholder={t("archives.search.placeholder") as string}
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
						<Search className={styles.searchIcon} size={20} />
					</div>
				</header>

				<section className={styles.statsContainer}>
					<div className={styles.statCard}>
						<h3 className={styles.statTitle}>{t("shared.stats.total")}</h3>
						<p className={styles.statValue}>{stats.total}</p>
					</div>
					<div className={`${styles.statCard} ${styles.pending}`}>
						<h3 className={styles.statTitle}>{t("shared.stats.pending")}</h3>
						<p className={styles.statValue}>{stats.pending}</p>
					</div>
					<div className={`${styles.statCard} ${styles.accepted}`}>
						<h3 className={styles.statTitle}>{t("shared.stats.accepted")}</h3>
						<p className={styles.statValue}>{stats.offerReceived}</p>
					</div>
					<div className={`${styles.statCard} ${styles.refused}`}>
						<h3 className={styles.statTitle}>{t("shared.stats.refused")}</h3>
						<p className={styles.statValue}>{stats.refused}</p>
					</div>
				</section>

				<section className={styles.archivesControls}>
					<div className={styles.filterContainer}>
						{(Object.keys(statusMap) as ApplicationStatus[])
							.filter((key) => ["OFFER_RECEIVED", "PENDING", "REJECTED_BY_COMPANY"].includes(key))
							.map((statusKey) => (
								<label key={statusKey} className={styles.filterCheckbox}>
									<input
										type="checkbox"
										checked={selectedStatuses.has(statusKey)}
										onChange={() => handleStatusChange(statusKey)}
									/>
									<span className={styles.checkboxLabel}>{statusMap[statusKey]}</span>
								</label>
							))}
					</div>
					<div className={styles.controlsRight}>
						<select
							className={styles.sortSelect}
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value as "date" | "status")}
						>
							<option value="date">{t("shared.sorting.date")}</option>
							<option value="status">{t("shared.sorting.status")}</option>
						</select>
					</div>
				</section>

				<div className={viewMode === "grid" ? styles.applicationsGrid : styles.applicationsList}>
					{sortedAndFilteredApplications.length > 0 ? (
						sortedAndFilteredApplications.map((app) => (
							viewMode === "grid" ? (
								<ApplicationCard
									key={app.id}
									application={app as JobApply}
									isPremium={isPremium}
									statusMap={statusMap}
									onEdit={(a: JobApply) => { setSelectedApplication(a as unknown as Application); setPopupType("edit"); }}
									onArchive={handleUnarchiveApplication}
									onDelete={handleDeleteApplication}
									onDetails={(a: JobApply) => { setSelectedApplication(a as unknown as Application); setPopupType("details"); }}
								/>
							) : (
								<ApplicationList
									key={app.id}
									application={app as JobApply}
									isPremium={isPremium}
									statusMap={statusMap}
									onEdit={(a: JobApply) => { setSelectedApplication(a as unknown as Application); setPopupType("edit"); }}
									onArchive={handleUnarchiveApplication}
									onDelete={handleDeleteApplication}
									onDetails={(a: JobApply) => { setSelectedApplication(a as unknown as Application); setPopupType("details"); }}
								/>
							)
						))
					) : (
						<div className={styles.emptyState}>
							<FileText size={48} className={styles.emptyIcon} />
							<h3 className={styles.emptyTitle}>{t("archives.empty.title")}</h3>
							<p className={styles.emptyText}>{t("archives.empty.text")}</p>
						</div>
					)}
				</div>
			</div>

			{popupType === "edit" && selectedApplication && (
				<EditApplicationModal
					application={selectedApplication as unknown as JobApply}
					setApplication={(app) => setSelectedApplication(app as unknown as Application)}
					onUpdate={handleUpdateApplication}
					onClose={closePopup}
					statusMap={statusMap}
				/>
			)}
			{popupType === "details" && selectedApplication && (
				<DetailsModal
					application={selectedApplication as unknown as JobApply}
					onClose={closePopup}
					statusMap={statusMap}
				/>
			)}
		</main>
	);
}