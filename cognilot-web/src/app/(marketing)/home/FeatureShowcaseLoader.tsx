'use client';

import dynamic from 'next/dynamic';

const FeatureShowcase = dynamic(
  () => import('./FeatureShowcase').then((mod) => mod.FeatureShowcase),
  { ssr: false }
);

export function FeatureShowcaseLoader() {
  return <FeatureShowcase />;
}
