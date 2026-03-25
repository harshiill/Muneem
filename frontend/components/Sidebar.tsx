'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle, PieChart, PlusCircle, Menu, X, Target, User, Receipt, AlertCircle, Banknote } from 'lucide-react'
import { useState } from 'react'

export function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    {
      label: 'Chat',
      href: '/',
      icon: MessageCircle,
    },
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: PieChart,
    },
    {
      label: 'Expenses',
      href: '/expenses',
      icon: Receipt,
    },
    {
      label: 'Money Lent',
      href: '/lent',
      icon: Banknote,
    },
    {
      label: 'Goals',
      href: '/goals',
      icon: Target,
    },
    {
      label: 'Dues',
      href: '/dues',
      icon: AlertCircle,
    },
    {
      label: 'Add Expense',
      href: '/add-expense',
      icon: PlusCircle,
    },
    {
      label: 'Profile',
      href: '/profile',
      icon: User,
    },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/30 transition-all"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed md:static left-0 top-0 h-screen w-64 border-r border-border bg-white transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } z-40 md:z-auto`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-blue-600 shadow-md flex items-center justify-center">
              <span className="text-xl font-bold text-white">◆</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Muneem</h1>
              <p className="text-xs text-muted-foreground font-medium">Finance Tracker</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  active
                    ? 'bg-primary text-primary-foreground font-semibold shadow-md'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-secondary/20">
          <p className="text-xs text-muted-foreground text-center font-medium">
            Muneem Finance
          </p>
          <p className="text-xs text-muted-foreground text-center mt-1 opacity-70">
            v1.0
          </p>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
