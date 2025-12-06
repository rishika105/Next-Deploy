"use client";
import Cubes from "./components/Cubes.jsx";
import LiquidEther from "./components/LiquidEther.jsx";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function Home() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      icon: "⚡",
      title: "Lightning Fast",
      description:
        "Deploy your projects in seconds with our optimized build system and global CDN.",
    },
    {
      icon: "🔧",
      title: "Zero Configuration",
      description:
        "Just push your code. We handle the rest with automatic framework detection.",
    },
    {
      icon: "🌍",
      title: "Global Edge Network",
      description:
        "Your sites are served from the edge for maximum performance worldwide.",
    },
    {
      icon: "🔄",
      title: "Instant Rollbacks",
      description:
        "One-click rollbacks to any previous deployment. Safety first.",
    },
    {
      icon: "🔒",
      title: "Secure by Default",
      description:
        "Automatic SSL, DDoS protection, and security headers included.",
    },
    {
      icon: "📊",
      title: "Real-time Analytics",
      description:
        "Monitor your deployments with detailed analytics and performance metrics.",
    },
  ];

  const stats = [
    { number: "10K+", label: "Active Deployments" },
    { number: "5M+", label: "Requests per Day" },
    { number: "99.9%", label: "Uptime SLA" },
    { number: "1.2s", label: "Average Build Time" },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Navigation */}

      {/* Hero Section */}
      <section className=" z-10 pt-12 pb-20">
        {/* Liquid Ether Background - Full Screen */}
        <div className="absolute inset-0 z-0">
          <LiquidEther
            colors={["#5227FF", "#FF9FFC", "#B19EEF"]}
            mouseForce={40}
            cursorSize={100}
            isViscous={false}
            viscous={30}
            iterationsViscous={32}
            iterationsPoisson={32}
            resolution={0.5}
            isBounce={false}
            autoDemo={true}
            autoSpeed={0.5}
            autoIntensity={2.2}
            takeoverDuration={0.25}
            autoResumeDelay={3000}
            autoRampDuration={0.6}
          />
        </div>

        <div className="container mx-auto px-6">
          <div
            className={`max-w-6xl mx-auto text-center transition-all duration-1000 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
            }`}
          >
            <div className="inline-flex items-center space-x-2 bg-black/50 border border-[#5227FF]/30 rounded-full px-4 py-2 mb-8 backdrop-blur-sm">
              <span className="w-2 h-2 bg-[#FF9FFC] rounded-full animate-pulse"></span>
              <span className="text-sm text-gray-300">
                The web, made fluid at your fingertips
              </span>
            </div>

            <h1 className="text-6xl md:text-8xl font-bold mb-8 leading-tight">
              <span className="block bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                Deploy
              </span>
              <span className="block bg-gradient-to-r from-[#FF9FFC] via-[#B19EEF] to-[#5227FF] bg-clip-text text-transparent">
                Instantly
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              The simplest way to deploy your web projects. Connect your
              repository and deploy in seconds. No configuration needed.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
              <Link
                href="/deploy"
                className="group bg-gradient-to-r from-[#5227FF] to-[#FF9FFC] hover:from-[#5227FF] hover:to-[#FF9FFC] px-8 py-4 rounded-full font-semibold text-lg transition-all transform hover:scale-105 shadow-2xl shadow-[#5227FF]/30 flex items-center space-x-2"
              >
                <span>Deploy Now</span>
                <span className="group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </Link>
              <button className="bg-black/50 hover:bg-[#5227FF]/10 border border-[#5227FF]/30 px-8 py-4 rounded-full font-semibold text-lg transition-all backdrop-blur-sm hover:border-[#FF9FFC]/50">
                Watch Demo
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto mt-64">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#FF9FFC] to-[#5227FF] bg-clip-text text-transparent">
                    {stat.number}
                  </div>
                  <div className="text-gray-400 text-sm mt-2">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 py-20 mt-28">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Everything You Need to
              </span>
              <br />
              <span className="bg-gradient-to-r from-[#FF9FFC] to-[#5227FF] bg-clip-text text-transparent">
                Ship Fast
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Powerful features that make deployment effortless and your
              applications performant.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-black/50 backdrop-blur-sm border border-[#5227FF]/20 rounded-2xl p-8 hover:bg-[#5227FF]/10 transition-all duration-500 transform hover:-translate-y-2 hover:border-[#FF9FFC]/50"
              >
                <div className="text-3xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Content Section with Box */}
      <section className="relative z-10 py-20 mt-24">
        <div className="container mx-auto px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Side - Content */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-4xl md:text-5xl font-bold mb-6">
                    <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      Built for Developers
                    </span>
                  </h2>
                  <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                    Experience the fastest way to deploy your applications. From
                    zero to production in seconds, with automatic SSL, global
                    CDN, and real-time analytics.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    "Git-based deployments",
                    "Automatic HTTPS/SSL",
                    "Custom domains",
                    "Environment variables",
                    "Instant cache invalidation",
                    "Real-time logs",
                  ].map((item, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-[#FF9FFC] rounded-full"></div>
                      <span className="text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="flex space-x-4">
                  <Link
                    href="/deploy"
                    className="bg-gradient-to-r from-[#5227FF] to-[#FF9FFC] hover:from-[#5227FF] hover:to-[#FF9FFC] px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg shadow-[#5227FF]/20"
                  >
                    Start Deploying
                  </Link>
                  <button className="bg-black/50 hover:bg-[#5227FF]/10 border border-[#5227FF]/30 px-6 py-3 rounded-lg font-semibold transition-all backdrop-blur-sm">
                    View Documentation
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="">
                  <div
                    style={{
                      height: "100%",
                      width: "140%",
                      position: "absolute",
                      bottom: "200px",
                      left: "100px",
                    }}
                  >
                    <Cubes
                      gridSize={8}
                      maxAngle={60}
                      radius={4}
                      borderStyle="2px dashed #B19EEF"
                      faceColor="#1a1a2e"
                      rippleColor="#ff6b6b"
                      rippleSpeed={1.5}
                      autoAnimate={true}
                      rippleOnClick={true}
                    />
                  </div>
                </div>

                {/* Floating elements for visual interest */}
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-[#FF9FFC]/20 rounded-full blur-sm"></div>
                <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-[#5227FF]/20 rounded-full blur-sm"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 mt-10">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-r from-[#5227FF]/10 to-[#FF9FFC]/10 border border-[#5227FF]/20 rounded-2xl p-12 backdrop-blur-sm">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Ready to Deploy?
                </span>
              </h2>
              <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                Join thousands of developers shipping their projects faster than
                ever before.
              </p>
              <Link
                href="/deploy"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-[#5227FF] to-[#FF9FFC] hover:from-[#5227FF] hover:to-[#FF9FFC] px-8 py-4 rounded-full font-semibold text-lg transition-all transform hover:scale-105 shadow-2xl shadow-[#5227FF]/30"
              >
                <span>Get Started for Free</span>
                <span className="hover:translate-x-1 transition-transform">
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800 py-12 bg-black/70 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center pl-8 pr-8">
            <div className="text-gray-400 text-sm">© 2025 NextDeploy.</div>

            <div className="text-gray-400 text-sm p-3">
              Made with ❤️ by Rishika.
            </div>

            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-[#FF9FFC] to-[#5227FF] rounded-lg"></div>
              <span className="text-xl font-bold text-white">NextDeploy </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
