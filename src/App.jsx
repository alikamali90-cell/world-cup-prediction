import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import PredictionPage from './pages/PredictionPage';
import SemiFinalPredictionPage from './pages/SemiFinalPredictionPage';
import FinalPredictionPage from './pages/FinalPredictionPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminQFMatchesPage from './pages/AdminQFMatchesPage';
import AdminQFResultsPage from './pages/AdminQFResultsPage';
import AdminSFResultsPage from './pages/AdminSFResultsPage';
import AdminFinalResultsPage from './pages/AdminFinalResultsPage';

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
      to: '/predict-sf',
      emoji: '🔥',
      title: 'Semi Final Prediction Form',
      description: 'Predict the Semi Finals. Higher stakes: correct finalist is worth 7 points.',
      accent: 'from-blue-500 to-indigo-600',
      button: 'Predict Semi Finals'
    },
    {
      to: '/predict-final',
      emoji: '👑',
      title: 'Final Stage Prediction Form',
      description: 'Predict the Third Place match and the Final. Correct champion is worth 10 points.',
      accent: 'from-yellow-500 to-amber-600',
      button: 'Predict the Final'
    },
    {
      to: '/leaderboard',
      emoji: '🏆',
      title: 'Leaderboard',
      description: 'See the current standings and find out who is leading the league.',
      accent: 'from-purple-500 to-violet-600',
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
      title: 'Admin QF Results',
      description: 'Admin only. Enter Quarter Final results and recalculate points automatically.',
      accent: 'from-slate-500 to-slate-700',
      button: 'Enter QF Results'
    },
    {
      to: '/admin/sf-results',
      emoji: '📝',
      title: 'Admin SF Results',
      description: 'Admin only. Enter Semi Final results and recalculate points automatically.',
      accent: 'from-slate-500 to-slate-700',
      button: 'Enter SF Results'
    },
    {
      to: '/admin/final-results',
      emoji: '🎖️',
      title: 'Admin Final Results',
      description: 'Admin only. Enter Third Place and Final results and recalculate points automatically.',
      accent: 'from-slate-500 to-slate-700',
      button: 'Enter Final Results'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/40 via-transparent to-blue-900/40"></div>
        <div className="relative max-w-5xl mx-auto px-4 pt-14 pb-10 md:pt-20 md:pb-14 text-center">
          <p className="text-emerald-400 text-sm font-semibold tracking-widest uppercase mb-3">
            Quarter Finals · Semi Finals · Final Stage
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            🌍 World Cup Prediction League
          </h1>
          <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto">
            Predict the scores, pick the winners and climb the leaderboard. Predictions lock
            before kickoff — get yours in early.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <div className="inline-flex items-center gap-2 bg-slate-800/70 border border-slate-700 rounded-full px-4 py-2 text-sm text-slate-300">
              <span className="text-emerald-400 font-semibold">QF:</span>
              Qualify +5 · Score +2 · Method +1 · Max 8
            </div>
            <div className="inline-flex items-center gap-2 bg-slate-800/70 border border-slate-700 rounded-full px-4 py-2 text-sm text-slate-300">
              <span className="text-blue-400 font-semibold">SF:</span>
              Qualify +7 · Score +3 · Method +1 · Max 11
            </div>
            <div className="inline-flex items-center gap-2 bg-slate-800/70 border border-slate-700 rounded-full px-4 py-2 text-sm text-slate-300">
              <span className="text-yellow-400 font-semibold">Final:</span>
              Champion +10 · Score +5 · Method +1 · Max 16
            </div>
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
          Private friends league · Quarter Finals · Semi Finals · Final Stage
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
        <Route path="/predict-sf" element={<SemiFinalPredictionPage />} />
        <Route path="/predict-final" element={<FinalPredictionPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/admin/qf-matches" element={<AdminQFMatchesPage />} />
        <Route path="/admin/qf-results" element={<AdminQFResultsPage />} />
        <Route path="/admin/sf-results" element={<AdminSFResultsPage />} />
        <Route path="/admin/final-results" element={<AdminFinalResultsPage />} />
      </Routes>
    </BrowserRouter>
  );
}