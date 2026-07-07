import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminQFMatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editedMatches, setEditedMatches] = useState({});

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
      setEditedMatches({});
      setMessage({ type: '', text: '' });
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to load matches: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (matchId, field, value) => {
    setEditedMatches(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value
      }
    }));
  };

  const saveMatch = async (match) => {
    try {
      setSaving(prev => ({ ...prev, [match.id]: true }));
      const updates = editedMatches[match.id];

      if (!updates || Object.keys(updates).length === 0) {
        setMessage({ type: 'info', text: 'No changes to save' });
        setSaving(prev => ({ ...prev, [match.id]: false }));
        return;
      }

      const updateData = {};
      if (updates.team_a !== undefined) updateData.team_a = updates.team_a;
      if (updates.team_b !== undefined) updateData.team_b = updates.team_b;
      if (updates.kickoff_time !== undefined) updateData.kickoff_time = updates.kickoff_time;

      const { error } = await supabase
        .from('qf_matches')
        .update(updateData)
        .eq('id', match.id);

      if (error) throw error;

      setMatches(prev =>
        prev.map(m =>
          m.id === match.id
            ? { ...m, ...updateData }
            : m
        )
      );

      setEditedMatches(prev => {
        const newState = { ...prev };
        delete newState[match.id];
        return newState;
      });

      setMessage({ type: 'success', text: `Match ${match.match_number} saved successfully` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to save Match ${match.match_number}: ${err.message}` });
    } finally {
      setSaving(prev => ({ ...prev, [match.id]: false }));
    }
  };

  const getDisplayValue = (match, field) => {
    const edited = editedMatches[match.id];
    return edited && edited.hasOwnProperty(field) ? edited[field] : match[field];
  };

  const hasChanges = (matchId) => {
    return editedMatches[matchId] && Object.keys(editedMatches[matchId]).length > 0;
  };

  const formatDatetimeLocal = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const parseLocalDatetime = (localDatetimeString) => {
    if (!localDatetimeString) return '';
    const [datePart, timePart] = localDatetimeString.split('T');
    return `${datePart}T${timePart}:00+00:00`;
  };

  const cancelEdit = (matchId) => {
    setEditedMatches(prev => {
      const newState = { ...prev };
      delete newState[matchId];
      return newState;
    });
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin - QF Matches</h1>
          <p className="text-gray-600">Edit quarter-final match details (teams and kickoff times)</p>
        </div>

        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              message.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : message.type === 'success'
                ? 'bg-green-50 text-green-800 border-green-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        <div className="space-y-6">
          {matches.map((match) => (
            <div
              key={match.id}
              className={`bg-white rounded-lg shadow-md border-l-4 p-6 transition-all ${
                hasChanges(match.id)
                  ? 'border-yellow-500 ring-2 ring-yellow-50'
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
                      Quarter Final Match {match.match_number}
                    </h2>
                  </div>
                </div>
                {hasChanges(match.id) && (
                  <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full">
                    Unsaved changes
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label htmlFor={`team_a_${match.id}`} className="block text-sm font-semibold text-gray-700 mb-2">
                    Team A
                  </label>
                  <input
                    id={`team_a_${match.id}`}
                    type="text"
                    value={getDisplayValue(match, 'team_a') || ''}
                    onChange={(e) =>
                      handleFieldChange(match.id, 'team_a', e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="e.g., Argentina"
                  />
                </div>

                <div>
                  <label htmlFor={`team_b_${match.id}`} className="block text-sm font-semibold text-gray-700 mb-2">
                    Team B
                  </label>
                  <input
                    id={`team_b_${match.id}`}
                    type="text"
                    value={getDisplayValue(match, 'team_b') || ''}
                    onChange={(e) =>
                      handleFieldChange(match.id, 'team_b', e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="e.g., Netherlands"
                  />
                </div>

                <div>
                  <label htmlFor={`kickoff_${match.id}`} className="block text-sm font-semibold text-gray-700 mb-2">
                    Kickoff Time (UTC)
                  </label>
                  <input
                    id={`kickoff_${match.id}`}
                    type="datetime-local"
                    value={formatDatetimeLocal(getDisplayValue(match, 'kickoff_time'))}
                    onChange={(e) => {
                      const isoString = parseLocalDatetime(e.target.value);
                      handleFieldChange(match.id, 'kickoff_time', isoString);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>

              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Current Values</p>
                <p className="text-sm text-gray-700">
                  <strong>{match.team_a || 'N/A'}</strong> vs <strong>{match.team_b || 'N/A'}</strong> on{' '}
                  <strong>
                    {match.kickoff_time
                      ? new Date(match.kickoff_time).toLocaleString('en-GB', {
                          timeZone: 'UTC',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) + ' UTC'
                      : 'Not set'}
                  </strong>
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => saveMatch(match)}
                  disabled={!hasChanges(match.id) || saving[match.id]}
                  className={`flex-1 px-6 py-2 rounded-lg font-semibold transition-all ${
                    hasChanges(match.id) && !saving[match.id]
                      ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {saving[match.id] ? 'Saving...' : 'Save Match'}
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

        <div className="mt-10 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            Predictions will automatically lock when the kickoff time is reached. Make sure all
            match details are correct before players start predicting.
          </p>
        </div>
      </div>
    </div>
  );
}