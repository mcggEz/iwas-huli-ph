"use client";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-red-500 rounded-none"></div>
            <span className="text-white font-bold text-lg sm:text-xl font-mono">IWAS HULI</span>
          </div>
          <div className="hidden md:flex space-x-6 md:space-x-8">
            <a href="#features" className="text-[#ffffff] hover:text-[#ff4444] transition-colors font-mono text-base md:text-lg">FEATURES</a>
            <a href="#about" className="text-[#ffffff] hover:text-[#ff4444] transition-colors font-mono text-base md:text-lg">ABOUT</a>
            <a href="#contact" className="text-[#ffffff] hover:text-[#ff4444] transition-colors font-mono text-base md:text-lg">CONTACT</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-2 sm:px-6 pt-20 sm:pt-0">
        <div className="absolute inset-0 bg-[#1a1a1a]"></div>
        <div className="relative z-10 text-center max-w-2xl sm:max-w-4xl mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight font-mono">
              IWAS HULI
              <span className="block text-[#ff4444] text-2xl sm:text-4xl">PARA DI KULONG</span>
            </h1>
            <p className="text-base sm:text-xl md:text-2xl text-[#888888] mb-6 sm:mb-12 max-w-3xl mx-auto leading-relaxed font-mono">
              Navigate Manila&apos;s roads with confidence. Get real-time alerts about traffic violation hotspots and stay informed to avoid fines.
            </p>
            <p className="text-base sm:text-lg md:text-xl text-[#ff4444] mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed font-mono font-bold">
              &quot;See where other drivers went wrong&quot;
            </p>
          </div>
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-10 sm:mb-16 w-full">
            <a 
              href="/dashboard" 
              className="group relative w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-[#1a1a1a] border border-[#ffffff] text-[#ffffff] font-semibold rounded-none transition-all duration-300 transform hover:bg-[#ffffff] hover:text-[#1a1a1a] font-mono text-base sm:text-lg"
          >
              <span className="relative z-10">SIGN IN WITH GOOGLE</span>
          </a>
          <a
              href="/dashboard" 
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border border-[#ffffff] text-[#ffffff] font-semibold rounded-none hover:bg-[#ffffff] hover:text-[#1a1a1a] transition-all duration-300 transform font-mono text-base sm:text-lg"
            >
              CONTINUE AS ANONYMOUS
            </a>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto w-full">
            <div className="text-center border border-[#ffffff] p-4 sm:p-6 bg-[#1a1a1a]">
              <div className="text-2xl sm:text-3xl font-bold text-[#ff4444] mb-1 sm:mb-2 font-mono">500+</div>
              <div className="text-[#888888] font-mono text-sm sm:text-base">VIOLATION ZONES</div>
            </div>
            <div className="text-center border border-[#ffffff] p-4 sm:p-6 bg-[#1a1a1a]">
              <div className="text-2xl sm:text-3xl font-bold text-[#00ff00] mb-1 sm:mb-2 font-mono">10K+</div>
              <div className="text-[#888888] font-mono text-sm sm:text-base">ACTIVE USERS</div>
            </div>
            <div className="text-center border border-[#ffffff] p-4 sm:p-6 bg-[#1a1a1a]">
              <div className="text-2xl sm:text-3xl font-bold text-[#ffffff] mb-1 sm:mb-2 font-mono">95%</div>
              <div className="text-[#888888] font-mono text-sm sm:text-base">SUCCESS RATE</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-20 px-2 sm:px-6 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6 font-mono">WHY CHOOSE IWAS HULI?</h2>
            <p className="text-base sm:text-xl text-[#888888] max-w-3xl mx-auto font-mono">
              Stay ahead of traffic violations with our comprehensive mapping system and real-time alerts.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
            <div className="bg-[#1a1a1a] border border-[#ffffff] rounded-none p-6 hover:bg-[#2a2a2a] transition-all duration-300">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#ff4444] rounded-none flex items-center justify-center mb-4 sm:mb-6 border border-[#ffffff] mx-auto">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-white mb-2 sm:mb-4 font-mono">REAL-TIME MAPPING</h3>
              <p className="text-[#888888] leading-relaxed font-mono text-sm sm:text-base">
                Interactive maps showing violation hotspots across Manila with detailed information about each zone.
              </p>
            </div>
            <div className="bg-[#1a1a1a] border border-[#ffffff] rounded-none p-6 hover:bg-[#2a2a2a] transition-all duration-300">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#00ff00] rounded-none flex items-center justify-center mb-4 sm:mb-6 border border-[#ffffff] mx-auto">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-white mb-2 sm:mb-4 font-mono">SMART ALERTS</h3>
              <p className="text-[#888888] leading-relaxed font-mono text-sm sm:text-base">
                Get notified about high-risk areas and common violations to help you navigate safely and legally.
              </p>
            </div>
            <div className="bg-[#1a1a1a] border border-[#ffffff] rounded-none p-6 hover:bg-[#2a2a2a] transition-all duration-300">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#ffffff] rounded-none flex items-center justify-center mb-4 sm:mb-6 border border-[#ffffff] mx-auto">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-white mb-2 sm:mb-4 font-mono">INSTANT UPDATES</h3>
              <p className="text-[#888888] leading-relaxed font-mono text-sm sm:text-base">
                Stay informed with the latest traffic rules, new violation zones, and real-time road condition updates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-12 sm:py-20 px-2 sm:px-6 bg-[#1a1a1a]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-6 sm:mb-8 font-mono">ABOUT IWAS HULI</h2>
          <p className="text-base sm:text-xl text-[#888888] leading-relaxed mb-8 sm:mb-12 font-mono">
            We&apos;re committed to making Manila&apos;s roads safer for everyone. Our platform helps drivers stay informed about traffic violations and avoid unnecessary fines while promoting responsible driving.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
            <div className="text-left border border-[#ffffff] p-4 sm:p-8 bg-[#0a0a0a]">
              <h3 className="text-lg sm:text-2xl font-bold text-white mb-2 sm:mb-4 font-mono">OUR MISSION</h3>
              <p className="text-[#888888] font-mono text-sm sm:text-base">
                To reduce traffic violations and improve road safety through technology and community awareness.
              </p>
            </div>
            <div className="text-left border border-[#ffffff] p-4 sm:p-8 bg-[#0a0a0a]">
              <h3 className="text-lg sm:text-2xl font-bold text-white mb-2 sm:mb-4 font-mono">OUR VISION</h3>
              <p className="text-[#888888] font-mono text-sm sm:text-base">
                A Manila where every driver is informed, every road is safe, and every journey is violation-free.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-8 sm:py-12 px-2 sm:px-6 border-t border-[#ffffff] bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex justify-center items-center space-x-2 mb-4 sm:mb-6">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-[#ff4444] rounded-none"></div>
            <span className="text-white font-bold text-base sm:text-lg font-mono">IWAS HULI</span>
          </div>
          <p className="text-[#888888] mb-4 sm:mb-6 font-mono text-sm sm:text-base">
            Making Manila&apos;s roads safer, one driver at a time.
          </p>
          <div className="text-[#666666] text-xs sm:text-sm font-mono">
            &copy; {new Date().getFullYear()} IWAS HULI. ALL RIGHTS RESERVED.
          </div>
        </div>
      </footer>
    </div>
  );
}
