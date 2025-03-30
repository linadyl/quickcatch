import React from "react";
import TeamCard from "./TeamCard";

interface TeamListProps {
  conference: string;
  division: string;
  teams: any[];
  onTeamClick: (teamName: string) => void; // Pass click handler
}

const TeamList: React.FC<TeamListProps> = ({ division, teams, onTeamClick }) => {
  return (
    <div className="mb-6">
      <h3 className="text-sm text-lime-600 font-medium mb-2">{division}</h3>
      <div className="flex flex-col divide-y divide-gray-200">
        {teams.map((team) => (
          <TeamCard
            key={team.name}
            name={team.name}
            logo={team.logo}
            onClick={() => onTeamClick(team.name)} // Trigger analysis on click
          />
        ))}
      </div>
    </div>
  );
};

export default TeamList;
