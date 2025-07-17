"use client";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] via-[#0f0f0f] to-[#1a1a1a]">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#ff4444] to-[#b71c1c] rounded-xl shadow-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <span className="text-white font-bold text-xl sm:text-2xl font-sans">Iwas Huli</span>
          </div>
          <div className="hidden md:flex space-x-8">
            <a href="#features" className="text-white hover:text-[#ff4444] transition-all duration-200 font-medium text-base hover:scale-105">Features</a>
            <a href="#about" className="text-white hover:text-[#ff4444] transition-all duration-200 font-medium text-base hover:scale-105">About</a>
            <a href="#contact" className="text-white hover:text-[#ff4444] transition-all duration-200 font-medium text-base hover:scale-105">Contact</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 md:pt-32 lg:pt-40">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#0f0f0f] to-[#1a1a1a]"></div>
        <div className="relative z-10 text-center max-w-4xl lg:max-w-6xl mx-auto w-full">
          <div className="mb-12 sm:mb-16">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 sm:mb-8 leading-tight font-sans">
            See where other drivers went wrong
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-300 mb-8 sm:mb-12 max-w-4xl mx-auto leading-relaxed font-medium">
              Navigate Manila&apos;s roads with confidence. Get real-time alerts about traffic violation hotspots and stay informed to avoid fines.
            </p>
          
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center w-full">
            <a
              href="/" 
              className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-[#ff4444] to-[#b71c1c] text-white font-semibold rounded-xl hover:from-[#b71c1c] hover:to-[#8b0000] transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl font-medium text-lg sm:text-xl"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Go back to the App
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 sm:mb-20">
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 sm:mb-8 font-sans">Why use <span className="text-red-500">Iwas Huli</span>?</h2>
            <p className="text-lg sm:text-xl text-gray-400 max-w-4xl mx-auto font-medium">
              Stay ahead of traffic violations with our comprehensive mapping system and real-time alerts.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-gray-700 rounded-xl p-8 hover:from-[#2a2a2a] hover:to-[#1a1a1a] transition-all duration-300 hover:scale-105 shadow-lg">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#ff4444] to-[#b71c1c] rounded-xl flex items-center justify-center mb-6 sm:mb-8 shadow-lg mx-auto">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 font-sans">Real-Time Mapping</h3>
              <p className="text-gray-400 leading-relaxed font-medium text-base sm:text-lg">
                Interactive maps showing violation hotspots across Manila with detailed information about each zone.
              </p>
            </div>
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-gray-700 rounded-xl p-8 hover:from-[#2a2a2a] hover:to-[#1a1a1a] transition-all duration-300 hover:scale-105 shadow-lg">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#00ff00] to-[#00cc00] rounded-xl flex items-center justify-center mb-6 sm:mb-8 shadow-lg mx-auto">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 font-sans">Smart Alerts</h3>
              <p className="text-gray-400 leading-relaxed font-medium text-base sm:text-lg">
                Get notified about high-risk areas and common violations to help you navigate safely and legally.
              </p>
            </div>
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-gray-700 rounded-xl p-8 hover:from-[#2a2a2a] hover:to-[#1a1a1a] transition-all duration-300 hover:scale-105 shadow-lg">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-white to-gray-200 rounded-xl flex items-center justify-center mb-6 sm:mb-8 shadow-lg mx-auto">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 font-sans">Instant Updates</h3>
              <p className="text-gray-400 leading-relaxed font-medium text-base sm:text-lg">
                Stay informed with the latest traffic rules, new violation zones, and real-time road condition updates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f]">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-8 sm:mb-12 font-sans">About Iwas Huli</h2>
          <p className="text-lg sm:text-xl text-gray-400 leading-relaxed mb-12 sm:mb-16 font-medium">
            We&apos;re committed to making Manila&apos;s roads safer for everyone. Our platform helps drivers stay informed about traffic violations and avoid unnecessary fines while promoting responsible driving.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <div className="text-left border border-gray-700 p-6 sm:p-8 bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] rounded-xl hover:from-[#1a1a1a] hover:to-[#0f0f0f] transition-all duration-300 hover:scale-105 shadow-lg">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 font-sans">Our Mission</h3>
              <p className="text-gray-400 font-medium text-base sm:text-lg">
                To reduce traffic violations and improve road safety through technology and community awareness.
              </p>
            </div>
            <div className="text-left border border-gray-700 p-6 sm:p-8 bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] rounded-xl hover:from-[#1a1a1a] hover:to-[#0f0f0f] transition-all duration-300 hover:scale-105 shadow-lg">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 font-sans">Our Vision</h3>
              <p className="text-gray-400 font-medium text-base sm:text-lg">
                A Manila where every driver is informed, every road is safe, and every journey is violation-free.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-700 bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a]">
        <div className="max-w-7xl mx-auto text-center">
          
      
          <div className="text-gray-500 text-sm sm:text-base font-medium">
            &copy; {new Date().getFullYear()} Iwas Huli. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
