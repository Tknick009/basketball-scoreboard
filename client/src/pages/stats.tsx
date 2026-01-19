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
import { useState } from "react";

interface PlayerStat {
  name: string;
  number: number | null;
  totalPoints: number;
  totalFouls: number;
  gamesPlayed: number;
  avgPoints: string;
}

type SortField = 'name' | 'totalPoints' | 'avgPoints' | 'totalFouls' | 'gamesPlayed';

export default function Stats() {
  const [sortField, setSortField] = useState<SortField>('totalPoints');
  const [sortAsc, setSortAsc] = useState(false);

  const { data: stats = [], isLoading } = useQuery<PlayerStat[]>({
    queryKey: ["/api/player-stats"],
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedStats = [...stats].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (sortField === 'avgPoints') {
      aVal = parseFloat(aVal);
      bVal = parseFloat(bVal);
    }

    if (sortField === 'name') {
      const result = aVal.localeCompare(bVal);
      return sortAsc ? result : -result;
    }

    const result = aVal - bVal;
    return sortAsc ? result : -result;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <Button variant="outline" size="sm" data-testid="button-back-to-control">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-display font-bold">Player Statistics</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Season Stats</CardTitle>
            <CardDescription>
              Statistics from all completed games (excluding mid-game substitutes)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading stats...</div>
            ) : stats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No statistics available. Complete some games to see player stats.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('name')}
                          className="font-semibold"
                          data-testid="button-sort-name"
                        >
                          Player {sortField === 'name' && (sortAsc ? '↑' : '↓')}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('gamesPlayed')}
                          className="font-semibold"
                          data-testid="button-sort-games"
                        >
                          GP {sortField === 'gamesPlayed' && (sortAsc ? '↑' : '↓')}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('totalPoints')}
                          className="font-semibold"
                          data-testid="button-sort-points"
                        >
                          PTS {sortField === 'totalPoints' && (sortAsc ? '↑' : '↓')}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('avgPoints')}
                          className="font-semibold"
                          data-testid="button-sort-avg"
                        >
                          AVG {sortField === 'avgPoints' && (sortAsc ? '↑' : '↓')}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('totalFouls')}
                          className="font-semibold"
                          data-testid="button-sort-fouls"
                        >
                          PF {sortField === 'totalFouls' && (sortAsc ? '↑' : '↓')}
                        </Button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedStats.map((player, index) => (
                      <TableRow key={`${player.name}-${index}`} data-testid={`row-player-${index}`}>
                        <TableCell className="font-mono text-muted-foreground">
                          {player.number != null ? `#${player.number}` : '-'}
                        </TableCell>
                        <TableCell className="font-semibold">{player.name}</TableCell>
                        <TableCell className="text-right font-mono">{player.gamesPlayed}</TableCell>
                        <TableCell className="text-right font-mono font-bold">{player.totalPoints}</TableCell>
                        <TableCell className="text-right font-mono text-primary">{player.avgPoints}</TableCell>
                        <TableCell className="text-right font-mono">{player.totalFouls}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
