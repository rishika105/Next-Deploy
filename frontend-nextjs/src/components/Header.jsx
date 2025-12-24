"use client";

import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  const navItems = [
    { name: "Overview", href: "/overview" },
    { name: "Deployments", href: "/deployments" }
  ];

  return (
    <header className="sticky top-0 z-50 bg-black/70 backdrop-blur-xl border-b border-gray-800">
      <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-[#FF9FFC] to-[#5227FF] rounded-lg flex items-center justify-center">
            <span className="font-bold text-white">N</span>
          </div>

          <Link
            href="/"
            className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
          >
            NextDeploy
          </Link>
        </div>

        {/* Desktop Menu */}
        <SignedIn>
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative transition text-gray-300 hover:text-white`}
                >
                  <span>{item.name}</span>

                  {/* Active underline */}
                  {isActive && (
                    <span className="absolute top-11 left-0 w-full border-b-2 border-gray-300"></span>
                  )}
                </Link>
              );
            })}

            <UserButton />
          </div>
        </SignedIn>

        {/* Auth Buttons */}
        <SignedOut>
          <div className="flex gap-4">
            <SignInButton mode="modal">
              <button className="border border-gray-600 text-white rounded-full px-4 py-2">
                Sign In
              </button>
            </SignInButton>

            <SignUpButton mode="modal">
              <button className="bg-[#6C47FF] text-white rounded-full px-4 py-2">
                Sign Up
              </button>
            </SignUpButton>
          </div>
        </SignedOut>
      </nav>
    </header>
  );
}
