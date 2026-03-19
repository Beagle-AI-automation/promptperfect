'use client';

import { useEffect } from 'react';

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareSourceCode',
  name: 'PromptPerfect',
  description:
    'Open-source prompt optimization tool that automatically improves your LLM prompts and explains the changes.',
  codeRepository: 'https://github.com/Beagle-AI-automation/promptperfect',
  programmingLanguage: 'TypeScript',
  runtimePlatform: 'Next.js',
  license: 'https://spdx.org/licenses/MIT.html',
  author: {
    '@type': 'Organization',
    name: 'Beagle AI Solutions',
  },
  keywords: [
    'prompt optimization',
    'prompt engineering',
    'llm',
    'ai',
    'open-source',
    'gpt-4',
    'claude',
    'gemini',
  ],
};

export function StructuredData() {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
    return () => {
      if (script.parentNode === document.head) {
        document.head.removeChild(script);
      }
    };
  }, []);

  return null;
}
