'use client'

import { Sidebar } from '@/components/Sidebar'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>AI Financial Assistant</title>
        <meta name="description" content="Your AI Financial Assistant" />
      </head>
      <body className="bg-background text-foreground">
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 flex flex-col overflow-hidden md:ml-0">
            {children}
          </main>
          <Toaster position="bottom-right" />
        </div>
      </body>
    </html>
  )
}
