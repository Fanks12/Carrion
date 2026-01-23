import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NotificationProvider } from "@/contexts/NotificationContext";

import "./globals.css";
import { AuthModalProvider } from "@/contexts/AuthModalContext";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
	title: "Carrion",
	description: "Suivez vos candidatures.",
	viewport: "width=device-width, initial-scale=1.0, maximum-scale=5.0",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="fr">
			<body>
				<AuthProvider>
					<LanguageProvider>
						<AuthModalProvider>
							<NotificationProvider>
								{children}
								<Toaster position="top-right" reverseOrder={false} />
							</NotificationProvider>
						</AuthModalProvider>
					</LanguageProvider>
				</AuthProvider>
				<div id="datepicker-portal"></div>
			</body>
		</html>
	);
}
