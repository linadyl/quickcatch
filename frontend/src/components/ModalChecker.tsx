import React, { useState } from 'react';
import AnalysisModal from './AnalysisModal.tsx'; // Update path if needed

const ModalChecker: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mockData, setMockData] = useState<any>(null);
  
  // Generate mock data for testing the modal
  const generateMockData = () => {
    return {
      summary: "The Toronto Maple Leafs defeated the Montreal Canadiens 4-2 in an exciting game. Toronto dominated puck possession throughout.",
      teamPerformance: "Toronto showed strong offensive pressure and solid defensive play. Montreal struggled with penalties but had moments of brilliance on the power play.",
      playerPerformance: "Auston Matthews scored two goals and had an assist. Nick Suzuki was the standout player for Montreal with a goal and strong two-way play.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Example URL
      gameData: {
        homeTeam: "Toronto Maple Leafs",
        awayTeam: "Montreal Canadiens",
        score: "Toronto 4, Montreal 2",
        gameId: 2023020123,
        gameDate: "2023-12-15T00:00:00Z"
      }
    };
  };
  
  // Test different modal states
  const openModal = (state: 'normal' | 'loading' | 'empty') => {
    setIsModalOpen(true);
    
    if (state === 'loading') {
      setLoading(true);
      setMockData(null);
    } else if (state === 'normal') {
      setLoading(false);
      setMockData(generateMockData());
    } else {
      setLoading(false);
      setMockData(null);
    }
  };
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Modal Checker</h2>
      <p className="mb-4">
        Use this tool to test if your AnalysisModal component is rendering correctly with different states.
      </p>
      
      <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
        <button
          onClick={() => openModal('normal')}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Test with Data
        </button>
        
        <button
          onClick={() => openModal('loading')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Loading State
        </button>
        
        <button
          onClick={() => openModal('empty')}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Test Empty State
        </button>
      </div>
      
      <div className="mt-6 p-4 bg-gray-50 rounded border">
        <h3 className="font-medium">Component Structure Check:</h3>
        <pre className="mt-2 p-3 bg-gray-100 text-xs overflow-auto rounded">
{`// Your AnalysisModal should be expecting these props:
interface AnalysisModalProps {
  isOpen: boolean;      // Controls modal visibility
  onClose: () => void;  // Function to close the modal
  analysis: {           // The analysis data
    summary: string;
    teamPerformance: string;
    playerPerformance: string;
    videoUrl: string;
    // Possibly other fields
  } | null;
  loading: boolean;     // Whether data is loading
  teamName?: string;    // Optional team name
}`}
        </pre>
      </div>
      
      {/* Render the actual modal with test data */}
      <AnalysisModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        analysis={mockData}
        loading={loading}
        teamName="Test Team"
      />
    </div>
  );
};

export default ModalChecker;