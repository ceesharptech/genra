'use client'

import React from 'react'
import Link from 'next/link'
import { useAuth } from './auth-provider'
import { Button, buttonVariants } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  UserIcon,
  Settings01Icon,
  Logout01Icon,
  PlusSignIcon,
  DashboardSquare01Icon,
  Bookmark02Icon,
  DocumentCodeIcon,
  Folder01Icon,
} from '@hugeicons/core-free-icons'

export function UserMenu() {
  const { user, profile, signOut } = useAuth()

  if (!user) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/signup"
          className="text-foreground/80 hover:text-foreground px-1 text-xs font-normal transition-colors sm:text-sm"
        >
          Sign up
        </Link>
        <Link
          href="/login"
          className={cn(
            buttonVariants({ variant: 'default', size: 'md' }),
            'rounded-full px-6 text-xs font-normal sm:text-sm'
          )}
        >
          Log in
        </Link>
      </div>
    )
  }

  const displayName =
    profile?.display_name || user.email?.split('@')[0] || 'User'
  const username = profile?.username || user.email?.split('@')[0] || 'user'
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 1)
    .toUpperCase()

  return (
    <div className="flex items-center gap-2.5 sm:gap-3">
      <Link
        href="/new"
        className={cn(
          buttonVariants({ variant: 'default', size: 'sm' }),
          'hidden h-8 gap-1.5 rounded-full px-3.5 text-xs font-semibold sm:inline-flex'
        )}
      >
        <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
        <span>New creation</span>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="focus-visible:ring-brand ring-offset-background size-8 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            />
          }
        >
          <Avatar className="size-8 cursor-pointer">
            {profile?.avatar_url && (
              <AvatarImage src={profile.avatar_url} alt={displayName} />
            )}
            <AvatarFallback className="bg-surface-2 text-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56 p-1">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2 py-2 font-normal">
              <div className="flex flex-col space-y-0.5">
                <p className="text-foreground truncate text-xs font-medium">
                  {displayName}
                </p>
                <p className="text-muted-foreground truncate text-[11px]">
                  @{username}
                </p>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem render={<Link href={`/u/${username}`} />}>
              <HugeiconsIcon
                icon={UserIcon}
                strokeWidth={1.5}
                className="mr-2 h-4 w-4"
              />
              <span>My profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/creations" />}>
              <HugeiconsIcon
                icon={DashboardSquare01Icon}
                strokeWidth={1.5}
                className="mr-2 h-4 w-4"
              />
              <span>My creations</span>
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href={`/u/${username}?tab=library`} />}>
              <HugeiconsIcon
                icon={DocumentCodeIcon}
                strokeWidth={1.5}
                className="mr-2 h-4 w-4"
              />
              <span>My library</span>
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href={`/u/${username}?tab=collections`} />}>
              <HugeiconsIcon
                icon={Folder01Icon}
                strokeWidth={1.5}
                className="mr-2 h-4 w-4"
              />
              <span>My collections</span>
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/saved" />}>
              <HugeiconsIcon
                icon={Bookmark02Icon}
                strokeWidth={1.5}
                className="mr-2 h-4 w-4"
              />
              <span>Saved</span>
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/settings" />}>
              <HugeiconsIcon
                icon={Settings01Icon}
                strokeWidth={1.5}
                className="mr-2 h-4 w-4"
              />
              <span>Settings</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => void signOut()}
            className="cursor-pointer"
          >
            <HugeiconsIcon
              icon={Logout01Icon}
              strokeWidth={1.5}
              className="mr-2 h-4 w-4"
            />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
