import React, { useState } from "react";
import SearchBar from "./components/SearchBar";
import TeamList from "./components/TeamList";
import AnalysisModal from "./components/AnalysisModal";
import teamsData from "./data/teams.json";
import { AnalysisResult } from "./types"; 
// @ts-ignore
import backgroundImage from './assets/bg.png';
// @ts-ignore
import logoImage from './assets/quickcatch.png';

const App: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTeam, setCurrentTeam] = useState<string>("");
  const [showDebugger, setShowDebugger] = useState(false);
  const [lastFetchedTeam, setLastFetchedTeam] = useState<string>("");

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
      console.log(`Checking existing analysis for ${teamName}...`);
      
      // First check if the analysis is already complete via the status endpoint
      const statusResponse = await fetch(`http://localhost:5000/api/analysis-status?team=${encodeURIComponent(teamName)}`);
      const statusData = await statusResponse.json();
      
      if (statusData.ready && statusData.data) {
        // Analysis is already complete, use the cached result
        console.log("Using cached analysis result");
        setAnalysis(statusData.data);
        setLoading(false);
        setLastFetchedTeam(teamName);
        return;
      }
      
      // If no cached result, request a new analysis
      console.log(`Fetching new analysis for ${teamName}...`);
      
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
      setLastFetchedTeam(teamName);
    } catch (err: any) {
      console.error("Error fetching analysis:", err);
      setError(err.message || "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    // Don't reset analysis data when closing, so we can reuse it
    setError(null);
    setCurrentTeam("");
  };

  return (
    <div className="relative min-h-screen w-full">
      {/* Fixed background image that stays in place while scrolling - updated to match Login.tsx */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: '35%',
          backgroundPosition: 'left center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.7
        }}
      ></div>
      
      {/* Content container with proper z-index and width */}
      <div className="w-full max-w-4xl mx-auto relative z-10">
        <div className="flex justify-between items-center py-4 mb-4 px-6">
          <h1 className="text-2xl font-bold text-gray-800">Find your teams now!</h1>
          <div className="flex items-center justify-center">
              <img
                src={logoImage}
                alt="QuickCatch Logo"
                className="h-10"
              />
            </div>
        </div>

        <div className="bg-white bg-opacity-95 rounded-xl p-6 overflow-y-auto border border-black w-full">
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

        {/* Analysis modal with proper error handling */}
        <AnalysisModal
          isOpen={isModalOpen}
          onClose={closeModal}
          analysis={analysis}
          loading={loading}
          teamName={currentTeam}
          error={error}
        />
      </div>
    </div>
  );
};

export default App;