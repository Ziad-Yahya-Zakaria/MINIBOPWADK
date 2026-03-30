import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { DEVELOPER_VAULT_ROUTE } from '../lib/accountPackageConstants';

export function useDeveloperVaultTrigger(requiredClicks = 7, resetAfterMs = 1800) {
  const navigate = useNavigate();
  const clicksRef = useRef({
    count: 0,
    lastAt: 0
  });

  return () => {
    const now = Date.now();
    if (now - clicksRef.current.lastAt > resetAfterMs) {
      clicksRef.current.count = 0;
    }

    clicksRef.current.count += 1;
    clicksRef.current.lastAt = now;

    if (clicksRef.current.count >= requiredClicks) {
      clicksRef.current.count = 0;
      navigate(DEVELOPER_VAULT_ROUTE);
    }
  };
}
