import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Play, RefreshCw, Clock } from "lucide-react";
import type { Team, Game, BracketSlot } from "@shared/schema";
import gonzoCupLogo from "@assets/5250878172990670614_1767493760280.jpeg";

export default function GonzoCup() {
  const { toast } = useToast();
  const [eastTeams, setEastTeams] = useState<string[]>([]);
  const [westTeams, setWestTeams] = useState<string[]>([]);
  const [showChampion, setShowChampion] = useState(false);

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: bracket = [] } = useQuery<BracketSlot[]>({
    queryKey: ["/api/gonzo-cup/bracket"],
  });

  const { data: tournamentGames = [] } = useQuery<Game[]>({
    queryKey: ["/api/gonzo-cup/games"],
  });

  const initBracketMutation = useMutation({
    mutationFn: async ({ east, west }: { east: string[]; west: string[] }) => {
      return apiRequest("POST", "/api/gonzo-cup/bracket/init", { east, west });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gonzo-cup/bracket"] });
      toast({ title: "Bracket initialized!", description: "East and West divisions seeded into the bracket." });
      setEastTeams([]);
      setWestTeams([]);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateSlotMutation = useMutation({
    mutationFn: async ({ slotId, teamId, scheduledTime }: { slotId: string; teamId?: string | null; scheduledTime?: string }) => {
      const body: any = {};
      if (teamId !== undefined) body.teamId = teamId;
      if (scheduledTime !== undefined) body.scheduledTime = scheduledTime;
      return apiRequest("PATCH", `/api/gonzo-cup/bracket/${slotId}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gonzo-cup/bracket"] });
    },
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

  const toggleTeamSelection = (teamId: string, division: 'east' | 'west') => {
    const setter = division === 'east' ? setEastTeams : setWestTeams;
    const currentTeams = division === 'east' ? eastTeams : westTeams;
    const otherTeams = division === 'east' ? westTeams : eastTeams;
    
    if (otherTeams.includes(teamId)) {
      toast({ title: "Already selected", description: "This team is already in the other division.", variant: "destructive" });
      return;
    }
    
    setter(prev => {
      if (prev.includes(teamId)) {
        return prev.filter(id => id !== teamId);
      }
      if (prev.length >= 4) return prev;
      return [...prev, teamId];
    });
  };

  const handleInitBracket = () => {
    if (eastTeams.length !== 4 || westTeams.length !== 4) {
      toast({ title: "Select 4 teams per division", description: "You must select exactly 4 teams for East and 4 for West.", variant: "destructive" });
      return;
    }
    initBracketMutation.mutate({ east: eastTeams, west: westTeams });
  };

  const quarterfinals = bracket.filter(s => s.round === 3).sort((a, b) => a.position - b.position);
  const semifinals = bracket.filter(s => s.round === 2).sort((a, b) => a.position - b.position);
  const finals = bracket.filter(s => s.round === 1).sort((a, b) => a.position - b.position);
  
  // Check if bracket has the correct structure (4 semifinals, 2 finals)
  const isBracketMalformed = bracket.length > 0 && (semifinals.length !== 4 || finals.length !== 2);

  // Find the championship game and winner
  const finalsTopSlot = finals.find(s => s.position === 0);
  const finalsGame = finalsTopSlot ? getGameForSlot(finalsTopSlot) : null;
  const championTeamId = finalsGame?.status === 'completed' 
    ? (finalsGame.homeScore > finalsGame.awayScore ? finalsGame.homeTeamId : finalsGame.awayTeamId)
    : null;

  const renderTeamSlot = (teamId: string | null, score: number | null, isWinner: boolean, slot?: BracketSlot) => {
    const colors = getTeamColor(teamId);
    const potential = slot && !teamId ? getPotentialTeams(slot) : null;
    
    if (!teamId && potential?.team1Id && potential?.team2Id) {
      return (
        <div className="flex items-center justify-between p-2 rounded-r-md bg-muted/30 border-l-4 border-l-muted-foreground/30">
          <span className="text-xs text-muted-foreground">
            {getTeamName(potential.team1Id)} / {getTeamName(potential.team2Id)}
          </span>
        </div>
      );
    }
    
    return (
      <div className={`flex items-center justify-between p-2.5 rounded-r-md transition-all bg-muted/50 ${teamId ? `border-l-4 ${colors.accent}` : 'border-l-4 border-l-muted'}`}>
        <span className="text-sm font-semibold truncate">
          {getTeamName(teamId)}
        </span>
        {score !== null && <span className="font-mono font-bold text-lg">{score}</span>}
      </div>
    );
  };

  const renderMatch = (topSlot: BracketSlot | undefined, bottomSlot: BracketSlot | undefined, roundName: string, matchIndex: number) => {
    if (!topSlot) return null;
    
    const game = getGameForSlot(topSlot);
    const isComplete = game?.status === 'completed';
    const winner = game ? (game.homeScore > game.awayScore ? game.homeTeamId : game.awayTeamId) : null;

    return (
      <div key={`${roundName}-${matchIndex}`} className="w-60 rounded-lg overflow-hidden border bg-card shadow-sm" data-testid={`match-${roundName}-${matchIndex}`}>
        <div className="px-3 py-1.5 bg-muted text-muted-foreground text-xs text-center flex items-center justify-center gap-1.5">
          <Clock className="w-3 h-3" />
          <Input
            placeholder="Time..."
            value={topSlot.scheduledTime || ""}
            onChange={(e) => updateSlotMutation.mutate({ slotId: topSlot.id, scheduledTime: e.target.value })}
            className="h-6 text-xs text-center bg-transparent border-none shadow-none p-0 w-24"
            data-testid={`input-time-${roundName}-${matchIndex}`}
          />
        </div>
        <div className="p-3 space-y-2">
          {renderTeamSlot(topSlot?.teamId, game?.homeScore ?? null, winner === topSlot?.teamId, topSlot)}
          <div className="text-center text-xs text-muted-foreground font-medium">VS</div>
          {renderTeamSlot(bottomSlot?.teamId ?? null, game?.awayScore ?? null, winner === bottomSlot?.teamId, bottomSlot)}
          <div className="pt-2 space-y-2">
            {game ? (
              <div className="flex items-center gap-2">
                <Badge variant={isComplete ? "secondary" : "default"} className="text-xs">
                  {isComplete ? "Final" : "Live"}
                </Badge>
                <Link href={`/?game=${game.id}`} className="flex-1">
                  <Button size="sm" variant="outline" className="w-full text-xs" data-testid={`control-game-${game.id}`}>
                    <Play className="w-3 h-3 mr-1" />
                    Control
                  </Button>
                </Link>
              </div>
            ) : topSlot?.teamId && bottomSlot?.teamId ? (
              <Button 
                size="sm" 
                className="w-full text-xs"
                onClick={() => advanceWinner(topSlot, bottomSlot)}
                data-testid={`start-match-${roundName}-${matchIndex}`}
              >
                Start Match
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const advanceWinner = async (topSlot: BracketSlot, bottomSlot: BracketSlot) => {
    try {
      await apiRequest("POST", `/api/gonzo-cup/bracket/${Math.floor(topSlot.position / 2)}/game`, { round: topSlot.round });
      queryClient.invalidateQueries({ queryKey: ["/api/gonzo-cup/bracket"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gonzo-cup/games"] });
      toast({ title: "Game created!", description: "The match has been started." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Gonzo Cup Display - positioned at 0,0, matches scoreboard dimensions */}
      <div className="absolute top-0 left-0 w-[480px] h-[120px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex items-center justify-center z-50">
        {showChampion && championTeamId ? (
          <div className="flex items-center justify-center gap-4">
            <div className="h-[90px] w-[90px] rounded-full bg-white p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
              <img src={gonzoCupLogo} alt="Gonzo Cup" className="h-full w-full object-contain rounded-full" />
            </div>
            <div className="flex flex-col items-center text-center">
              <h1 className="font-display text-4xl font-bold text-white tracking-wide uppercase">
                Team {getTeamName(championTeamId)}
              </h1>
              <p className="text-amber-400 text-lg font-semibold tracking-wider uppercase">
                2026 Gonzo Cup Champions
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <div className="h-[90px] w-[90px] rounded-full bg-white p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
              <img src={gonzoCupLogo} alt="Gonzo Cup" className="h-full w-full object-contain rounded-full" />
            </div>
            <h1 className="font-display text-6xl font-bold text-white tracking-wide uppercase">Gonzo Cup</h1>
          </div>
        )}
      </div>
      
      <div className="max-w-7xl mx-auto p-4 pt-[136px]">
        
        <div className="flex items-center justify-between mb-6">
          <Link href="/">
            <Button variant="outline" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            {championTeamId && (
              <Button 
                variant={showChampion ? "default" : "outline"}
                onClick={() => setShowChampion(!showChampion)}
                data-testid="button-toggle-champion"
              >
                {showChampion ? "Hide Champion" : "Show Champion"}
              </Button>
            )}
            <Link href="/GonzoCup">
              <Button variant="outline" data-testid="link-public-page">View Public Page</Button>
            </Link>
          </div>
        </div>

        {isBracketMalformed ? (
          <Card className="border-amber-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <RefreshCw className="h-5 w-5" />
                Bracket Structure Update Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                The bracket structure has been updated to correctly pair division winners in semifinals. 
                Please reset and re-initialize the bracket to use the new structure.
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                <strong>New structure:</strong> E1vE4 winner faces E2vE3 winner (East SF), W1vW4 winner faces W2vW3 winner (West SF)
              </p>
              <Button 
                variant="destructive" 
                onClick={() => {
                  apiRequest("DELETE", "/api/gonzo-cup/bracket").then(() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/gonzo-cup/bracket"] });
                    toast({ title: "Bracket reset", description: "You can now re-initialize with the new structure." });
                  });
                }}
                data-testid="button-reset-malformed"
              >
                Reset Bracket
              </Button>
            </CardContent>
          </Card>
        ) : bracket.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Initialize Bracket - Select Teams by Division
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Select 4 teams for each division. Click order determines seeding (1st pick = #1 seed).
              </p>
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* East Division */}
                <div className="space-y-3">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    East Division ({eastTeams.length}/4)
                  </h3>
                  <div className="space-y-2">
                    {teams.map((team) => {
                      const eastSeed = eastTeams.indexOf(team.id);
                      const westSeed = westTeams.indexOf(team.id);
                      const isEast = eastSeed !== -1;
                      const isWest = westSeed !== -1;
                      return (
                        <div
                          key={`east-${team.id}`}
                          className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isEast ? 'bg-blue-500/10 border-blue-500' : isWest ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted'
                          }`}
                          onClick={() => !isWest && toggleTeamSelection(team.id, 'east')}
                          data-testid={`team-east-${team.id}`}
                        >
                          <Checkbox checked={isEast} disabled={isWest} />
                          <span className="font-medium">{team.name}</span>
                          {isEast && (
                            <Badge className="ml-auto bg-blue-500">E{eastSeed + 1}</Badge>
                          )}
                          {isWest && (
                            <Badge variant="outline" className="ml-auto opacity-50">W{westSeed + 1}</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* West Division */}
                <div className="space-y-3">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    West Division ({westTeams.length}/4)
                  </h3>
                  <div className="space-y-2">
                    {teams.map((team) => {
                      const eastSeed = eastTeams.indexOf(team.id);
                      const westSeed = westTeams.indexOf(team.id);
                      const isEast = eastSeed !== -1;
                      const isWest = westSeed !== -1;
                      return (
                        <div
                          key={`west-${team.id}`}
                          className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isWest ? 'bg-red-500/10 border-red-500' : isEast ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted'
                          }`}
                          onClick={() => !isEast && toggleTeamSelection(team.id, 'west')}
                          data-testid={`team-west-${team.id}`}
                        >
                          <Checkbox checked={isWest} disabled={isEast} />
                          <span className="font-medium">{team.name}</span>
                          {isWest && (
                            <Badge className="ml-auto bg-red-500">W{westSeed + 1}</Badge>
                          )}
                          {isEast && (
                            <Badge variant="outline" className="ml-auto opacity-50">E{eastSeed + 1}</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Matchup Preview */}
              {eastTeams.length === 4 && westTeams.length === 4 && (
                <div className="mb-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Quarterfinal Matchups:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-blue-600 dark:text-blue-400">E1 {getTeamName(eastTeams[0])} vs E4 {getTeamName(eastTeams[3])}</div>
                    <div className="text-red-600 dark:text-red-400">W1 {getTeamName(westTeams[0])} vs W4 {getTeamName(westTeams[3])}</div>
                    <div className="text-blue-600 dark:text-blue-400">E2 {getTeamName(eastTeams[1])} vs E3 {getTeamName(eastTeams[2])}</div>
                    <div className="text-red-600 dark:text-red-400">W2 {getTeamName(westTeams[1])} vs W3 {getTeamName(westTeams[2])}</div>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-4">
                <Button 
                  onClick={handleInitBracket}
                  disabled={eastTeams.length !== 4 || westTeams.length !== 4 || initBracketMutation.isPending}
                  data-testid="button-init-bracket"
                >
                  {initBracketMutation.isPending ? "Initializing..." : "Initialize Bracket"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Bracket Display - Traditional Left-to-Right Flow */}
            <div className="overflow-x-auto">
              <div className="flex items-start gap-8 min-w-max p-4">
                {/* Quarterfinals Column */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-center mb-2">Quarterfinals</h3>
                  {/* East QF 1 */}
                  <div className="mb-4">{renderMatch(quarterfinals[0], quarterfinals[1], "QF", 0)}</div>
                  {/* East QF 2 */}
                  <div className="mb-8">{renderMatch(quarterfinals[2], quarterfinals[3], "QF", 1)}</div>
                  {/* West QF 1 */}
                  <div className="mb-4">{renderMatch(quarterfinals[4], quarterfinals[5], "QF", 2)}</div>
                  {/* West QF 2 */}
                  <div>{renderMatch(quarterfinals[6], quarterfinals[7], "QF", 3)}</div>
                </div>

                {/* Semifinals Column */}
                <div className="flex flex-col justify-around h-full pt-16">
                  <h3 className="text-sm font-bold text-center mb-2">Semifinals</h3>
                  <div className="flex flex-col gap-32">
                    {/* East Semifinal: E1vE4 winner vs E2vE3 winner (positions 0,1) */}
                    <div>{renderMatch(semifinals.find(s => s.position === 0), semifinals.find(s => s.position === 1), "SF", 0)}</div>
                    {/* West Semifinal: W1vW4 winner vs W2vW3 winner (positions 2,3) */}
                    <div>{renderMatch(semifinals.find(s => s.position === 2), semifinals.find(s => s.position === 3), "SF", 1)}</div>
                  </div>
                </div>

                {/* Finals Column */}
                <div className="flex flex-col justify-center pt-48">
                  <h3 className="text-sm font-bold text-center mb-2">Championship</h3>
                  {finals.length > 0 && renderMatch(finals.find(s => s.position === 0), finals.find(s => s.position === 1), "Final", 0)}
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Tournament Games</CardTitle>
              </CardHeader>
              <CardContent>
                {tournamentGames.length === 0 ? (
                  <p className="text-muted-foreground">No tournament games yet. Start a match from the bracket above.</p>
                ) : (
                  <div className="space-y-2">
                    {tournamentGames.map(game => (
                      <div key={game.id} className="flex items-center justify-between p-3 bg-muted rounded-lg" data-testid={`game-row-${game.id}`}>
                        <div className="flex items-center gap-4">
                          <Badge variant={game.status === 'completed' ? 'secondary' : 'default'}>
                            {game.status === 'completed' ? 'Final' : 'Active'}
                          </Badge>
                          <span className="font-medium">{getTeamName(game.homeTeamId)}</span>
                          <span className="font-bold">{game.homeScore} - {game.awayScore}</span>
                          <span className="font-medium">{getTeamName(game.awayTeamId)}</span>
                        </div>
                        <Link href={`/?game=${game.id}`}>
                          <Button size="sm" variant="outline" data-testid={`link-game-${game.id}`}>
                            Control Game
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm("Are you sure you want to reset the bracket? This will delete all bracket data.")) {
                    apiRequest("POST", "/api/gonzo-cup/bracket/init", { teams: [] }).catch(() => {});
                    queryClient.invalidateQueries({ queryKey: ["/api/gonzo-cup/bracket"] });
                  }
                }}
                data-testid="button-reset-bracket"
              >
                Reset Bracket
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
