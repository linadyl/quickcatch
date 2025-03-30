// src/services/emailService.ts
import { AnalysisResult } from '../types';

interface EmailRequestPayload {
  recipientEmail: string;
  teamName: string;
  summary: string;
  teamPerformance: string;
  playerPerformance: string;
  videoUrl: string;
}

interface EmailResponse {
  success: boolean;
  message: string;
  messageId?: string;
  error?: string;
}

/**
 * Sends the analysis to the provided email address
 */
export const sendAnalysisEmail = async (
  email: string,
  teamName: string,
  analysis: AnalysisResult
): Promise<EmailResponse> => {
  try {
    const response = await fetch('http://localhost:5000/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipientEmail: email,
        teamName,
        summary: analysis.summary,
        teamPerformance: analysis.teamPerformance,
        playerPerformance: analysis.playerPerformance,
        videoUrl: analysis.videoUrl,
      } as EmailRequestPayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send email');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};