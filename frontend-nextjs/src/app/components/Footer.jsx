import React from 'react'

const Footer = () => {
  return (
    <div>
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
  )
}

export default Footer
