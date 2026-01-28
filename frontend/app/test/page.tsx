export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">MCC Lost & Found</h1>
        <p className="text-lg text-gray-600 mb-8">System is working!</p>
        <div className="space-x-4">
          <a href="/login" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
            Login
          </a>
          <a href="/browse" className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700">
            Browse Items
          </a>
        </div>
      </div>
    </div>
  )
}