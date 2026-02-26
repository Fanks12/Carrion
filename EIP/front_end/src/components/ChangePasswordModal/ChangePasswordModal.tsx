"use client";

import React, { useState } from "react";
import apiService from "@/services/api";
import styles from "./ChangePasswordModal.module.css";
import PrimaryButton from "@/components/Button/PrimaryButton";
import { FiEye, FiEyeOff, FiCheckCircle, FiXCircle, FiX } from "react-icons/fi";
import { passwordRegEX } from "@/services/utils";
import toast from "react-hot-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
	isOpen: boolean;
	onClose: () => void;
	hasCurrentPassword?: boolean;
}

export default function ChangePasswordModal({ isOpen, onClose, hasCurrentPassword = true }: Props) {
	const { t } = useLanguage();
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPasswords, setShowPasswords] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [passwordCriteria, setPasswordCriteria] = useState({
		length: false,
		upper: false,
		lower: false,
		number: false,
		special: false,
	});

	if (!isOpen) return null;

	const validatePassword = (pwd: string) => {
		setPasswordCriteria({
			length: pwd.length >= 8,
			upper: /[A-Z]/.test(pwd),
			lower: /[a-z]/.test(pwd),
			number: /\d/.test(pwd),
			special: /.*[\W_]/.test(pwd),
		});
	};

	const ValidationCriterion = ({ isValid, text }: { isValid: boolean; text: string }) => (
		<li className={isValid ? styles.valid : styles.invalid}>
			{isValid ? <FiCheckCircle /> : <FiXCircle />}
			<span>{text}</span>
		</li>
	);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;

		if (!passwordRegEX.test(newPassword)) {
			return toast.error(t("auth.passwordInvalid") as string);
		}
		if (newPassword !== confirmPassword) {
			return toast.error(t("auth.passwordMismatch") as string);
		}

		setIsSubmitting(true);
		try {
			await apiService.post("/auth/update-password", {
				current: hasCurrentPassword ? currentPassword : null,
				new: newPassword
			});
			toast.success(t("settings.passwordUpdateSuccess") as string);
			setTimeout(onClose, 1500);
		} catch (error: unknown) {
			const message = (error as Error).message;

			if (message.includes("Incorrect current password")) {
				toast.error(t("settings.currentPasswordIncorrect") as string);
			} else {
				toast.error(t("auth.genericError") as string);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className={styles.overlay} onClick={onClose}>
			<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
				<button type="button" className={styles.closeHeader} onClick={onClose}>
					<FiX size={24} />
				</button>

				<h2 className={styles.title}>{t("settings.changePassword") as string || "Modify your password"}</h2>

				<form onSubmit={handleSubmit} className={styles.form}>

					{hasCurrentPassword && (
						<div className={styles.inputGroup}>
							<label>{t("settings.currentPassword") as string || "Your current password"}</label>
							<input
								type={showPasswords ? "text" : "password"}
								value={currentPassword}
								onChange={(e) => setCurrentPassword(e.target.value)}
								required={hasCurrentPassword}
							/>
						</div>
					)}

					<div className={styles.inputGroup}>
						<label>{t("auth.newPassword") as string || "New password"}</label>
						<div className={styles.passwordWrapper}>
							<input
								type={showPasswords ? "text" : "password"}
								value={newPassword}
								onChange={(e) => {
									setNewPassword(e.target.value);
									validatePassword(e.target.value);
								}}
								required
							/>
							<button
								type="button"
								onClick={() => setShowPasswords(!showPasswords)}
								className={styles.eyeIcon}
								tabIndex={-1}
							>
								{showPasswords ? <FiEyeOff /> : <FiEye />}
							</button>
						</div>
					</div>

					<ul className={styles.passwordCriteria}>
						<ValidationCriterion isValid={passwordCriteria.length} text={t("auth.criteria.length") as string || "At least 8 characters"} />
						<ValidationCriterion isValid={passwordCriteria.upper} text={t("auth.criteria.upper") as string || "Contains an uppercase letter"} />
						<ValidationCriterion isValid={passwordCriteria.lower} text={t("auth.criteria.lower") as string || "Contains a lowercase letter"} />
						<ValidationCriterion isValid={passwordCriteria.number} text={t("auth.criteria.number") as string || "Contains a number"} />
						<ValidationCriterion isValid={passwordCriteria.special} text={t("auth.criteria.special") as string || "Contains a special character"} />
					</ul>

					<div className={styles.inputGroup}>
						<label>{t("settings.confirmNewPassword") as string || "Confirm new password"}</label>
						<input
							type={showPasswords ? "text" : "password"}
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							required
							className={confirmPassword && newPassword !== confirmPassword ? styles.inputError : ""}
						/>
					</div>

					<div className={styles.actions}>
						<button type="button" className={styles.cancelBtn} onClick={onClose}>
							{t("common.cancel") as string || "Cancel"}
						</button>
						<PrimaryButton
							text={isSubmitting ? (t("common.loading") as string || "Loading...") : (t("common.confirm") as string || "Confirm")}
							type="submit"
							disabled={isSubmitting}
						/>
					</div>
				</form>
			</div>
		</div>
	);
}