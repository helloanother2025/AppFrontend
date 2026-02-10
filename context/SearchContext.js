import React, { createContext, useContext, useCallback, useState } from 'react';

const SearchContext = createContext();

const getInitialSearchData = () => ({
  start: { name: '', coords: null },
  destination: { name: '', coords: null },
  transport: '',
  date: { day: '', time: '' },
  gender: '',
  routePolyline: null,
});

export const SearchProvider = ({ children }) => {
  const [searchData, setSearchData] = useState(getInitialSearchData());
  const resetSearchData = useCallback(() => {
    setSearchData(getInitialSearchData());
  }, []);

  return (
    <SearchContext.Provider value={{ searchData, setSearchData, resetSearchData }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => useContext(SearchContext);
