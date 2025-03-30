import React, { useState, useEffect } from 'react';

// A simple component to help debug modal and API issues
const ModalDebugger: React.FC = () => {
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedTeam, setSelectedTeam] = useState<string>("Toronto Maple Leafs");

  // Test teams - add your actual teams here
  const testTeams = [
    "Toronto Maple Leafs",
    "Boston Bruins",
    "New York Rangers",
    "Montreal Canadiens"
  ];

  const testApi = async (team: string) => {
    setLoading(true);
    setError(null);
    setApiResponse(null);
    
    try {
      // Use the actual API endpoint
      const response = await fetch(`/api/analyze?team=${encodeURIComponent(team)}`);
      
      // Log raw response for debugging
      console.log("Raw response:", response);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Try to parse the JSON response
      const data = await response.json();
      setApiResponse(data);
    } catch (err: any) {
      console.error("API test error:", err);
      setError(err.message || "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Check for server connection on initial load
  useEffect(() => {
    const checkServer = async () => {
      try {
        // Simple check to see if server is responding
        const response = await fetch('/api/status', { method: 'GET' });
        
        if (response.ok) {
          console.log("Server is running!");
        } else {
          setError("Server is running but returned an error status");
        }
      } catch (err) {
        setError("Cannot connect to server at http://localhost:5000 - is it running?");
      }
    };
    
    checkServer();
  }, []);

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Modal & API Debugger</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
          
          {error.includes("Cannot connect") && (
            <div className="mt-2 text-sm">
              <p>⚠️ Make sure you've started your server with:</p>
              <pre className="bg-gray-800 text-white p-2 rounded mt-1">node server.js</pre>
              
              <p className="mt-2">Check for these common issues:</p>
              <ul className="list-disc pl-5 mt-1">
                <li>Is your server running on port 5000?</li>
                <li>Are there any errors in your server console?</li>
                <li>Is CORS configured correctly?</li>
              </ul>
            </div>
          )}
        </div>
      )}
      
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">1. Select a team to test:</h3>
        <div className="flex flex-wrap gap-2">
          {testTeams.map(team => (
            <button
              key={team}
              onClick={() => {
                setSelectedTeam(team);
                testApi(team);
              }}
              className={`px-3 py-1 rounded border ${
                selectedTeam === team 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white text-gray-800 hover:bg-gray-100'
              }`}
            >
              {team}
            </button>
          ))}
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">2. Test custom team:</h3>
        <div className="flex">
          <input
            type="text"
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="flex-1 border rounded-l px-3 py-2"
            placeholder="Enter team name..."
          />
          <button
            onClick={() => testApi(selectedTeam)}
            className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? 'Testing...' : 'Test API'}
          </button>
        </div>
      </div>
      
      {loading && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded animate-pulse">
          Loading data for {selectedTeam}...
        </div>
      )}
      
      {apiResponse && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">API Response:</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-gray-50 rounded border">
              <h4 className="font-medium text-gray-700">Summary</h4>
              <p className="mt-1">{apiResponse.summary || "Not provided"}</p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded border">
              <h4 className="font-medium text-gray-700">Team Performance</h4>
              <p className="mt-1">{apiResponse.teamPerformance || "Not provided"}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded border">
              <h4 className="font-medium text-gray-700">Player Performance</h4>
              <p className="mt-1">{apiResponse.playerPerformance || "Not provided"}</p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded border">
              <h4 className="font-medium text-gray-700">Video URL</h4>
              <p className="mt-1 break-all text-xs">
                {apiResponse.videoUrl || "Not provided"}
              </p>
            </div>
          </div>
          
          {apiResponse.videoUrl && (
            <div className="mt-4 bg-black rounded">
              <iframe
                src={apiResponse.videoUrl}
                className="w-full aspect-video rounded"
                allowFullScreen
              ></iframe>
            </div>
          )}
          
          <div className="mt-4">
            <details>
              <summary className="cursor-pointer text-sm font-medium text-blue-600">
                View Raw JSON Response
              </summary>
              <pre className="mt-2 p-3 bg-gray-800 text-green-400 text-xs overflow-auto rounded max-h-60">
                {JSON.stringify(apiResponse, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
      
      <h3 className="text-lg font-medium mt-6 mb-2">Modal Content Debugging:</h3>
      <div className="p-3 bg-yellow-50 border border-yellow-300 rounded">
        <p className="text-sm">If your modal isn't displaying data correctly, check:</p>
        <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm">
          <li>Is your API returning data in the expected format?</li>
          <li>Does your modal component have the correct prop types?</li>
          <li>Is there conditional rendering in your modal that might be hiding content?</li>
          <li>Are there any type mismatches between what the API returns and what the modal expects?</li>
          <li>Does your modal handle loading states correctly?</li>
        </ol>
      </div>
    </div>
  );
};

export default ModalDebugger;