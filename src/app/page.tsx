import type { Metadata } from 'next';

import { LandingPageClient } from '@/components/LandingPageClient';
import {
  DEFAULT_OG_DESCRIPTION,
  DEFAULT_OG_TITLE,
  EXTENSION_README_URL,
  REPO_URL,
  SITE_NAME,
  getOgImageUrl,
  getSiteUrl,
} from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const base = getSiteUrl();
  const ogImage = getOgImageUrl();

  return {
    title: DEFAULT_OG_TITLE,
    description: DEFAULT_OG_DESCRIPTION,
    metadataBase: new URL(base),
    alternates: {
      canonical: '/',
    },
    openGraph: {
      title: DEFAULT_OG_TITLE,
      description: DEFAULT_OG_DESCRIPTION,
      url: base,
      siteName: SITE_NAME,
      type: 'website',
      locale: 'en_US',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} — prompt optimizer UI preview`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: DEFAULT_OG_TITLE,
      description: DEFAULT_OG_DESCRIPTION,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function HomePage() {
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    description: DEFAULT_OG_DESCRIPTION,
    url: getSiteUrl(),
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Organization',
      name: 'Beagle AI Solutions',
      url: 'https://beaglecorp.com',
    },
    license: 'https://spdx.org/licenses/MIT.html',
    codeRepository: REPO_URL,
    downloadUrl: EXTENSION_README_URL,
    screenshot: getOgImageUrl(),
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <LandingPageClient />
    </>
  );
}
