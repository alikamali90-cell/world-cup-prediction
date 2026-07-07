import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import PredictionPage from './pages/PredictionPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminQFMatchesPage from './pages/AdminQFMatchesPage';
import AdminQFResultsPage from './pages/AdminQFResultsPage';

function HomePage() {
  const cards = [
    {
      to: '/predict',
      emoji: '⚽',
      title: 'Prediction Form',
      description: 'Predict scores, winning method and the team to qualify for each quarter final.',
      accent: 'from-emerald-500 to-green-600',
      button: 'Make Predictions'
    },
    {
      to: '/leaderboard',
      emoji: '🏆',
      title: 'Leaderboard',
      description: 'See the current standings and find out who is leading the league.',
      accent: 'from-blue-500 to-indigo-600',
      button: 'View Standings'
    },
    {
      to: '/admin/qf-matches',
      emoji: '🛠️',
      title: 'Admin Matches',
      description: 'Admin only. Edit quarter final teams and kickoff times.',
      accent: 'from-slate-500 to-slate-700',
      button: 'Manage Matches'
    },
    {
      to: '/admin/qf-results',
      emoji: '📋',
      title: 'Admin Results',
      description: 'Admin only. Enter actual results and recalculate points automatically.',
      accent: 'from-slate-500 to-slate-700',
      button: 'Enter Results'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/40 via-transparent to-blue-900/40"></div>
        <div className="relative max-w-5xl mx-auto px-4 pt-14 pb-10 md:pt-20 md:pb-14 text-center">
          <p className="text-emerald-400 text-sm font-semibold tracking-widest uppercase mb-3">
            Quarter Finals
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            🌍 World Cup Prediction League
          </h1>
          <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto">
            Predict the scores, pick the winners and climb the leaderboard. Predictions lock at
            kickoff — get yours in early.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-slate-800/70 border border-slate-700 rounded-full px-4 py-2 text-sm text-slate-300">
            <span className="text-emerald-400 font-semibold">Scoring:</span>
            Qualify +5 · Exact score +2 · Method +1 · Max 8 per match
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
          {cards.map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className="group bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-600 hover:bg-slate-800/80 transition-colors"
            >
              <div
                className={`inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br ${card.accent} text-2xl mb-4`}
              >
                {card.emoji}
              </div>
              <h2 className="text-lg font-bold text-white mb-1">{card.title}</h2>
              <p className="text-sm text-slate-400 mb-5 leading-relaxed">{card.description}</p>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 group-hover:text-emerald-300 transition-colors">
                {card.button}
                <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>

        <footer className="mt-12 text-center text-xs text-slate-600">
          Private friends league · Quarter Final stage
        </footer>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/predict" element={<PredictionPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/admin/qf-matches" element={<AdminQFMatchesPage />} />
        <Route path="/admin/qf-results" element={<AdminQFResultsPage />} />
      </Routes>
    </BrowserRouter>
  );
}