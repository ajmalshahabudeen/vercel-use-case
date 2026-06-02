'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Button } from '@workspace/ui/components/button'
import {
  HiOutlineRocketLaunch,
  HiOutlineDocumentDuplicate,
  HiOutlineUserCircle,
  HiOutlineSun,
  HiOutlineMoon,
} from 'react-icons/hi2'
import { cn } from '@workspace/ui/lib/utils'

const navItems = [
  { href: '/', label: 'Get Started', icon: HiOutlineRocketLaunch },
  { href: '/bulk-update', label: 'Bulk Update', icon: HiOutlineDocumentDuplicate },
  { href: '/account', label: 'Account', icon: HiOutlineUserCircle },
]

export function AppHeader() {
  const pathname = usePathname()
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time mount flag for hydration-safe theme icon (standard next-themes pattern)
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-foreground text-background">
              <HiOutlineRocketLaunch className="size-5" />
            </div>
            <div className="font-semibold tracking-tight text-xl">Vercel Env</div>
          </Link>
          <div className="hidden text-[10px] text-muted-foreground sm:block">SYNC + DB</div>
        </div>

        <nav className="flex items-center gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Button
                key={item.href}
                asChild
                variant={isActive ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'gap-2 rounded-3xl',
                  isActive && 'shadow-sm'
                )}
              >
                <Link href={item.href}>
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              </Button>
            )
          })}

          <div className="ml-2 h-5 w-px bg-border" />

          <Button variant="outline" size="sm" asChild>
            <a
              href="https://vercel.com/docs/rest-api"
              target="_blank"
              rel="noopener noreferrer"
            >
              Vercel API Docs
            </a>
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="ml-1"
          >
            {mounted ? (
              resolvedTheme === 'dark' ? (
                <HiOutlineSun className="size-4" />
              ) : (
                <HiOutlineMoon className="size-4" />
              )
            ) : (
              <HiOutlineMoon className="size-4 opacity-50" />
            )}
          </Button>
        </nav>
      </div>
    </header>
  )
}
