import React, { useState } from "react";
import SearchBar from "./components/SearchBar";
import TeamList from "./components/TeamList";
import AnalysisModal from "./components/AnalysisModal";
import teamsData from "./data/teams.json";
import { AnalysisResult } from "./types"; // Import from the correct location
import ModalDebugger from "./components/ModalDebugger"; // Import the debugging tool

const App: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTeam, setCurrentTeam] = useState<string>("");
  const [showDebugger, setShowDebugger] = useState(false); // For debug mode

  // Filter teams by search
  const filteredTeams = teamsData.map((division) => ({
    ...division,
    teams: division.teams.filter((team: any) =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  }));

  // Group by conference
  const groupedByConference: { [key: string]: any[] } = {};
  filteredTeams.forEach((divisionData) => {
    if (!groupedByConference[divisionData.conference]) {
      groupedByConference[divisionData.conference] = [];
    }
    groupedByConference[divisionData.conference].push(divisionData);
  });

  // Fetch analysis from backend with timeout
  const handleTeamClick = async (teamName: string) => {
    // Show the modal immediately
    setIsModalOpen(true);
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setCurrentTeam(teamName);

    try {
      console.log(`Fetching analysis for ${teamName}...`);
      
      // Set a timeout to handle very long requests
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Request timed out")), 60000); // 60-second timeout
      });

      const fetchPromise = fetch(`http://localhost:5000/api/analyze?team=${encodeURIComponent(teamName)}`);
      
      // Race between the fetch and the timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      // Parse the response
      const data = await response.json();
      console.log("Received analysis data:", data);
      
      // Update state with the analysis data
      setAnalysis(data);
    } catch (err: any) {
      console.error("Error fetching analysis:", err);
      setError(err.message || "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setAnalysis(null);
    setError(null);
    setCurrentTeam("");
  };

  // Toggle the debugger visibility (add this to your footer or a hidden button)
  const toggleDebugger = () => {
    setShowDebugger(!showDebugger);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex justify-between items-center py-4 mb-4 px-6">
        <h1 className="text-2xl font-bold text-gray-800">Find your teams now!</h1>
        <div className="flex gap-2">
          <button className="px-4 py-1 bg-gray-200 text-gray-800 rounded-lg text-sm">Skip</button>
          <button className="px-4 py-1 bg-gray-900 text-white rounded-lg text-sm">Continue</button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 overflow-y-auto border border-black">
        <SearchBar setSearchTerm={setSearchTerm} />

        {Object.entries(groupedByConference).map(([conference, divisions]) => (
          <div key={conference} className="mb-8">
            <h2 className="text-xl font-bold mb-4">{conference}</h2>
            <div className="grid grid-cols-2 gap-4">
              {divisions.map((division: any) => (
                <TeamList
                  key={division.division}
                  conference={division.conference}
                  division={division.division}
                  teams={division.teams}
                  onTeamClick={handleTeamClick}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Debug mode toggle (hidden normally) */}
      <div className="mt-8 text-center">
        <button 
          onClick={toggleDebugger}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          {showDebugger ? "Hide Debugger" : "Show Debugger"}
        </button>
      </div>

      {/* Render the debugger when enabled */}
      {showDebugger && <ModalDebugger />}

      {/* Analysis modal with proper error handling */}
      <AnalysisModal
        isOpen={isModalOpen}
        onClose={closeModal}
        analysis={analysis}
        loading={loading}
        teamName={currentTeam}
      />
    </div>
  );
};

export default App;