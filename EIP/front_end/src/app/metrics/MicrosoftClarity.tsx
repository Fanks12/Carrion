'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const MicrosoftClarity = () => {
	const { userProfile } = useAuth();

	useEffect(() => {
		const projectId = process.env.NEXT_PUBLIC_MICROSOFT_CLARITY;

		if (!projectId || typeof window === 'undefined') return;

		if (!window.clarity) {
			window.clarity = function (...args: unknown[]) {
				(window.clarity.q = window.clarity.q || []).push(args);
			};

			const script = document.createElement('script');
			script.async = true;
			script.src = `https://www.clarity.ms/tag/${projectId}`;
			document.head.appendChild(script);
		}
	}, []);

	useEffect(() => {
		if (userProfile?.id && typeof window !== 'undefined' && window.clarity) {
			window.clarity('identify', userProfile.id);
		}
	}, [userProfile?.id]);

	return null;
};

export default MicrosoftClarity;