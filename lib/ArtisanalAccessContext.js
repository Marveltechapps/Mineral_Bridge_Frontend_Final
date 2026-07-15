/**
 * Context for artisanal access.
 * - canAccess / isEligible: true for every authenticated user (any country)
 * - isAfrican: optional metadata when login dial is African (labels only — not used to hide features)
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getArtisanalCanAccess } from './services';

const ArtisanalAccessContext = createContext({
  canAccess: true,
  isEligible: true,
  isAfrican: false,
  loading: false,
});

export function ArtisanalAccessProvider({ children }) {
  const [canAccess, setCanAccess] = useState(true);
  const [isEligible, setIsEligible] = useState(true);
  const [isAfrican, setIsAfrican] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getArtisanalCanAccess()
      .then((data) => {
        if (!mounted) return;
        const access = data?.canAccess !== false;
        const eligible = data?.isEligible !== false && access;
        setCanAccess(access);
        setIsEligible(eligible);
        setIsAfrican(!!(data && data.country));
      })
      .catch(() => {
        if (!mounted) return;
        // Fail open for artisanal so non-Africa users are not locked out offline/API blip
        setCanAccess(true);
        setIsEligible(true);
        setIsAfrican(false);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ArtisanalAccessContext.Provider value={{ canAccess, isEligible, isAfrican, loading }}>
      {children}
    </ArtisanalAccessContext.Provider>
  );
}

export function useArtisanalCanAccess() {
  return useContext(ArtisanalAccessContext);
}
