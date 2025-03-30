import React, { useState } from 'react';

// ✅ Type for the expected response from the backend
interface AnalysisResponse {
  summary: string;
  teamPerformance: string;
  playerPerformance: string;
  videoUrl: string;
}

const DiagnosticComponent: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AnalysisResponse | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>("");

  const testTeams: string[] = [
    'Colorado Avalanche',
    'Vegas Golden Knights',
    'Toronto Maple Leafs',
    'Boston Bruins',
  ];

  const testApi = async (team: string) => {
    setLoading(true);
    setError(null);
    setResponse(null);
    setSelectedTeam(team);

    try {
      const res = await fetch(`http://localhost:5000/api/analyze?team=${encodeURIComponent(team)}`);

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }

      const data: AnalysisResponse = await res.json();
      setResponse(data);
    } catch (err: any) {
      setError(err.message || "An unknown error occurred");
      console.error("API test error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">API Diagnostic Tool</h2>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Test Teams</h3>
        <div className="flex flex-wrap gap-2">
          {testTeams.map((team) => (
            <button
              key={team}
              onClick={() => testApi(team)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {team}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="mb-4 p-4 bg-gray-100 rounded">
          <p className="text-gray-800">Loading analysis for {selectedTeam}...</p>
          <div className="mt-2 w-full h-2 bg-gray-200 rounded overflow-hidden">
            <div className="h-full bg-blue-500 animate-pulse"></div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 rounded">
          <h3 className="text-lg font-semibold text-red-800">Error</h3>
          <p className="text-red-700">{error}</p>
          <div className="mt-2">
            <p className="text-sm text-red-600">
              Common issues:
              <ul className="list-disc ml-5 mt-1">
                <li>Backend server not running (`node server.js`)</li>
                <li>CORS issues (check server CORS configuration)</li>
                <li>Google API key not set or invalid</li>
                <li>YouTube-dl not installed or not working properly</li>
              </ul>
            </p>
          </div>
        </div>
      )}

      {response && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">API Response</h3>
          <div className="p-4 bg-gray-50 rounded border overflow-auto max-h-96">
            <div className="mb-4">
              <h4 className="font-medium text-blue-600">Video URL:</h4>
              <p className="text-sm break-all">{response.videoUrl || "Not provided"}</p>
              {response.videoUrl && (
                <div className="mt-2 bg-black rounded overflow-hidden aspect-video">
                  <iframe
                    width="100%"
                    height="100%"
                    src={response.videoUrl}
                    frameBorder="0"
                    allowFullScreen
                    title="Highlight Video"
                  ></iframe>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-white rounded shadow">
                <h4 className="font-medium text-green-600">Summary</h4>
                <p className="text-sm mt-1">{response.summary || "Not provided"}</p>
              </div>

              <div className="p-3 bg-white rounded shadow">
                <h4 className="font-medium text-green-600">Team Performance</h4>
                <p className="text-sm mt-1">{response.teamPerformance || "Not provided"}</p>
              </div>

              <div className="p-3 bg-white rounded shadow">
                <h4 className="font-medium text-green-600">Player Performance</h4>
                <p className="text-sm mt-1">{response.playerPerformance || "Not provided"}</p>
              </div>
            </div>

            <div className="mt-4">
              <details>
                <summary className="cursor-pointer text-sm font-medium text-gray-600">
                  Raw Response JSON
                </summary>
                <pre className="mt-2 p-2 bg-gray-800 text-green-400 text-xs overflow-auto rounded">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiagnosticComponent;
