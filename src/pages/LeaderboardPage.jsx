import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const getTeamFlag = (teamName) => {
  const flags = {
    France: '🇫🇷',
    Morocco: '🇲🇦',
    England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    Norway: '🇳🇴',
    Belgium: '🇧🇪',
    Spain: '🇪🇸',
    Argentina: '🇦🇷',
    Colombia: '🇨🇴'
  };
  return flags[teamName] || '⚽';
};

const getMethodLabel = (method) => {
  if (method === '90') return 'Normal';
  if (method === '120') return 'ET';
  if (method === 'Pen') return 'Pens';
  return method || '';
};

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [matches, setMatches] = useState([]);
  const [predictionsByPlayer, setPredictionsByPlayer] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    fetchLeaderboard();
    const fetchInterval = setInterval(() => {
      fetchLeaderboard(false);
    }, 10000);
    const clockInterval = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => {
      clearInterval(fetchInterval);
      clearInterval(clockInterval);
    };
  }, []);

  const fetchLeaderboard = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError('');

      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*');

      if (playersError) throw playersError;

      const { data: matchesData, error: matchesError } = await supabase
        .from('qf_matches')
        .select('*')
        .order('match_number', { ascending: true });

      if (matchesError) throw matchesError;

      const { data: predictionsData, error: predictionsError } = await supabase
        .from('qf_predictions')
        .select('*');

      if (predictionsError) throw predictionsError;

      const players = playersData || [];
      const allMatches = matchesData || [];
      const predictions = predictionsData || [];

      const nonAdminPlayers = players.filter((p) => !p.is_admin);

      const predMap = {};
      predictions.forEach((pred) => {
        if (!predMap[pred.player_id]) {
          predMap[pred.player_id] = {};
        }
        predMap[pred.player_id][pred.match_id] = pred;
      });

      const rows = nonAdminPlayers.map((player) => {
        const playerPredictions = predictions.filter(
          (pred) => pred.player_id === player.id
        );

        const qfPoints = playerPredictions.reduce(
          (sum, pred) => sum + (pred.points || 0),
          0
        );

        const previousPoints = player.previous_points || 0;
        const totalPoints = previousPoints + qfPoints;

        return {
          playerId: player.id,
          name: player.name,
          previousPoints,
          qfPoints,
          totalPoints,
          predictionsSubmitted: playerPredictions.length
        };
      });

      rows.sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }
        return a.name.localeCompare(b.name);
      });

      let currentRank = 0;
      let previousTotal = null;
      const rankedRows = rows.map((row, index) => {
        if (row.totalPoints !== previousTotal) {
          currentRank = index + 1;
          previousTotal = row.totalPoints;
        }
        return { ...row, rank: currentRank };
      });

      setLeaderboard(rankedRows);
      setMatches(allMatches);
      setPredictionsByPlayer(predMap);
    } catch (err) {
      setError(`Failed to load leaderboard: ${err.message}`);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const isMatchRevealed = (match) => {
    const revealTime = new Date(new Date(match.kickoff_time).getTime() - 60 * 60 * 1000);
    return now >= revealTime;
  };

  const revealedMatches = matches.filter(isMatchRevealed);

  const getRankDisplay = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  const renderPredictionCell = (playerId, match) => {
    const pred = predictionsByPlayer[playerId]?.[match.id];

    if (
      !pred ||
      pred.predicted_team_a_score === null ||
      pred.predicted_team_a_score === undefined
    ) {
      return <span className="text-slate-600">—</span>;
    }

    return (
      <div className="text-xs leading-relaxed">
        <p className="font-bold text-white">
          {pred.predicted_team_a_score} - {pred.predicted_team_b_score}
        </p>
        <p className="text-slate-400">
          {getTeamFlag(pred.predicted_qualified_team)} {pred.predicted_qualified_team}
        </p>
        <p className="text-slate-500">{getMethodLabel(pred.predicted_winning_method)}</p>
      </div>
    );
  };

  const totalPlayers = leaderboard.length;
  const totalPredictions = leaderboard.reduce(
    (sum, row) => sum + row.predictionsSubmitted,
    0
  );
  const highestScore = leaderboard.length > 0 ? leaderboard[0].totalPoints : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
              <p className="text-slate-400">Loading leaderboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
          <div>
            <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-2">
              Quarter Finals
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              🏆 Leaderboard
            </h1>
            <p className="text-slate-400 mt-2">
              Who is leading the league? Updates automatically every 10 seconds.
            </p>
          </div>
          <button
            onClick={() => fetchLeaderboard(true)}
            className="self-start sm:self-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 active:bg-slate-600 transition-colors"
          >
            ↻ Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl border bg-red-950/50 text-red-300 border-red-900">
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 md:gap-5 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 text-center">
            <p className="text-2xl md:text-3xl font-bold text-white">{totalPlayers}</p>
            <p className="text-xs md:text-sm text-slate-400 mt-1">Total Players</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 text-center">
            <p className="text-2xl md:text-3xl font-bold text-white">{totalPredictions}</p>
            <p className="text-xs md:text-sm text-slate-400 mt-1">Total Predictions</p>
          </div>
          <div className="bg-slate-900 border border-emerald-900/60 rounded-2xl p-4 md:p-6 text-center">
            <p className="text-2xl md:text-3xl font-bold text-emerald-400">{highestScore}</p>
            <p className="text-xs md:text-sm text-slate-400 mt-1">Highest Score</p>
          </div>
        </div>

        {revealedMatches.length === 0 && (
          <div className="mb-6 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <p className="text-sm text-slate-400 text-center">
              🔒 Predictions will be revealed 1 hour before each match.
            </p>
          </div>
        )}

        {leaderboard.length === 0 && !error ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
            <p className="text-slate-400">No players found.</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80">
                    <th className="px-3 md:px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Rank
                    </th>
                    <th className="px-3 md:px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Player
                    </th>
                    <th className="px-3 md:px-5 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Previous Points
                    </th>
                    <th className="px-3 md:px-5 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      QF Points
                    </th>
                    <th className="px-3 md:px-5 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Total Points
                    </th>
                    <th className="px-3 md:px-5 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Predictions
                    </th>
                    {revealedMatches.map((match) => (
                      <th
                        key={match.id}
                        className="px-3 md:px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        M{match.match_number}: {getTeamFlag(match.team_a)} {match.team_a}
                        {' - '}
                        {getTeamFlag(match.team_b)} {match.team_b}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {leaderboard.map((row) => {
                    const isFirst = row.rank === 1;
                    const isTopThree = row.rank <= 3;

                    return (
                      <tr
                        key={row.playerId}
                        className={`transition-colors ${
                          isFirst
                            ? 'bg-emerald-950/40 hover:bg-emerald-950/60'
                            : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <td className="px-3 md:px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center justify-center h-9 w-9 rounded-full font-bold ${
                              isTopThree
                                ? 'text-xl'
                                : 'text-sm bg-slate-800 text-slate-400'
                            }`}
                          >
                            {getRankDisplay(row.rank)}
                          </span>
                        </td>
                        <td className="px-3 md:px-5 py-4 whitespace-nowrap">
                          <span
                            className={`text-sm font-semibold ${
                              isFirst ? 'text-emerald-300' : 'text-white'
                            }`}
                          >
                            {row.name}
                            {isFirst && (
                              <span className="ml-2 text-xs font-bold text-emerald-400 bg-emerald-950 border border-emerald-900 px-2 py-0.5 rounded-full align-middle">
                                LEADER
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-3 md:px-5 py-4 whitespace-nowrap text-right">
                          <span className="text-sm text-slate-400">
                            {row.previousPoints}
                          </span>
                        </td>
                        <td className="px-3 md:px-5 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-semibold text-white">
                            {row.qfPoints}
                          </span>
                        </td>
                        <td className="px-3 md:px-5 py-4 whitespace-nowrap text-right">
                          <span
                            className={`text-base font-bold ${
                              isFirst ? 'text-emerald-400' : 'text-white'
                            }`}
                          >
                            {row.totalPoints}
                          </span>
                        </td>
                        <td className="px-3 md:px-5 py-4 whitespace-nowrap text-right">
                          <span className="text-sm text-slate-400">
                            {row.predictionsSubmitted} / 4
                          </span>
                        </td>
                        {revealedMatches.map((match) => (
                          <td
                            key={match.id}
                            className="px-3 md:px-5 py-4 whitespace-nowrap"
                          >
                            {renderPredictionCell(row.playerId, match)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <p className="text-sm text-slate-400 text-center">
            <span className="text-emerald-400 font-semibold">Total Points</span> = Previous
            Points + QF Points ·{' '}
            <span className="text-emerald-400 font-semibold">Scoring per match:</span> Correct
            qualified team +5 · Exact score +2 · Winning method +1 (only if qualified team is
            correct) · Max 8 per match · Predictions are revealed 1 hour before each match
          </p>
        </div>
      </div>
    </div>
  );
}