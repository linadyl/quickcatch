// src/types.ts
export interface GameData {
    homeTeam: string;
    awayTeam: string;
    score: string;
    gameId: number;
    gameDate: string;
  }
export interface AnalysisResult {
    summary: string;
    teamPerformance: string;
    playerPerformance: string;
    videoUrl: string;
    analysisStatus?: "pending" | "complete";
  }