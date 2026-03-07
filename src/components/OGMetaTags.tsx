'use client';

import { useEffect } from 'react';

type MetaAttr = 'property' | 'name';

function setMetaTag(
  attr: MetaAttr,
  key: string,
  content: string
): HTMLMetaElement {
  const existing = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (existing) {
    existing.setAttribute('content', content);
    return existing as HTMLMetaElement;
  }
  const meta = document.createElement('meta');
  meta.setAttribute(attr, key);
  meta.setAttribute('content', content);
  document.head.appendChild(meta);
  return meta;
}

const META_TAGS: [MetaAttr, string, string][] = [
  ['property', 'og:title', 'PromptPerfect — Open-Source Prompt Optimizer'],
  [
    'property',
    'og:description',
    'Improve your LLM prompts with AI-powered suggestions and explanations. Free, open source, bring your own API key.',
  ],
  ['property', 'og:url', 'https://promptperfect-xyz.vercel.app'],
  ['property', 'og:type', 'website'],
  ['property', 'og:site_name', 'PromptPerfect'],
  ['name', 'twitter:card', 'summary_large_image'],
  ['name', 'twitter:title', 'PromptPerfect — Open-Source Prompt Optimizer'],
  [
    'name',
    'twitter:description',
    'Improve your LLM prompts with AI-powered suggestions and explanations. Free, open source, BYOK.',
  ],
];

export function OGMetaTags() {
  useEffect(() => {
    const elements: HTMLMetaElement[] = [];
    for (const [attr, key, content] of META_TAGS) {
      elements.push(setMetaTag(attr, key, content));
    }
    return () => {
      for (const el of elements) {
        if (el.parentNode === document.head) {
          document.head.removeChild(el);
        }
      }
    };
  }, []);

  return null;
}
