import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import './globals.css';
import './features.css';
import './loading-failsafe.css';
import './header-fixed.css';
import './brand-refresh.css';
export const metadata: Metadata = { title: 'PF360 · ProductFlow workspace', description: 'PTCL ProductFlow 360 — from idea to impact.' };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
