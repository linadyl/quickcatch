import React, { useState, useEffect } from "react";
import { AnalysisResult } from "../types"; // Make sure this path is correct

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: AnalysisResult | null;
  loading: boolean;
  teamName?: string;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({
  isOpen,
  onClose,
  analysis,
  loading,
  teamName
}) => {
  const [completeAnalysis, setCompleteAnalysis] = useState<AnalysisResult | null>(null);
  const [pollingCount, setPollingCount] = useState(0);
  const [pollingActive, setPollingActive] = useState(false);
  
  useEffect(() => {
    // Reset polling when the modal is opened or closed
    if (!isOpen) {
      setPollingActive(false);
      setPollingCount(0);
      setCompleteAnalysis(null);
      return;
    }
    
    // If we have analysis data and it's in pending status, start polling
    if (analysis && analysis.analysisStatus === "pending") {
      setPollingActive(true);
    } else {
      setPollingActive(false);
    }
  }, [isOpen, analysis]);
  
  // Poll for complete analysis
  useEffect(() => {
    if (!pollingActive || !teamName) return;
    
    console.log("Starting polling for analysis updates...");
    
    const pollInterval = setInterval(async () => {
      try {
        console.log(`Polling for ${teamName} analysis update... (attempt ${pollingCount + 1})`);
        const response = await fetch(
          `http://localhost:5000/api/analysis-status?team=${encodeURIComponent(teamName)}`
        );
        const data = await response.json();
        
        console.log("Poll response:", data);
        
        if (data.ready && data.data) {
          console.log("Analysis is ready:", data.data);
          setCompleteAnalysis(data.data);
          setPollingActive(false);
        } else {
          // Increment polling count for progress display
          setPollingCount(prevCount => prevCount + 1);
          
          // Stop polling after 30 attempts (90 seconds)
          if (pollingCount >= 30) {
            console.log("Polling stopped after 30 attempts");
            setPollingActive(false);
          }
        }
      } catch (error) {
        console.error("Error polling for analysis:", error);
      }
    }, 3000); // Poll every 3 seconds
    
    return () => clearInterval(pollInterval);
  }, [pollingActive, teamName, pollingCount]);
  
  // Debug logging
  console.log("AnalysisModal props:", { isOpen, loading, teamName });
  console.log("Analysis data:", analysis);
  console.log("Complete analysis:", completeAnalysis);
  
  // Calculate progress percentage for loading bar
  const progressPercentage = pollingCount > 0 
    ? Math.min(pollingCount * 5, 90) // Max 90% until complete
    : 0;
  
  // Use complete analysis if available, otherwise use the initial analysis
  const displayAnalysis = completeAnalysis || analysis;
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl"
        >
          ✕
        </button>

        {loading ? (
          <div className="text-center p-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Finding {teamName} Highlights
            </h3>
            
            <div className="mb-6 w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-lime-600 h-2.5 rounded-full animate-pulse"
                style={{ width: "60%" }}
              ></div>
            </div>
            
            <p className="text-gray-600 text-lg">
              Searching for recent highlights...
            </p>
          </div>
        ) : displayAnalysis ? (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {teamName ? `${teamName} Highlights` : "NHL Highlights"}
            </h2>
            
            {/* Always show video immediately if available */}
            {displayAnalysis.videoUrl && (
              <div className="w-full aspect-video rounded-lg overflow-hidden mb-6">
                <iframe
                  width="100%"
                  height="100%"
                  src={displayAnalysis.videoUrl}
                  frameBorder="0"
                  allowFullScreen
                  className="rounded-lg"
                ></iframe>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-lime-600">📝 Summary</h3>
                <p className="text-gray-700 min-h-[3em]">
                  {displayAnalysis.summary || "No summary available"}
                  {displayAnalysis.analysisStatus === "pending" && (
                    <span className="inline-block animate-pulse ml-1">...</span>
                  )}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-lime-600">📊 Team Performance</h3>
                <p className="text-gray-700 min-h-[3em]">
                  {displayAnalysis.teamPerformance || "No team analysis available"}
                  {displayAnalysis.analysisStatus === "pending" && (
                    <span className="inline-block animate-pulse ml-1">...</span>
                  )}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-lime-600">🏒 Player Performance</h3>
                <p className="text-gray-700 min-h-[3em]">
                  {displayAnalysis.playerPerformance || "No player analysis available"}
                  {displayAnalysis.analysisStatus === "pending" && (
                    <span className="inline-block animate-pulse ml-1">...</span>
                  )}
                </p>
              </div>
              
              {/* Show thinking indicator if analysis is pending */}
              {displayAnalysis.analysisStatus === "pending" && pollingActive && (
                <div className="mt-4 pt-2 border-t border-gray-200">
                  <div className="flex items-center">
                    <div className="text-sm text-gray-500 mr-2">AI analyzing game...</div>
                    <div className="flex-1">
                      <div className="h-1 bg-gray-200 rounded">
                        <div 
                          className="h-1 bg-lime-500 rounded transition-all duration-500"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-gray-600 text-center p-8">
            <div className="text-5xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Highlights Found</h3>
            <p>Sorry, we couldn't find recent highlights for this team.</p>
            <p className="text-sm text-gray-500 mt-2">Try selecting a different team.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisModal;