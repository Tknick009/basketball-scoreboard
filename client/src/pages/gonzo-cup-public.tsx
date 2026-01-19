import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trophy, Users, BarChart3, Calendar, Clock } from "lucide-react";
import type { Team, Game, BracketSlot, GamePlayer } from "@shared/schema";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import gonzoCupLogo from "@assets/5250878172990670614_1767493760280.jpeg";

type PlayerStat = {
  name: string;
  number: number | null;
  totalPoints: number;
  totalFouls: number;
  gamesPlayed: number;
  avgPoints: string;
};

export default function GonzoCupPublic() {
  const [statsSortField, setStatsSortField] = useState<keyof PlayerStat>('totalPoints');
  const [statsSortDirection, setStatsSortDirection] = useState<'asc' | 'desc'>('desc');

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: bracket = [] } = useQuery<BracketSlot[]>({
    queryKey: ["/api/gonzo-cup/bracket"],
  });

  const { data: tournamentGames = [] } = useQuery<Game[]>({
    queryKey: ["/api/gonzo-cup/games"],
  });

  const { data: playerStats = [] } = useQuery<PlayerStat[]>({
    queryKey: ["/api/gonzo-cup/stats"],
  });

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return "TBD";
    const team = teams.find(t => t.id === teamId);
    return team?.name || "Unknown";
  };

  const getTeamColor = (teamId: string | null): { accent: string; dot: string } => {
    if (!teamId) return { accent: "bg-muted", dot: "bg-muted-foreground" };
    const name = getTeamName(teamId).toLowerCase();
    const colorMap: Record<string, { accent: string; dot: string }> = {
      black: { accent: "border-l-gray-900", dot: "bg-gray-900" },
      white: { accent: "border-l-gray-300", dot: "bg-gray-300" },
      red: { accent: "border-l-red-500", dot: "bg-red-500" },
      blue: { accent: "border-l-blue-500", dot: "bg-blue-500" },
      green: { accent: "border-l-green-500", dot: "bg-green-500" },
      orange: { accent: "border-l-orange-500", dot: "bg-orange-500" },
      yellow: { accent: "border-l-yellow-400", dot: "bg-yellow-400" },
      purple: { accent: "border-l-purple-500", dot: "bg-purple-500" },
      pink: { accent: "border-l-pink-500", dot: "bg-pink-500" },
      gray: { accent: "border-l-gray-500", dot: "bg-gray-500" },
      grey: { accent: "border-l-gray-500", dot: "bg-gray-500" },
      navy: { accent: "border-l-blue-900", dot: "bg-blue-900" },
      maroon: { accent: "border-l-red-900", dot: "bg-red-900" },
      teal: { accent: "border-l-teal-500", dot: "bg-teal-500" },
      gold: { accent: "border-l-amber-500", dot: "bg-amber-500" },
    };
    for (const [color, styles] of Object.entries(colorMap)) {
      if (name.includes(color)) return styles;
    }
    return { accent: "border-l-slate-500", dot: "bg-slate-500" };
  };

  const getGameForSlot = (slot: BracketSlot) => {
    if (!slot.gameId) return null;
    return tournamentGames.find(g => g.id === slot.gameId);
  };

  const getPotentialTeams = (slot: BracketSlot): { team1Id: string | null; team2Id: string | null } | null => {
    const feedingSlots = bracket.filter(s => s.nextSlotId === slot.id);
    if (feedingSlots.length < 2) return null;
    const topFeeder = feedingSlots.find(s => s.isTopSlot);
    const bottomFeeder = feedingSlots.find(s => !s.isTopSlot);
    if (!topFeeder || !bottomFeeder) return null;
    return { team1Id: topFeeder.teamId, team2Id: bottomFeeder.teamId };
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleStatsSort = (field: keyof PlayerStat) => {
    if (statsSortField === field) {
      setStatsSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setStatsSortField(field);
      setStatsSortDirection('desc');
    }
  };

  const sortedStats = [...playerStats].sort((a, b) => {
    let aVal: any = a[statsSortField];
    let bVal: any = b[statsSortField];
    
    if (statsSortField === 'avgPoints') {
      aVal = parseFloat(aVal);
      bVal = parseFloat(bVal);
    }
    
    if (typeof aVal === 'string') {
      return statsSortDirection === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    
    return statsSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const quarterfinals = bracket.filter(s => s.round === 3).sort((a, b) => a.position - b.position);
  const semifinals = bracket.filter(s => s.round === 2).sort((a, b) => a.position - b.position);
  const finals = bracket.filter(s => s.round === 1).sort((a, b) => a.position - b.position);
  
  // Group quarterfinals into matches and sort by scheduled time
  const qfMatches = [
    { top: quarterfinals[0], bottom: quarterfinals[1] },
    { top: quarterfinals[2], bottom: quarterfinals[3] },
    { top: quarterfinals[4], bottom: quarterfinals[5] },
    { top: quarterfinals[6], bottom: quarterfinals[7] },
  ].filter(m => m.top).sort((a, b) => {
    const timeA = a.top?.scheduledTime || "ZZZ";
    const timeB = b.top?.scheduledTime || "ZZZ";
    return timeA.localeCompare(timeB);
  });
  
  // Check if bracket has the correct structure (4 semifinals, 2 finals)
  const isBracketMalformed = bracket.length > 0 && (semifinals.length !== 4 || finals.length !== 2);

  const renderTeamSlot = (teamId: string | null, score: number | null, isLoser: boolean, slot?: BracketSlot) => {
    const colors = getTeamColor(teamId);
    const potential = slot && !teamId ? getPotentialTeams(slot) : null;
    
    if (!teamId && potential?.team1Id && potential?.team2Id) {
      return (
        <div className="flex items-center justify-between p-1.5 rounded-r bg-muted/30 border-l-4 border-l-muted-foreground/30">
          <span className="text-xs text-muted-foreground uppercase">
            {getTeamName(potential.team1Id)} / {getTeamName(potential.team2Id)}
          </span>
        </div>
      );
    }
    
    return (
      <div className={`flex items-center justify-between p-2 rounded-r transition-all bg-muted/50 ${teamId ? `border-l-8 ${colors.accent}` : 'border-l-8 border-l-muted'}`}>
        <span className={`text-sm font-semibold truncate uppercase ${isLoser ? 'line-through text-red-500 dark:text-red-400' : 'text-muted-foreground'}`}>
          {getTeamName(teamId)}
        </span>
        {score !== null && <span className="font-mono font-bold text-muted-foreground">{score}</span>}
      </div>
    );
  };

  const renderBracketMatch = (topSlot: BracketSlot | undefined, bottomSlot: BracketSlot | undefined, roundName?: string, matchIndex?: number) => {
    if (!topSlot) return null;
    
    const game = getGameForSlot(topSlot);
    const isComplete = game?.status === 'completed';
    const winner = game ? (game.homeScore > game.awayScore ? game.homeTeamId : game.awayTeamId) : null;
    const topIsLoser = isComplete && winner !== null && winner !== topSlot?.teamId;
    const bottomIsLoser = isComplete && winner !== null && winner !== bottomSlot?.teamId;

    return (
      <div className="bg-card border rounded-lg overflow-hidden w-48 sm:w-52 shadow-sm">
        <div className="px-2 py-1.5 bg-muted text-foreground/70 text-sm font-medium text-center">
          {topSlot.scheduledTime || "TBD"}
        </div>
        <div className="p-2 space-y-1.5">
          {renderTeamSlot(topSlot?.teamId, game?.homeScore ?? null, topIsLoser, topSlot)}
          <div className="border-t border-muted-foreground/30 mx-8"></div>
          {renderTeamSlot(bottomSlot?.teamId ?? null, game?.awayScore ?? null, bottomIsLoser, bottomSlot)}
          {game && (
            <div className="pt-1 flex items-center justify-center gap-2">
              <Badge variant={isComplete ? "secondary" : "default"} className="text-xs">
                {isComplete ? "Final" : "Live"}
              </Badge>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-5 text-xs px-2" data-testid={`button-stats-${game.id}`}>
                    Stats
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-center">
                      {getTeamName(game.homeTeamId)} vs {getTeamName(game.awayTeamId)}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="text-center mb-2">
                    <span className="text-2xl font-bold font-mono">
                      {game.homeScore} - {game.awayScore}
                    </span>
                    <Badge variant={isComplete ? "secondary" : "default"} className="ml-2">
                      {isComplete ? "Final" : "Live"}
                    </Badge>
                  </div>
                  <GameRecap game={game} />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>
    );
  };

  const GameRecap = ({ game }: { game: Game }) => {
    const { data: gamePlayers = [] } = useQuery<GamePlayer[]>({
      queryKey: ["/api/game", game.id, "stats"],
    });

    const homePlayers = gamePlayers.filter(p => p.teamId === game.homeTeamId);
    const awayPlayers = gamePlayers.filter(p => p.teamId === game.awayTeamId);

    return (
      <div className="grid md:grid-cols-2 gap-4 p-4">
        <div>
          <h4 className="font-semibold mb-2 text-center">{getTeamName(game.homeTeamId)}</h4>
          <div className="rounded overflow-hidden">
            {homePlayers.sort((a, b) => b.points - a.points).map((p, i) => (
              <div 
                key={p.id} 
                className={`flex justify-between text-sm px-2 py-1 ${i % 2 === 0 ? 'bg-muted/50' : 'bg-muted/20'} ${p.missing ? 'line-through opacity-50' : ''}`}
              >
                <span>{p.number != null ? `#${p.number} ` : ''}{p.name}</span>
                <span className="font-mono">{p.points} pts</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-2 text-center">{getTeamName(game.awayTeamId)}</h4>
          <div className="rounded overflow-hidden">
            {awayPlayers.sort((a, b) => b.points - a.points).map((p, i) => (
              <div 
                key={p.id} 
                className={`flex justify-between text-sm px-2 py-1 ${i % 2 === 0 ? 'bg-muted/50' : 'bg-muted/20'} ${p.missing ? 'line-through opacity-50' : ''}`}
              >
                <span>{p.number != null ? `#${p.number} ` : ''}{p.name}</span>
                <span className="font-mono">{p.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Gonzo Cup Memorial Header */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-700 text-white py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <div className="h-24 w-24 rounded-full bg-white p-1.5 flex items-center justify-center overflow-hidden shadow-lg">
              <img src={gonzoCupLogo} alt="Gonzo Cup" className="h-full w-full object-contain rounded-full" />
            </div>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-wide uppercase mb-3">
            Gonzo Cup
          </h1>
          <div className="w-24 h-0.5 bg-amber-400 mx-auto mb-4"></div>
          <p className="text-lg sm:text-xl text-slate-300 italic">
            In loving memory of Ryan "Gonzo" Harrington
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        <Tabs defaultValue="bracket" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bracket" className="flex items-center gap-2" data-testid="tab-bracket">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Bracket</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2" data-testid="tab-stats">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="games" className="flex items-center gap-2" data-testid="tab-games">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Games</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bracket" className="space-y-4">
            {isBracketMalformed ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Trophy className="h-12 w-12 mx-auto text-amber-500 mb-4" />
                  <h3 className="text-lg font-semibold">Bracket Update In Progress</h3>
                  <p className="text-muted-foreground">The bracket is being updated. Please check back shortly.</p>
                </CardContent>
              </Card>
            ) : bracket.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">Bracket Not Set</h3>
                  <p className="text-muted-foreground">The tournament bracket has not been initialized yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex items-start gap-6 min-w-max p-4">
                  {/* Quarterfinals Column - sorted by scheduled time */}
                  <div className="flex flex-col gap-3">
                    <h3 className="text-xs font-bold text-center text-muted-foreground uppercase">Quarterfinals</h3>
                    {qfMatches.map((match, i) => (
                      <div key={i} className={i < qfMatches.length - 1 ? "mb-2" : ""}>
                        {renderBracketMatch(match.top, match.bottom, "QF", i)}
                      </div>
                    ))}
                  </div>

                  {/* Semifinals Column */}
                  <div className="flex flex-col pt-12">
                    <h3 className="text-xs font-bold text-center text-muted-foreground uppercase mb-2">Semifinals</h3>
                    <div className="flex flex-col gap-24">
                      {/* East Semifinal: E1vE4 winner vs E2vE3 winner (positions 0,1) */}
                      <div>{renderBracketMatch(semifinals.find(s => s.position === 0), semifinals.find(s => s.position === 1), "SF", 0)}</div>
                      {/* West Semifinal: W1vW4 winner vs W2vW3 winner (positions 2,3) */}
                      <div>{renderBracketMatch(semifinals.find(s => s.position === 2), semifinals.find(s => s.position === 3), "SF", 1)}</div>
                    </div>
                  </div>

                  {/* Finals Column */}
                  <div className="flex flex-col pt-36">
                    <h3 className="text-xs font-bold text-center text-muted-foreground uppercase mb-2">Championship</h3>
                    {finals.length > 0 && renderBracketMatch(finals.find(s => s.position === 0), finals.find(s => s.position === 1), "Final", 0)}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Tournament Player Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {playerStats.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No tournament stats yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted"
                            onClick={() => handleStatsSort('name')}
                          >
                            Player {statsSortField === 'name' && (statsSortDirection === 'asc' ? '↑' : '↓')}
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted text-right"
                            onClick={() => handleStatsSort('gamesPlayed')}
                          >
                            GP {statsSortField === 'gamesPlayed' && (statsSortDirection === 'asc' ? '↑' : '↓')}
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted text-right"
                            onClick={() => handleStatsSort('totalPoints')}
                          >
                            PTS {statsSortField === 'totalPoints' && (statsSortDirection === 'asc' ? '↑' : '↓')}
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted text-right"
                            onClick={() => handleStatsSort('avgPoints')}
                          >
                            PPG {statsSortField === 'avgPoints' && (statsSortDirection === 'asc' ? '↑' : '↓')}
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted text-right"
                            onClick={() => handleStatsSort('totalFouls')}
                          >
                            FLS {statsSortField === 'totalFouls' && (statsSortDirection === 'asc' ? '↑' : '↓')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedStats.map((player, index) => (
                          <TableRow key={index} data-testid={`stat-row-${index}`}>
                            <TableCell className="font-medium">
                              {player.number != null ? `#${player.number} ` : ''}{player.name}
                            </TableCell>
                            <TableCell className="text-right">{player.gamesPlayed}</TableCell>
                            <TableCell className="text-right font-bold">{player.totalPoints}</TableCell>
                            <TableCell className="text-right">{player.avgPoints}</TableCell>
                            <TableCell className="text-right">{player.totalFouls}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="games" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Tournament Games
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tournamentGames.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No tournament games yet.</p>
                ) : (
                  <Accordion type="single" collapsible className="space-y-2">
                    {tournamentGames.map(game => (
                      <AccordionItem key={game.id} value={game.id} className="border rounded-lg">
                        <AccordionTrigger className="px-4 hover:no-underline" data-testid={`game-${game.id}`}>
                          <div className="flex items-center gap-4 w-full">
                            <Badge variant={game.status === 'completed' ? 'secondary' : 'default'}>
                              {game.status === 'completed' ? 'Final' : 'Live'}
                            </Badge>
                            <span className="font-medium">{getTeamName(game.homeTeamId)}</span>
                            <span className="font-bold font-mono">{game.homeScore} - {game.awayScore}</span>
                            <span className="font-medium">{getTeamName(game.awayTeamId)}</span>
                            <span className="text-sm text-muted-foreground ml-auto mr-4">
                              {formatDate(game.createdAt)}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <GameRecap game={game} />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
