import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import AdminQFMatchesPage from './pages/AdminQFMatchesPage'
import AdminQFResultsPage from './pages/AdminQFResultsPage'
import PredictionPage from './pages/PredictionPage'
import LeaderboardPage from './pages/LeaderboardPage'

function Home() {
  return (
    <div style={{ padding: '30px', fontFamily: 'Arial' }}>
      <h1>World Cup Prediction League</h1>

      <div style={{ display: 'grid', gap: '12px', marginTop: '20px' }}>
        <Link to="/predict">Prediction Form</Link>

        <Link to="/leaderboard">Leaderboard</Link>

        <Link to="/admin/qf-matches">Admin QF Matches</Link>

        <Link to="/admin/qf-results">Admin QF Results</Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/predict" element={<PredictionPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/admin/qf-matches" element={<AdminQFMatchesPage />} />
        <Route path="/admin/qf-results" element={<AdminQFResultsPage />} />
      </Routes>
    </BrowserRouter>
  )
}