"use client";

import React, { useState } from "react";
import apiService from "@/services/api";
import styles from "./ChangePasswordModal.module.css";
import PrimaryButton from "@/components/Button/PrimaryButton";
import { FiEye, FiEyeOff, FiCheckCircle, FiXCircle, FiX } from "react-icons/fi";
import { passwordRegEX } from "@/services/utils";
import toast, { Toaster } from "react-hot-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: Props) {
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
                current: currentPassword,
                new: newPassword
            });
            toast.success(t("settings.passwordUpdateSuccess") as string);
            setTimeout(onClose, 1500);
        } catch (error: any) {
            const message = error.message;

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
                <button className={styles.closeHeader} onClick={onClose}>
                    <FiX size={24} />
                </button>

                <h2 className={styles.title}>{t("settings.changePassword")}</h2>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label>{t("settings.currentPassword")}</label>
                        <input
                            type={showPasswords ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>{t("auth.newPassword")}</label>
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
                            <span onClick={() => setShowPasswords(!showPasswords)} className={styles.eyeIcon}>
                                {showPasswords ? <FiEyeOff /> : <FiEye />}
                            </span>
                        </div>
                    </div>

                    {/* Criteria List Implementation */}
                    <ul className={styles.passwordCriteria}>
                        <ValidationCriterion isValid={passwordCriteria.length} text={t("auth.criteria.length") as string} />
                        <ValidationCriterion isValid={passwordCriteria.upper} text={t("auth.criteria.upper") as string} />
                        <ValidationCriterion isValid={passwordCriteria.lower} text={t("auth.criteria.lower") as string} />
                        <ValidationCriterion isValid={passwordCriteria.number} text={t("auth.criteria.number") as string} />
                        <ValidationCriterion isValid={passwordCriteria.special} text={t("auth.criteria.special") as string} />
                    </ul>

                    <div className={styles.inputGroup}>
                        <label>{t("settings.confirmNewPassword")}</label>
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
                            {t("common.cancel")}
                        </button>
                        <PrimaryButton
                            text={isSubmitting ? t("common.loading") as string : t("common.confirm") as string}
                            type="submit"
                            disabled={isSubmitting}
                        />
                    </div>
                </form>
            </div>
        </div>
    );
}
