"use client";

import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [selected, setSelected] = useState(false);
  const [selected2, setSelected2] = useState(false);
  const [selected3, setSelected3] = useState(false);
  const [selected4, setSelected4] = useState(false);
  
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
            <Link
              href="/deploy"
              className="nav-link"
              onClick={() => setSelected(!selected)}
            >
              {selected ? (
                <div className="border-b-2 border-gray-300">Overview</div>
              ) : (
                <div>Overview</div>
              )}
            </Link>
            <Link
              href="/deployments"
              className="nav-link"
              onClick={() => setSelected2(!selected2)}
            >
              {selected2 ? (
                <div className="border-b-2  border-gray-300">Deployments</div>
              ) : (
                <div>Deployments</div>
              )}
            </Link>
            <Link
              href="/obs"
              className="nav-link"
              onClick={() => setSelected4(!selected4)}
            >
              {selected4 ? (
                <div className="border-b-2 border-gray-300"> Observability</div>
              ) : (
                <div> Observability</div>
              )}
            </Link>

            <Link
              href="/docs"
              className="nav-link"
              onClick={() => setSelected3(!selected3)}
            >
              {selected3 ? (
                <div className="border-b-2 border-gray-300"> Documentation</div>
              ) : (
                <div> Documentation</div>
              )}
            </Link>

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
