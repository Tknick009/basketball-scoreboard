import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { Game, Team } from "@shared/schema";
import { formatTime, getPeriodLabel, getTeamColors } from "@/lib/scoreboardUtils";
import logoUrl from "@assets/Pastime_Circle_Logo_v01_1762565290461.png";

interface ScoreboardDisplayProps {
  game?: Game;
  homeTeam?: Team;
  awayTeam?: Team;
}

export function ScoreboardDisplay({ game, homeTeam, awayTeam }: ScoreboardDisplayProps) {
  return (
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
                      src={logoUrl} 
                      alt="Pastime Logo" 
                      className="mt-1 h-8 w-8 object-contain brightness-0 invert opacity-60"
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
                      src={logoUrl} 
                      alt="Pastime Logo" 
                      className="mt-1 h-10 w-10 object-contain brightness-0 invert opacity-60"
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
          <motion.div
            key="branded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full flex flex-col items-center justify-center"
          >
            <img 
              src={logoUrl} 
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
    </div>
  );
}
