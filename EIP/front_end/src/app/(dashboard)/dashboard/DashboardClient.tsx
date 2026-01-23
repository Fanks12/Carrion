"use client";

import React, { useState, useMemo } from "react";
import { Search, Plus, FileText } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import apiService from "@/services/api";
import ApplicationCard from "@/components/Card/Dashboardcard";
import ApplicationList from "@/components/List/DashboardList";
import EditApplicationModal from "@/components/EditApplicationModal";
import DetailsModal from "@/components/DetailsModal";
import AddApplicationModal, { ApplicationFormData } from "@/components/AddApplicationModal/AddApplicationModal";
import { Application } from "@/interface/application.interface";
import { JobApply } from "@/interface/job-apply.interface";
import { ApplicationStatus } from "@/enum/application-status.enum";
import toast from "react-hot-toast";
import styles from "./Dashboard.module.css";

interface DashboardClientProps {
	initialApplications: Application[];
	error: string | null;
}

export default function DashboardClient({ initialApplications, error: initialError }: DashboardClientProps) {
	const { t } = useLanguage();
	const { userProfile } = useAuth();
	const [applications, setApplications] = useState<Application[]>(initialApplications);
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [sortBy, setSortBy] = useState<"date" | "status">("date");
	const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());
	const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
	const [popupType, setPopupType] = useState<"add" | "edit" | "details" | null>(null);

	const isPremium = useMemo(() => {
		const sub = userProfile?.subscription;
		if (!sub) return false;
		const isNotExpired = !sub.currentPeriodEnd || new Date(sub.currentPeriodEnd) > new Date();
		return sub.status === "ACTIVE" && isNotExpired;
	}, [userProfile]);

	const statusMap: Record<ApplicationStatus, string> = useMemo(() => ({
		[ApplicationStatus.OFFER_ACCEPTED]: t("dashboard.statuses.ACCEPTED"),
		[ApplicationStatus.PENDING]: t("dashboard.statuses.PENDING"),
		[ApplicationStatus.INTERVIEW_SCHEDULED]: t("dashboard.statuses.INTERVIEW"),
		[ApplicationStatus.OFFER_RECEIVED]: t("dashboard.statuses.OFFER"),
		[ApplicationStatus.REJECTED_BY_COMPANY]: t("dashboard.statuses.REJECTED_BY_COMPANY"),
	} as Record<ApplicationStatus, string>), [t]);

	const stats = useMemo(
		() => ({
			total: applications.length,
			pending: applications.filter((app) => app.status === ApplicationStatus.PENDING).length,
			accepted: applications.filter((app) =>
				app.status === ApplicationStatus.OFFER_RECEIVED ||
				app.status === ApplicationStatus.OFFER_ACCEPTED
			).length,
			refused: applications.filter((app) => app.status === ApplicationStatus.REJECTED_BY_COMPANY).length,
		}),
		[applications]
	);

	const handleUpdateApplication = async () => {
		if (!selectedApplication) return;
		try {
			const { id, createdAt: _c, userId: _u, ...rest } = selectedApplication;
			const updatedApp = await apiService.put<Application>(`/job_applies/${id}/status`, {
				...rest,
				interviewDate: rest.interviewDate ? new Date(rest.interviewDate) : null,
			});
			if (updatedApp) {
				setApplications((prev) => prev.map((app) => (app.id === updatedApp.id ? updatedApp : app)));
			}
			closePopup();
		} catch (err) {
			console.error(err);
		}
	};

	const handleToggleSelection = async (application: JobApply | Application) => {
		try {
			const result = await apiService.patch<Application>(
				`/job_applies/${application.id}/toggle-selection`,
				{}
			);

			if (result && result.id) {
				setApplications((prev) =>
					prev.map((app) => (app.id === result.id ? result : app))
				);
				toast.success(result.isSelected ? t("common.followed") as string : t("common.follow") as string);
			} else if (result && 'error' in result) {
				toast.error(t(`dashboard.errors.${result.error}`) as string);
			}
		} catch (error: unknown) {
			const err = error as Error;
			toast.error(err.message || "Une erreur est survenue");
		}
	};

	const handleSaveNewApplication = async (data: ApplicationFormData) => {
		try {
			const newApp = await apiService.post<Application>("/job_applies/jobApply", data);
			if (newApp) setApplications((prev) => [newApp, ...prev]);
			closePopup();
		} catch (err) {
			console.error(err);
		}
	};

	const sortedAndFiltered = useMemo(() => {
		const term = searchTerm.toLowerCase();
		return applications
			.filter((app) => (selectedStatuses.size === 0 || selectedStatuses.has(app.status)) &&
				(app.company?.toLowerCase().includes(term) || app.title?.toLowerCase().includes(term)))
			.sort((a, b) => {
				if (sortBy === "date") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
				const statusA = statusMap[a.status as ApplicationStatus] || "";
				const statusB = statusMap[b.status as ApplicationStatus] || "";
				return statusA.localeCompare(statusB);
			});
	}, [applications, selectedStatuses, sortBy, searchTerm, statusMap]);

	const handleArchiveApplication = async (id: string) => {
		try {
			await apiService.post(`/job_applies/${id}/archive`, {});
			setApplications((prev) => prev.filter((app) => app.id !== id));
		} catch (err: unknown) {
			console.error(t("dashboard.errors.archiveError"), err);
		}
	};

	const handleDeleteApplication = async (id: string) => {
		try {
			await apiService.delete(`/job_applies/${id}`, {});
			setApplications((prev) => prev.filter((app) => app.id !== id));
		} catch (err: unknown) {
			console.error(t("dashboard.errors.deleteError"), err);
		}
	};

	const closePopup = () => {
		setSelectedApplication(null);
		setPopupType(null);
	};

	if (initialError) return <main className={styles.dashboardErrorState}><p>{initialError}</p></main>;

	return (
		<main className={styles.mainContent}>
			<div className={styles.container}>
				<header className={styles.banner}>
					<div className={styles.bannerContent}>
						<h1 className={styles.bannerTitle}>{t("dashboard.title")}</h1>
						<p className={styles.bannerText}>{t("dashboard.description")}</p>
					</div>
					<div className={styles.bannerActions}>
						<button className={styles.addApplicationBtn} onClick={() => setPopupType("add")}>
							<Plus size={20} />
							<span>{t("dashboard.addApplication")}</span>
						</button>
						<div className={styles.searchContainer}>
							<input type="search" className={styles.searchInput} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t("dashboard.search.placeholder") as string} />
							<Search className={styles.searchIcon} size={20} />
						</div>
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
						<p className={styles.statValue}>{stats.accepted}</p>
					</div>
					<div className={`${styles.statCard} ${styles.refused}`}>
						<h3 className={styles.statTitle}>{t("shared.stats.refused")}</h3>
						<p className={styles.statValue}>{stats.refused}</p>
					</div>
				</section>

				<section className={styles.controlsContainer}>
					<div className={styles.filterContainer}>
						{(Object.keys(statusMap) as ApplicationStatus[]).map((key) => (
							<label key={key} className={styles.filterCheckbox}>
								<input type="checkbox" checked={selectedStatuses.has(key)} onChange={() => setSelectedStatuses(prev => {
									const n = new Set(prev);
									if (n.has(key)) {
										n.delete(key);
									} else {
										n.add(key);
									}
									return n;
								})} />
								<span className={styles.checkboxLabel}>{statusMap[key]}</span>
							</label>
						))}
					</div>
					<div className={styles.controlsRight}>
						<select className={styles.sortSelect} value={sortBy} onChange={(e) => setSortBy(e.target.value as "date" | "status")}>
							<option value="date">{t("shared.sorting.date")}</option>
							<option value="status">{t("shared.sorting.status")}</option>
						</select>
						<div className={styles.viewToggle}>
							<button className={`${styles.toggleButton} ${viewMode === "grid" ? styles.active : ""}`} onClick={() => setViewMode("grid")}>Grid</button>
							<button className={`${styles.toggleButton} ${viewMode === "list" ? styles.active : ""}`} onClick={() => setViewMode("list")}>List</button>
						</div>
					</div>
				</section>

				<div className={viewMode === "grid" ? styles.applicationsGrid : styles.applicationsList}>
					{sortedAndFiltered.length > 0 ? (
						sortedAndFiltered.map((app) => (
							viewMode === "grid" ? (
								<ApplicationCard
									key={app.id}
									application={app as JobApply}
									isPremium={isPremium}
									statusMap={statusMap}
									onEdit={(a: JobApply) => { setSelectedApplication(a as unknown as Application); setPopupType("edit"); }}
									onArchive={() => { handleArchiveApplication(app.id); }}
									onDelete={() => { handleDeleteApplication(app.id); }}
									onDetails={(a: JobApply) => { setSelectedApplication(a as unknown as Application); setPopupType("details"); }}
									onToggleSelection={handleToggleSelection}
								/>
							) : (
								<ApplicationList
									key={app.id}
									application={app as JobApply}
									isPremium={isPremium}
									statusMap={statusMap}
									onEdit={(a: JobApply) => { setSelectedApplication(a as unknown as Application); setPopupType("edit"); }}
									onArchive={() => { handleArchiveApplication(app.id); }}
									onDelete={() => { handleDeleteApplication(app.id); }}
									onDetails={(a: JobApply) => { setSelectedApplication(a as unknown as Application); setPopupType("details"); }}
									onToggleSelection={handleToggleSelection}
								/>
							)
						))
					) : (
						<div className={styles.emptyState}>
							<FileText size={48} className={styles.emptyIcon} />
							<h3 className={styles.emptyTitle}>{t("dashboard.empty.title")}</h3>
							<p className={styles.emptyText}>{t("dashboard.empty.text")}</p>
						</div>
					)}
				</div>
			</div>

			{popupType === "add" && <AddApplicationModal onAdd={handleSaveNewApplication} onClose={closePopup} statusMap={statusMap} />}
			{popupType === "edit" && selectedApplication && <EditApplicationModal application={selectedApplication as unknown as JobApply} setApplication={(app) => setSelectedApplication(app as unknown as Application)} onUpdate={handleUpdateApplication} onClose={closePopup} statusMap={statusMap} />}
			{popupType === "details" && selectedApplication && <DetailsModal application={selectedApplication as unknown as JobApply} onClose={closePopup} statusMap={statusMap} />}
		</main>
	);
}