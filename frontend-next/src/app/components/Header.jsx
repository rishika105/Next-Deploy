"use client";

import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";

export default function Header() {
  return (
    <div>
      <nav className="relative z-50 bg-black/70 backdrop-blur-xl border-b border-gray-800">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* first */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-[#FF9FFC] to-[#5227FF] rounded-lg flex items-center justify-center">
                <span className="font-bold text-white">N</span>
              </div>
              <Link href="/" className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                NextDeploy
              </Link>
            </div>

            {/* second */}
            <div className="hidden md:flex items-center space-x-8">
              <Link
                href="/features"
                className="text-gray-300 hover:text-[#FF9FFC] transition-colors duration-300"
              >
                Features
              </Link>
              <Link
                href="/pricing"
                className="text-gray-300 hover:text-[#FF9FFC] transition-colors duration-300"
              >
                Pricing
              </Link>
              <Link
                href="/docs"
                className="text-gray-300 hover:text-[#FF9FFC] transition-colors duration-300"
              >
                Documentation
              </Link>
              <Link
                href="/deploy"
                className="text-gray-300 hover:text-[#FF9FFC] transition-colors duration-300"
              >
                Deploy
              </Link>
            </div>

            {/* third */}
            <div>
              <div className="p-2 flex gap-4">
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="border border-gray-600 text-white cursor-pointer rounded-full px-4 py-3">
                      Sign In
                    </button>
                  </SignInButton>

                  <SignUpButton mode="modal">
                    <button className="bg-[#6c47ff] text-white cursor-pointer rounded-full px-4 py-2">
                      Sign Up
                    </button>
                  </SignUpButton>
                </SignedOut>
              </div>

              <SignedIn>
                <UserButton />
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
