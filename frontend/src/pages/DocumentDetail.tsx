import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchDocumentById } from '../store/slices/documentsSlice'
import { summarizeDocument, setQuery } from '../store/slices/searchSlice'
import { RootState } from '../store/store'
import { ArrowLeft, FileText, Sparkles, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>()
  const dispatch = useDispatch()
  const { selectedDocument, loading } = useSelector(
    (state: RootState) => state.documents
  )
  const [summaryQuery, setSummaryQuery] = useState('')
  const [summary, setSummary] = useState<string | null>(null)
  const [generatingSummary, setGeneratingSummary] = useState(false)

  useEffect(() => {
    if (id) {
      dispatch(fetchDocumentById(id) as any)
    }
  }, [id, dispatch])

  const handleGenerateSummary = async () => {
    if (!summaryQuery.trim() || !id) {
      toast.error('Please enter a query for summarization')
      return
    }

    setGeneratingSummary(true)
    try {
      dispatch(setQuery(summaryQuery))
      const result = await dispatch(
        summarizeDocument({ documentId: id, query: summaryQuery }) as any
      ).unwrap()
      setSummary(result)
      toast.success('Summary generated successfully!')
    } catch (error) {
      toast.error('Failed to generate summary')
    } finally {
      setGeneratingSummary(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!selectedDocument) {
    return (
      <div className="px-4 py-6">
        <div className="card text-center py-12">
          <p className="text-gray-600">Document not found</p>
          <Link to="/" className="btn-primary mt-4 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Poll for status updates
  useEffect(() => {
    
  })

  return (
    <div className="px-4 py-6">
      <Link
        to="/"
        className="inline-flex items-center text-primary-600 hover:text-primary-800 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Link>

      <div className="card max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <FileText className="h-8 w-8 text-primary-600 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{selectedDocument.title}</h1>
              <p className="text-sm text-gray-500 mt-1">{selectedDocument.filename}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500">File Type</p>
              <p className="font-medium">{selectedDocument.fileType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">File Size</p>
              <p className="font-medium">{(selectedDocument.fileSize / 1024).toFixed(2)} KB</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <span
                className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                  selectedDocument.status === 'indexed'
                    ? 'bg-green-100 text-green-800'
                    : selectedDocument.status === 'processing'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {selectedDocument.status}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Upload Date</p>
              <p className="font-medium">
                {new Date(selectedDocument.uploadDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {selectedDocument.summary && (
          <div className="mb-6 p-4 bg-primary-50 rounded-lg border border-primary-200">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
              <Sparkles className="h-5 w-5 text-primary-600 mr-2" />
              Document Summary
            </h3>
            <p className="text-gray-700">{selectedDocument.summary}</p>
          </div>
        )}

        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            AI-Powered Summarization
          </h2>
          <p className="text-gray-600 mb-4">
            Generate a custom summary based on your specific query or question about this
            document.
          </p>

          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={summaryQuery}
              onChange={(e) => setSummaryQuery(e.target.value)}
              placeholder="e.g., What are the main findings? Summarize the key points..."
              className="input-field flex-1"
            />
            <button
              onClick={handleGenerateSummary}
              disabled={generatingSummary || !summaryQuery.trim()}
              className="btn-primary flex items-center gap-2"
            >
              {generatingSummary ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Summary
                </>
              )}
            </button>
          </div>

          {summary && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Generated Summary</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{summary}</p>
            </div>
          )}
        </div>

        {selectedDocument.metadata && Object.keys(selectedDocument.metadata).length > 0 && (
          <div className="mt-6 border-t border-gray-200 pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Metadata</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(selectedDocument.metadata).map(([key, value]) => (
                <div key={key}>
                  <p className="text-sm text-gray-500">{key}</p>
                  <p className="font-medium">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
