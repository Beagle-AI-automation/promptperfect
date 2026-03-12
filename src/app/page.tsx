'use client';

import { LandingHeader } from '@/components/LandingHeader';
import { Hero } from '@/components/Hero';
import { Footer } from '@/components/Footer';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-[#050505]">
      <LandingHeader />
      <Hero />
      <main className="flex-1" />
      <Footer />
    </div>
  );
}
