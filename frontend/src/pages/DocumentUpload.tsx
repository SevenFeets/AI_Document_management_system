import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useDropzone } from 'react-dropzone'
import { uploadDocument } from '../store/slices/uploadSlice'
import { RootState } from '../store/store'
import { Upload, FileText, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DocumentUpload() {
  const dispatch = useDispatch()
  const { uploading, progress, error } = useSelector((state: RootState) => state.upload)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        try {
          await dispatch(uploadDocument(file) as any)
          toast.success(`Successfully uploaded ${file.name}`)
        } catch (err) {
          toast.error(`Failed to upload ${file.name}`)
        }
      }
    },
    [dispatch]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
  })

  return (
    <div className="px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Documents</h1>
        <p className="text-gray-600">Upload documents to be indexed and searchable</p>
      </div>

      <div className="card max-w-3xl mx-auto">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          {isDragActive ? (
            <p className="text-lg text-primary-600">Drop the files here...</p>
          ) : (
            <>
              <p className="text-lg text-gray-700 mb-2">
                Drag & drop files here, or click to select
              </p>
              <p className="text-sm text-gray-500">
                Supports PDF, DOC, DOCX, and TXT files
              </p>
            </>
          )}
        </div>

        {uploading && (
          <div className="mt-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Uploading...</span>
              <span className="text-sm text-gray-500">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <X className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">How it works</h3>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary-100 text-primary-600 font-semibold">
                  1
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Upload your document</p>
                <p className="text-sm text-gray-500">
                  Files are securely uploaded to S3 storage
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary-100 text-primary-600 font-semibold">
                  2
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Automatic processing</p>
                <p className="text-sm text-gray-500">
                  Documents are queued for indexing and summarization
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary-100 text-primary-600 font-semibold">
                  3
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Ready to search</p>
                <p className="text-sm text-gray-500">
                  Once indexed, documents become searchable with AI-powered summaries
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
