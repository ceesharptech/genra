"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "./auth-provider";
import { useRequireAuth } from "./auth-modal-provider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserIcon,
  Settings01Icon,
  Logout01Icon,
} from "@hugeicons/core-free-icons";

export function UserMenu() {
  const { user, profile, signOut } = useAuth();
  const { openLoginModal } = useRequireAuth();

  if (!user) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => openLoginModal()}
        className="font-medium"
      >
        Log in
      </Button>
    );
  }

  const displayName =
    profile?.display_name || user.email?.split("@")[0] || "User";
  const username = profile?.username || user.email?.split("@")[0] || "user";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          />
        }
      >
        <Avatar size="sm" className="cursor-pointer">
          {profile?.avatar_url && (
            <AvatarImage src={profile.avatar_url} alt={displayName} />
          )}
          <AvatarFallback className="bg-surface-2 text-foreground font-medium text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 p-1">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal px-2 py-2">
            <div className="flex flex-col space-y-0.5">
              <p className="text-xs font-medium text-foreground truncate">
                {displayName}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
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
          onClick={() => signOut()}
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
  );
}
