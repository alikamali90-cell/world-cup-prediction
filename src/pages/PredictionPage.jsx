import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function PredictionPage() {
  const [player, setPlayer] = useState(null);
  const [loginName, setLoginName] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (player) {
      fetchMatchesAndPredictions();
    }
  }, [player]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoginError('');

    if (!loginName.trim() || !loginCode.trim()) {
      setLoginError('Please enter both name and login code');
      return;
    }

    try {
      setLoggingIn(true);
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('name', loginName.trim())
        .eq('login_code', loginCode.trim())
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setLoginError('Invalid name or login code');
        return;
      }

      setPlayer(data);
    } catch (err) {
      setLoginError(`Login failed: ${err.message}`);
    } finally {
      setLoggingIn(false);
    }
  };

  const fetchMatchesAndPredictions = async () => {
    try {
      setLoading(true);

      const { data: matchesData, error: matchesError } = await supabase
        .from('qf_matches')
        .select('*')
        .order('match_number', { ascending: true });

      if (matchesError) throw matchesError;
      setMatches(matchesData || []);

      const { data: predictionsData, error: predictionsError } = await supabase
        .from('qf_predictions')
        .select('*')
        .eq('player_id', player.id);

      if (predictionsError) throw predictionsError;

      const predictionsMap = {};
      (predictionsData || []).forEach((pred) => {
        predictionsMap[pred.match_id] = {
          predicted_team_a_score: pred.predicted_team_a_score,
          predicted_team_b_score: pred.predicted_team_b_score,
          predicted_winning_method: pred.predicted_winning_method,
          predicted_qualified_team: pred.predicted_qualified_team,
          points: pred.points
        };
      });
      setPredictions(predictionsMap);
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to load: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const isMatchLocked = (kickoffTime) => {
    return new Date() >= new Date(kickoffTime);
  };

  const hasActualResult = (match) => {
    return (
      match.actual_team_a_score !== null &&
      match.actual_team_a_score !== undefined &&
      match.actual_team_b_score !== null &&
      match.actual_team_b_score !== undefined &&
      match.actual_winning_method !== null &&
      match.actual_winning_method !== undefined &&
      match.actual_winning_method !== '' &&
      match.actual_qualified_team !== null &&
      match.actual_qualified_team !== undefined &&
      match.actual_qualified_team !== ''
    );
  };

  const calculatePoints = (prediction, match) => {
    const qualifiedCorrect =
      prediction.predicted_qualified_team === match.actual_qualified_team;
    const scoreCorrect =
      prediction.predicted_team_a_score === match.actual_team_a_score &&
      prediction.predicted_team_b_score === match.actual_team_b_score;
    const methodCorrect =
      prediction.predicted_winning_method === match.actual_winning_method;

    let points = 0;
    if (qualifiedCorrect) points += 5;
    if (scoreCorrect) points += 2;
    if (qualifiedCorrect && methodCorrect) points += 1;

    return points;
  };

  const handlePredictionChange = (matchId, field, value) => {
    setPredictions((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value
      }
    }));
  };

  const savePrediction = async (match) => {
    try {
      setMessage({ type: '', text: '' });

      if (isMatchLocked(match.kickoff_time)) {
        setMessage({
          type: 'error',
          text: `Match ${match.match_number} is locked - kickoff time has passed`
        });
        return;
      }

      const pred = predictions[match.id];

      if (
        !pred ||
        pred.predicted_team_a_score === undefined ||
        pred.predicted_team_a_score === '' ||
        pred.predicted_team_a_score === null ||
        pred.predicted_team_b_score === undefined ||
        pred.predicted_team_b_score === '' ||
        pred.predicted_team_b_score === null ||
        !pred.predicted_winning_method ||
        !pred.predicted_qualified_team
      ) {
        setMessage({
          type: 'error',
          text: `Match ${match.match_number}: please fill in all fields`
        });
        return;
      }

      setSaving((prev) => ({ ...prev, [match.id]: true }));

      const { data: freshMatch, error: matchError } = await supabase
        .from('qf_matches')
        .select('*')
        .eq('id', match.id)
        .single();

      if (matchError) throw matchError;

      if (freshMatch && isMatchLocked(freshMatch.kickoff_time)) {
        setMessage({
          type: 'error',
          text: `Match ${match.match_number} is locked - kickoff time has passed`
        });
        return;
      }

      const predictionData = {
        player_id: player.id,
        match_id: match.id,
        predicted_team_a_score: parseInt(pred.predicted_team_a_score, 10),
        predicted_team_b_score: parseInt(pred.predicted_team_b_score, 10),
        predicted_winning_method: pred.predicted_winning_method,
        predicted_qualified_team: pred.predicted_qualified_team
      };

      let points = 0;
      if (freshMatch && hasActualResult(freshMatch)) {
        points = calculatePoints(predictionData, freshMatch);
      }

      predictionData.points = points;

      const { error } = await supabase
        .from('qf_predictions')
        .upsert([predictionData], { onConflict: 'player_id,match_id' });

      if (error) throw error;

      setPredictions((prev) => ({
        ...prev,
        [match.id]: {
          ...prev[match.id],
          points
        }
      }));

      setMessage({
        type: 'success',
        text: `Match ${match.match_number} prediction saved`
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({
        type: 'error',
        text: `Failed to save Match ${match.match_number}: ${err.message}`
      });
    } finally {
      setSaving((prev) => ({ ...prev, [match.id]: false }));
    }
  };

  if (!player) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Prediction League</h1>
          <p className="text-gray-600 mb-6">Enter your name and login code</p>

          {loginError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login_name" className="block text-sm font-semibold text-gray-700 mb-2">
                Name
              </label>
              <input
                id="login_name"
                type="text"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your name"
              />
            </div>

            <div>
              <label htmlFor="login_code" className="block text-sm font-semibold text-gray-700 mb-2">
                Login Code
              </label>
              <input
                id="login_code"
                type="password"
                value={loginCode}
                onChange={(e) => setLoginCode(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your login code"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className={`w-full py-2 rounded-lg font-semibold transition-colors ${
                loggingIn
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              {loggingIn ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
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
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Quarter Final Predictions</h1>
            <p className="text-gray-600">
              Logged in as <span className="font-semibold">{player.name}</span>
            </p>
          </div>
          <button
            onClick={() => {
              setPlayer(null);
              setLoginName('');
              setLoginCode('');
              setPredictions({});
              setMatches([]);
            }}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Logout
          </button>
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
            Scoring: Correct team to qualify +5 • Exact score (after extra time) +2 • Winning
            method +1 (only if qualified team is correct) • Max 8 points per match
          </p>
        </div>

        <div className="space-y-6">
          {matches.map((match) => {
            const locked = isMatchLocked(match.kickoff_time);
            const pred = predictions[match.id] || {};
            const kickoffDate = new Date(match.kickoff_time);
            const resultEntered = hasActualResult(match);

            return (
              <div
                key={match.id}
                className={`bg-white rounded-lg shadow-md border-l-4 p-6 ${
                  locked ? 'border-gray-400' : 'border-blue-500'
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {match.team_a} vs {match.team_b}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Kickoff:{' '}
                      {kickoffDate.toLocaleString('en-GB', {
                        timeZone: 'UTC',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}{' '}
                      UTC
                    </p>
                  </div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      locked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {locked ? 'Locked' : 'Open'}
                  </span>
                </div>

                {locked && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700">
                    <p className="font-semibold">
                      Predictions are locked - kickoff time has passed.
                    </p>
                    {resultEntered && pred.predicted_team_a_score !== undefined && (
                      <p className="mt-1">
                        Result: {match.team_a} {match.actual_team_a_score} -{' '}
                        {match.actual_team_b_score} {match.team_b} • Method:{' '}
                        {match.actual_winning_method} • Qualified:{' '}
                        {match.actual_qualified_team} •{' '}
                        <span className="font-bold text-gray-900">
                          Points: {pred.points ?? 0}
                        </span>
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor={`score_a_${match.id}`}
                        className="block text-sm font-semibold text-gray-700 mb-2"
                      >
                        {match.team_a} Score
                      </label>
                      <input
                        id={`score_a_${match.id}`}
                        type="number"
                        min="0"
                        disabled={locked}
                        value={pred.predicted_team_a_score ?? ''}
                        onChange={(e) =>
                          handlePredictionChange(
                            match.id,
                            'predicted_team_a_score',
                            e.target.value
                          )
                        }
                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          locked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                        }`}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`score_b_${match.id}`}
                        className="block text-sm font-semibold text-gray-700 mb-2"
                      >
                        {match.team_b} Score
                      </label>
                      <input
                        id={`score_b_${match.id}`}
                        type="number"
                        min="0"
                        disabled={locked}
                        value={pred.predicted_team_b_score ?? ''}
                        onChange={(e) =>
                          handlePredictionChange(
                            match.id,
                            'predicted_team_b_score',
                            e.target.value
                          )
                        }
                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          locked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                        }`}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor={`method_${match.id}`}
                        className="block text-sm font-semibold text-gray-700 mb-2"
                      >
                        Winning Method
                      </label>
                      <select
                        id={`method_${match.id}`}
                        disabled={locked}
                        value={pred.predicted_winning_method || ''}
                        onChange={(e) =>
                          handlePredictionChange(
                            match.id,
                            'predicted_winning_method',
                            e.target.value
                          )
                        }
                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${
                          locked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                        }`}
                      >
                        <option value="">Select...</option>
                        <option value="90">90</option>
                        <option value="120">120</option>
                        <option value="Pen">Pen</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor={`qualify_${match.id}`}
                        className="block text-sm font-semibold text-gray-700 mb-2"
                      >
                        Team to Qualify
                      </label>
                      <select
                        id={`qualify_${match.id}`}
                        disabled={locked}
                        value={pred.predicted_qualified_team || ''}
                        onChange={(e) =>
                          handlePredictionChange(
                            match.id,
                            'predicted_qualified_team',
                            e.target.value
                          )
                        }
                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${
                          locked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                        }`}
                      >
                        <option value="">Select...</option>
                        <option value={match.team_a}>{match.team_a}</option>
                        <option value={match.team_b}>{match.team_b}</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => savePrediction(match)}
                    disabled={locked || saving[match.id]}
                    className={`w-full py-2 rounded-lg font-semibold transition-colors ${
                      locked || saving[match.id]
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                    }`}
                  >
                    {locked
                      ? 'Locked'
                      : saving[match.id]
                      ? 'Saving...'
                      : 'Save Prediction'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}