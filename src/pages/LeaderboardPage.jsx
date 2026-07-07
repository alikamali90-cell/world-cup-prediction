import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*');

      if (playersError) throw playersError;

      const { data: predictionsData, error: predictionsError } = await supabase
        .from('qf_predictions')
        .select('*');

      if (predictionsError) throw predictionsError;

      const players = playersData || [];
      const predictions = predictionsData || [];

      const nonAdminPlayers = players.filter((p) => !p.is_admin);

      const rows = nonAdminPlayers.map((player) => {
        const playerPredictions = predictions.filter(
          (pred) => pred.player_id === player.id
        );

        const totalPoints = playerPredictions.reduce(
          (sum, pred) => sum + (pred.points || 0),
          0
        );

        return {
          playerId: player.id,
          name: player.name,
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
      let previousPoints = null;
      const rankedRows = rows.map((row, index) => {
        if (row.totalPoints !== previousPoints) {
          currentRank = index + 1;
          previousPoints = row.totalPoints;
        }
        return { ...row, rank: currentRank };
      });

      setLeaderboard(rankedRows);
    } catch (err) {
      setError(`Failed to load leaderboard: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getRankStyles = (rank) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800';
    if (rank === 2) return 'bg-gray-200 text-gray-700';
    if (rank === 3) return 'bg-orange-100 text-orange-800';
    return 'bg-blue-50 text-blue-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading leaderboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Leaderboard</h1>
            <p className="text-gray-600">Quarter Final standings</p>
          </div>
          <button
            onClick={fetchLeaderboard}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg border bg-red-50 text-red-800 border-red-200">
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {leaderboard.length === 0 && !error ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">No players found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Player Name
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      QF Points
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Predictions Submitted
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leaderboard.map((row) => (
                    <tr
                      key={row.playerId}
                      className={`hover:bg-gray-50 transition-colors ${
                        row.rank === 1 ? 'bg-yellow-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold ${getRankStyles(
                            row.rank
                          )}`}
                        >
                          {row.rank}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {row.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-bold text-gray-900">
                          {row.totalPoints}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm text-gray-600">
                          {row.predictionsSubmitted} / 4
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            Scoring per match: Correct qualified team +5 • Exact score +2 • Winning method +1
            (only if qualified team is correct) • Max 8 points per match
          </p>
        </div>
      </div>
    </div>
  );
}