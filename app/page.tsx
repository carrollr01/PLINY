export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">LifeOS Agent</h1>
        <p className="text-gray-600 mb-8">
          Text {process.env.TWILIO_PHONE_NUMBER || 'your Twilio number'} to log activities
        </p>
        <div className="space-y-2 text-left bg-white p-6 rounded-lg shadow max-w-md mx-auto">
          <p className="text-sm text-gray-700">
            <strong>Examples:</strong>
          </p>
          <p className="text-sm text-gray-600">• "Just read for 45min"</p>
          <p className="text-sm text-gray-600">• "2hr deep work on Philos"</p>
          <p className="text-sm text-gray-600">• "Finished workout - boxing"</p>
        </div>
      </div>
    </div>
  )
}