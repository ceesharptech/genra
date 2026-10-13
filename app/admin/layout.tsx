import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth/server';

export const metadata: Metadata = {
  title: 'Admin Console · Genra',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_admin) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
