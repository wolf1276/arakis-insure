import React from "react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1C1A2F] font-sans px-4 py-4 md:px-6 md:py-6">
      {/* Header & Hero Section */}
      <div className="bg-[#EAEAF8] rounded-[2.5rem] p-6 md:p-12 mb-16 relative overflow-hidden">
        {/* Navigation */}
        <nav className="flex justify-between items-center mb-16 md:mb-24 relative z-10">
          <div className="flex items-center gap-2 font-semibold text-xl tracking-tight">
            <img src="/logo.png" alt="Surakhchain Logo" className="w-8 h-8 object-contain" />
            Surakhchain
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#" className="text-gray-900 font-semibold">
              USD bloom
            </a>
            <a href="#" className="hover:text-gray-900 transition-colors">
              Business
            </a>
            <a href="#" className="hover:text-gray-900 transition-colors">
              Treasury
            </a>
            <a href="#" className="hover:text-gray-900 transition-colors">
              Developers
            </a>
            <a href="#" className="hover:text-gray-900 transition-colors">
              Join us
            </a>
          </div>
          <button className="bg-[#1C1A2F] text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-black transition-colors">
            Launch BETA
          </button>
        </nav>

        {/* Hero Content */}
        <main className="text-center max-w-2xl mx-auto mb-12 relative z-10">
          <div className="flex justify-center mb-6">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[#1C1A2F]"
            >
              <path d="M12 2v20" />
              <path d="M2 12h20" />
              <path d="M4.93 4.93l14.14 14.14" />
              <path d="M4.93 19.07L19.07 4.93" />
            </svg>
          </div>
          <h1 className="text-5xl md:text-6xl font-medium tracking-tight text-[#1C1A2F] mb-6">
            Where Money Grows
          </h1>
          <p className="text-[#1C1A2F]/70 mb-8 max-w-md mx-auto text-lg leading-relaxed">
            A programmable, utility-driven stable token designed for native
            value accrual and seamless integration into DeFi.
          </p>
          <button className="bg-[#1C1A2F] text-white px-8 py-3.5 rounded-full font-medium hover:bg-black transition-colors">
            Try it now
          </button>
        </main>

        {/* Hero Decorative Image */}
        <div className="w-full h-64 md:h-[400px] rounded-[2rem] bg-gradient-to-br from-[#8C7BFF] to-[#4631A4] relative overflow-hidden shadow-xl">
          {/* Abstract background representation */}
          <div className="absolute inset-0 opacity-50 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          {/* Simulated 3D elements */}
          <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-[#B3ADFF] rounded-full blur-3xl opacity-60"></div>
          <div className="absolute right-12 bottom-0 w-48 h-48 bg-[#EAEAF8] rounded-full border-8 border-white/20 shadow-2xl backdrop-blur-sm flex items-center justify-center transform rotate-12">
            <div className="w-40 h-40 border-4 border-white/30 rounded-full flex items-center justify-center">
              <span className="text-white/50 text-4xl font-bold">$</span>
            </div>
          </div>
          <div className="absolute left-1/4 bottom-12 w-32 h-32 bg-[#EAEAF8] rounded-full border-4 border-white/20 shadow-2xl backdrop-blur-sm transform -rotate-12 flex items-center justify-center">
            <span className="text-white/40 text-2xl font-bold">$</span>
          </div>
        </div>
      </div>

      {/* About Section */}
      <section className="max-w-6xl mx-auto mb-12 px-4 md:px-0">
        <div className="flex flex-col md:flex-row justify-between mb-16 gap-8">
          <div className="md:w-1/3">
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-[#1C1A2F] mb-6">
              What is USD Bloom?
            </h2>
            <button className="bg-[#1C1A2F] text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-black transition-colors">
              Explore now
            </button>
          </div>
          <div className="md:w-1/2">
            <p className="text-xl md:text-2xl text-[#1C1A2F]/80 leading-relaxed font-light">
              USD Bloom is a yield-bearing stablecoin that helps your capital
              grow while staying pegged to the U.S. dollar.
            </p>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 md:col-span-2 bg-[#D1D6F0] rounded-[2rem] p-10 flex flex-col justify-between min-h-[360px] relative overflow-hidden">
            <h3 className="text-3xl font-medium text-[#1C1A2F] z-10">
              Capital that grows
            </h3>
            <p className="text-[#1C1A2F]/70 max-w-xs mt-auto z-10 font-medium">
              Earn passive income as your stablecoins are deployed into
              high-performing DeFi protocols.
            </p>

            {/* Decorative Element */}
            <div className="absolute right-0 bottom-0 w-1/2 h-full flex items-end justify-end p-8">
              <div className="w-32 h-32 bg-purple-500 rounded-full border-4 border-[#1C1A2F]/10 transform translate-x-8 translate-y-8 flex items-center justify-center shadow-lg relative">
                 <div className="absolute -top-10 -left-6 text-purple-600 transform -rotate-12">
                   <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                     <path d="M12 2C12 2 14.5 9.5 22 12C14.5 14.5 12 22 12 22C12 22 9.5 14.5 2 12C9.5 9.5 12 2C12 2Z" />
                   </svg>
                 </div>
              </div>
            </div>
          </div>

          <div className="col-span-1 bg-[#232039] rounded-[2rem] p-10 text-white flex flex-col justify-between min-h-[360px]">
            <h3 className="text-3xl font-medium leading-tight">
              Always liquid,
              <br />
              always stable
            </h3>
            <p className="text-white/60 font-medium mt-auto text-sm leading-relaxed">
              Stay fully dollar-pegged with instant access to your funds — no
              lockups or delays.
            </p>
          </div>

          <div className="col-span-1 md:col-span-1 bg-[#232039] rounded-[2rem] p-10 text-white flex flex-col justify-between min-h-[360px] md:hidden">
            {/* Visible only on mobile to match the grid on desktop layout vs mobile, wait we need 3 items. I'll put it outside hidden so it flows on desktop */}
            <h3 className="text-3xl font-medium leading-tight">
              100%
              <br />
              hands-free
            </h3>
            <p className="text-white/60 font-medium mt-auto text-sm leading-relaxed">
              No need to manage strategies manually. USD Bloom works in the
              background for you.
            </p>
          </div>
          
          <div className="hidden md:flex col-span-1 bg-[#232039] rounded-[2rem] p-10 text-white flex-col justify-between min-h-[360px]">
            <h3 className="text-3xl font-medium leading-tight">
              100%
              <br />
              hands-free
            </h3>
            <p className="text-white/60 font-medium mt-auto text-sm leading-relaxed">
              No need to manage strategies manually. USD Bloom works in the
              background for you.
            </p>
          </div>
        </div>
      </section>

      {/* Partners Logos */}
      <section className="max-w-6xl mx-auto py-12 mb-16 px-4 md:px-0">
        <div className="border-t border-b border-gray-200/60 py-8 flex flex-col lg:flex-row items-center justify-between gap-8">
          <p className="text-xs text-gray-400 max-w-[150px] font-medium leading-relaxed">
            Backed by the best companies and visionary angels.
          </p>
          <div className="flex gap-6 md:gap-10 items-center justify-center flex-wrap opacity-50 grayscale text-sm font-bold tracking-wider">
            <span>Fundamental<br/>Labs</span>
            <span className="flex items-center gap-1"><span className="text-xl">K</span>KUCOIN</span>
            <span>III NGC</span>
            <span>NxGen</span>
            <span className="flex items-center gap-1"><span className="text-xl">M</span>Matter Labs</span>
            <span>DEXTOOLS</span>
            <span>NGRAVE</span>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="max-w-6xl mx-auto mb-24 px-4 md:px-0 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
        <div className="pt-8">
          <p className="text-gray-400 text-xs font-semibold mb-4 uppercase tracking-wider">
            USD bloom in Action
          </p>
          <h2 className="text-5xl md:text-6xl font-medium tracking-tight text-[#1C1A2F] mb-6">
            Use cases
          </h2>
          <p className="text-[#1C1A2F]/70 max-w-sm leading-relaxed">
            USD bloom offers a variety of use cases for developers, businesses
            and treasuries seeking secure and profitable stablecoin
            integrations.
          </p>
        </div>

        <div className="bg-white rounded-[2rem] p-8 md:p-12 flex flex-col min-h-[400px]">
          <h3 className="text-3xl font-medium text-[#1C1A2F] mb-4">
            Business
          </h3>
          <p className="text-[#1C1A2F]/70 mb-8 leading-relaxed max-w-sm">
            Boost user engagement by offering USD bloom, a secure fiat-backed
            stablecoin with high yields, allowing your customers to earn
            effortlessly on your platform.
          </p>
          <a
            href="#"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#1C1A2F] hover:underline"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
            Learn more
          </a>
          
          {/* Simulated 3D Building Element */}
          <div className="mt-12 flex justify-center h-48 relative">
             <div className="absolute bottom-0 w-3/4 h-32 bg-[#E1E4F8] rounded-t-xl border-t border-x border-[#B3BCE3] relative flex flex-col items-center justify-end p-4">
                {/* Roof */}
                <div className="w-[110%] h-8 bg-[#C8CFF1] absolute -top-8 rounded-t-lg"></div>
                {/* Pillars */}
                <div className="flex justify-between w-full px-4 mt-4 h-24">
                  <div className="w-4 h-full bg-[#B3BCE3] rounded-t"></div>
                  <div className="w-4 h-full bg-[#B3BCE3] rounded-t"></div>
                  <div className="w-4 h-full bg-[#B3BCE3] rounded-t"></div>
                  <div className="w-4 h-full bg-[#B3BCE3] rounded-t"></div>
                </div>
                {/* Base */}
                <div className="w-[120%] h-6 bg-[#C8CFF1] absolute -bottom-6 rounded-b-sm border-b-4 border-[#A3AED7]"></div>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}
