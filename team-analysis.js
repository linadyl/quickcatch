// team-analysis.js
// Dummy NHL team analysis data for production deployment

const teamAnalysisData = {
    // some predefined data, not all teams
    "Carolina Hurricanes": {
      summary: "The Carolina Hurricanes demonstrated their characteristic fast-paced, possession-driven hockey in this highlight reel. Their aggressive forecheck and quick transition game were on full display, showing why they consistently rank among the league's best at controlling play.",
      teamPerformance: "The Hurricanes' system was operating at peak efficiency, with their defensemen aggressively pinching to maintain offensive zone pressure. Their power play showed creativity with excellent puck movement and player rotation. Defensively, Carolina's commitment to shot-blocking and quick stick work disrupted several opposing scoring chances.",
      playerPerformance: "Sebastian Aho showcased his elite two-way game, creating scoring opportunities while being responsible defensively. Andrei Svechnikov's powerful skating and puck protection along the boards created space for his teammates. Seth Jarvis demonstrated his offensive instincts with timely positioning near the net. Martin Nečas's speed was evident in transition, catching defenders flat-footed."
    },
    "Columbus Blue Jackets": {
      summary: "The Columbus Blue Jackets showed flashes of potential despite their rebuilding status. This highlight package showcases their work ethic and ability to generate quality scoring chances through structured play and counterattacking opportunities.",
      teamPerformance: "Columbus exhibited a structured defensive approach, keeping shots to the perimeter and limiting high-danger chances. Their forecheck was persistent, creating turnovers in the offensive zone. The Blue Jackets' power play still needs refinement, but their penalty kill showed good coordination and positioning.",
      playerPerformance: "Zach Werenski led the offensive charge from the blue line, activating into plays and showcasing his smooth skating. Patrik Laine displayed his elite shooting ability, requiring minimal time and space to get dangerous shots on net. Kirill Marchenko's creativity with the puck created several scoring opportunities. Boone Jenner provided veteran leadership with responsible two-way play."
    },
    
    "Toronto Maple Leafs": {
      summary: "The Toronto Maple Leafs showcased their elite offensive talent in this highlight package. Their ability to quickly transition from defense to offense and capitalize on scoring chances demonstrates why they're one of the most dangerous teams in the league when at their best.",
      teamPerformance: "The Maple Leafs controlled possession for long stretches, using their speed and skill to maintain offensive zone time. Their power play was particularly effective, with crisp puck movement and excellent player positioning. Defensively, Toronto showed improved structure, though there were still moments where their commitment to offense created vulnerabilities on counterattacks.",
      playerPerformance: "Auston Matthews demonstrated his elite goal-scoring ability, finding open space and releasing his quick, accurate shot. Mitch Marner's playmaking vision was on full display, threading passes through tight spaces to create scoring chances. William Nylander used his speed and puck handling to drive play through the neutral zone. Morgan Rielly activated from the blue line effectively, joining the rush at opportune moments."
    },
    "Boston Bruins": {
      summary: "The Boston Bruins displayed their trademark blend of skill and physicality in this highlight reel. Their structured system and veteran savvy were evident throughout, showing why they remain one of the most consistent franchises in the league.",
      teamPerformance: "Boston's defensive structure was excellent, limiting opportunities through the middle of the ice and forcing play to the perimeter. Their forecheck applied consistent pressure, creating turnovers that led to quick strike chances. The Bruins' special teams were effective, with their penalty kill particularly impressive in disrupting passing lanes.",
      playerPerformance: "David Pastrňák showcased his elite scoring touch, creating offense both off the rush and in established zone play. Brad Marchand's competitive edge was evident in his relentless puck pursuit and ability to agitate opponents. Charlie McAvoy demonstrated his two-way ability, making smart defensive reads while jumping into the play offensively. Jeremy Swayman provided timely saves when called upon, showing good positioning and rebound control."
    },
    
    // Generic fallback for any team not specifically covered
    "default": {
      summary: "This highlight package showcases the team's recent performance, highlighting their strengths and playing style. The video captures key moments that demonstrate their system and individual player talents.",
      teamPerformance: "The team displayed their typical strategic approach, with moments of both offensive creativity and defensive structure. Their special teams showed both promising sequences and areas for improvement, while their overall system execution reflected the coaching staff's philosophy.",
      playerPerformance: "Several key players stood out in this highlight package. The forward group created scoring opportunities through skill and determination, while the defensive corps balanced offensive activation with responsible coverage. Goaltending made timely saves when called upon, providing the foundation for the team's performance."
    }
  };
  
  // Function to get analysis for a team
  const getTeamAnalysis = (teamName) => {
    // Try to match the exact team name
    if (teamAnalysisData[teamName]) {
      return teamAnalysisData[teamName];
    }
    
    // Try to find a partial match
    const keys = Object.keys(teamAnalysisData);
    for (const key of keys) {
      if (key !== "default" && teamName.includes(key) || key.includes(teamName)) {
        return teamAnalysisData[key];
      }
    }
    
    // Default fallback
    return teamAnalysisData.default;
  };
  
  module.exports = {
    getTeamAnalysis
  };