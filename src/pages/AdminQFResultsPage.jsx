import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminQFResultsPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editedResults, setEditedResults] = useState({});

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('qf_matches')
        .select('*')
        .order('match_number', { ascending: true });

      if (error) throw error;
      setMatches(data || []);
      setEditedResults({});
      setMessage({ type: '', text: '' });
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to load matches: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (matchId, field, value) => {
    setEditedResults((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value
      }
    }));
  };

  const getDisplayValue = (match, field) => {
    const edited = editedResults[match.id];
    if (edited && edited.hasOwnProperty(field)) {
      return edited[field];
    }
    return match[field];
  };

  const hasChanges = (matchId) => {
    return editedResults[matchId] && Object.keys(editedResults[matchId]).length > 0;
  };

  const cancelEdit = (matchId) => {
    setEditedResults((prev) => {
      const newState = { ...prev };
      delete newState[matchId];
      return newState;
    });
  };

  const calculatePoints = (prediction, result) => {
    const qualifiedCorrect =
      prediction.predicted_qualified_team === result.actual_qualified_team;
    const scoreCorrect =
      prediction.predicted_team_a_score === result.actual_team_a_score &&
      prediction.predicted_team_b_score === result.actual_team_b_score;
    const methodCorrect =
      prediction.predicted_winning_method === result.actual_winning_method;

    let points = 0;
    if (qualifiedCorrect) points += 5;
    if (scoreCorrect) points += 2;
    if (qualifiedCorrect && methodCorrect) points += 1;

    return points;
  };

  const saveResultAndRecalculate = async (match) => {
    try {
      setMessage({ type: '', text: '' });

      const teamAScore = getDisplayValue(match, 'actual_team_a_score');
      const teamBScore = getDisplayValue(match, 'actual_team_b_score');
      const winningMethod = getDisplayValue(match, 'actual_winning_method');
      const qualifiedTeam = getDisplayValue(match, 'actual_qualified_team');

      if (
        teamAScore === null ||
        teamAScore === undefined ||
        teamAScore === '' ||
        teamBScore === null ||
        teamBScore === undefined ||
        teamBScore === '' ||
        !winningMethod ||
        !qualifiedTeam
      ) {
        setMessage({
          type: 'error',
          text: `Match ${match.match_number}: please fill in all result fields`
        });
        return;
      }

      setSaving((prev) => ({ ...prev, [match.id]: true }));

      const resultData = {
        actual_team_a_score: parseInt(teamAScore, 10),
        actual_team_b_score: parseInt(teamBScore, 10),
        actual_winning_method: winningMethod,
        actual_qualified_team: qualifiedTeam
      };

      const { error: updateError } = await supabase
        .from('qf_matches')
        .update(resultData)
        .eq('id', match.id);

      if (updateError) throw updateError;

      const { data: predictionsData, error: predictionsError } = await supabase
        .from('qf_predictions')
        .select('*')
        .eq('match_id', match.id);

      if (predictionsError) throw predictionsError;

      const predictionsList = predictionsData || [];

      for (const prediction of predictionsList) {
        const points = calculatePoints(prediction, resultData);

        const { error: pointsError } = await supabase
          .from('qf_predictions')
          .update({ points })
          .eq('id', prediction.id);

        if (pointsError) throw pointsError;
      }

      setMatches((prev) =>
        prev.map((m) => (m.id === match.id ? { ...m, ...resultData } : m))
      );

      setEditedResults((prev) => {
        const newState = { ...prev };
        delete newState[match.id];
        return newState;
      });

      setMessage({
        type: 'success',
        text: `Match ${match.match_number} result saved. Points recalculated for ${predictionsList.length} prediction(s).`
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      setMessage({
        type: 'error',
        text: `Failed to save Match ${match.match_number}: ${err.message}`
      });
    } finally {
      setSaving((prev) => ({ ...prev, [match.id]: false }));
    }
  };

  const hasResult = (match) => {
    return (
      match.actual_team_a_score !== null &&
      match.actual_team_a_score !== undefined &&
      match.actual_team_b_score !== null &&
      match.actual_team_b_score !== undefined &&
      match.actual_winning_method &&
      match.actual_qualified_team
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading matches...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin - QF Results</h1>
          <p className="text-gray-600">
            Enter actual match results. Points are recalculated automatically after saving.
          </p>
        </div>

        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              message.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-green-50 text-green-800 border-green-200'
            }`}
          >
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            Scoring: Correct qualified team +5 • Exact score (after extra time) +2 • Winning
            method +1 (only if qualified team is correct) • Max 8 points per match. If the match
            went to penalties, enter the score after extra time and set method to Pen.
          </p>
        </div>

        <div className="space-y-6">
          {matches.map((match) => (
            <div
              key={match.id}
              className={`bg-white rounded-lg shadow-md border-l-4 p-6 ${
                hasChanges(match.id)
                  ? 'border-yellow-500 ring-2 ring-yellow-50'
                  : hasResult(match)
                  ? 'border-green-500'
                  : 'border-blue-500'
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-blue-100">
                      <span className="text-lg font-bold text-blue-600">
                        {match.match_number}
                      </span>
                    </span>
                    <h2 className="text-xl font-bold text-gray-900">
                      {match.team_a} vs {match.team_b}
                    </h2>
                  </div>
                </div>
                <div className="flex gap-2">
                  {hasResult(match) && !hasChanges(match.id) && (
                    <span className="inline-block bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">
                      Result entered
                    </span>
                  )}
                  {hasChanges(match.id) && (
                    <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full">
                      Unsaved changes
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div>
                  <label
                    htmlFor={`actual_a_${match.id}`}
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    {match.team_a} Score
                  </label>
                  <input
                    id={`actual_a_${match.id}`}
                    type="number"
                    min="0"
                    value={getDisplayValue(match, 'actual_team_a_score') ?? ''}
                    onChange={(e) =>
                      handleFieldChange(match.id, 'actual_team_a_score', e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`actual_b_${match.id}`}
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    {match.team_b} Score
                  </label>
                  <input
                    id={`actual_b_${match.id}`}
                    type="number"
                    min="0"
                    value={getDisplayValue(match, 'actual_team_b_score') ?? ''}
                    onChange={(e) =>
                      handleFieldChange(match.id, 'actual_team_b_score', e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`actual_method_${match.id}`}
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Winning Method
                  </label>
                  <select
                    id={`actual_method_${match.id}`}
                    value={getDisplayValue(match, 'actual_winning_method') || ''}
                    onChange={(e) =>
                      handleFieldChange(match.id, 'actual_winning_method', e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Select...</option>
                    <option value="90">90</option>
                    <option value="120">120</option>
                    <option value="Pen">Pen</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`actual_qualified_${match.id}`}
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Qualified Team
                  </label>
                  <select
                    id={`actual_qualified_${match.id}`}
                    value={getDisplayValue(match, 'actual_qualified_team') || ''}
                    onChange={(e) =>
                      handleFieldChange(match.id, 'actual_qualified_team', e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Select...</option>
                    <option value={match.team_a}>{match.team_a}</option>
                    <option value={match.team_b}>{match.team_b}</option>
                  </select>
                </div>
              </div>

              {hasResult(match) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                    Saved Result
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>
                      {match.team_a} {match.actual_team_a_score} - {match.actual_team_b_score}{' '}
                      {match.team_b}
                    </strong>{' '}
                    • Method: <strong>{match.actual_winning_method}</strong> • Qualified:{' '}
                    <strong>{match.actual_qualified_team}</strong>
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => saveResultAndRecalculate(match)}
                  disabled={!hasChanges(match.id) || saving[match.id]}
                  className={`flex-1 px-6 py-2 rounded-lg font-semibold transition-colors ${
                    hasChanges(match.id) && !saving[match.id]
                      ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {saving[match.id]
                    ? 'Saving and recalculating...'
                    : 'Save Result & Recalculate Points'}
                </button>

                {hasChanges(match.id) && (
                  <button
                    onClick={() => cancelEdit(match.id)}
                    disabled={saving[match.id]}
                    className="px-6 py-2 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}