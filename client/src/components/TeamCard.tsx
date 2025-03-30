import React from "react";

interface TeamCardProps {
  name: string;
  logo: string;
  onClick?: () => void; // Add onClick as optional
}

const TeamCard: React.FC<TeamCardProps> = ({ name, logo, onClick }) => {
  return (
    <div
      className="flex items-center py-3 px-2 cursor-pointer hover:bg-lime-200 hover:rounded-3xl"
      onClick={onClick} // Add click handler
    >
      <img src={logo} alt={name} className="w-8 h-8 mr-3" />
      <span className="font-medium">{name}</span>
    </div>
  );
};

export default TeamCard;
