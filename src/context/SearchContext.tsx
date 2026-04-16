import React, { createContext, useContext, useCallback, useState, type ReactNode } from 'react';
import { type RideLocation } from '../utils/rideMapper';

export type TimeFilter = 'All' | 'Leave now' | 'Schedule';

export interface SearchData {
  start: RideLocation | null;
  destination: RideLocation | null;
  transport: string;
  date: string; // ISO string
  timeFilter: TimeFilter;
  gender: string;
}

interface SearchContextValue {
  searchData: SearchData;
  setSearchData: React.Dispatch<React.SetStateAction<SearchData>>;
  resetSearchData: () => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

const getInitialSearchData = (): SearchData => ({
  start: null,
  destination: null,
  transport: 'All',
  date: (() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    return d.toISOString().slice(0, 16);
  })(),
  timeFilter: 'All',
  gender: 'Any',
});

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchData, setSearchData] = useState<SearchData>(getInitialSearchData());

  const resetSearchData = useCallback(() => {
    setSearchData(getInitialSearchData());
  }, []);

  return (
    <SearchContext.Provider value={{ searchData, setSearchData, resetSearchData }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within SearchProvider');
  }
  return context;
}
