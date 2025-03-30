import React, { useState, useEffect } from "react";
import { AnalysisResult } from "../types";
import EmailSharePopup from "./EmailSharePopup";
import { sendAnalysisEmail } from "../services/emailService";

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
        if (matches[j].index !== undefined && matches[j].index > index) {
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
  const [isEmailPopupOpen, setIsEmailPopupOpen] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{
    sending: boolean;
    success: boolean | null;
    message: string | null;
  }>({
    sending: false,
    success: null,
    message: null
  });
  
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
          `/api/analysis-status?team=${encodeURIComponent(teamName)}`
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
  
  // Handle email sharing
  const handleOpenEmailPopup = () => {
    // Only allow email sharing if we have analysis data
    if (displayAnalysis && !loading && !error) {
      setIsEmailPopupOpen(true);
    }
  };
  
  const handleCloseEmailPopup = () => {
    setIsEmailPopupOpen(false);
    // Reset email status after a delay
    setTimeout(() => {
      setEmailStatus({
        sending: false,
        success: null,
        message: null
      });
    }, 3000);
  };
  
  const handleSendEmail = async (email: string) => {
    if (!displayAnalysis || !teamName) return;
    
    setEmailStatus({
      sending: true,
      success: null,
      message: null
    });
    
    try {
      const response = await sendAnalysisEmail(email, teamName, displayAnalysis);
      
      if (response.success) {
        setEmailStatus({
          sending: false,
          success: true,
          message: "Analysis sent to your email!"
        });
        
        // Close the popup after a success message delay
        setTimeout(() => {
          setIsEmailPopupOpen(false);
        }, 2000);
      } else {
        setEmailStatus({
          sending: false,
          success: false,
          message: response.message || "Failed to send email. Please try again."
        });
      }
    } catch (error) {
      setEmailStatus({
        sending: false,
        success: false,
        message: "An error occurred. Please try again."
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-lime-100 bg-opacity-80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-11/12 max-w-4xl max-h-[90vh] flex flex-col relative border border-lime-300">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-lime-50 to-white rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-800">
            {teamName ? `${teamName} Highlights` : "NHL Highlights"}
          </h2>
          <div className="flex items-center space-x-2">
            {/* Email share button */}
            <button
              onClick={handleOpenEmailPopup}
              disabled={loading || !displayAnalysis || !!error}
              className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                loading || !displayAnalysis || !!error
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-lime-600 text-white hover:bg-lime-700"
              }`}
              title={
                loading 
                  ? "Analysis loading..." 
                  : !displayAnalysis || !!error
                    ? "Analysis unavailable"
                    : "Share analysis via email"
              }
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4 mr-1" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              Email
            </button>
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-red-500 text-xl flex items-center justify-center bg-white rounded-full h-8 w-8 border border-gray-300 hover:border-red-300 shadow-sm transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
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
                <div className="w-full aspect-video rounded-lg overflow-hidden mb-6 shadow-md">
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

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-lime-600 mb-2">📝 Summary</h3>
                  <div 
                    className="text-gray-700 bg-lime-50 p-4 rounded-lg shadow-sm border border-lime-100"
                    dangerouslySetInnerHTML={{ 
                      __html: formatText(displayAnalysis.summary || "No summary available") +
                      (displayAnalysis.analysisStatus === "pending" ? 
                        '<span class="inline-block animate-pulse ml-1">...</span>' : '')
                    }}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-lime-600 mb-2">📊 Team Performance</h3>
                  <div 
                    className="text-gray-700 bg-lime-50 p-4 rounded-lg shadow-sm border border-lime-100"
                    dangerouslySetInnerHTML={{ 
                      __html: formatText(displayAnalysis.teamPerformance || "No team analysis available") +
                      (displayAnalysis.analysisStatus === "pending" ? 
                        '<span class="inline-block animate-pulse ml-1">...</span>' : '')
                    }}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-lime-600 mb-2">🏒 Player Performance</h3>
                  <div 
                    className="text-gray-700 bg-lime-50 p-4 rounded-lg shadow-sm border border-lime-100"
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
      </div>
      
      {/* Email share popup */}
      <EmailSharePopup
        isOpen={isEmailPopupOpen}
        onClose={handleCloseEmailPopup}
        onSubmit={handleSendEmail}
        teamName={teamName}
      />
      
      {/* Email status toast notification */}
      {emailStatus.message && (
        <div 
          className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg 
            ${emailStatus.success === true 
              ? "bg-green-600 text-white" 
              : emailStatus.success === false 
                ? "bg-red-600 text-white" 
                : "bg-gray-700 text-white"
            } 
            transition-opacity duration-300 ${emailStatus.message ? "opacity-100" : "opacity-0"}`}
        >
          <div className="flex items-center">
            {emailStatus.success === true && (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            )}
            {emailStatus.success === false && (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            )}
            <span>{emailStatus.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisModal;