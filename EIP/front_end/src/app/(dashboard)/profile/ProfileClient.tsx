"use client";

import React, { useState, useRef, useEffect, useMemo, Suspense } from "react";
import Image from "next/image";
import { CircleUserRound } from "lucide-react";
import DatePicker, { registerLocale } from "react-datepicker";
import Select, { MultiValue, SingleValue, StylesConfig } from "react-select";
import AsyncSelect from "react-select/async";
import debounce from "lodash/debounce";
import { fr } from "date-fns/locale/fr";
import toast from "react-hot-toast";
import "react-datepicker/dist/react-datepicker.css";
import apiService from "@/services/api";
import { jobSectors } from "@/data/jobSectors";
import { contractOptions } from "@/data/contractOptions";
import ServicesCard from "@/components/ServicesCard/ServicesCard";
import AddServiceModal from "@/components/AddServiceModal/AddServiceModal";
import ChangePasswordModal from "@/components/ChangePasswordModal/ChangePasswordModal";
import CustomDateInput from "@/components/CustomDateInput";
import CvCard from "@/components/CvCard/CvCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { ConnectedService, UserProfile } from "@/interface/user.interface";
import { SelectOption } from "@/interface/misc.interface";
import styles from "./Profile.module.css";
import Loading from "@/components/Loading/Loading";
import { useRouter } from "next/navigation";

registerLocale("fr", fr);

type ProfileDetails = UserProfile['userProfile'];

interface FlatProfile extends ProfileDetails {
	userId?: string;
	email?: string;
	username?: string;
}

type ProfileInput = UserProfile | FlatProfile;

type FormUserProfile = Omit<UserProfile, 'userProfile' | 'subscription'> & {
	userProfile: Omit<UserProfile['userProfile'], 'birthDate'> & {
		birthDate?: Date | null;
	};
};

interface ProfileClientProps {
	initialProfile: ProfileInput | null;
	initialServices: ConnectedService[];
	initialCvUrl: string | null;
	initialProfilePictureUrl: string | null;
	error: string | null;
	shouldRetry?: boolean;
}

function ProfileContent({
	initialProfile,
	initialServices,
	initialCvUrl,
	initialProfilePictureUrl,
	error: initialError,
}: ProfileClientProps) {
	const { t } = useLanguage();
	const { userProfile: authProfile, setUserProfile } = useAuth();

	const activeProfile: ProfileInput | null = initialProfile || authProfile;

	const [personalInfo, setPersonalInfo] = useState<FormUserProfile | null>(null);
	const [selectedCity, setSelectedCity] = useState<SelectOption | null>(null);
	const [connectedServices, setConnectedServices] = useState<ConnectedService[]>(initialServices);
	const [cvUrl, setCvUrl] = useState<string | null>(initialCvUrl);
	const [uploadedImage, setUploadedImage] = useState<string | null>(initialProfilePictureUrl);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [uploadingCv, setUploadingCv] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (activeProfile) {
			let rawData: ProfileDetails;
			let rootData: Pick<UserProfile, 'id' | 'email' | 'username'>;

			if ('userProfile' in activeProfile && activeProfile.userProfile) {
				rawData = activeProfile.userProfile;
				rootData = {
					id: activeProfile.id,
					email: activeProfile.email,
					username: activeProfile.username
				};
			} else {
				const flat = activeProfile as FlatProfile;
				rawData = flat;
				rootData = {
					id: flat.userId || "",
					email: flat.email || "",
					username: flat.username || ""
				};
			}

			const cleanProfileState: FormUserProfile = {
				...rootData,
				isEmailVerified: true,
				tokens: [],
				userProfile: {
					...rawData,
					birthDate: rawData.birthDate ? new Date(rawData.birthDate) : null,
				}
			};

			setPersonalInfo(cleanProfileState);

			if (rawData.city) {
				setSelectedCity({ label: rawData.city, value: rawData.city });
			}

			if (initialProfilePictureUrl) {
				setUploadedImage(initialProfilePictureUrl);
			}

			const resume = initialCvUrl || rawData.resume;
			if (resume) setCvUrl(resume);
		}
	}, [activeProfile, initialProfilePictureUrl, initialCvUrl]);

	useEffect(() => {
		setPersonalInfo((prev) => {
			if (!prev) return null;
			const newCity = selectedCity?.value || "";

			if (prev.userProfile.city === newCity) return prev;

			return {
				...prev,
				userProfile: {
					...prev.userProfile,
					city: newCity,
				},
			};
		});
	}, [selectedCity]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!personalInfo) return;

		const payload = {
			firstName: personalInfo.userProfile.firstName,
			lastName: personalInfo.userProfile.lastName,
			phoneNumber: personalInfo.userProfile.phoneNumber,
			birthDate: personalInfo.userProfile.birthDate
				? new Date(personalInfo.userProfile.birthDate).toISOString()
				: null,
			city: personalInfo.userProfile.city,
			school: personalInfo.userProfile.school,
			portfolioLink: personalInfo.userProfile.portfolioLink,
			linkedin: personalInfo.userProfile.linkedin,
			contractSought: personalInfo.userProfile.contractSought,
			sector: personalInfo.userProfile.sector,
			locationSought: personalInfo.userProfile.locationSought,
		};

		const savePromise = apiService.post("/user-profile", payload);

		try {
			await toast.promise(savePromise, {
				loading: (t("profile.saving") as string) || "Saving...",
				success: (t("profile.saveSuccess") as string) || "Profile saved!",
				error: (err: unknown) => {
					const message = err instanceof Error ? err.message : "Unknown error";
					return `Error: ${message}`;
				},
			});

			if (activeProfile && 'userProfile' in activeProfile) {
				const existingBirthDate = activeProfile.userProfile.birthDate;

				const finalBirthDate = payload.birthDate
					? new Date(payload.birthDate)
					: (existingBirthDate ? new Date(existingBirthDate) : null);

				const updatedContextProfile: UserProfile = {
					...activeProfile,
					userProfile: {
						...activeProfile.userProfile,
						...payload,
						birthDate: finalBirthDate as Date,
					}
				};

				setUserProfile(updatedContextProfile);
			}
		} catch (error) {
			console.error("Critical save error", error);
		}
	};

	const debouncedLoadCities = useMemo(
		() =>
			debounce(
				(inputValue: string, callback: (options: SelectOption[]) => void) => {
					if (inputValue.length < 2) return callback([]);
					apiService
						.fetchAndFormatCities(inputValue)
						.then((options) => callback(options))
						.catch(() => callback([]));
				},
				500
			),
		[]
	);

	const handleDisconnectService = async (serviceName: string) => {
		if (!window.confirm(`Disconnect the service?`)) return;
		const disconnectPromise = apiService.delete(`/user-profile/services/${serviceName}`);

		await toast.promise(disconnectPromise, {
			loading: "Disconnecting...",
			success: () => {
				setConnectedServices((prev) => prev.filter((s) => s.name !== serviceName));
				return "Service disconnected!";
			},
			error: "Disconnection error.",
		});
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setPersonalInfo((prev) => {
			if (!prev) return null;
			return {
				...prev,
				userProfile: {
					...prev.userProfile,
					[name]: value,
				},
			};
		});
	};

	const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const tempUrl = URL.createObjectURL(file);
		setUploadedImage(tempUrl);
		setUploading(true);

		try {
			const response = await apiService.post<{ signedUrl: string }>(
				`/s3/upload?filename=profile&contentType=${file.type}`,
				{}
			);

			if (!response?.signedUrl) throw new Error("Upload URL error");

			await fetch(response.signedUrl, {
				method: "PUT",
				headers: { "Content-Type": file.type },
				body: file,
			});

			const downloadResponse = await apiService.get<{ signedUrl: string }>(`/s3/download?filename=profile`);
			if (downloadResponse?.signedUrl) {
				setUploadedImage(downloadResponse.signedUrl);
			}
			toast.success("Image updated!");
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : "Unknown error";
			toast.error(`Image upload error: ${msg}`);
			setUploadedImage(initialProfilePictureUrl);
		} finally {
			setUploading(false);
			URL.revokeObjectURL(tempUrl);
		}
	};

	const handleDeleteProfilePicture = async (e: React.MouseEvent) => {
		e.stopPropagation();
		e.preventDefault();
		if (!window.confirm(t("profile.removePictureConfirmation") as string)) return;
		try {
			await apiService.delete(`/s3/delete?filename=profile`, {});
			setUploadedImage(null);
			toast.success(t("profile.removePictureSuccess") as string);
		} catch {
			toast.error(t("profile.removePictureError") as string);
		}
	};

	const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setUploadingCv(true);
		try {
			const response = await apiService.post<{ signedUrl: string } | null>(
				`/s3/upload?filename=cv&contentType=${file.type}`,
				{}
			);
			if (!response?.signedUrl) throw new Error("Upload URL error");

			await fetch(response.signedUrl, {
				method: "PUT",
				headers: { "Content-Type": file.type },
				body: file,
			});
			const newCvData = await apiService.get<{ signedUrl: string }>(`/s3/download?filename=cv`);
			if (newCvData?.signedUrl) setCvUrl(newCvData.signedUrl);
			toast.success("CV uploaded!");
		} catch {
			toast.error("CV upload error");
		} finally {
			setUploadingCv(false);
		}
	};

	const handleCvDelete = async () => {
		if (!window.confirm("Delete CV?")) return;
		try {
			await apiService.delete(`/s3/delete?filename=cv`, {});
			setCvUrl(null);
			toast.success("CV deleted!");
		} catch {
			toast.error("CV deletion error");
		}
	};

	const multiSelectStyles: StylesConfig<SelectOption, true> = {
		menuPortal: (base) => ({ ...base, zIndex: 10011 }),
	};
	const singleSelectStyles: StylesConfig<SelectOption, false> = {
		menuPortal: (base) => ({ ...base, zIndex: 10011 }),
	};

	const getSelectedObjects = (opts: readonly SelectOption[], vals: string[] | undefined): SelectOption[] => {
		if (!vals) return [];
		return vals.map((v) => opts.find((o) => o.value === v)).filter((item): item is SelectOption => !!item);
	};

	const getLocationObjects = (vals: string[] | undefined) => vals?.map((v) => ({ label: v, value: v })) || [];

	if (initialError) return <main className={styles.profilePage}>Error: {initialError}</main>;

	return (
		<>
			<main className={styles.profilePage}>
				<div className={styles.profileContainer}>
					<aside className={styles.profileRightColumn}>
						<section className={styles.profileCard + " " + styles.profilePictureCard}>
							<div
								className={styles.imageWrapper}
								onClick={() => fileInputRef.current?.click()}
							>
								<input
									type="file"
									ref={fileInputRef}
									onChange={handleImageUpload}
									accept="image/*"
									style={{ display: "none" }}
								/>

								{uploading ? (
									<div>...</div>
								) : uploadedImage ? (
									<>
										<Image
											src={uploadedImage}
											alt={t("profile.picture") as string}
											width={120}
											height={120}
											className={styles.profileImg}
											unoptimized={true}
											priority
											onError={() => setUploadedImage(null)}
										/>
										<button
											onClick={handleDeleteProfilePicture}
											className={styles.deleteButton}
											title="Delete"
											type="button"
										>
											×
										</button>
									</>
								) : (
									<CircleUserRound size={120} color="#9ca3af" />
								)}
							</div>
							<h3 className={styles.profileName}>
								{personalInfo?.userProfile?.firstName || ""} {personalInfo?.userProfile?.lastName || ""}
							</h3>
						</section>

						<ServicesCard
							connectedServices={connectedServices}
							onAddService={() => setIsModalOpen(true)}
							onDisconnectService={handleDisconnectService}
						/>
					</aside>

					<form className={styles.profileLeftColumn} id="profile-form" onSubmit={handleSubmit}>
						<article className={styles.profileCard}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
								<h2 style={{ margin: 0 }}>{t("profile.personalInfo") as string}</h2>
								<button
									type="button"
									onClick={() => setIsPasswordModalOpen(true)}
									style={{
										backgroundColor: "transparent",
										border: "1px solid #d1d5db",
										color: "inherit",
										padding: "0.5rem 1rem",
										borderRadius: "0.375rem",
										cursor: "pointer",
										fontSize: "0.875rem",
										fontWeight: 500
									}}
								>
									{t("settings.changePassword") as string || "Change Password"}
								</button>
							</div>
							<div className={styles.profileInfoForm}>
								<div className={styles.formGrid}>

									<div className={styles.formGroup}>
										<label htmlFor="lastName">{t("auth.lastName") as string}</label>
										<input
											id="lastName"
											type="text"
											name="lastName"
											value={personalInfo?.userProfile?.lastName || ""}
											onChange={handleChange}
										/>
									</div>

									<div className={styles.formGroup}>
										<label htmlFor="firstName">{t("auth.firstName") as string}</label>
										<input
											id="firstName"
											type="text"
											name="firstName"
											value={personalInfo?.userProfile?.firstName || ""}
											onChange={handleChange}
										/>
									</div>

									<div className={styles.formGroup}>
										<label htmlFor="phoneNumber">{t("profile.phone") as string}</label>
										<input
											id="phoneNumber"
											type="tel"
											name="phoneNumber"
											value={personalInfo?.userProfile?.phoneNumber || ""}
											onChange={handleChange}
										/>
									</div>

									<div className={styles.formGroup}>
										<label htmlFor="birthDate">{t("auth.birthDate") as string}</label>
										<DatePicker
											id="birthDate"
											selected={personalInfo?.userProfile?.birthDate || undefined}
											onChange={(date: Date | null) =>
												setPersonalInfo((prev) => {
													if (!prev) return null;
													return {
														...prev,
														userProfile: {
															...prev.userProfile,
															birthDate: date,
														},
													};
												})
											}
											locale="fr"
											dateFormat="dd/MM/yyyy"
											showYearDropdown
											showMonthDropdown
											dropdownMode="select"
											maxDate={new Date()}
											customInput={<CustomDateInput />}
										/>
									</div>

									<div className={styles.formGroup}>
										<label htmlFor="city">{t("dashboard.applicationForm.location") as string}</label>
										<AsyncSelect
											inputId="city"
											cacheOptions
											classNamePrefix="select"
											placeholder={t("profile.search") as string}
											loadOptions={debouncedLoadCities}
											value={selectedCity}
											onChange={(selected: SingleValue<SelectOption>) => setSelectedCity(selected)}
											isClearable
											styles={singleSelectStyles}
											menuPortalTarget={typeof document !== "undefined" ? document.body : null}
										/>
									</div>

									<div className={styles.formGroup}>
										<label htmlFor="school">{t("profile.school") as string}</label>
										<input
											id="school"
											type="text"
											name="school"
											value={personalInfo?.userProfile?.school || ""}
											onChange={handleChange}
										/>
									</div>

									<div className={styles.formGroup + " fullWidth"}>
										<label htmlFor="portfolioLink">{t("modal.add.website") as string}</label>
										<input
											id="portfolioLink"
											type="text"
											name="portfolioLink"
											value={personalInfo?.userProfile?.portfolioLink || ""}
											onChange={handleChange}
										/>
									</div>

									<div className={styles.formGroup + " fullWidth"}>
										<label htmlFor="linkedin">LinkedIn</label>
										<input
											id="linkedin"
											type="text"
											name="linkedin"
											value={personalInfo?.userProfile?.linkedin || ""}
											onChange={handleChange}
										/>
									</div>
								</div>
							</div>
						</article>

						<CvCard
							cvUrl={cvUrl as string}
							uploadingCv={uploadingCv}
							onUpload={handleCvUpload}
							onDelete={handleCvDelete}
						/>

						<article className={styles.profileCard}>
							<h2>{t("profile.preferences") as string}</h2>
							<div className={styles.profileInfoForm}>
								<div className={styles.formGrid}>

									<div className={styles.formGroup}>
										<label htmlFor="contractSought">{t("profile.contractType") as string}</label>
										<Select
											inputId="contractSought"
											isMulti
											classNamePrefix="select"
											placeholder={t("profile.selectContract") as string}
											options={contractOptions}
											value={getSelectedObjects(contractOptions, personalInfo?.userProfile?.contractSought || [])}
											onChange={(selected: MultiValue<SelectOption>) =>
												setPersonalInfo((prev) => {
													if (!prev) return null;
													return {
														...prev,
														userProfile: {
															...prev.userProfile,
															contractSought: selected ? selected.map((s) => s.value) : [],
														},
													};
												})
											}
											styles={multiSelectStyles}
											menuPortalTarget={typeof document !== "undefined" ? document.body : null}
										/>
									</div>

									<div className={styles.formGroup}>
										<label htmlFor="sector">{t("profile.sector") as string}</label>
										<Select
											inputId="sector"
											isMulti
											classNamePrefix="select"
											placeholder={t("profile.selectSector") as string}
											options={jobSectors}
											value={getSelectedObjects(jobSectors, personalInfo?.userProfile?.sector || [])}
											onChange={(selected: MultiValue<SelectOption>) =>
												setPersonalInfo((prev) => {
													if (!prev) return null;
													return {
														...prev,
														userProfile: {
															...prev.userProfile,
															sector: selected ? selected.map((s) => s.value) : [],
														},
													};
												})
											}
											styles={multiSelectStyles}
											menuPortalTarget={typeof document !== "undefined" ? document.body : null}
										/>
									</div>

									<div className={styles.formGroup + " fullWidth"}>
										<label htmlFor="locationSought">{t("profile.location") as string}</label>
										<AsyncSelect
											inputId="locationSought"
											isMulti
											classNamePrefix="select"
											placeholder={t("profile.searchOrCreate") as string}
											loadOptions={debouncedLoadCities}
											value={getLocationObjects(personalInfo?.userProfile?.locationSought || [])}
											onChange={(selected: MultiValue<SelectOption>) =>
												setPersonalInfo((prev) => {
													if (!prev) return null;
													return {
														...prev,
														userProfile: {
															...prev.userProfile,
															locationSought: selected ? selected.map((s) => s.value) : [],
														},
													};
												})
											}
											styles={multiSelectStyles}
											menuPortalTarget={typeof document !== "undefined" ? document.body : null}
										/>
									</div>
								</div>
							</div>
						</article>

						<div className={styles.formActionsGlobal}>
							<button type="submit" className={styles.saveButton}>
								{t("profile.saveChanges") as string}
							</button>
						</div>
					</form>
				</div>
			</main>
			<AddServiceModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				connectedServices={connectedServices}
			/>
			<ChangePasswordModal
				isOpen={isPasswordModalOpen}
				onClose={() => setIsPasswordModalOpen(false)}
				hasCurrentPassword={authProfile?.hasPassword}
			/>
		</>
	);
}

export default function ProfileClient(props: ProfileClientProps) {
	const router = useRouter();
	const [isRetrying, setIsRetrying] = useState(props.shouldRetry);

	useEffect(() => {
		if (props.shouldRetry) {
			console.log("Client: Token missing from server, attempting refresh...");
			router.refresh();
		} else {
			setIsRetrying(false);
		}
	}, [props.shouldRetry, router]);

	if (isRetrying) {
		return <Loading />;
	}

	return (
		<Suspense fallback={<Loading />}>
			<ProfileContent {...props} />
		</Suspense>
	);
}