/**
 * Context for artisanal access.
 * - canAccess: true for all users (Mining tab visible for everyone)
 * - isAfrican: true only for users with African country (More → Artisanal Mining Profile visible only for Africans)
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getArtisanalCanAccess } from './services';

const ArtisanalAccessContext = createContext({ canAccess: true, isAfrican: false, loading: false });

export function ArtisanalAccessProvider({ children }) {
  const [canAccess] = useState(true);
  const [isAfrican, setIsAfrican] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getArtisanalCanAccess()
      .then((data) => {
        if (mounted) setIsAfrican(!!(data && data.country));
      })
      .catch(() => {
        if (mounted) setIsAfrican(false);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  return (
    <ArtisanalAccessContext.Provider value={{ canAccess, isAfrican, loading }}>
      {children}
    </ArtisanalAccessContext.Provider>
  );
}

export function useArtisanalCanAccess() {
  return useContext(ArtisanalAccessContext);
}
