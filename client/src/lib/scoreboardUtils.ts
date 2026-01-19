export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const getPeriodLabel = (period: number): string => {
  if (period === 1) return "H1";
  if (period === 2) return "H2";
  return `OT${period - 2}`;
};

export const formatPlayerName = (fullName: string): string => {
  const parts = fullName.trim().split(' ');
  if (parts.length < 2) return fullName;
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return `${firstName.charAt(0)}. ${lastName}`;
};

export const getTeamColors = (teamName: string) => {
  const name = teamName.toLowerCase();
  
  if (name.includes('black')) {
    return { bg: 'bg-gradient-to-b from-gray-800 to-gray-900', border: 'border-gray-700', text: 'text-gray-300' };
  }
  if (name.includes('orange')) {
    return { bg: 'bg-gradient-to-b from-orange-700 to-orange-900', border: 'border-orange-600', text: 'text-orange-200' };
  }
  if (name.includes('purple')) {
    return { bg: 'bg-gradient-to-b from-purple-700 to-purple-900', border: 'border-purple-600', text: 'text-purple-200' };
  }
  if (name.includes('camo')) {
    return { bg: 'bg-gradient-to-b from-green-800 to-green-950', border: 'border-green-700', text: 'text-green-200' };
  }
  if (name.includes('white')) {
    return { bg: 'bg-gradient-to-b from-gray-300 to-gray-400', border: 'border-gray-500', text: 'text-gray-800' };
  }
  if (name.includes('red')) {
    return { bg: 'bg-gradient-to-b from-red-700 to-red-900', border: 'border-red-600', text: 'text-red-200' };
  }
  if (name.includes('green')) {
    return { bg: 'bg-gradient-to-b from-green-700 to-green-900', border: 'border-green-600', text: 'text-green-200' };
  }
  if (name.includes('blue')) {
    return { bg: 'bg-gradient-to-b from-blue-700 to-blue-900', border: 'border-blue-600', text: 'text-blue-200' };
  }
  
  return { bg: 'bg-gradient-to-b from-slate-700 to-slate-900', border: 'border-slate-600', text: 'text-slate-200' };
};
