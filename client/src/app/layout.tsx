import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Report Platform',
  description: 'Платформа отчётов',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white border-b border-gray-200 shadow-sm">
            <div className="mx-auto max-w-5xl px-4 py-4 flex items-center gap-4">
              <a href="/" className="text-xl font-bold text-blue-600 hover:text-blue-700">
                📊 Report Platform
              </a>
              <span className="text-sm text-gray-400">Платформа отчётов</span>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
