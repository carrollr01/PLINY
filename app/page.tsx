export default function Home() {
  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-black">Pliny</h1>
          <p className="text-xl text-gray-800 mb-2">Personal Productivity Intelligence</p>
          <p className="text-lg text-gray-600">
            Track your productivity throughout the day via SMS
          </p>
        </div>

        {/* Brand Information Section */}
        <div className="bg-white border border-gray-300 rounded-sm p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-black">About Pliny</h2>
          <div className="space-y-3 text-gray-800">
            <p className="leading-relaxed">
              Pliny is a personal productivity tool that helps you track and optimize your daily activities.
              By analyzing texts you send to our SMS agent, Pliny creates activity logs, manages reminders,
              organizes notes, and tracks tasks throughout your day.
            </p>
            <div className="grid md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-300">
              <div>
                <p className="font-semibold text-black">Business Address:</p>
                <p>8210 Alston Road<br />Towson, Maryland 21204</p>
              </div>
              <div>
                <p className="font-semibold text-black">Contact Information:</p>
                <p>Phone: +1 (443) 895-8558<br />Email: rcarrol6@nd.edu</p>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works / Opt-In Workflow */}
        <div className="bg-white border border-gray-300 rounded-sm p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-black">How to Get Started</h2>
          <div className="space-y-4 text-gray-800">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-black">Step 1: Opt-In to SMS Service</h3>
              <p className="mb-3">
                Text <span className="font-mono bg-gray-100 px-2 py-1 rounded-sm">START</span> to{' '}
                <span className="font-semibold">+1 (443) 895-8558</span> to subscribe to Pliny's productivity tracking service.
              </p>
              <p className="text-sm italic bg-gray-100 p-4 rounded-sm border-l-2 border-black">
                By providing your phone number and texting START, you agree to receive SMS messages for activity logging,
                reminders, notes, and task management. Message frequency varies based on your usage.
                Message and data rates may apply. Consent is not a condition of purchase. Reply STOP to opt out at any time.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 text-black">Step 2: Start Logging Activities</h3>
              <p className="mb-2">Once subscribed, simply text your activities, tasks, or notes throughout the day:</p>
              <div className="bg-gray-100 p-4 rounded-sm space-y-2">
                <p className="text-sm font-mono">• "Just read for 45min"</p>
                <p className="text-sm font-mono">• "2hr deep work on Philos"</p>
                <p className="text-sm font-mono">• "Finished workout - boxing"</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 text-black">Step 3: Review Your Progress</h3>
              <p>
                Access your dashboard to view insights, analytics, and patterns in your productivity over time.
              </p>
            </div>
          </div>
        </div>

        {/* Required Keywords and Confirmation Messages */}
        <div className="bg-white border border-gray-300 rounded-sm p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-black">SMS Commands</h2>
          <div className="space-y-4">
            <div className="border-l-2 border-black pl-4 py-2">
              <p className="font-semibold text-black mb-1">START - Subscribe to Service</p>
              <p className="text-sm text-gray-600 mb-2">Text START to opt-in and begin tracking your productivity.</p>
              <div className="bg-gray-100 p-3 rounded-sm text-sm">
                <p className="font-semibold mb-1">Confirmation Message:</p>
                <p className="italic">
                  "Pliny: Thanks for subscribing to our productivity tracking service! Reply HELP for help.
                  Message frequency may vary based on your usage. Msg&data rates may apply.
                  Consent is not a condition of purchase. Reply STOP to opt out."
                </p>
              </div>
            </div>

            <div className="border-l-2 border-gray-600 pl-4 py-2">
              <p className="font-semibold text-black mb-1">HELP - Get Support</p>
              <p className="text-sm text-gray-600 mb-2">Text HELP to receive contact information and support.</p>
              <div className="bg-gray-100 p-3 rounded-sm text-sm">
                <p className="font-semibold mb-1">Confirmation Message:</p>
                <p className="italic">
                  "Pliny: Please reach out to us at rcarrol6@nd.edu or +1 (443) 895-8558 for help.
                  Visit https://pliny-beta.vercel.app for more information."
                </p>
              </div>
            </div>

            <div className="border-l-2 border-gray-400 pl-4 py-2">
              <p className="font-semibold text-black mb-1">STOP - Unsubscribe</p>
              <p className="text-sm text-gray-600 mb-2">Text STOP to opt out and stop receiving messages.</p>
              <div className="bg-gray-100 p-3 rounded-sm text-sm">
                <p className="font-semibold mb-1">Confirmation Message:</p>
                <p className="italic">
                  "Pliny: You are unsubscribed and will receive no further messages."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Message Frequency and Privacy */}
        <div className="bg-white border border-gray-300 rounded-sm p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-black">Privacy & Terms</h2>
          <div className="space-y-4 text-gray-800">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-black">Message Frequency</h3>
              <p>
                Message frequency varies based on your usage. You control how often you interact with Pliny.
                Confirmation messages are sent when you opt-in, opt-out, or request help.
                Activity logging occurs only when you send messages to the service.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 text-black">Standard Messaging Rates</h3>
              <p>
                Message and data rates may apply based on your mobile carrier's plan.
                Please check with your carrier for details on your messaging plan.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 text-black">Privacy Policy</h3>
              <p>
                Your privacy is important to us. We collect and store only the information you provide via SMS
                to deliver our productivity tracking service. We do not share your personal information with third parties
                for marketing purposes. All data is stored securely and used solely to provide you with activity tracking,
                insights, and productivity analytics.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 text-black">Terms of Service</h3>
              <p>
                By using Pliny's SMS service, you agree to receive text messages related to productivity tracking,
                activity logging, reminders, notes, and task management. You may opt out at any time by texting STOP.
                Consent to receive messages is not a condition of purchase or use of any other services.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-600 text-sm">
          <p>&copy; 2026 Pliny. All rights reserved.</p>
          <p className="mt-2">8210 Alston Road, Towson, Maryland 21204</p>
          <p>Contact: rcarrol6@nd.edu | +1 (443) 895-8558</p>
        </div>
      </div>
    </div>
  )
}