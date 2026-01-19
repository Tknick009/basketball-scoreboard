import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TrendingUp, Calendar, Users, Trophy } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import logoUrl from "@assets/Pastime_Circle_Logo_v01_1762565290461.png";
import gonzoCupLogoUrl from "@assets/gonzo-cup-logo.png";

interface PlayerStat {
  name: string;
  number: number | null;
  totalPoints: number;
  totalFouls: number;
  gamesPlayed: number;
  avgPoints: string;
}

interface TeamStanding {
  rank: number;
  teamName: string;
  wins: number;
  losses: number;
  winPct: string;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  ppg: string;
  pag: string;
}

interface Team {
  id: string;
  name: string;
}

interface Game {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  period: number;
  status: string;
  createdAt: string;
}

interface GamePlayer {
  id: string;
  name: string;
  number: number | null;
  points: number;
  fouls: number;
  teamId: string;
  linkedPlayerId: string | null;
  missing: boolean;
}

interface Player {
  id: string;
  name: string;
  number: number | null;
  teamId: string;
}

type StatsSortField = 'name' | 'totalPoints' | 'avgPoints' | 'totalFouls' | 'gamesPlayed';
type StandingsSortField = 'rank' | 'teamName' | 'wins' | 'losses' | 'winPct' | 'pointsFor' | 'pointsAgainst' | 'pointDiff' | 'ppg' | 'pag';

export default function PublicLeague() {
  const [statsSortField, setStatsSortField] = useState<StatsSortField>('totalPoints');
  const [statsSortAsc, setStatsSortAsc] = useState(false);
  const [standingsSortField, setStandingsSortField] = useState<StandingsSortField>('rank');
  const [standingsSortAsc, setStandingsSortAsc] = useState(true);

  const { data: stats = [], isLoading: statsLoading } = useQuery<PlayerStat[]>({
    queryKey: ["/api/player-stats"],
  });

  const { data: standings = [], isLoading: standingsLoading } = useQuery<TeamStanding[]>({
    queryKey: ["/api/standings"],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: games = [], isLoading: gamesLoading } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  const handleStatsSort = (field: StatsSortField) => {
    if (statsSortField === field) {
      setStatsSortAsc(!statsSortAsc);
    } else {
      setStatsSortField(field);
      setStatsSortAsc(false);
    }
  };

  const handleStandingsSort = (field: StandingsSortField) => {
    if (standingsSortField === field) {
      setStandingsSortAsc(!standingsSortAsc);
    } else {
      setStandingsSortField(field);
      setStandingsSortAsc(field === 'rank' || field === 'teamName');
    }
  };

  const sortedStats = [...stats].sort((a, b) => {
    let aVal: any = a[statsSortField];
    let bVal: any = b[statsSortField];

    if (statsSortField === 'avgPoints') {
      aVal = parseFloat(aVal);
      bVal = parseFloat(bVal);
    }

    if (statsSortField === 'name') {
      const result = aVal.localeCompare(bVal);
      return statsSortAsc ? result : -result;
    }

    const result = aVal - bVal;
    return statsSortAsc ? result : -result;
  });

  const sortedStandings = [...standings].sort((a, b) => {
    // When sorting by rank (default), use custom tiebreaker logic
    if (standingsSortField === 'rank') {
      // Primary sort: win percentage (descending)
      const aWinPct = parseFloat(a.winPct);
      const bWinPct = parseFloat(b.winPct);
      if (aWinPct !== bWinPct) {
        return bWinPct - aWinPct;
      }

      // Secondary sort: average point differential (descending)
      const aGames = a.wins + a.losses;
      const bGames = b.wins + b.losses;
      const aAvgDiff = aGames > 0 ? a.pointDiff / aGames : 0;
      const bAvgDiff = bGames > 0 ? b.pointDiff / bGames : 0;
      if (aAvgDiff !== bAvgDiff) {
        return bAvgDiff - aAvgDiff;
      }

      // Tertiary sort: team name (alphabetical)
      return a.teamName.localeCompare(b.teamName);
    }

    // For all other columns, use standard sorting
    let aVal: any = a[standingsSortField];
    let bVal: any = b[standingsSortField];

    if (standingsSortField === 'winPct' || standingsSortField === 'ppg' || standingsSortField === 'pag') {
      aVal = parseFloat(aVal);
      bVal = parseFloat(bVal);
    }

    if (standingsSortField === 'teamName') {
      const result = aVal.localeCompare(bVal);
      return standingsSortAsc ? result : -result;
    }

    const result = aVal - bVal;
    return standingsSortAsc ? result : -result;
  });

  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || 'Unknown';
  };

  const getPeriodDisplay = (period: number) => {
    if (period === 1) return 'H1';
    if (period === 2) return 'H2';
    return `OT${period - 2}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Sort games: completed first (newest), then active
  const sortedGames = [...games].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return -1;
    if (a.status !== 'completed' && b.status === 'completed') return 1;
    const bTime = Number(b.createdAt) * 1000;
    const aTime = Number(a.createdAt) * 1000;
    return bTime - aTime;
  });

  // Group games by date
  const gamesByDate = sortedGames.reduce((acc, game) => {
    const timestamp = Number(game.createdAt) * 1000;
    const date = new Date(timestamp).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(game);
    return acc;
  }, {} as Record<string, Game[]>);

  const TeamRoster = ({ teamId }: { teamId: string }) => {
    const { data: roster = [], isLoading } = useQuery<Player[]>({
      queryKey: ["/api/players", teamId],
    });

    if (isLoading) {
      return <div className="text-center py-4 text-muted-foreground text-sm" data-testid="loading-roster">Loading roster...</div>;
    }

    if (roster.length === 0) {
      return <div className="text-center py-4 text-muted-foreground text-sm">No players on this team yet.</div>;
    }

    return (
      <div className="px-1 pb-2">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-xs md:text-sm">#</TableHead>
                <TableHead className="text-xs md:text-sm">Player</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((player) => (
                <TableRow key={player.id} data-testid={`roster-player-${player.id}`}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {player.number != null ? `#${player.number}` : '-'}
                  </TableCell>
                  <TableCell className="text-sm">{player.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const GameDetails = ({ game }: { game: Game }) => {
    const { data: gamePlayers = [] } = useQuery<GamePlayer[]>({
      queryKey: ["/api/game", game.id, "stats"],
    });

    const homePlayers = gamePlayers.filter(p => p.teamId === game.homeTeamId).sort((a, b) => {
      const lastNameA = a.name.split(' ').pop() || '';
      const lastNameB = b.name.split(' ').pop() || '';
      return lastNameA.localeCompare(lastNameB);
    });

    const awayPlayers = gamePlayers.filter(p => p.teamId === game.awayTeamId).sort((a, b) => {
      const lastNameA = a.name.split(' ').pop() || '';
      const lastNameB = b.name.split(' ').pop() || '';
      return lastNameA.localeCompare(lastNameB);
    });

    return (
      <div className="space-y-4 px-1 pb-2">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Home Team Stats */}
          <div>
            <h4 className="font-semibold mb-2 text-sm">{getTeamName(game.homeTeamId)} - Player Stats</h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">PTS</TableHead>
                    <TableHead className="text-right">PF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {homePlayers.length > 0 ? (
                    homePlayers.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {player.number != null ? `#${player.number}` : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className={player.missing ? "line-through opacity-50" : ""}>
                            {player.name}
                          </span>
                          {!player.linkedPlayerId && (
                            <Badge variant="outline" className="ml-1 text-[10px] h-4" data-testid="badge-sub">SUB</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">{player.points}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{player.fouls}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                        No player stats available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Away Team Stats */}
          <div>
            <h4 className="font-semibold mb-2 text-sm">{getTeamName(game.awayTeamId)} - Player Stats</h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">PTS</TableHead>
                    <TableHead className="text-right">PF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {awayPlayers.length > 0 ? (
                    awayPlayers.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {player.number != null ? `#${player.number}` : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className={player.missing ? "line-through opacity-50" : ""}>
                            {player.name}
                          </span>
                          {!player.linkedPlayerId && (
                            <Badge variant="outline" className="ml-1 text-[10px] h-4" data-testid="badge-sub">SUB</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">{player.points}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{player.fouls}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                        No player stats available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto p-3 md:p-6 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8 pt-2 md:pt-4">
          <div className="flex items-center justify-center gap-2 md:gap-3 mb-2 md:mb-3">
            <img src={logoUrl} alt="Pastime Logo" className="h-8 w-8 md:h-10 md:w-10" data-testid="img-league-logo" />
            <h1 className="text-2xl md:text-4xl font-display font-bold">Pac Winter League</h1>
          </div>
          <p className="text-muted-foreground text-sm md:text-lg mb-3">
            Live statistics, standings, and game results
          </p>
          <Link href="/GonzoCup">
            <Button variant="outline" className="text-amber-600 border-amber-600 hover:bg-amber-50" data-testid="link-gonzo-cup">
              <img src={gonzoCupLogoUrl} alt="Gonzo Cup" className="h-7 w-7 rounded-full mr-2" style={{ filter: 'brightness(0) saturate(100%) invert(45%) sepia(98%) saturate(1000%) hue-rotate(15deg) brightness(0.95)' }} />
              Gonzo Cup Tournament
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="standings" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4 md:mb-6">
            <TabsTrigger value="standings" className="text-xs md:text-sm" data-testid="tab-standings">
              <Trophy className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Standings</span>
              <span className="sm:hidden">Stand.</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="text-xs md:text-sm" data-testid="tab-stats">
              <TrendingUp className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Player Stats</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="games" className="text-xs md:text-sm" data-testid="tab-games">
              <Calendar className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Games</span>
              <span className="sm:hidden">Games</span>
            </TabsTrigger>
            <TabsTrigger value="teams" className="text-xs md:text-sm" data-testid="tab-teams">
              <Users className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Teams</span>
              <span className="sm:hidden">Teams</span>
            </TabsTrigger>
          </TabsList>

          {/* Team Standings Tab */}
          <TabsContent value="standings">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg md:text-xl">Team Standings</CardTitle>
                </div>
                <CardDescription className="text-xs md:text-sm">
                  Current league standings based on completed games
                </CardDescription>
              </CardHeader>
              <CardContent>
                {standingsLoading ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Loading standings...</div>
                ) : standings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No standings available. Complete some games to see team standings.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8 md:w-12 text-center cursor-pointer text-xs md:text-sm" onClick={() => handleStandingsSort('rank')}>
                            # {standingsSortField === 'rank' && (standingsSortAsc ? '↑' : '↓')}
                          </TableHead>
                          <TableHead className="cursor-pointer text-xs md:text-sm" onClick={() => handleStandingsSort('teamName')}>
                            Team {standingsSortField === 'teamName' && (standingsSortAsc ? '↑' : '↓')}
                          </TableHead>
                          <TableHead className="text-right cursor-pointer text-xs md:text-sm" onClick={() => handleStandingsSort('wins')}>
                            W {standingsSortField === 'wins' && (standingsSortAsc ? '↑' : '↓')}
                          </TableHead>
                          <TableHead className="text-right cursor-pointer text-xs md:text-sm" onClick={() => handleStandingsSort('losses')}>
                            L {standingsSortField === 'losses' && (standingsSortAsc ? '↑' : '↓')}
                          </TableHead>
                          <TableHead className="text-right cursor-pointer text-xs md:text-sm" onClick={() => handleStandingsSort('winPct')}>
                            PCT {standingsSortField === 'winPct' && (standingsSortAsc ? '↑' : '↓')}
                          </TableHead>
                          <TableHead className="text-right cursor-pointer text-xs md:text-sm" onClick={() => handleStandingsSort('pointsFor')}>
                            PF {standingsSortField === 'pointsFor' && (standingsSortAsc ? '↑' : '↓')}
                          </TableHead>
                          <TableHead className="text-right cursor-pointer text-xs md:text-sm" onClick={() => handleStandingsSort('pointsAgainst')}>
                            PA {standingsSortField === 'pointsAgainst' && (standingsSortAsc ? '↑' : '↓')}
                          </TableHead>
                          <TableHead className="text-right cursor-pointer text-xs md:text-sm" onClick={() => handleStandingsSort('pointDiff')}>
                            DIFF {standingsSortField === 'pointDiff' && (standingsSortAsc ? '↑' : '↓')}
                          </TableHead>
                          <TableHead className="text-right cursor-pointer text-xs md:text-sm" onClick={() => handleStandingsSort('ppg')}>
                            APF {standingsSortField === 'ppg' && (standingsSortAsc ? '↑' : '↓')}
                          </TableHead>
                          <TableHead className="text-right cursor-pointer text-xs md:text-sm" onClick={() => handleStandingsSort('pag')}>
                            APA {standingsSortField === 'pag' && (standingsSortAsc ? '↑' : '↓')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedStandings.map((team, index) => (
                          <TableRow key={team.teamName} data-testid={`row-standing-${index}`}>
                            <TableCell className="text-center font-semibold text-muted-foreground text-xs md:text-sm">
                              {team.rank}
                            </TableCell>
                            <TableCell className="font-semibold text-xs md:text-sm">{team.teamName}</TableCell>
                            <TableCell className="text-right font-mono text-xs md:text-sm">{team.wins}</TableCell>
                            <TableCell className="text-right font-mono text-xs md:text-sm">{team.losses}</TableCell>
                            <TableCell className="text-right font-mono font-bold text-xs md:text-sm">{team.winPct}</TableCell>
                            <TableCell className="text-right font-mono text-xs md:text-sm">{team.pointsFor}</TableCell>
                            <TableCell className="text-right font-mono text-xs md:text-sm">{team.pointsAgainst}</TableCell>
                            <TableCell className={`text-right font-mono font-semibold text-xs md:text-sm ${
                              team.pointDiff > 0 ? 'text-green-600 dark:text-green-400' : 
                              team.pointDiff < 0 ? 'text-red-600 dark:text-red-400' : ''
                            }`}>
                              {team.pointDiff > 0 ? '+' : ''}{team.pointDiff}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs md:text-sm">{team.ppg}</TableCell>
                            <TableCell className="text-right font-mono text-xs md:text-sm">{team.pag}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Player Stats Tab */}
          <TabsContent value="stats">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg md:text-xl">Player Statistics</CardTitle>
                </div>
                <CardDescription className="text-xs md:text-sm">
                  Season statistics from all completed games
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Loading stats...</div>
                ) : stats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No statistics available. Complete some games to see player stats.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-xs md:text-sm">#</TableHead>
                          <TableHead className="cursor-pointer text-xs md:text-sm" onClick={() => handleStatsSort('name')}>
                            Player {statsSortField === 'name' && (statsSortAsc ? '↑' : '↓')}
                          </TableHead>
                          <TableHead className="text-right cursor-pointer text-xs md:text-sm" onClick={() => handleStatsSort('gamesPlayed')}>
                            GP {statsSortField === 'gamesPlayed' && (statsSortAsc ? '↑' : '↓')}
                          </TableHead>
                          <TableHead className="text-right cursor-pointer text-xs md:text-sm" onClick={() => handleStatsSort('totalPoints')}>
                            PTS {statsSortField === 'totalPoints' && (statsSortAsc ? '↑' : '↓')}
                          </TableHead>
                          <TableHead className="text-right cursor-pointer text-xs md:text-sm" onClick={() => handleStatsSort('avgPoints')}>
                            AVG {statsSortField === 'avgPoints' && (statsSortAsc ? '↑' : '↓')}
                          </TableHead>
                          <TableHead className="text-right cursor-pointer text-xs md:text-sm" onClick={() => handleStatsSort('totalFouls')}>
                            PF {statsSortField === 'totalFouls' && (statsSortAsc ? '↑' : '↓')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedStats.map((player, index) => (
                          <TableRow key={`${player.name}-${index}`} data-testid={`row-player-${index}`}>
                            <TableCell className="font-mono text-muted-foreground text-xs md:text-sm">
                              {player.number != null ? `#${player.number}` : '-'}
                            </TableCell>
                            <TableCell className="font-semibold text-xs md:text-sm">{player.name}</TableCell>
                            <TableCell className="text-right font-mono text-xs md:text-sm">{player.gamesPlayed}</TableCell>
                            <TableCell className="text-right font-mono font-bold text-xs md:text-sm">{player.totalPoints}</TableCell>
                            <TableCell className="text-right font-mono text-primary text-xs md:text-sm">{player.avgPoints}</TableCell>
                            <TableCell className="text-right font-mono text-xs md:text-sm">{player.totalFouls}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Games Tab */}
          <TabsContent value="games">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg md:text-xl">Games & Results</CardTitle>
                </div>
                <CardDescription className="text-xs md:text-sm">
                  View all games and individual player statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {gamesLoading ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Loading games...</div>
                ) : games.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No games available yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(gamesByDate).map(([date, gamesForDate]) => (
                      <div key={date}>
                        <h3 className="font-semibold text-sm mb-2 mt-4 first:mt-0" data-testid={`date-header-${date}`}>
                          {formatDate(Number(gamesForDate[0].createdAt))}
                        </h3>
                        <Accordion type="multiple" className="w-full">
                          {gamesForDate.map((game) => (
                            <AccordionItem key={game.id} value={game.id}>
                              <AccordionTrigger className="hover:no-underline" data-testid={`game-${game.id}`}>
                                <div className="flex items-center justify-between w-full pr-4">
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 flex-1">
                                    <div className="flex items-center gap-2">
                                      <Badge variant={game.status === 'completed' ? 'secondary' : 'default'} className="text-xs">
                                        {game.status === 'completed' ? 'Final' : 'Active'}
                                      </Badge>
                                      {game.isTournament && (
                                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-600" data-testid="badge-tournament">
                                          TOURNAMENT
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-4 text-sm md:text-base font-semibold">
                                      <span className="truncate max-w-[100px] sm:max-w-none">{getTeamName(game.homeTeamId)}</span>
                                      <span className="font-mono font-bold text-lg md:text-xl">{game.homeScore}</span>
                                      <span className="text-muted-foreground">-</span>
                                      <span className="font-mono font-bold text-lg md:text-xl">{game.awayScore}</span>
                                      <span className="truncate max-w-[100px] sm:max-w-none">{getTeamName(game.awayTeamId)}</span>
                                    </div>
                                    {game.status === 'active' && (
                                      <Badge variant="outline" className="text-xs">
                                        {getPeriodDisplay(game.period)}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <GameDetails game={game} />
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg md:text-xl">Teams</CardTitle>
                </div>
                <CardDescription className="text-xs md:text-sm">
                  All teams in the league
                </CardDescription>
              </CardHeader>
              <CardContent>
                {teams.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No teams available yet.
                  </div>
                ) : (
                  <Accordion type="multiple" className="w-full">
                    {teams.map((team) => (
                      <AccordionItem key={team.id} value={team.id}>
                        <AccordionTrigger className="hover:no-underline" data-testid={`team-${team.id}`}>
                          <span className="font-semibold text-sm md:text-base">{team.name}</span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <TeamRoster teamId={team.id} />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer with abbreviations legend */}
        <div className="mt-6 md:mt-8 text-center text-xs md:text-sm text-muted-foreground space-y-1 pb-6 md:pb-8">
          <p className="font-semibold">Legend</p>
          <p className="hidden md:block">W = Wins, L = Losses, PCT = Win Percentage, PF = Points For, PA = Points Against, DIFF = Point Differential, APF = Avg Points For, APA = Avg Points Against</p>
          <p className="hidden md:block">GP = Games Played, PTS = Total Points, AVG = Points Per Game Average, PF = Personal Fouls</p>
          <p className="md:hidden">W = Wins, L = Losses, PCT = Win%, PF = Points For, PA = Points Against</p>
          <p className="md:hidden">GP = Games, PTS = Points, AVG = Avg, PF = Fouls</p>
        </div>
      </div>
    </div>
  );
}
