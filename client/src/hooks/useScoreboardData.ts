import { useQuery } from "@tanstack/react-query";
import type { Game, Team } from "@shared/schema";

export function useScoreboardData(gameId?: string | null) {
  // Fetch game data - either specific game or current game
  const { data: game } = useQuery<Game>({ 
    queryKey: gameId ? [`/api/game/${gameId}`] : ["/api/game/current"],
    retry: false
  });
  
  // Fetch home team data
  const { data: homeTeam } = useQuery<Team>({ 
    queryKey: [`/api/teams/${game?.homeTeamId}`],
    enabled: !!game?.homeTeamId
  });
  
  // Fetch away team data
  const { data: awayTeam } = useQuery<Team>({ 
    queryKey: [`/api/teams/${game?.awayTeamId}`],
    enabled: !!game?.awayTeamId
  });

  return {
    game,
    homeTeam,
    awayTeam
  };
}
