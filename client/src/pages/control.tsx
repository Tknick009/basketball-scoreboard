import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { type Team, type Player, type Game, type GamePlayer, insertTeamSchema, insertGameSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Play, Pause, RotateCcw, ChevronRight, Upload, Plus, Minus, List, ArrowLeftRight, Trash2, Volume2, Shield, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AnimatePresence, motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import pastimeLogoUrl from "@assets/Pastime_Circle_Logo_v01_1762565290461.png";
import gonzoCupLogoUrl from "@assets/5250878172990670614_1767493760280.jpeg";

export default function Control() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkImportFileRef = useRef<HTMLInputElement>(null);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const hornBufferRef = useRef<AudioBuffer | null>(null);
  const lastClockValueRef = useRef<number | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [selectedHomeTeamId, setSelectedHomeTeamId] = useState("");
  const [selectedAwayTeamId, setSelectedAwayTeamId] = useState("");
  const [elamTarget, setElamTarget] = useState<string>("");
  const [editingRosterTeamId, setEditingRosterTeamId] = useState<string>("");
  const [rosterFirstName, setRosterFirstName] = useState("");
  const [rosterLastName, setRosterLastName] = useState("");
  const [rosterNumber, setRosterNumber] = useState("");
  const [editingPlayerId, setEditingPlayerId] = useState<string>("");
  const [editName, setEditName] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinAuthenticated, setPinAuthenticated] = useState(false);
  const [pendingRosterTeamId, setPendingRosterTeamId] = useState<string>("");
  const [pendingBulkImport, setPendingBulkImport] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<string>("");
  const [resetClockConfirmOpen, setResetClockConfirmOpen] = useState(false);
  const [homeSubFirstName, setHomeSubFirstName] = useState("");
  const [homeSubLastName, setHomeSubLastName] = useState("");
  const [homeSubNumber, setHomeSubNumber] = useState("");
  const [awaySubFirstName, setAwaySubFirstName] = useState("");
  const [awaySubLastName, setAwaySubLastName] = useState("");
  const [awaySubNumber, setAwaySubNumber] = useState("");
  const [scoreboardNotification, setScoreboardNotification] = useState<{
    playerName: string;
    message: string;
    team: 'home' | 'away';
  } | null>(null);
  const [playerToMarkMissing, setPlayerToMarkMissing] = useState<string>("");
  const [markMissingConfirmOpen, setMarkMissingConfirmOpen] = useState(false);
  const [tournamentMode, setTournamentMode] = useState(false);

  // Load and persist tournament mode with localStorage (with safety checks)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tournamentMode');
      if (saved === 'true') {
        setTournamentMode(true);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('tournamentMode', tournamentMode.toString());
    } catch {
      // localStorage not available
    }
  }, [tournamentMode]);

  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('game');

  // Helper function to format player name as "F. LastName"
  const formatPlayerName = (fullName: string): string => {
    const parts = fullName.trim().split(' ');
    if (parts.length < 2) return fullName;
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');
    return `${firstName.charAt(0)}. ${lastName}`;
  };

  // Play horn sound - harsh basketball arena buzzer
  const playHorn = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      
      // Resume context if suspended (required for auto-play in browsers)
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      const now = ctx.currentTime;
      const duration = 1.0; // Classic buzzer length
      
      // Create harsh basketball buzzer - very aggressive and grating
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      
      // Main buzzer tone - lower and harsher (250 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.value = 250;
      osc1.connect(gain1);
      gain1.connect(masterGain);
      gain1.gain.value = 0.6;
      
      // Slightly detuned sawtooth for harshness/beating effect
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.value = 253; // Slightly off-tune for grating effect
      osc2.connect(gain2);
      gain2.connect(masterGain);
      gain2.gain.value = 0.5;
      
      // Square wave punch
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'square';
      osc3.frequency.value = 250;
      osc3.connect(gain3);
      gain3.connect(masterGain);
      gain3.gain.value = 0.4;
      
      // Upper harmonic for edge
      const osc4 = ctx.createOscillator();
      const gain4 = ctx.createGain();
      osc4.type = 'square';
      osc4.frequency.value = 500;
      osc4.connect(gain4);
      gain4.connect(masterGain);
      gain4.gain.value = 0.2;
      
      // Envelope: instant on, full blast, instant off (classic buzzer)
      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(1.0, now + 0.001); // Instant attack
      masterGain.gain.setValueAtTime(1.0, now + duration - 0.005); // Full blast
      masterGain.gain.linearRampToValueAtTime(0, now + duration); // Instant cutoff
      
      // Start and stop all oscillators
      osc1.start(now);
      osc2.start(now);
      osc3.start(now);
      osc4.start(now);
      osc1.stop(now + duration);
      osc2.stop(now + duration);
      osc3.stop(now + duration);
      osc4.stop(now + duration);
      
      toast({ title: "Horn sounded" });
    } catch (error) {
      console.error("Error playing horn:", error);
      toast({ title: "Error playing horn", variant: "destructive" });
    }
  };

  const { data: teams = [] } = useQuery<Team[]>({ queryKey: ["/api", "teams"] });
  const { data: game } = useQuery<Game>({ 
    queryKey: gameId ? ["/api", "game", gameId] : ["/api", "game", "current"],
    enabled: !!gameId,
    retry: false
  });
  const { data: homeTeam } = useQuery<Team>({ 
    queryKey: ["/api", "teams", game?.homeTeamId],
    enabled: !!game?.homeTeamId
  });
  const { data: awayTeam } = useQuery<Team>({ 
    queryKey: ["/api", "teams", game?.awayTeamId],
    enabled: !!game?.awayTeamId
  });
  const { data: homePlayers = [] } = useQuery<GamePlayer[]>({ 
    queryKey: ["/api/games", game?.id, "players", "home"],
    enabled: !!game?.id
  });
  const { data: awayPlayers = [] } = useQuery<GamePlayer[]>({ 
    queryKey: ["/api/games", game?.id, "players", "away"],
    enabled: !!game?.id
  });
  const { data: rosterPlayers = [] } = useQuery<Player[]>({ 
    queryKey: ["/api", "players", editingRosterTeamId],
    enabled: !!editingRosterTeamId
  });

  const editingTeam = teams.find(t => t.id === editingRosterTeamId);

  // Cleanup notification timeout on unmount
  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  // Initialize and resume AudioContext on first user interaction
  useEffect(() => {
    const initAudio = async () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
        } catch (error) {
          console.error("Failed to resume audio context:", error);
        }
      }
    };

    // Listen for first user interaction to unlock audio
    const unlockAudio = () => {
      initAudio();
      // Remove listeners after first unlock
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };

    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Auto-play horn when clock hits 0
  useEffect(() => {
    if (game && game.timeRemaining !== undefined) {
      const currentClock = game.timeRemaining;
      
      // Check if clock just hit 0 (transition from positive to 0)
      if (currentClock === 0 && lastClockValueRef.current !== null && lastClockValueRef.current > 0) {
        playHorn();
      }
      
      // Update last clock value
      lastClockValueRef.current = currentClock;
    }
  }, [game?.timeRemaining]);

  // Auto-populate Elam target (7 points higher than leading team)
  useEffect(() => {
    if (game && !game.elamEndingActive) {
      const higherScore = Math.max(game.homeScore, game.awayScore);
      const calculatedTarget = higherScore + 7;
      setElamTarget(calculatedTarget.toString());
    }
  }, [game?.homeScore, game?.awayScore, game?.elamEndingActive]);

  // Helper to show scoreboard notification with proper timeout management
  const showScoreboardNotification = (playerName: string, message: string, team: 'home' | 'away') => {
    // Clear any existing timeout
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    
    // Set the notification
    setScoreboardNotification({ playerName, message, team });
    
    // Schedule auto-dismiss
    notificationTimeoutRef.current = setTimeout(() => {
      setScoreboardNotification(null);
      notificationTimeoutRef.current = null;
    }, 3000);
  };

  const createTeamMutation = useMutation({
    mutationFn: async (name: string) => {
      const validated = insertTeamSchema.parse({ name });
      return await apiRequest("POST", "/api/teams", validated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "teams"] });
      setNewTeamName("");
      toast({ title: "Team created successfully" });
    },
  });

  const createPlayerMutation = useMutation({
    mutationFn: async ({ teamId, name, number }: { teamId: string; name: string; number?: number | null }) => {
      return await apiRequest("POST", "/api/players", { teamId, name, number: number !== undefined ? number : null });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api", "players", variables.teamId] });
      toast({ title: "Player added successfully" });
      // Clear roster editor form
      if (variables.teamId === editingRosterTeamId) {
        setRosterFirstName("");
        setRosterLastName("");
        setRosterNumber("");
      }
    },
  });

  const updatePlayerMutation = useMutation({
    mutationFn: async ({ playerId, name, number }: { playerId: string; name?: string; number?: number | null }) => {
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (number !== undefined) updates.number = number;
      return await apiRequest("PATCH", `/api/players/${playerId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "players"] });
      toast({ title: "Player updated successfully" });
      setEditingPlayerId("");
      setEditName("");
      setEditNumber("");
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      return await apiRequest("DELETE", `/api/teams/${teamId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api", "players"] });
      toast({ title: "Team deleted successfully" });
      setEditingRosterTeamId("");
      setPinAuthenticated(false);
    },
  });

  const deletePlayerMutation = useMutation({
    mutationFn: async (playerId: string) => {
      return await apiRequest("DELETE", `/api/players/${playerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "players"] });
      toast({ title: "Player deleted successfully" });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('csv', file);
      const response = await fetch('/api/players/bulk-import', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Import failed');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api", "teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api", "players"] });
      toast({ 
        title: "Bulk import successful", 
        description: `Imported ${data.count} players` 
      });
      if (bulkImportFileRef.current) {
        bulkImportFileRef.current.value = '';
      }
    },
    onError: (error: Error) => {
      toast({ 
        title: "Import failed", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const createGameMutation = useMutation({
    mutationFn: async () => {
      const validated = insertGameSchema.parse({
        homeTeamId: selectedHomeTeamId,
        awayTeamId: selectedAwayTeamId,
        isTournament: tournamentMode,
      });
      const response = await apiRequest("POST", "/api/game", validated);
      return await response.json();
    },
    onSuccess: async (newGame: Game) => {
      toast({ title: "Game started!" });
      // Wait a moment before transitioning to keep logo visible
      await new Promise(resolve => setTimeout(resolve, 100));
      // Invalidate queries to load new game data
      await queryClient.invalidateQueries({ queryKey: ["/api", "game"] });
      // Navigate to the new game using wouter (no page reload)
      setLocation(`/?game=${newGame.id}`);
    },
  });

  const updateScoreMutation = useMutation({
    mutationFn: async ({ team, points, gamePlayerId, playerName, currentPoints }: { 
      team: 'home' | 'away'; 
      points: number; 
      gamePlayerId?: string;
      playerName?: string;
      currentPoints?: number;
    }) => {
      return await apiRequest("POST", "/api/game/score", { team, points, gamePlayerId, gameId: game?.id });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api", "game"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games", game?.id, "players"] });
      
      // Invalidate bracket for tournament games (in case winner advanced)
      if (game?.isTournament) {
        queryClient.invalidateQueries({ queryKey: ["/api/gonzo-cup/bracket"] });
        queryClient.invalidateQueries({ queryKey: ["/api/gonzo-cup/games"] });
      }
      
      // Only show player notification if a specific player was involved
      if (variables.gamePlayerId && variables.playerName && variables.currentPoints !== undefined) {
        const newTotal = variables.currentPoints + variables.points;
        const formattedName = formatPlayerName(variables.playerName);
        const deltaLabel = Math.abs(variables.points) === 1 ? 'point' : 'points';
        const totalLabel = Math.abs(newTotal) === 1 ? 'point' : 'points';
        
        showScoreboardNotification(
          formattedName,
          `${variables.points > 0 ? '+' : ''}${variables.points} ${deltaLabel} • Total: ${newTotal} ${totalLabel}`,
          variables.team
        );
      }
    },
    onError: () => {
      toast({ title: "Network error", description: "Score update failed - check your connection", variant: "destructive" });
    },
  });

  const addFoulMutation = useMutation({
    mutationFn: async ({ team, gamePlayerId, count = 1, playerName, currentFouls }: { 
      team: 'home' | 'away'; 
      gamePlayerId?: string; 
      count?: number;
      playerName?: string;
      currentFouls?: number;
    }) => {
      return await apiRequest("POST", "/api/game/foul", { team, gamePlayerId, count, gameId: game?.id });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api", "game"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games", game?.id, "players"] });
      
      // Only show player notification if a specific player was involved
      if (variables.gamePlayerId && variables.playerName && variables.currentFouls !== undefined) {
        const newTotal = variables.currentFouls + (variables.count || 1);
        const formattedName = formatPlayerName(variables.playerName);
        const foulCount = variables.count || 1;
        const deltaLabel = Math.abs(foulCount) === 1 ? 'foul' : 'fouls';
        const totalLabel = Math.abs(newTotal) === 1 ? 'foul' : 'fouls';
        
        showScoreboardNotification(
          formattedName,
          `${foulCount > 0 ? '+' : ''}${foulCount} ${deltaLabel} • Total: ${newTotal} ${totalLabel}`,
          variables.team
        );
      }
    },
    onError: () => {
      toast({ title: "Network error", description: "Foul update failed - check your connection", variant: "destructive" });
    },
  });

  const createGamePlayerMutation = useMutation({
    mutationFn: async ({ teamId, name, number }: { teamId: string; name: string; number?: number | null }) => {
      if (!game?.id) throw new Error("No active game");
      return await apiRequest("POST", `/api/games/${game.id}/players`, {
        teamId,
        name,
        number: number !== undefined ? number : null,
        linkedPlayerId: null,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/games", game?.id, "players"] });
      toast({ title: "Substitute added successfully" });
      // Clear the form based on which team
      if (variables.teamId === game?.homeTeamId) {
        setHomeSubFirstName("");
        setHomeSubLastName("");
        setHomeSubNumber("");
      } else {
        setAwaySubFirstName("");
        setAwaySubLastName("");
        setAwaySubNumber("");
      }
    },
  });

  const toggleClockMutation = useMutation({
    mutationFn: async () => await apiRequest("POST", "/api/game/clock/toggle", { gameId: game?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "game"] });
    },
    onError: () => {
      toast({ title: "Network error", description: "Clock toggle failed - check your connection", variant: "destructive" });
    },
  });

  const resetClockMutation = useMutation({
    mutationFn: async () => await apiRequest("POST", "/api/game/clock/reset", { gameId: game?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "game"] });
    },
  });

  const updateClockMutation = useMutation({
    mutationFn: async ({ timeRemaining }: { timeRemaining: number }) => 
      await apiRequest("POST", "/api/game/clock/update", { timeRemaining, gameId: game?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "game"] });
      toast({ title: "Clock time updated" });
    },
  });

  const changePeriodMutation = useMutation({
    mutationFn: async (direction: 'next' | 'prev') => 
      await apiRequest("POST", "/api/game/period", { direction, gameId: game?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "game"] });
    },
  });

  const togglePossessionMutation = useMutation({
    mutationFn: async () => await apiRequest("POST", "/api/game/possession/toggle", { gameId: game?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "game"] });
    },
  });

  const useTimeoutMutation = useMutation({
    mutationFn: async ({ team, action }: { team: 'home' | 'away'; action: 'add' | 'subtract' }) => 
      await apiRequest("POST", "/api/game/timeout", { team, action, gameId: game?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "game"] });
    },
  });

  const activateElamMutation = useMutation({
    mutationFn: async (targetScore: number) => 
      await apiRequest("POST", "/api/game/elam/activate", { targetScore, gameId: game?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "game"] });
      toast({ title: "Elam Ending activated!" });
      setElamTarget("");
    },
    onError: () => {
      toast({ title: "Network error", description: "Elam activation failed - check your connection", variant: "destructive" });
    },
  });

  const deactivateElamMutation = useMutation({
    mutationFn: async () => 
      await apiRequest("POST", "/api/game/elam/deactivate", { gameId: game?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "game"] });
      toast({ title: "Elam Ending deactivated" });
    },
    onError: () => {
      toast({ title: "Network error", description: "Elam deactivation failed - check your connection", variant: "destructive" });
    },
  });

  const endGameMutation = useMutation({
    mutationFn: async () => 
      await apiRequest("POST", "/api/game/end", { gameId: game?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "game"] });
      toast({ title: "Game ended", description: "The game has been marked as completed" });
      window.location.href = '/';
    },
  });

  const swapTeamsMutation = useMutation({
    mutationFn: async () => 
      await apiRequest("POST", "/api/game/swap-teams", { gameId: game?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "game"] });
      queryClient.invalidateQueries({ queryKey: ["/api", "players"] });
      toast({ title: "Teams swapped", description: "Home and away teams have been switched" });
    },
  });

  const adjustTimeoutMutation = useMutation({
    mutationFn: async ({ team, action }: { team: 'home' | 'away'; action: 'add' | 'subtract' }) =>
      await apiRequest("POST", "/api/game/timeout", { team, action, gameId: game?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "game"] });
    },
  });

  const updateMissingMutation = useMutation({
    mutationFn: async ({ playerId, missing }: { playerId: string; missing: boolean }) =>
      await apiRequest("PATCH", `/api/game-players/${playerId}/missing`, { missing }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games", game?.id, "players"] });
      toast({ title: "Player status updated" });
    },
  });


  useEffect(() => {
    if (!game?.clockRunning || !game?.id) return;

    const interval = setInterval(async () => {
      try {
        const currentGame = await queryClient.fetchQuery({ 
          queryKey: gameId ? ["/api", "game", gameId] : ["/api", "game", "current"] 
        }) as Game;
        if (currentGame && currentGame.timeRemaining > 0) {
          await apiRequest("POST", "/api/game/clock/update", { 
            timeRemaining: currentGame.timeRemaining - 1,
            gameId: currentGame.id,
            pauseClock: false
          });
          queryClient.invalidateQueries({ queryKey: ["/api", "game"] });
        } else if (currentGame && currentGame.timeRemaining <= 0) {
          await apiRequest("POST", "/api/game/clock/toggle", { gameId: currentGame.id });
          queryClient.invalidateQueries({ queryKey: ["/api", "game"] });
        }
      } catch (error) {
        // Network error - silently ignore to prevent clock from stopping
        // The interval will retry on the next tick
        console.warn("Clock update failed, will retry:", error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [game?.clockRunning, game?.id, gameId]);

  // Spacebar to toggle clock
  useEffect(() => {
    if (!game) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea, or select
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      // Ignore repeated keydown events (when key is held down)
      if (e.repeat) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        toggleClockMutation.mutate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [game, toggleClockMutation]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPeriodLabel = (period: number) => {
    if (period <= 2) return `H${period}`;
    return `OT${period - 2}`;
  };

  const getTeamColors = (teamName: string) => {
    const name = teamName.toLowerCase();
    
    // Map team names to colors
    const colorMap: Record<string, { bg: string; border: string; text: string }> = {
      black: { bg: 'bg-gray-950/50', border: 'border-gray-500/30', text: 'text-gray-200' },
      orange: { bg: 'bg-orange-950/50', border: 'border-orange-500/30', text: 'text-orange-200' },
      purple: { bg: 'bg-purple-950/50', border: 'border-purple-500/30', text: 'text-purple-200' },
      camo: { bg: 'bg-green-950/50', border: 'border-green-700/30', text: 'text-green-200' },
      white: { bg: 'bg-slate-700/50', border: 'border-slate-400/30', text: 'text-slate-100' },
      red: { bg: 'bg-red-950/50', border: 'border-red-500/30', text: 'text-red-200' },
      green: { bg: 'bg-green-950/50', border: 'border-green-500/30', text: 'text-green-200' },
      blue: { bg: 'bg-blue-950/50', border: 'border-blue-500/30', text: 'text-blue-200' },
    };

    // Return matching color or default to blue
    return colorMap[name] || { bg: 'bg-blue-950/50', border: 'border-blue-500/30', text: 'text-blue-200' };
  };

  const PlayerRow = ({ player, team, teamObj }: { player: GamePlayer; team: 'home' | 'away'; teamObj?: Team }) => {
    return (
      <div className={`bg-card border rounded-md p-1.5 flex items-center gap-1.5 ${player.missing ? 'opacity-50' : ''}`} data-testid={`player-row-${player.id}`}>
        {/* Player Info - Compact */}
        <div className="flex items-center gap-1.5 min-w-[140px]">
          <span className="font-display text-sm font-bold text-primary w-6 text-center">
            {player.number != null ? `#${player.number}` : '-'}
          </span>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs truncate">{player.name}</span>
              {player.missing && (
                <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                  MISSING
                </Badge>
              )}
            </div>
            <div className="flex gap-1.5 text-xs font-medium">
              <span className="text-green-600 dark:text-green-400">{player.points}P</span>
              <span className="text-orange-600 dark:text-orange-400">{player.fouls}F</span>
            </div>
          </div>
        </div>

        {/* Scoring Buttons - Compact */}
        <div className="flex gap-1 flex-1">
          <Button 
            size="sm"
            className="flex-1 font-bold text-xs h-7"
            variant="default"
            disabled={updateScoreMutation.isPending}
            onClick={() => updateScoreMutation.mutate({ 
              team, 
              points: 1, 
              gamePlayerId: player.id,
              playerName: player.name,
              currentPoints: player.points
            })}
            data-testid={`button-add-1-${player.id}`}
          >
            +1
          </Button>
          <Button 
            size="sm"
            className="flex-1 font-bold text-xs h-7"
            variant="default"
            disabled={updateScoreMutation.isPending}
            onClick={() => updateScoreMutation.mutate({ 
              team, 
              points: 2, 
              gamePlayerId: player.id,
              playerName: player.name,
              currentPoints: player.points
            })}
            data-testid={`button-add-2-${player.id}`}
          >
            +2
          </Button>
          <Button 
            size="sm"
            className="flex-1 font-bold text-xs h-7"
            variant="default"
            disabled={updateScoreMutation.isPending}
            onClick={() => updateScoreMutation.mutate({ 
              team, 
              points: 3, 
              gamePlayerId: player.id,
              playerName: player.name,
              currentPoints: player.points
            })}
            data-testid={`button-add-3-${player.id}`}
          >
            +3
          </Button>
          <Button 
            size="default"
            className="font-bold px-3"
            variant="outline"
            disabled={updateScoreMutation.isPending}
            onClick={() => updateScoreMutation.mutate({ 
              team, 
              points: -1, 
              gamePlayerId: player.id,
              playerName: player.name,
              currentPoints: player.points
            })}
            data-testid={`button-minus-1-${player.id}`}
          >
            -1
          </Button>
        </div>

        {/* Separator */}
        <div className="w-px h-7 bg-border" />

        {/* Foul Buttons */}
        <div className="flex gap-1">
          <Button 
            size="default"
            className="font-bold px-3"
            variant="destructive"
            disabled={addFoulMutation.isPending}
            onClick={() => addFoulMutation.mutate({ 
              team, 
              gamePlayerId: player.id, 
              count: 1,
              playerName: player.name,
              currentFouls: player.fouls
            })}
            data-testid={`button-add-foul-${player.id}`}
          >
            +F
          </Button>
          <Button 
            size="default"
            className="font-bold px-3"
            variant="outline"
            disabled={addFoulMutation.isPending}
            onClick={() => addFoulMutation.mutate({ 
              team, 
              gamePlayerId: player.id, 
              count: -1,
              playerName: player.name,
              currentFouls: player.fouls
            })}
            data-testid={`button-minus-foul-${player.id}`}
          >
            -F
          </Button>
        </div>

        {/* Separator */}
        <div className="w-px h-7 bg-border" />

        {/* Missing Button */}
        <Button
          size="default"
          className="font-bold px-3"
          variant="ghost"
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
          {player.missing ? 'Unmark' : 'Missing'}
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Scoreboard Display Preview - Fixed at 0,0 for hardware duplication */}
      <div 
        className="w-[480px] h-[120px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 overflow-hidden cursor-none" 
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          margin: 0, 
          padding: 0,
          zIndex: 50
        }}
        data-testid="display-scoreboard-preview"
      >
        <AnimatePresence mode="wait">
        {game && homeTeam && awayTeam ? (
          // Active Game Scoreboard
          <motion.div
            key="active-game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full flex items-stretch"
          >
            {/* Home Team - Left */}
            <div className={`flex-1 flex flex-col items-center justify-center ${getTeamColors(homeTeam.name).bg} border-r-2 ${getTeamColors(homeTeam.name).border} relative`}>
              <div className={`absolute left-2 top-1/2 -translate-y-1/2 transition-opacity flex items-center gap-1 ${game.possession === 'home' ? 'opacity-100' : 'opacity-0'}`}>
                <span className="font-display text-xl font-bold text-yellow-400">P</span>
                <ChevronRight className="h-7 w-7 text-yellow-400" data-testid="indicator-possession-home" />
              </div>
              {/* Bonus indicator - shows when OPPONENT (away) has 6+ fouls */}
              {game.awayFouls >= 9 ? (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 text-red-400 font-bold text-xs tracking-tight" style={{ writingMode: 'vertical-rl' }} data-testid="indicator-bonus-home">
                  BONUS+
                </div>
              ) : game.awayFouls >= 6 ? (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 text-yellow-400 font-bold text-xs tracking-tight" style={{ writingMode: 'vertical-rl' }} data-testid="indicator-bonus-home">
                  BONUS
                </div>
              ) : null}
              <div className={`font-display text-sm uppercase tracking-wider ${getTeamColors(homeTeam.name).text} mb-1`} data-testid="text-home-team">
                {homeTeam.name}
              </div>
              <div className="font-display text-[55px] font-bold tabular-nums text-white leading-none" data-testid="text-home-score">
                {game.homeScore}
              </div>
              <div className={`flex gap-2 text-xs ${getTeamColors(homeTeam.name).text} mt-1`}>
                <span>F: <span className="font-bold" data-testid="text-home-fouls">{game.homeFouls}</span></span>
                <span>TO: <span className="font-bold" data-testid="text-home-timeouts">{game.homeTimeouts}</span></span>
              </div>
            </div>

            {/* Center - Clock/Period */}
            <div className="w-[160px] flex flex-col items-center justify-center bg-slate-900/80 relative">
              <AnimatePresence mode="wait">
                {game.elamEndingActive ? (
                  <motion.div
                    key="elam"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 flex flex-col items-center justify-center text-center px-2"
                  >
                    <div className="text-sm font-semibold bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 bg-clip-text text-transparent uppercase tracking-wide animate-pulse leading-tight">
                      Elam Ending
                    </div>
                    <div className="font-display text-[32px] font-bold bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] leading-none my-1" data-testid="text-target-score">
                      {game.targetScore}
                    </div>
                    <div className="text-[9px] text-amber-300 leading-tight">
                      First to {game.targetScore}
                    </div>
                    <img 
                      src={game.isTournament ? gonzoCupLogoUrl : pastimeLogoUrl} 
                      alt={game.isTournament ? "Gonzo Cup" : "Pastime Logo"} 
                      className={`mt-1 h-8 w-8 object-contain ${game.isTournament ? 'rounded-full' : 'brightness-0 invert opacity-60'}`}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="clock"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 flex flex-col items-center justify-center text-center"
                  >
                    <div className="font-display text-[41px] tabular-nums text-white leading-none mb-1" data-testid="text-clock">
                      {formatTime(game.timeRemaining)}
                    </div>
                    <div className="text-lg font-bold text-gray-300" data-testid="text-period">
                      {getPeriodLabel(game.period)}
                    </div>
                    <img 
                      src={game.isTournament ? gonzoCupLogoUrl : pastimeLogoUrl} 
                      alt={game.isTournament ? "Gonzo Cup" : "Pastime Logo"} 
                      className={`mt-1 h-10 w-10 object-contain ${game.isTournament ? 'rounded-full' : 'brightness-0 invert opacity-60'}`}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Away Team - Right */}
            <div className={`flex-1 flex flex-col items-center justify-center ${getTeamColors(awayTeam.name).bg} border-l-2 ${getTeamColors(awayTeam.name).border} relative`}>
              <div className={`absolute right-2 top-1/2 -translate-y-1/2 transition-opacity flex items-center gap-1 ${game.possession === 'away' ? 'opacity-100' : 'opacity-0'}`}>
                <ChevronRight className="h-7 w-7 text-yellow-400 rotate-180" data-testid="indicator-possession-away" />
                <span className="font-display text-xl font-bold text-yellow-400">P</span>
              </div>
              {/* Bonus indicator - shows when OPPONENT (home) has 6+ fouls */}
              {game.homeFouls >= 9 ? (
                <div className="absolute left-1 top-1/2 -translate-y-1/2 text-red-400 font-bold text-xs tracking-tight" style={{ writingMode: 'vertical-rl' }} data-testid="indicator-bonus-away">
                  BONUS+
                </div>
              ) : game.homeFouls >= 6 ? (
                <div className="absolute left-1 top-1/2 -translate-y-1/2 text-yellow-400 font-bold text-xs tracking-tight" style={{ writingMode: 'vertical-rl' }} data-testid="indicator-bonus-away">
                  BONUS
                </div>
              ) : null}
              <div className={`font-display text-sm uppercase tracking-wider ${getTeamColors(awayTeam.name).text} mb-1`} data-testid="text-away-team">
                {awayTeam.name}
              </div>
              <div className="font-display text-[55px] font-bold tabular-nums text-white leading-none" data-testid="text-away-score">
                {game.awayScore}
              </div>
              <div className={`flex gap-2 text-xs ${getTeamColors(awayTeam.name).text} mt-1`}>
                <span>F: <span className="font-bold" data-testid="text-away-fouls">{game.awayFouls}</span></span>
                <span>TO: <span className="font-bold" data-testid="text-away-timeouts">{game.awayTimeouts}</span></span>
              </div>
            </div>
          </motion.div>
        ) : (
          // Branded Display - No Active Game
          <motion.div
            key="branded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full flex flex-col items-center justify-center"
          >
            <img 
              src={pastimeLogoUrl} 
              alt="Pastime Logo" 
              className="h-16 w-16 object-contain brightness-0 invert opacity-90 mb-2"
              data-testid="logo-pastime-branded"
            />
            <div className="font-display text-2xl font-bold text-white tracking-wide uppercase" data-testid="text-branded-name">
              Pastimes Athletic Club
            </div>
          </motion.div>
        )}
        </AnimatePresence>
        
        {/* Notification Overlay */}
        <AnimatePresence>
          {scoreboardNotification && (() => {
            const notifTeam = scoreboardNotification.team === 'home' ? homeTeam : awayTeam;
            const notifColors = notifTeam ? getTeamColors(notifTeam.name) : { bg: 'bg-slate-900', border: 'border-slate-500', text: 'text-white' };
            
            // Get gradient colors based on team
            const getGradientColors = () => {
              const teamName = notifTeam?.name.toLowerCase() || '';
              const colorMap: Record<string, { top: string; bottom: string }> = {
                black: { top: '#2d2d2d', bottom: '#0a0a0a' },
                orange: { top: '#ff6a00', bottom: '#662200' },
                purple: { top: '#7a1aff', bottom: '#330066' },
                camo: { top: '#3d7a3d', bottom: '#1a3d1a' },
                white: { top: '#a0aec0', bottom: '#4a5568' },
                red: { top: '#ff1a1a', bottom: '#660000' },
                green: { top: '#00ff1a', bottom: '#006600' },
                blue: { top: '#1a7aff', bottom: '#003366' },
              };
              return colorMap[teamName] || { top: '#1a7aff', bottom: '#003366' };
            };
            
            const gradientColors = getGradientColors();
            
            return (
              <motion.div
                initial={{ opacity: 0, x: scoreboardNotification.team === 'home' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: scoreboardNotification.team === 'home' ? -20 : 20 }}
                transition={{ duration: 0.3 }}
                className={`absolute top-0 bottom-0 w-[160px] flex flex-col items-center justify-center border-4 ${notifColors.border} ${
                  scoreboardNotification.team === 'home' ? 'left-0 border-l-0' : 'right-0 border-r-0'
                }`}
                style={{
                  background: `linear-gradient(to bottom, ${gradientColors.top}, ${gradientColors.bottom})`
                }}
                data-testid="notification-overlay"
              >
                <div className="text-center px-3 w-full">
                  <div className={`font-display text-lg font-black ${notifColors.text} mb-0.5 drop-shadow-lg leading-tight break-words`} data-testid="notification-player-name">
                    {scoreboardNotification.playerName}
                  </div>
                  <div className={`text-xs font-bold ${notifColors.text} opacity-90 leading-tight`} data-testid="notification-message">
                    {scoreboardNotification.message}
                  </div>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>

      {/* Control Panel Content - Offset to avoid scoreboard */}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" style={{ paddingTop: '140px' }}>
        <div className="max-w-7xl mx-auto p-4 space-y-3">
          <div className="flex items-center justify-between bg-card/95 backdrop-blur-md rounded-lg px-6 py-4 shadow-lg border border-card-border">
            <h1 className="font-display text-3xl font-bold uppercase tracking-wide">PAC Basketball</h1>
            <div className="flex gap-2">
              <Button 
                variant="destructive"
                onClick={playHorn}
                data-testid="button-horn"
              >
                <Volume2 className="h-4 w-4 mr-2" />
                Manual Horn
              </Button>
              {game && (
                game.isTournament ? (
                  <Link href="/GonzoCupControl">
                    <Button 
                      variant="default"
                      className="bg-amber-600 hover:bg-amber-700"
                      data-testid="button-return-bracket"
                    >
                      <Trophy className="h-4 w-4 mr-2" />
                      Return To Bracket
                    </Button>
                  </Link>
                ) : (
                  <Button 
                    variant="default"
                    onClick={() => {
                      if (confirm("Are you sure you want to end this game and start a new one?")) {
                        endGameMutation.mutate();
                      }
                    }}
                    data-testid="button-new-game"
                  >
                    Start New Game
                  </Button>
                )
              )}
              {!game && (
                <>
                  <Link href="/GonzoCupControl">
                    <Button variant="outline" className="text-amber-600 border-amber-600 hover:bg-amber-50" data-testid="link-gonzo-cup">
                      <Trophy className="h-4 w-4 mr-2" />
                      Gonzo Cup
                    </Button>
                  </Link>
                  <Link href="/games">
                    <Button variant="outline" data-testid="link-games">
                      <List className="h-4 w-4 mr-2" />
                      View All Games
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

        {!game ? (
          <>
            {editingRosterTeamId && editingTeam && pinAuthenticated && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Edit Roster: {editingTeam.name}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setTeamToDelete(editingRosterTeamId);
                          setDeleteConfirmOpen(true);
                        }}
                        data-testid="button-delete-team"
                      >
                        Delete Team
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingRosterTeamId("");
                          setPinAuthenticated(false);
                        }}
                        data-testid="button-close-roster-editor"
                      >
                        Close
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {rosterPlayers.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <h3 className="font-semibold text-sm">Current Roster</h3>
                      <div className="space-y-1 max-h-64 overflow-y-auto">
                        {[...rosterPlayers].sort((a, b) => {
                          const lastNameA = a.name.split(' ').pop() || '';
                          const lastNameB = b.name.split(' ').pop() || '';
                          return lastNameA.localeCompare(lastNameB);
                        }).map((player) => (
                          <div key={player.id} className="flex items-center gap-2 p-2 rounded-md bg-muted" data-testid={`roster-player-${player.id}`}>
                            {editingPlayerId === player.id ? (
                              <>
                                <Input
                                  type="number"
                                  placeholder="#"
                                  value={editNumber}
                                  onChange={(e) => setEditNumber(e.target.value)}
                                  className="w-20"
                                  data-testid="input-edit-number"
                                />
                                <Input
                                  placeholder="Name"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="flex-1"
                                  data-testid="input-edit-name"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    updatePlayerMutation.mutate({
                                      playerId: player.id,
                                      name: editName || undefined,
                                      number: editNumber.trim() !== '' ? parseInt(editNumber) : null
                                    });
                                  }}
                                  disabled={!editName || updatePlayerMutation.isPending}
                                  data-testid="button-save-edit"
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingPlayerId("");
                                    setEditName("");
                                    setEditNumber("");
                                  }}
                                  data-testid="button-cancel-edit"
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="font-bold text-muted-foreground w-12">
                                  {player.number != null ? `#${player.number}` : "-"}
                                </span>
                                <span className="font-medium flex-1">{player.name}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingPlayerId(player.id);
                                    setEditName(player.name);
                                    setEditNumber(player.number?.toString() || "");
                                  }}
                                  data-testid={`button-edit-player-${player.id}`}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm(`Delete ${player.name}?`)) {
                                      deletePlayerMutation.mutate(player.id);
                                    }
                                  }}
                                  data-testid={`button-delete-player-${player.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-3 pt-3 border-t">
                    <Label className="text-sm font-semibold">Add Player</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="Number"
                        type="number"
                        value={rosterNumber}
                        onChange={(e) => setRosterNumber(e.target.value)}
                        data-testid="input-roster-number"
                      />
                      <Input
                        placeholder="First Name"
                        value={rosterFirstName}
                        onChange={(e) => setRosterFirstName(e.target.value)}
                        data-testid="input-roster-first-name"
                      />
                      <Input
                        placeholder="Last Name"
                        value={rosterLastName}
                        onChange={(e) => setRosterLastName(e.target.value)}
                        data-testid="input-roster-last-name"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (editingRosterTeamId && rosterFirstName && rosterLastName) {
                          createPlayerMutation.mutate({
                            teamId: editingRosterTeamId,
                            name: `${rosterFirstName} ${rosterLastName}`,
                            number: rosterNumber.trim() !== '' ? parseInt(rosterNumber) : null
                          });
                        }
                      }}
                      disabled={!rosterFirstName || !rosterLastName || createPlayerMutation.isPending}
                      data-testid="button-add-roster-player"
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Player
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Start Game</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Home Team</Label>
                    <Select value={selectedHomeTeamId} onValueChange={setSelectedHomeTeamId}>
                      <SelectTrigger data-testid="select-home-team">
                        <SelectValue placeholder="Select home team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Away Team</Label>
                    <Select value={selectedAwayTeamId} onValueChange={setSelectedAwayTeamId}>
                      <SelectTrigger data-testid="select-away-team">
                        <SelectValue placeholder="Select away team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                    <div className="space-y-0.5">
                      <Label htmlFor="tournament-mode" className="text-sm font-medium cursor-pointer">
                        Tournament Mode
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Games won't count towards standings or stats
                      </p>
                    </div>
                    <Switch
                      id="tournament-mode"
                      checked={tournamentMode}
                      onCheckedChange={setTournamentMode}
                      data-testid="switch-tournament-mode"
                    />
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => createGameMutation.mutate()}
                    disabled={!selectedHomeTeamId || !selectedAwayTeamId || selectedHomeTeamId === selectedAwayTeamId || createGameMutation.isPending}
                    data-testid="button-start-game"
                  >
                    {tournamentMode ? 'Start Tournament Game' : 'Start Game'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Create Team</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="team-name">Team Name</Label>
                    <div className="flex gap-2">
                      <Input
                        id="team-name"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="Enter team name"
                        data-testid="input-team-name"
                      />
                      <Button 
                        onClick={() => createTeamMutation.mutate(newTeamName)}
                        disabled={!newTeamName || createTeamMutation.isPending}
                        data-testid="button-create-team"
                      >
                        Create
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <Label>Bulk Import Players</Label>
                    <p className="text-xs text-muted-foreground">Upload a CSV file with columns: FirstName, LastName, Team</p>
                    <input
                      ref={bulkImportFileRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          bulkImportMutation.mutate(file);
                        }
                      }}
                      data-testid="input-bulk-import"
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setPendingBulkImport(true);
                        setPinDialogOpen(true);
                      }}
                      disabled={bulkImportMutation.isPending}
                      data-testid="button-bulk-import"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {bulkImportMutation.isPending ? "Importing..." : "Upload CSV"}
                    </Button>
                  </div>

                  {teams.length > 0 && (
                    <div className="space-y-3 pt-4 border-t">
                      <h3 className="font-semibold">Existing Teams</h3>
                      {teams.map((team) => (
                        <div key={team.id} className="flex items-center justify-between p-3 rounded-md bg-card border border-card-border">
                          <span className="font-medium">{team.name}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPendingRosterTeamId(team.id);
                              setPinDialogOpen(true);
                            }}
                            data-testid={`button-edit-roster-${team.id}`}
                          >
                            Edit Roster
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {/* Compact Action Bar - Single Row */}
            <Card className="shadow-lg border-2 border-card-border bg-card/95 backdrop-blur-md">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {/* Clock Display */}
                  <div className="font-display text-3xl font-bold tabular-nums text-center py-1 px-3 bg-card border-2 border-primary rounded-md w-32" data-testid="text-clock-display">
                    {formatTime(game.timeRemaining)}
                  </div>
                  
                  {/* START/STOP */}
                  <Button size="default" className="h-11 font-bold px-3 flex flex-col gap-0 leading-none" variant={game.clockRunning ? "destructive" : "default"} onClick={() => toggleClockMutation.mutate()} data-testid="button-toggle-clock">
                    <span>{game.clockRunning ? "STOP" : "START"}</span>
                    <span className="text-[10px] font-normal opacity-80">(Spacebar)</span>
                  </Button>

                  <div className="w-px h-11 bg-border mx-1" />

                  {/* Period */}
                  {!game.elamEndingActive && (
                    <>
                      <Button size="icon" variant="outline" className="h-11 w-9" onClick={() => changePeriodMutation.mutate('prev')} disabled={game.period <= 1} data-testid="button-period-prev">
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="font-display text-xl font-bold text-center py-1 px-3 bg-card border rounded-md min-w-[60px]" data-testid="text-period-display">
                        {getPeriodLabel(game.period)}
                      </div>
                      <Button size="icon" variant="outline" className="h-11 w-9" onClick={() => changePeriodMutation.mutate('next')} data-testid="button-period-next">
                        <Plus className="h-4 w-4" />
                      </Button>
                      <div className="w-px h-11 bg-border mx-1" />
                    </>
                  )}

                  {/* Possession */}
                  <div className="flex flex-col items-center gap-1">
                    <Button className="h-11 px-4 min-w-[140px]" variant="outline" onClick={() => togglePossessionMutation.mutate()} data-testid="button-toggle-possession">
                      <ChevronRight className={`h-4 w-4 ${game.possession === 'home' ? 'opacity-100' : 'opacity-20'}`} />
                      <span className="font-bold text-xs truncate mx-1">{game.possession === 'home' ? homeTeam?.name : awayTeam?.name}</span>
                      <ChevronRight className={`h-4 w-4 rotate-180 ${game.possession === 'away' ? 'opacity-100' : 'opacity-20'}`} />
                    </Button>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Possession</span>
                  </div>

                  <div className="w-px h-11 bg-border mx-1" />

                  {/* Set Time */}
                  <Input
                    type="text"
                    placeholder="MM:SS"
                    className="text-center font-mono h-11 w-24"
                    maxLength={5}
                    data-testid="input-set-time"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.currentTarget.value;
                        const match = input.match(/^(\d+):(\d{2})$/);
                        if (match) {
                          const mins = parseInt(match[1]);
                          const secs = parseInt(match[2]);
                          if (secs < 60) {
                            updateClockMutation.mutate({ timeRemaining: mins * 60 + secs });
                            e.currentTarget.value = '';
                          }
                        }
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-11"
                    variant="outline"
                    onClick={(e) => {
                      const input = (e.currentTarget.previousElementSibling as HTMLInputElement)?.value;
                      const match = input?.match(/^(\d+):(\d{2})$/);
                      if (match) {
                        const mins = parseInt(match[1]);
                        const secs = parseInt(match[2]);
                        if (secs < 60) {
                          updateClockMutation.mutate({ timeRemaining: mins * 60 + secs });
                          (e.currentTarget.previousElementSibling as HTMLInputElement).value = '';
                        }
                      }
                    }}
                    data-testid="button-set-time"
                  >
                    Set
                  </Button>
                  <Button size="icon" className="h-11" variant="outline" onClick={() => setResetClockConfirmOpen(true)} data-testid="button-reset-clock">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Controls - Compact */}
            <Card className="shadow-md border border-card-border bg-card/90 backdrop-blur-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-9"
                    variant="outline"
                    onClick={() => swapTeamsMutation.mutate()}
                    disabled={swapTeamsMutation.isPending}
                    data-testid="button-swap-teams"
                    title="Swap home/away teams"
                  >
                    <ArrowLeftRight className="h-3 w-3 mr-1" />
                    Swap Sides
                  </Button>
                  
                  <div className="w-px h-9 bg-border mx-1" />
                  
                  <span className="text-xs font-medium">Elam:</span>
                  {!game.elamEndingActive ? (
                    <>
                      <Input
                        type="number"
                        placeholder="Target"
                        className="h-9 w-20 text-xs"
                        value={elamTarget}
                        onChange={(e) => setElamTarget(e.target.value)}
                        data-testid="input-elam-target"
                      />
                      <Button
                        size="sm"
                        className="h-9"
                        onClick={() => activateElamMutation.mutate(parseInt(elamTarget))}
                        disabled={!elamTarget || activateElamMutation.isPending}
                        data-testid="button-activate-elam"
                      >
                        Activate
                      </Button>
                      <span className="text-xs text-muted-foreground italic ml-2">
                        Elam Ending- 7 points, activated first dead ball under 4:00
                      </span>
                    </>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-9"
                      onClick={() => deactivateElamMutation.mutate()}
                      disabled={deactivateElamMutation.isPending}
                      data-testid="button-deactivate-elam"
                    >
                      Target: {game.targetScore} (Click to Deactivate)
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Rosters - Fixed Height with Scroll */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="shadow-lg border border-card-border bg-card/95 backdrop-blur-md">
                <CardHeader className="pb-2 pt-3 px-4 bg-gradient-to-b from-card/50 to-transparent border-b border-card-border">
                  <CardTitle className="flex items-center justify-between text-sm font-display font-bold uppercase tracking-wide">
                    <span>{homeTeam?.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2"
                          onClick={() => adjustTimeoutMutation.mutate({ team: 'home', action: 'subtract' })}
                          disabled={game.homeTimeouts <= 0}
                          data-testid="button-home-timeout-minus"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Badge variant="secondary" className="text-xs font-mono">TO: {game.homeTimeouts}</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2"
                          onClick={() => adjustTimeoutMutation.mutate({ team: 'home', action: 'add' })}
                          data-testid="button-home-timeout-plus"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Badge variant="secondary" className="text-xs">Fouls: {game.homeFouls}</Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-2 px-3">
                  {/* Fixed-height scrollable roster */}
                  <div className="max-h-[520px] overflow-y-auto space-y-1.5 pr-1">
                    {homePlayers.length > 0 ? (
                      [...homePlayers].sort((a, b) => {
                        const lastNameA = a.name.split(' ').pop() || '';
                        const lastNameB = b.name.split(' ').pop() || '';
                        return lastNameA.localeCompare(lastNameB);
                      }).map((player) => (
                        <PlayerRow key={player.id} player={player} team="home" teamObj={homeTeam} />
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        No players. Add substitutes below.
                      </p>
                    )}
                  </div>
                  
                  <div className="border-t mt-2 pt-2">
                    <div className="flex gap-1">
                      <Input placeholder="First" className="h-8 text-xs" value={homeSubFirstName} onChange={(e) => setHomeSubFirstName(e.target.value)} data-testid="input-home-sub-first-name" />
                      <Input placeholder="Last" className="h-8 text-xs" value={homeSubLastName} onChange={(e) => setHomeSubLastName(e.target.value)} data-testid="input-home-sub-last-name" />
                      <Input type="number" placeholder="#" className="h-8 text-xs w-14" value={homeSubNumber} onChange={(e) => setHomeSubNumber(e.target.value)} data-testid="input-home-sub-number" />
                      <Button
                        onClick={() => {
                          if (homeSubFirstName && homeSubLastName && game?.homeTeamId) {
                            createGamePlayerMutation.mutate({
                              teamId: game.homeTeamId,
                              name: `${homeSubFirstName} ${homeSubLastName}`,
                              number: homeSubNumber.trim() !== '' ? parseInt(homeSubNumber) : null
                            });
                          }
                        }}
                        disabled={!homeSubFirstName || !homeSubLastName || createGamePlayerMutation.isPending}
                        size="sm"
                        className="h-8"
                        data-testid="button-add-home-substitute"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border border-card-border bg-card/95 backdrop-blur-md">
                <CardHeader className="pb-2 pt-3 px-4 bg-gradient-to-b from-card/50 to-transparent border-b border-card-border">
                  <CardTitle className="flex items-center justify-between text-sm font-display font-bold uppercase tracking-wide">
                    <span>{awayTeam?.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2"
                          onClick={() => adjustTimeoutMutation.mutate({ team: 'away', action: 'subtract' })}
                          disabled={game.awayTimeouts <= 0}
                          data-testid="button-away-timeout-minus"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Badge variant="secondary" className="text-xs font-mono">TO: {game.awayTimeouts}</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2"
                          onClick={() => adjustTimeoutMutation.mutate({ team: 'away', action: 'add' })}
                          data-testid="button-away-timeout-plus"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Badge variant="secondary" className="text-xs">Fouls: {game.awayFouls}</Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-2 px-3">
                  {/* Fixed-height scrollable roster */}
                  <div className="max-h-[520px] overflow-y-auto space-y-1.5 pr-1">
                    {awayPlayers.length > 0 ? (
                      [...awayPlayers].sort((a, b) => {
                        const lastNameA = a.name.split(' ').pop() || '';
                        const lastNameB = b.name.split(' ').pop() || '';
                        return lastNameA.localeCompare(lastNameB);
                      }).map((player) => (
                        <PlayerRow key={player.id} player={player} team="away" teamObj={awayTeam} />
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        No players. Add substitutes below.
                      </p>
                    )}
                  </div>
                  
                  <div className="border-t mt-2 pt-2">
                    <div className="flex gap-1">
                      <Input placeholder="First" className="h-8 text-xs" value={awaySubFirstName} onChange={(e) => setAwaySubFirstName(e.target.value)} data-testid="input-away-sub-first-name" />
                      <Input placeholder="Last" className="h-8 text-xs" value={awaySubLastName} onChange={(e) => setAwaySubLastName(e.target.value)} data-testid="input-away-sub-last-name" />
                      <Input type="number" placeholder="#" className="h-8 text-xs w-14" value={awaySubNumber} onChange={(e) => setAwaySubNumber(e.target.value)} data-testid="input-away-sub-number" />
                      <Button
                        onClick={() => {
                          if (awaySubFirstName && awaySubLastName && game?.awayTeamId) {
                            createGamePlayerMutation.mutate({
                              teamId: game.awayTeamId,
                              name: `${awaySubFirstName} ${awaySubLastName}`,
                              number: awaySubNumber.trim() !== '' ? parseInt(awaySubNumber) : null
                            });
                          }
                        }}
                        disabled={!awaySubFirstName || !awaySubLastName || createGamePlayerMutation.isPending}
                        size="sm"
                        className="h-8"
                        data-testid="button-add-away-substitute"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Manual Scoring - Team Level */}
            <Card className="shadow-lg border-2 border-primary/30 bg-card/95 backdrop-blur-md">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-6">
                  {/* Home Team Scoring */}
                  <div className="space-y-2">
                    <h3 className="font-display text-lg font-bold uppercase tracking-wide text-center mb-3">{homeTeam?.name} - Quick Score</h3>
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="lg"
                        className="h-14 text-lg font-bold min-w-[70px]"
                        onClick={() => updateScoreMutation.mutate({ team: 'home', points: 1 })}
                        disabled={updateScoreMutation.isPending}
                        data-testid="button-score-home-1"
                      >
                        +1
                      </Button>
                      <Button
                        size="lg"
                        className="h-14 text-lg font-bold min-w-[70px]"
                        onClick={() => updateScoreMutation.mutate({ team: 'home', points: 2 })}
                        disabled={updateScoreMutation.isPending}
                        data-testid="button-score-home-2"
                      >
                        +2
                      </Button>
                      <Button
                        size="lg"
                        className="h-14 text-lg font-bold min-w-[70px]"
                        onClick={() => updateScoreMutation.mutate({ team: 'home', points: 3 })}
                        disabled={updateScoreMutation.isPending}
                        data-testid="button-score-home-3"
                      >
                        +3
                      </Button>
                      <Button
                        size="lg"
                        variant="destructive"
                        className="h-14 text-lg font-bold min-w-[70px]"
                        onClick={() => updateScoreMutation.mutate({ team: 'home', points: -1 })}
                        disabled={updateScoreMutation.isPending}
                        data-testid="button-score-home-minus"
                      >
                        -1
                      </Button>
                    </div>
                    <div className="flex gap-2 justify-center pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 text-sm font-semibold"
                        onClick={() => addFoulMutation.mutate({ team: 'home', count: 1 })}
                        disabled={addFoulMutation.isPending}
                        data-testid="button-foul-home"
                      >
                        + Foul
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 text-sm font-semibold"
                        onClick={() => addFoulMutation.mutate({ team: 'home', count: -1 })}
                        disabled={addFoulMutation.isPending || game.homeFouls === 0}
                        data-testid="button-unfoul-home"
                      >
                        -1 Foul
                      </Button>
                    </div>
                  </div>

                  {/* Away Team Scoring */}
                  <div className="space-y-2">
                    <h3 className="font-display text-lg font-bold uppercase tracking-wide text-center mb-3">{awayTeam?.name} - Quick Score</h3>
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="lg"
                        className="h-14 text-lg font-bold min-w-[70px]"
                        onClick={() => updateScoreMutation.mutate({ team: 'away', points: 1 })}
                        disabled={updateScoreMutation.isPending}
                        data-testid="button-score-away-1"
                      >
                        +1
                      </Button>
                      <Button
                        size="lg"
                        className="h-14 text-lg font-bold min-w-[70px]"
                        onClick={() => updateScoreMutation.mutate({ team: 'away', points: 2 })}
                        disabled={updateScoreMutation.isPending}
                        data-testid="button-score-away-2"
                      >
                        +2
                      </Button>
                      <Button
                        size="lg"
                        className="h-14 text-lg font-bold min-w-[70px]"
                        onClick={() => updateScoreMutation.mutate({ team: 'away', points: 3 })}
                        disabled={updateScoreMutation.isPending}
                        data-testid="button-score-away-3"
                      >
                        +3
                      </Button>
                      <Button
                        size="lg"
                        variant="destructive"
                        className="h-14 text-lg font-bold min-w-[70px]"
                        onClick={() => updateScoreMutation.mutate({ team: 'away', points: -1 })}
                        disabled={updateScoreMutation.isPending}
                        data-testid="button-score-away-minus"
                      >
                        -1
                      </Button>
                    </div>
                    <div className="flex gap-2 justify-center pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 text-sm font-semibold"
                        onClick={() => addFoulMutation.mutate({ team: 'away', count: 1 })}
                        disabled={addFoulMutation.isPending}
                        data-testid="button-foul-away"
                      >
                        + Foul
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 text-sm font-semibold"
                        onClick={() => addFoulMutation.mutate({ team: 'away', count: -1 })}
                        disabled={addFoulMutation.isPending || game.awayFouls === 0}
                        data-testid="button-unfoul-away"
                      >
                        -1 Foul
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        </div>
      </div>

      {/* PIN Dialog */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent data-testid="dialog-pin-entry">
          <DialogHeader>
            <DialogTitle>{pendingBulkImport ? "Enter PIN to Import Players" : "Enter PIN to Edit Roster"}</DialogTitle>
            <DialogDescription>
              {pendingBulkImport ? "Please enter the PIN to upload a CSV file." : "Please enter the PIN to access the roster editor."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Enter PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pinInput === '1324') {
                  if (pendingBulkImport) {
                    bulkImportFileRef.current?.click();
                    setPendingBulkImport(false);
                  } else {
                    setPinAuthenticated(true);
                    setEditingRosterTeamId(pendingRosterTeamId);
                  }
                  setPinDialogOpen(false);
                  setPinInput("");
                }
              }}
              data-testid="input-pin"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPinDialogOpen(false);
                setPinInput("");
                setPendingBulkImport(false);
              }}
              data-testid="button-cancel-pin"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (pinInput === '1324') {
                  if (pendingBulkImport) {
                    bulkImportFileRef.current?.click();
                    setPendingBulkImport(false);
                  } else {
                    setPinAuthenticated(true);
                    setEditingRosterTeamId(pendingRosterTeamId);
                  }
                  setPinDialogOpen(false);
                  setPinInput("");
                } else {
                  toast({ 
                    title: "Incorrect PIN", 
                    description: "Please try again.",
                    variant: "destructive"
                  });
                }
              }}
              data-testid="button-submit-pin"
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Team Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this team and all its players. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteTeamMutation.mutate(teamToDelete);
                setDeleteConfirmOpen(false);
              }}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Clock Confirmation Dialog */}
      <AlertDialog open={resetClockConfirmOpen} onOpenChange={setResetClockConfirmOpen}>
        <AlertDialogContent data-testid="dialog-reset-clock-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Clock to 20:00?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset the game clock to 20:00?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reset-clock">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetClockMutation.mutate();
                setResetClockConfirmOpen(false);
              }}
              data-testid="button-confirm-reset-clock"
            >
              Reset Clock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark Player Missing Confirmation Dialog */}
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
