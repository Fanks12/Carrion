'use client';

import { useAuth } from '@/contexts/AuthContext';
import Script from 'next/script';
import { useEffect } from 'react';

const MicrosoftClarity = () => {
	const { userProfile } = useAuth();

	useEffect(() => {
		if (userProfile?.id) {
			const identifyUser = () => {
				if (typeof window !== 'undefined') {
					window.clarity = window.clarity || function (...args: unknown[]) {
						(window.clarity.q = window.clarity.q || []).push(args);
					};

					window.clarity("identify", userProfile.id);
				}
			};

			identifyUser();
		}
	}, [userProfile]);

	return (
		<Script
			id="microsoft-clarity-init"
			strategy="afterInteractive"
			dangerouslySetInnerHTML={{
				__html: `
          (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${process.env.NEXT_PUBLIC_MICROSOFT_CLARITY}");
        `,
			}}
		/>
	);
};

export default MicrosoftClarity;