import { Suspense } from "react";
import SubscriptionClient from "./SubscriptionClient";
import Loading from "@/components/Loading/Loading";


export const dynamic = "force-dynamic";

export default function SubscriptionPage() {
	return (
		<Suspense fallback={<Loading />}>
			<SubscriptionClient />
		</Suspense>
	);
}