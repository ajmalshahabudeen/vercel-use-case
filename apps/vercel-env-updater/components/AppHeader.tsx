'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Button } from '@workspace/ui/components/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@workspace/ui/components/sheet'
import {
  HiOutlineRocketLaunch,
  HiOutlineDocumentDuplicate,
  HiOutlineUserCircle,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineBars3,
} from 'react-icons/hi2'
import { cn } from '@workspace/ui/lib/utils'

const navItems = [
  { href: '/', label: 'Get Started', icon: HiOutlineRocketLaunch },
  { href: '/bulk-update', label: 'Bulk Update', icon: HiOutlineDocumentDuplicate },
  { href: '/account', label: 'Account', icon: HiOutlineUserCircle },
]

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  onNavigate,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  isActive: boolean
  onNavigate?: () => void
}) {
  return (
    <Button
      asChild
      variant={isActive ? 'default' : 'ghost'}
      size="sm"
      className={cn('w-full justify-start gap-2 rounded-3xl md:w-auto', isActive && 'shadow-sm')}
    >
      <Link href={href} onClick={onNavigate}>
        <Icon className="size-4" />
        {label}
      </Link>
    </Button>
  )
}

export function AppHeader() {
  const pathname = usePathname()
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe theme icon
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background">
              <HiOutlineRocketLaunch className="size-5" />
            </div>
            <div className="font-semibold tracking-tight text-lg sm:text-xl truncate">
              Vercel Env
            </div>
          </Link>
          <div className="hidden text-[10px] text-muted-foreground lg:block">SYNC + DB</div>
        </div>

        <nav className="hidden md:flex items-center gap-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              isActive={pathname === item.href}
            />
          ))}

          <div className="ml-2 h-5 w-px bg-border" />

          <Button variant="outline" size="sm" asChild>
            <a
              href="https://vercel.com/docs/rest-api"
              target="_blank"
              rel="noopener noreferrer"
            >
              API Docs
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

        <div className="flex md:hidden items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
          >
            {mounted && resolvedTheme === 'dark' ? (
              <HiOutlineSun className="size-4" />
            ) : (
              <HiOutlineMoon className="size-4" />
            )}
          </Button>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-sm" aria-label="Open menu">
                <HiOutlineBars3 className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100%,20rem)]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.href}
                    {...item}
                    isActive={pathname === item.href}
                    onNavigate={closeMenu}
                  />
                ))}
                <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                  <a
                    href="https://vercel.com/docs/rest-api"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeMenu}
                  >
                    Vercel API Docs
                  </a>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}