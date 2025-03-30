// src/components/Header.tsx
import React from 'react';

const Header: React.FC = () => {
  return (
    <div className="flex justify-between items-center py-4 mb-6">
      <h1 className="text-2xl font-bold">Find your teams now !</h1>
      <div className="flex gap-2">
        <button className="px-4 py-1 bg-gray-900 text-white rounded-lg text-sm">Skip</button>
        <button className="px-4 py-1 bg-gray-900 text-white rounded-lg text-sm">Continue</button>
      </div>
    </div>
  );
};

export default Header;