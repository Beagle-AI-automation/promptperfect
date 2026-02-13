import { useEffect, useState } from 'react';

import type { ProviderId } from '@/lib/types';

interface ApiConfigResponse {
  providers: Record<ProviderId, boolean>;
}

export function useApiConfig() {
  const [config, setConfig] = useState<ApiConfigResponse | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => setConfig(data as ApiConfigResponse))
      .catch(() =>
        setConfig({
          providers: { google: false },
        }),
      );
  }, []);

  const hasServerKey = (provider: ProviderId) => Boolean(config?.providers?.[provider]);

  return { config, hasServerKey };
}

