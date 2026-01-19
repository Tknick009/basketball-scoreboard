import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState } from "react";
import type { Game, Team, GamePlayer } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Clock, CheckCircle, Trash2, TrendingUp } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useScoreboardData } from "@/hooks/useScoreboardData";
import { ScoreboardDisplay } from "@/components/scoreboard/ScoreboardDisplay";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Games() {
  const { toast } = useToast();
  const [deleteGameId, setDeleteGameId] = useState<string | null>(null);
  const [deletePin, setDeletePin] = useState("");
  const [playerToMarkMissing, setPlayerToMarkMissing] = useState<string>("");
  const [markMissingConfirmOpen, setMarkMissingConfirmOpen] = useState(false);
  
  const { data: games = [], isLoading: gamesLoading } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // Get scoreboard data for the currently active game or most recent game
  const activeGame = games.find((g) => g.status === "active");
  const { game: scoreboardGame, homeTeam: scoreboardHomeTeam, awayTeam: scoreboardAwayTeam } = useScoreboardData(activeGame?.id);

  const markCompleteMutation = useMutation({
    mutationFn: async (gameId: string) =>
      await apiRequest("POST", "/api/game/end", { gameId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      toast({ title: "Game marked as complete" });
    },
  });

  const deleteGameMutation = useMutation({
    mutationFn: async ({ gameId, pin }: { gameId: string; pin: string }) =>
      await apiRequest("DELETE", `/api/games/${gameId}`, { pin }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      toast({ title: "Game deleted successfully" });
      setDeleteGameId(null);
      setDeletePin("");
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message.includes("401") ? "Invalid PIN" : error.message,
        variant: "destructive"
      });
    }
  });

  const updateMissingMutation = useMutation({
    mutationFn: async ({ playerId, missing }: { playerId: string; missing: boolean }) =>
      await apiRequest("PATCH", `/api/game-players/${playerId}/missing`, { missing }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      toast({ title: "Player status updated" });
    },
  });

  const handleDeleteConfirm = () => {
    if (deleteGameId && deletePin) {
      deleteGameMutation.mutate({ gameId: deleteGameId, pin: deletePin });
    }
  };

  const getTeamName = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    return team?.name || "Unknown";
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatPeriod = (period: number) => {
    if (period <= 4) return `Q${period}`;
    return `OT${period - 4}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const GamePlayerRow = ({ player }: { player: GamePlayer }) => {
    return (
      <TableRow className={player.missing ? "opacity-50" : ""} data-testid={`player-row-${player.id}`}>
        <TableCell className="font-bold text-primary">
          {player.number != null ? `#${player.number}` : "-"}
        </TableCell>
        <TableCell className="font-semibold">
          <div className="flex items-center gap-2">
            {player.name}
            {player.missing && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4" data-testid={`badge-missing-${player.id}`}>
                Missing
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="text-center">{player.points}</TableCell>
        <TableCell className="text-center">{player.fouls}</TableCell>
        <TableCell className="text-right">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (player.missing) {
                updateMissingMutation.mutate({ playerId: player.id, missing: false });
              } else {
                setPlayerToMarkMissing(player.id);
                setMarkMissingConfirmOpen(true);
              }
            }}
            data-testid={`button-mark-missing-${player.id}`}
          >
            {player.missing ? "Unmark" : "Mark Missing"}
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  const activeGames = games.filter((g) => g.status === "active");
  const completedGames = games.filter((g) => g.status === "completed");

  if (gamesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-2xl">Loading games...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ScoreboardDisplay game={scoreboardGame} homeTeam={scoreboardHomeTeam} awayTeam={scoreboardAwayTeam} />
      <div className="max-w-6xl mx-auto space-y-6 p-6" style={{ paddingTop: '140px' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Games</h1>
            <p className="text-muted-foreground">Manage and view all basketball games</p>
          </div>
          <div className="flex gap-2">
            <Link href="/standings">
              <Button variant="outline" data-testid="button-view-standings">
                <Trophy className="h-4 w-4 mr-2" />
                Standings
              </Button>
            </Link>
            <Link href="/stats">
              <Button variant="outline" data-testid="button-view-stats">
                <TrendingUp className="h-4 w-4 mr-2" />
                Player Stats
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" data-testid="button-back-control">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Control
              </Button>
            </Link>
          </div>
        </div>

        {activeGames.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Clock className="h-6 w-6" />
              Active Games
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {activeGames.map((game) => {
                const GameRosterAccordion = () => {
                  const { data: homePlayers = [] } = useQuery<GamePlayer[]>({
                    queryKey: ["/api/games", game.id, "players", "home"],
                  });
                  const { data: awayPlayers = [] } = useQuery<GamePlayer[]>({
                    queryKey: ["/api/games", game.id, "players", "away"],
                  });

                  return (
                    <Accordion type="single" collapsible data-testid={`accordion-roster-${game.id}`}>
                      <AccordionItem value="roster">
                        <AccordionTrigger>View Player Rosters</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">{getTeamName(game.homeTeamId)} (Home)</h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-center w-16">Pts</TableHead>
                                    <TableHead className="text-center w-16">Fouls</TableHead>
                                    <TableHead className="text-right w-32">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {[...homePlayers]
                                    .sort((a, b) => {
                                      const lastNameA = a.name.split(" ").pop() || "";
                                      const lastNameB = b.name.split(" ").pop() || "";
                                      return lastNameA.localeCompare(lastNameB);
                                    })
                                    .map((player) => (
                                      <GamePlayerRow key={player.id} player={player} />
                                    ))}
                                </TableBody>
                              </Table>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">{getTeamName(game.awayTeamId)} (Away)</h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-center w-16">Pts</TableHead>
                                    <TableHead className="text-center w-16">Fouls</TableHead>
                                    <TableHead className="text-right w-32">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {[...awayPlayers]
                                    .sort((a, b) => {
                                      const lastNameA = a.name.split(" ").pop() || "";
                                      const lastNameB = b.name.split(" ").pop() || "";
                                      return lastNameA.localeCompare(lastNameB);
                                    })
                                    .map((player) => (
                                      <GamePlayerRow key={player.id} player={player} />
                                    ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  );
                };

                return (
                  <Card key={game.id} data-testid={`card-game-${game.id}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="default">Active</Badge>
                          {game.isTournament && (
                            <Badge variant="outline" className="text-amber-600 border-amber-600" data-testid="badge-tournament">
                              TOURNAMENT
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{formatDate(game.createdAt)}</div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-lg font-semibold">{getTeamName(game.homeTeamId)}</div>
                            <div className="text-sm text-muted-foreground">Home</div>
                          </div>
                          <div className="text-3xl font-bold">{game.homeScore}</div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-lg font-semibold">{getTeamName(game.awayTeamId)}</div>
                            <div className="text-sm text-muted-foreground">Away</div>
                          </div>
                          <div className="text-3xl font-bold">{game.awayScore}</div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div>{formatPeriod(game.period)}</div>
                          <div>{formatTime(game.timeRemaining)}</div>
                        </div>
                        <GameRosterAccordion />
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      <Link href={`/?game=${game.id}`} className="flex-1">
                        <Button variant="default" className="w-full" data-testid={`button-view-game-${game.id}`}>
                          View Game
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        onClick={() => markCompleteMutation.mutate(game.id)}
                        disabled={markCompleteMutation.isPending}
                        data-testid={`button-mark-complete-${game.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Complete
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {completedGames.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Trophy className="h-6 w-6" />
              Completed Games
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedGames.map((game) => {
                const GameRosterAccordion = () => {
                  const { data: homePlayers = [] } = useQuery<GamePlayer[]>({
                    queryKey: ["/api/games", game.id, "players", "home"],
                  });
                  const { data: awayPlayers = [] } = useQuery<GamePlayer[]>({
                    queryKey: ["/api/games", game.id, "players", "away"],
                  });

                  return (
                    <Accordion type="single" collapsible data-testid={`accordion-roster-${game.id}`}>
                      <AccordionItem value="roster">
                        <AccordionTrigger>View Player Rosters</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">{getTeamName(game.homeTeamId)} (Home)</h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-center w-16">Pts</TableHead>
                                    <TableHead className="text-center w-16">Fouls</TableHead>
                                    <TableHead className="text-right w-32">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {[...homePlayers]
                                    .sort((a, b) => {
                                      const lastNameA = a.name.split(" ").pop() || "";
                                      const lastNameB = b.name.split(" ").pop() || "";
                                      return lastNameA.localeCompare(lastNameB);
                                    })
                                    .map((player) => (
                                      <GamePlayerRow key={player.id} player={player} />
                                    ))}
                                </TableBody>
                              </Table>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">{getTeamName(game.awayTeamId)} (Away)</h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-center w-16">Pts</TableHead>
                                    <TableHead className="text-center w-16">Fouls</TableHead>
                                    <TableHead className="text-right w-32">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {[...awayPlayers]
                                    .sort((a, b) => {
                                      const lastNameA = a.name.split(" ").pop() || "";
                                      const lastNameB = b.name.split(" ").pop() || "";
                                      return lastNameA.localeCompare(lastNameB);
                                    })
                                    .map((player) => (
                                      <GamePlayerRow key={player.id} player={player} />
                                    ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  );
                };

                return (
                  <Card key={game.id} className="hover-elevate" data-testid={`card-completed-game-${game.id}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Completed</Badge>
                          {game.isTournament && (
                            <Badge variant="outline" className="text-amber-600 border-amber-600" data-testid="badge-tournament">
                              TOURNAMENT
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{formatDate(game.createdAt)}</div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">{getTeamName(game.homeTeamId)}</div>
                          <div className="text-2xl font-bold">{game.homeScore}</div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">{getTeamName(game.awayTeamId)}</div>
                          <div className="text-2xl font-bold">{game.awayScore}</div>
                        </div>
                        <div className="text-xs text-muted-foreground text-center">
                          Final - {formatPeriod(game.period)}
                        </div>
                        <GameRosterAccordion />
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      <Link href={`/?game=${game.id}`} className="flex-1">
                        <Button variant="outline" className="w-full" data-testid={`button-view-game-${game.id}`}>
                          View Game
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => setDeleteGameId(game.id)}
                        data-testid={`button-delete-game-${game.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {games.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No Games Yet</CardTitle>
              <CardDescription>
                Create your first game from the control panel
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      <AlertDialog
        open={deleteGameId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteGameId(null);
            setDeletePin("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Game</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Enter the PIN to delete this game.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              type="password"
              inputMode="numeric"
              placeholder="Enter PIN"
              value={deletePin}
              onChange={(e) => setDeletePin(e.target.value)}
              className="text-center"
              autoFocus
              data-testid="input-delete-pin"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={!deletePin || deleteGameMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteGameMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={markMissingConfirmOpen} onOpenChange={setMarkMissingConfirmOpen}>
        <AlertDialogContent data-testid="dialog-mark-missing-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Player as Missing?</AlertDialogTitle>
            <AlertDialogDescription>
              This player will be excluded from games played statistics. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-mark-missing">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                updateMissingMutation.mutate({ playerId: playerToMarkMissing, missing: true });
                setMarkMissingConfirmOpen(false);
              }}
              data-testid="button-confirm-mark-missing"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
