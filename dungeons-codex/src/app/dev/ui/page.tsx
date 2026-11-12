import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { UiShowcase } from './_components/UiShowcase';

export const metadata: Metadata = {
  title: 'UI kit (dev only)',
  robots: { index: false, follow: false },
};

export default function DevUiPage() {
  // Development-only showcase: a production build prerenders this route as a 404.
  if (process.env.NODE_ENV === 'production') notFound();
  return <UiShowcase />;
}
