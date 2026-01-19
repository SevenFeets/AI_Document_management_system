import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard'
import DocumentUpload from './pages/DocumentUpload'
import DocumentSearch from './pages/DocumentSearch'
import DocumentDetail from './pages/DocumentDetail'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<DocumentUpload />} />
        <Route path="/search" element={<DocumentSearch />} />
        <Route path="/documents/:id" element={<DocumentDetail />} />
      </Routes>
    </Layout>
  )
}

export default App
