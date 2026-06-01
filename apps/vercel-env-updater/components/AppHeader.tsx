'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@workspace/ui/components/button'
import { HiOutlineRocketLaunch, HiOutlineDocumentDuplicate } from 'react-icons/hi2'
import { cn } from '@workspace/ui/lib/utils'

const navItems = [
  { href: '/', label: 'Get Started', icon: HiOutlineRocketLaunch },
  { href: '/bulk-update', label: 'Bulk Update', icon: HiOutlineDocumentDuplicate },
]

export function AppHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
        </nav>
      </div>
    </header>
  )
}
