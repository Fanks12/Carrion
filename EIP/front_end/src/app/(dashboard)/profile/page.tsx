// app/(dashboard)/profile/page.tsx
import { Suspense } from "react";
import { cookies } from "next/headers";
import ApiService from "@/services/api";
import ProfileClient from "./ProfileClient";
import Loading from "@/components/Loading/Loading";
import { UserProfile, ConnectedService } from "@/interface/user.interface";

export const dynamic = "force-dynamic";

async function getProfileData() {
	const cookieStore = await cookies();
	const token = cookieStore.get("access_token");

	if (!token) {
		return {
			initialProfile: null,
			initialServices: [],
			initialCvUrl: null,
			initialProfilePictureUrl: null,
			error: null,
			shouldRetry: true,
		};
	}

	const headers = { Cookie: cookieStore.toString() };

	try {
		const [profileRes, servicesRes, cvUrlRes, profilePicRes] =
			await Promise.all([
				ApiService.get<UserProfile>("/user-profile", { headers }),
				ApiService.get<{ services: ConnectedService[] }>(
					"/user-profile/services",
					{ headers }
				),
				ApiService.get<{ signedUrl: string }>(`/s3/download?filename=cv`, {
					headers,
				}).catch(() => null),
				ApiService.get<{ signedUrl: string }>(`/s3/download?filename=profile`, {
					headers,
				}).catch(() => null),
			]);

		return {
			initialProfile: profileRes,
			initialServices: servicesRes?.services || [],
			initialCvUrl: cvUrlRes?.signedUrl || null,
			initialProfilePictureUrl: profilePicRes?.signedUrl || null,
			error: null,
			shouldRetry: false,
		};
	} catch (error: unknown) {
		return {
			initialProfile: null,
			initialServices: [],
			initialCvUrl: null,
			initialProfilePictureUrl: null,
			error: null,
			shouldRetry: true,
		};
	}
}

export default async function ProfilePage() {
	const profileData = await getProfileData();

	return (
		<Suspense fallback={<Loading />}>
			<ProfileClient {...profileData} />
		</Suspense>
	);
}