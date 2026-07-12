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

export default function AdminSFResultsPage() {
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
        .from('sf_matches')
        .select('*')
        .order('match_number', { ascending: true });

      if (error) throw error;
      setMatches(data || []);
      setEditedResults({});
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

  const isBlank = (value) => {
    return value === null || value === undefined || value === '';
  };

  const calculatePoints = (prediction, result) => {
    const qualifiedCorrect =
      prediction.predicted_qualified_team === result.actual_qualified_team;
    const scoreCorrect =
      Number(prediction.predicted_team_a_score) === Number(result.actual_team_a_score) &&
      Number(prediction.predicted_team_b_score) === Number(result.actual_team_b_score);
    const methodCorrect =
      prediction.predicted_winning_method === result.actual_winning_method;

    let points = 0;
    if (qualifiedCorrect) points += 7;
    if (scoreCorrect) points += 3;
    if (qualifiedCorrect && methodCorrect) points += 1;

    return points;
  };

  const saveResult = async (match) => {
    try {
      setMessage({ type: '', text: '' });

      const teamAScore = getDisplayValue(match, 'actual_team_a_score');
      const teamBScore = getDisplayValue(match, 'actual_team_b_score');
      const winningMethod = getDisplayValue(match, 'actual_winning_method');
      const qualifiedTeam = getDisplayValue(match, 'actual_qualified_team');

      const blanks = [
        isBlank(teamAScore),
        isBlank(teamBScore),
        isBlank(winningMethod),
        isBlank(qualifiedTeam)
      ];

      const allBlank = blanks.every((b) => b === true);
      const allFilled = blanks.every((b) => b === false);

      if (!allBlank && !allFilled) {
        setMessage({
          type: 'error',
          text: 'Please either complete all result fields or leave all fields blank'
        });
        return;
      }

      setSaving((prev) => ({ ...prev, [match.id]: true }));

      if (allBlank) {
        const { error: clearError } = await supabase
          .from('sf_matches')
          .update({
            actual_team_a_score: null,
            actual_team_b_score: null,
            actual_winning_method: null,
            actual_qualified_team: null
          })
          .eq('id', match.id);

        if (clearError) throw clearError;

        const { error: resetError } = await supabase
          .from('sf_predictions')
          .update({ points: 0 })
          .eq('match_id', match.id);

        if (resetError) throw resetError;

        setMessage({
          type: 'success',
          text: 'Result cleared and points reset'
        });

        await fetchMatches();
        setTimeout(() => setMessage({ type: '', text: '' }), 4000);
        return;
      }

      const resultData = {
        actual_team_a_score: parseInt(teamAScore, 10),
        actual_team_b_score: parseInt(teamBScore, 10),
        actual_winning_method: winningMethod,
        actual_qualified_team: qualifiedTeam
      };

      const { error: updateError } = await supabase
        .from('sf_matches')
        .update(resultData)
        .eq('id', match.id);

      if (updateError) throw updateError;

      const { data: predictionsData, error: predictionsError } = await supabase
        .from('sf_predictions')
        .select('*')
        .eq('match_id', match.id);

      if (predictionsError) throw predictionsError;

      const predictionsList = predictionsData || [];

      for (const prediction of predictionsList) {
        const points = calculatePoints(prediction, resultData);

        const { error: pointsError } = await supabase
          .from('sf_predictions')
          .update({ points })
          .eq('id', prediction.id);

        if (pointsError) throw pointsError;
      }

      setMessage({
        type: 'success',
        text: 'Result saved and points recalculated'
      });

      await fetchMatches();
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
      !isBlank(match.actual_team_a_score) &&
      !isBlank(match.actual_team_b_score) &&
      !isBlank(match.actual_winning_method) &&
      !isBlank(match.actual_qualified_team)
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
              <p className="text-slate-400">Loading matches...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-2">
            Admin
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">📋 SF Results</h1>
          <p className="text-slate-400">
            Enter actual Semi Final results. Points are recalculated automatically after saving.
            Leave all fields blank and save to clear a result.
          </p>
        </div>

        {message.text && (
          <div
            className={`mb-6 p-4 rounded-xl border ${
              message.type === 'error'
                ? 'bg-red-950/50 text-red-300 border-red-900'
                : 'bg-emerald-950/50 text-emerald-300 border-emerald-900'
            }`}
          >
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        <div className="mb-8 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <p className="text-sm text-slate-400 text-center">
            <span className="text-emerald-400 font-semibold">Semi Final Scoring:</span> Correct
            qualified team +7 · Exact score (after extra time) +3 · Winning method +1 (only if
            qualified team is correct) · Max 11 per match. If the match went to penalties, enter
            the score after extra time and set method to Pen.
          </p>
        </div>

        <div className="space-y-6">
          {matches.map((match) => (
            <div
              key={match.id}
              className={`bg-slate-900 border rounded-2xl p-6 ${
                hasChanges(match.id)
                  ? 'border-yellow-700/60'
                  : hasResult(match)
                  ? 'border-emerald-900/60'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Semi Final {match.match_number}
                  </p>
                  <h2 className="text-xl font-bold text-white">
                    {getTeamFlag(match.team_a)} {match.team_a}{' '}
                    <span className="text-slate-500 font-normal">vs</span>{' '}
                    {getTeamFlag(match.team_b)} {match.team_b}
                  </h2>
                </div>
                <div className="flex gap-2">
                  {hasResult(match) && !hasChanges(match.id) && (
                    <span className="inline-block bg-emerald-950 text-emerald-400 border border-emerald-900 text-xs font-bold px-3 py-1 rounded-full">
                      ✅ Result entered
                    </span>
                  )}
                  {hasChanges(match.id) && (
                    <span className="inline-block bg-yellow-950 text-yellow-400 border border-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
                      ⚠️ Unsaved changes
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
                <div>
                  <label
                    htmlFor={`sf_actual_a_${match.id}`}
                    className="block text-sm font-semibold text-slate-300 mb-2"
                  >
                    {getTeamFlag(match.team_a)} {match.team_a} Score
                  </label>
                  <input
                    id={`sf_actual_a_${match.id}`}
                    type="number"
                    min="0"
                    value={getDisplayValue(match, 'actual_team_a_score') ?? ''}
                    onChange={(e) =>
                      handleFieldChange(match.id, 'actual_team_a_score', e.target.value)
                    }
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="—"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`sf_actual_b_${match.id}`}
                    className="block text-sm font-semibold text-slate-300 mb-2"
                  >
                    {getTeamFlag(match.team_b)} {match.team_b} Score
                  </label>
                  <input
                    id={`sf_actual_b_${match.id}`}
                    type="number"
                    min="0"
                    value={getDisplayValue(match, 'actual_team_b_score') ?? ''}
                    onChange={(e) =>
                      handleFieldChange(match.id, 'actual_team_b_score', e.target.value)
                    }
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="—"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`sf_actual_method_${match.id}`}
                    className="block text-sm font-semibold text-slate-300 mb-2"
                  >
                    Winning Method
                  </label>
                  <select
                    id={`sf_actual_method_${match.id}`}
                    value={getDisplayValue(match, 'actual_winning_method') ?? ''}
                    onChange={(e) =>
                      handleFieldChange(match.id, 'actual_winning_method', e.target.value)
                    }
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">— Blank —</option>
                    <option value="90">90</option>
                    <option value="120">120</option>
                    <option value="Pen">Pen</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`sf_actual_qualified_${match.id}`}
                    className="block text-sm font-semibold text-slate-300 mb-2"
                  >
                    Qualified Team
                  </label>
                  <select
                    id={`sf_actual_qualified_${match.id}`}
                    value={getDisplayValue(match, 'actual_qualified_team') ?? ''}
                    onChange={(e) =>
                      handleFieldChange(match.id, 'actual_qualified_team', e.target.value)
                    }
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">— Blank —</option>
                    <option value={match.team_a}>
                      {getTeamFlag(match.team_a)} {match.team_a}
                    </option>
                    <option value={match.team_b}>
                      {getTeamFlag(match.team_b)} {match.team_b}
                    </option>
                  </select>
                </div>
              </div>

              {hasResult(match) && (
                <div className="mb-6 p-4 bg-slate-800/60 rounded-xl border border-slate-700">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Saved Result
                  </p>
                  <p className="text-sm text-slate-300">
                    <span className="font-bold text-white">
                      {getTeamFlag(match.team_a)} {match.team_a} {match.actual_team_a_score} -{' '}
                      {match.actual_team_b_score} {getTeamFlag(match.team_b)} {match.team_b}
                    </span>{' '}
                    · Method:{' '}
                    <span className="font-semibold text-white">
                      {match.actual_winning_method}
                    </span>{' '}
                    · Qualified:{' '}
                    <span className="font-semibold text-white">
                      {getTeamFlag(match.actual_qualified_team)} {match.actual_qualified_team}
                    </span>
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => saveResult(match)}
                  disabled={!hasChanges(match.id) || saving[match.id]}
                  className={`flex-1 px-6 py-2.5 rounded-xl font-semibold transition-colors ${
                    hasChanges(match.id) && !saving[match.id]
                      ? 'bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {saving[match.id]
                    ? 'Saving...'
                    : '💾 Save Result & Recalculate Points'}
                </button>

                {hasChanges(match.id) && (
                  <button
                    onClick={() => cancelEdit(match.id)}
                    disabled={saving[match.id]}
                    className="px-6 py-2.5 rounded-xl font-semibold text-white bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors disabled:opacity-50"
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