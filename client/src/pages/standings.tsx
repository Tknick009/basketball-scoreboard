import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TeamStanding {
  rank: number;
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  gamesPlayed: number;
  winPct: string;
  pointDiff: number;
  ppg: string;
}

export default function Standings() {
  const { data: standings = [], isLoading } = useQuery<TeamStanding[]>({
    queryKey: ["/api/standings"],
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/games">
            <Button variant="outline" size="sm" data-testid="button-back-to-games">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-display font-bold">Team Standings</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>League Standings</CardTitle>
            <CardDescription>
              Team records and statistics from all completed games
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading standings...</div>
            ) : standings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No standings available. Complete some games to see team records.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead className="text-center">W</TableHead>
                      <TableHead className="text-center">L</TableHead>
                      <TableHead className="text-center">PCT</TableHead>
                      <TableHead className="text-center">PF</TableHead>
                      <TableHead className="text-center">PA</TableHead>
                      <TableHead className="text-center">DIFF</TableHead>
                      <TableHead className="text-center">PPG</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.map((team, index) => (
                      <TableRow key={team.teamId} data-testid={`row-team-${team.teamId}`}>
                        <TableCell className="font-bold text-muted-foreground">
                          {team.rank}
                        </TableCell>
                        <TableCell className="font-semibold">{team.teamName}</TableCell>
                        <TableCell className="text-center font-mono">{team.wins}</TableCell>
                        <TableCell className="text-center font-mono">{team.losses}</TableCell>
                        <TableCell className="text-center font-mono font-bold text-primary">
                          {team.winPct}
                        </TableCell>
                        <TableCell className="text-center font-mono">{team.pointsFor}</TableCell>
                        <TableCell className="text-center font-mono">{team.pointsAgainst}</TableCell>
                        <TableCell className={`text-center font-mono font-semibold ${team.pointDiff > 0 ? 'text-green-600 dark:text-green-400' : team.pointDiff < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                          {team.pointDiff > 0 ? '+' : ''}{team.pointDiff}
                        </TableCell>
                        <TableCell className="text-center font-mono">{team.ppg}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 text-sm text-muted-foreground">
          <p><strong>Legend:</strong> W = Wins, L = Losses, PCT = Win Percentage, PF = Points For, PA = Points Against, DIFF = Point Differential, PPG = Points Per Game</p>
        </div>
      </div>
    </div>
  );
}
