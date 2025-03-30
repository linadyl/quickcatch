// src/components/SearchBar.tsx
import React from 'react';

interface SearchBarProps {
  setSearchTerm: (term: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ setSearchTerm }) => {
  return (
    <div className="relative w-full max-w-lg mx-auto mb-10">
      <input
        type="text"
        placeholder="Search Teams"
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-2 pl-4 pr-12 border border-gray-300 rounded-full outline-none"
      />
      <div className="absolute right-1 top-1 bg-gray-900 rounded-full p-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </div>
    </div>
  );
};

export default SearchBar;