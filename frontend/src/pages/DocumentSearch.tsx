import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { searchDocuments, setQuery, summarizeDocument } from '../store/slices/searchSlice'
import { RootState } from '../store/store'
import { Search, FileText, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DocumentSearch() {
  const dispatch = useDispatch()
  const { query, results, loading, hasSearched, documentSummaries } = useSelector(
    (state: RootState) => state.search
  )
  const [searchInput, setSearchInput] = useState(query)
  const [summarizing, setSummarizing] = useState<string | null>(null)

  useEffect(() => {
    setSearchInput(query)
  }, [query])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchInput.trim()) return

    dispatch(setQuery(searchInput))
    try {
      await dispatch(searchDocuments(searchInput) as any)
    } catch (error) {
      toast.error('Search failed. Please try again.')
    }
  }

  const handleSummarize = async (documentId: string) => {
    if (!query) {
      toast.error('Please enter a search query first')
      return
    }

    setSummarizing(documentId)
    try {
      await dispatch(
        summarizeDocument({ documentId, query }) as any
      ).unwrap()
      toast.success('Summary generated!', { duration: 5000 })
    } catch (error) {
      toast.error('Failed to generate summary')
    } finally {
      setSummarizing(null)
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Search Documents</h1>
        <p className="text-gray-600">
          Use AI-powered search to find and summarize relevant documents
        </p>
      </div>

      <div className="card max-w-4xl mx-auto mb-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search documents by keywords, topics, or ask a question..."
              className="input-field pl-10"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      )}

      {!loading && hasSearched && (
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <p className="text-gray-600">
              Found <span className="font-semibold">{results.length}</span> results for "
              {query}"
            </p>
          </div>

          {results.length === 0 ? (
            <div className="card text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No documents found</p>
              <p className="text-sm text-gray-500">
                Try different keywords or upload more documents
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((result) => (
                <div key={result.id} className="card hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <Link
                        to={`/documents/${result.id}`}
                        className="text-lg font-semibold text-primary-600 hover:text-primary-800 mb-2 block"
                      >
                        {result.title}
                      </Link>
                      <p className="text-sm text-gray-500 mb-2">{result.filename}</p>
                      <p className="text-gray-700 mb-3">{result.snippet}</p>
                      {documentSummaries[result.id] && (
                        <div className="mb-3 p-3 bg-primary-50 border border-primary-200 rounded-lg">
                          <p className="text-xs font-semibold text-primary-700 mb-1">AI Summary</p>
                          <p className="text-gray-700 text-sm whitespace-pre-wrap">
                            {documentSummaries[result.id]}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Relevance: {(result.score * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Link
                      to={`/documents/${result.id}`}
                      className="btn-secondary text-sm"
                    >
                      View Document
                    </Link>
                    <button
                      onClick={() => handleSummarize(result.id)}
                      disabled={summarizing === result.id}
                      className="btn-primary text-sm flex items-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      {summarizing === result.id ? 'Generating...' : 'AI Summarize'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!hasSearched && !loading && (
        <div className="card max-w-4xl mx-auto text-center py-12">
          <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Start searching your documents</p>
          <p className="text-sm text-gray-500">
            Enter keywords, topics, or ask questions to find relevant documents
          </p>
        </div>
      )}
    </div>
  )
}
