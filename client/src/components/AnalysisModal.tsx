import React, { useState, useEffect } from "react";
import { AnalysisResult } from "../types";

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: AnalysisResult | null;
  loading: boolean;
  teamName?: string;
  error?: string | null;
}

// Helper function to format markdown-like text
const formatText = (text: string) => {
  if (!text) return "";
  
  // Handle completely manually for reliability
  
  // Step 1: Find all bold+colon patterns (like "**Title:** Content")
  const boldColonPattern = /\*\*([^*]+)\*\*\s*:/g;
  const matches = [...text.matchAll(boldColonPattern)];
  
  // If we have fewer than 2 matches, just do regular formatting
  if (matches.length <= 1) {
    // Just apply standard bold formatting
    return text
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br />");
  }
  
  // Step 2: For each bold+colon pattern after the first one, replace with a version
  // that has line breaks before it
  let result = text;
  
  for (let i = 1; i < matches.length; i++) {
    const match = matches[i][0]; // Get the full match
    const index = result.indexOf(match);
    
    if (index !== -1) {
      // Replace this instance with a version that has breaks before it
      result = 
        result.substring(0, index) + 
        "<br /><br />" + 
        match + 
        result.substring(index + match.length);
      
      // Need to adjust future matches since we added content
      for (let j = i + 1; j < matches.length; j++) {
        if (matches[j].index > index) {
          matches[j].index += 11; // Length of "<br /><br />"
        }
      }
    }
  }
  
  // Step 3: Apply regular formatting
  return result
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");
};

const AnalysisModal: React.FC<AnalysisModalProps> = ({
  isOpen,
  onClose,
  analysis,
  loading,
  teamName,
  error
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
  
  // Calculate progress percentage for loading bar
  const progressPercentage = pollingCount > 0 
    ? Math.min(pollingCount * 5, 90) // Max 90% until complete
    : 0;
  
  // Use complete analysis if available, otherwise use the initial analysis
  const displayAnalysis = completeAnalysis || analysis;
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-lime-100 bg-opacity-30 flex justify-center items-center z-50 p-2">
      <div className="bg-white rounded-xl shadow-xl w-[70%] h-[85vh] flex flex-col relative border border-black">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 bg-lime-100 rounded-t-xl flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            {teamName ? `${teamName} Highlights` : "NHL Highlights"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 text-xl bg-gray-200 rounded-full h-8 w-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {loading ? (
            <div className="text-center py-12">
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
          ) : error ? (
            <div className="text-gray-600 text-center py-8">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-red-600 mb-2">Error</h3>
              <p>{error}</p>
              {error.includes("already in progress") && (
                <p className="text-sm text-gray-500 mt-4">
                  Try again in a moment or select a different team.
                </p>
              )}
            </div>
          ) : displayAnalysis ? (
            <>
              {/* Always show video immediately if available */}
              {displayAnalysis.videoUrl && (
                <div className="w-full aspect-video rounded-xl overflow-hidden mb-6 bg-black border-2 border-lime-200 max-w-5xl mx-auto">
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

              <div className="space-y-6 px-2">
                <div>
                  <h3 className="text-lg font-semibold text-lime-600 mb-2 flex items-center">
                    <span className="mr-2">📝</span> Summary
                  </h3>
                  <div 
                    className="text-gray-700 bg-lime-50 p-4 rounded-lg border border-lime-200"
                    dangerouslySetInnerHTML={{ 
                      __html: formatText(displayAnalysis.summary || "No summary available") +
                      (displayAnalysis.analysisStatus === "pending" ? 
                        '<span class="inline-block animate-pulse ml-1">...</span>' : '')
                    }}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-lime-600 mb-2 flex items-center">
                    <span className="mr-2">📊</span> Team Performance
                  </h3>
                  <div 
                    className="text-gray-700 bg-lime-50 p-4 rounded-lg border border-lime-200"
                    dangerouslySetInnerHTML={{ 
                      __html: formatText(displayAnalysis.teamPerformance || "No team analysis available") +
                      (displayAnalysis.analysisStatus === "pending" ? 
                        '<span class="inline-block animate-pulse ml-1">...</span>' : '')
                    }}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-lime-600 mb-2 flex items-center">
                    <span className="mr-2">🏒</span> Player Performance
                  </h3>
                  <div 
                    className="text-gray-700 bg-lime-50 p-4 rounded-lg border border-lime-200"
                    dangerouslySetInnerHTML={{ 
                      __html: formatText(displayAnalysis.playerPerformance || "No player analysis available") +
                      (displayAnalysis.analysisStatus === "pending" ? 
                        '<span class="inline-block animate-pulse ml-1">...</span>' : '')
                    }}
                  />
                </div>
              </div>
              
              {/* Show thinking indicator if analysis is pending */}
              {displayAnalysis.analysisStatus === "pending" && pollingActive && (
                <div className="mt-6 pt-2 border-t border-gray-200">
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
            </>
          ) : (
            <div className="text-gray-600 text-center py-8">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Highlights Found</h3>
              <p>Sorry, we couldn't find recent highlights for this team.</p>
              <p className="text-sm text-gray-500 mt-2">Try selecting a different team.</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-lime-50 rounded-b-xl flex justify-end">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;