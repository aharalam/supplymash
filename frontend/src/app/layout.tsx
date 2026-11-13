import '@fontsource-variable/dm-sans';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../index.css';
import '../hover.css';
import '../workspace.css';
import '../orders.css';
import Navigation from '../components/Navigation';
export const metadata: Metadata = { title: 'SupplyMash | Michigan business network', description: 'Exchange materials, pool orders, and share storage with Michigan businesses.' };
export default function RootLayout({ children }: { children: ReactNode }) {
 return <html lang="en"><body><a className="skip-link" href="#top">Skip to content</a><Navigation /><main id="top">{children}</main><footer className="site-footer"><strong>SupplyMash</strong><span>Michigan businesses. Shared resources.</span><small>Michigan DevFest 2026</small></footer></body></html>;
}
