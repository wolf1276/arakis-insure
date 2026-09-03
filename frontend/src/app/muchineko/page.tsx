import React from 'react';

const BackLayer = () => (
  <div className="w-full h-full relative flex items-end flex-shrink-0">
    <div className="w-[15%] h-[40%] bg-[#BEB8AD] ml-[10%]"></div>
    <div className="w-[10%] h-[60%] bg-[#BEB8AD] ml-[5%] flex flex-col justify-end">
       <div className="w-full h-4 bg-[#E6E1D7] mb-2 opacity-30"></div>
       <div className="w-full h-4 bg-[#E6E1D7] mb-2 opacity-30"></div>
    </div>
    <div className="w-[20%] h-[75%] bg-[#BEB8AD] ml-[2%] relative">
       <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#BEB8AD] -mt-4"></div>
    </div>
    <div className="w-[15%] h-[50%] bg-[#BEB8AD] ml-[15%]"></div>
  </div>
);

const MidLayer = () => (
  <div className="w-full h-full relative flex items-end flex-shrink-0">
    <div className="w-[25%] h-[30%] bg-[#777777] relative flex flex-col items-center">
       <div className="grid grid-cols-4 gap-1 mt-4 w-3/4 opacity-50">
          {[...Array(12)].map((_, i) => <div key={`m1-${i}`} className="w-full aspect-square bg-[#E6E1D7]"></div>)}
       </div>
    </div>
    <div className="w-[10%] h-[40%] bg-[#777777] ml-2"></div>
    <div className="w-[15%] h-[60%] bg-[#777777] ml-[20%] relative flex justify-center">
       <div className="absolute top-10 -left-6 bg-[#E6E1D7] border-2 border-[#333333] px-2 py-6 text-sm font-bold tracking-widest" style={{ writingMode: 'vertical-rl' }}>
          むちねこ
       </div>
    </div>
    <div className="w-[18%] h-[80%] bg-[#777777] ml-[5%]">
       <div className="grid grid-cols-3 gap-2 mt-8 mx-auto w-2/3 opacity-30">
          {[...Array(15)].map((_, i) => <div key={`m2-${i}`} className="w-full aspect-square bg-[#111111]"></div>)}
       </div>
    </div>
  </div>
);

const FrontLayer = () => (
  <div className="w-full h-full relative flex items-end flex-shrink-0">
    <div className="w-[45%] h-[20%] bg-[#333333] relative">
       <div className="absolute -top-4 left-4 w-3/4 h-4 border-t-2 border-x-2 border-[#111111] flex justify-around items-end">
          <div className="w-0.5 h-full bg-[#111111]"></div>
          <div className="w-0.5 h-full bg-[#111111]"></div>
          <div className="w-0.5 h-full bg-[#111111]"></div>
       </div>
       <div className="grid grid-cols-5 gap-2 mt-4 ml-8 w-1/2">
          {[...Array(10)].map((_, i) => <div key={`f1-${i}`} className="w-full h-2 bg-[#777777]"></div>)}
       </div>
    </div>
    <div className="w-[55%] h-[15%] bg-[#111111]"></div>
  </div>
);

export default function MuchinekoPage() {
  return (
    <div 
      className="min-h-screen p-8 md:p-12 lg:p-20 font-sans overflow-hidden" 
      style={{ backgroundColor: '#F6F4EE', color: '#111111' }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes cat-jump {
          0%, 100% { transform: translateY(0) rotate(-12deg); }
          50% { transform: translateY(-30px) rotate(-5deg); }
        }
        @keyframes fly-item {
          0% { transform: translateX(200vw); }
          100% { transform: translateX(-50vw); }
        }
        .animate-scroll-slow { animation: scroll-left 30s linear infinite; }
        .animate-scroll-mid { animation: scroll-left 20s linear infinite; }
        .animate-scroll-fast { animation: scroll-left 10s linear infinite; }
        .animate-cat { animation: cat-jump 1.2s ease-in-out infinite; }
        .animate-kibble-1 { animation: fly-item 5s linear infinite; }
        .animate-kibble-2 { animation: fly-item 5s linear infinite 0.5s; }
        .animate-kibble-3 { animation: fly-item 5s linear infinite 1s; }
        .animate-can { animation: fly-item 12s linear infinite 3s; }
      `}} />

      <div className="max-w-[1200px] mx-auto relative z-10">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start mb-16 gap-8">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-[0.15em] mb-4">むちねこ</h1>
            <p className="text-xs md:text-sm tracking-[0.4em] text-[#777777] mb-8 font-medium">
              CONCEPT DESIGN
            </p>
            <p className="text-lg md:text-xl font-medium tracking-wide">
              食べたい。でも、飛べなくなる。
            </p>
            <div className="w-12 h-[2px] bg-[#111111] mt-6"></div>
          </div>
          
          <div className="text-sm md:text-base leading-loose font-medium">
            <p className="tracking-[0.3em] text-[#777777] mb-4 text-xs">CONCEPT</p>
            <ul className="space-y-2">
              <li>・食べるほど、重くなる。</li>
              <li>・走る、跳ぶ、落ちる。</li>
              <li>・むちむちでも、ゴールをめざす。</li>
            </ul>
          </div>
        </header>

        {/* Game Screen Mockup */}
        <div className="w-full bg-[#111111] rounded-[3rem] p-3 md:p-4 shadow-2xl mb-20 relative">
          {/* Bezel inner */}
          <div className="w-full aspect-[21/9] bg-[#E6E1D7] rounded-[2.5rem] overflow-hidden relative shadow-inner">
            
            {/* UI Top Left */}
            <div className="absolute top-6 left-8 md:top-8 md:left-12 z-40">
              <p className="text-[10px] md:text-xs font-bold tracking-widest mb-2 text-[#333333]">WEIGHT</p>
              <div className="w-24 md:w-40 h-2 md:h-3 rounded-full border border-[#333333] overflow-hidden p-[1px] bg-transparent relative">
                <div className="w-[42%] h-full bg-[#111111] rounded-full transition-all duration-1000 ease-in-out hover:w-[80%]"></div>
              </div>
              <p className="text-[10px] md:text-xs font-bold mt-2 text-[#333333]">42%</p>
            </div>

            {/* UI Top Right */}
            <div className="absolute top-6 right-8 md:top-8 md:right-12 z-40 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-[#777777]"></div>
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-[#777777]"></div>
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-[#777777]"></div>
                </div>
                <span className="text-xs font-bold tracking-widest text-[#333333]">&times; 18</span>
              </div>
              <div className="flex gap-1 cursor-pointer hover:opacity-70 transition-opacity">
                <div className="w-1 md:w-1.5 h-4 md:h-5 bg-[#333333]"></div>
                <div className="w-1 md:w-1.5 h-4 md:h-5 bg-[#333333]"></div>
              </div>
            </div>

            {/* Background Buildings (Parallax layers) */}
            <div className="absolute bottom-0 left-0 w-[200%] h-full z-0 flex animate-scroll-slow">
              <BackLayer />
              <BackLayer />
            </div>

            {/* Middle Layer Buildings */}
            <div className="absolute bottom-0 left-0 w-[200%] h-full z-10 flex animate-scroll-mid">
              <MidLayer />
              <MidLayer />
            </div>

            {/* Foreground Buildings */}
            <div className="absolute bottom-0 left-0 w-[200%] h-full z-20 flex animate-scroll-fast">
              <FrontLayer />
              <FrontLayer />
            </div>

            {/* Cat and Items */}
            <div className="absolute inset-0 z-30">
               {/* Jumping Cat */}
               <div className="absolute top-[40%] left-[20%] md:left-[30%] flex items-center justify-center animate-cat">
                  <div className="w-24 h-16 bg-[#F6F4EE] rounded-[40%] border-4 border-[#111111] relative shadow-lg">
                     {/* Tail */}
                     <div className="absolute -left-4 top-4 w-6 h-3 bg-[#111111] rounded-full transform -rotate-45 origin-right animate-pulse"></div>
                     {/* Face/Ear area */}
                     <div className="absolute right-0 top-0 w-8 h-full bg-[#111111] rounded-r-[40%]"></div>
                     <div className="absolute -right-1 -top-2 w-4 h-4 bg-[#111111] transform rotate-45 border-r border-[#111111]"></div>
                     {/* Eye */}
                     <div className="absolute right-3 top-4 w-1.5 h-1.5 bg-[#F6F4EE] rounded-full"></div>
                     {/* Legs */}
                     <div className="absolute -bottom-2 left-4 w-3 h-4 bg-[#111111] rounded-full transform rotate-45"></div>
                     <div className="absolute -bottom-2 right-4 w-3 h-4 bg-[#111111] rounded-full transform -rotate-12"></div>
                  </div>
                  {/* Jump lines (hidden during smooth jump animation, or pulse opacity) */}
                  <div className="absolute -left-10 bottom-0 flex flex-col gap-2 opacity-50">
                     <div className="w-4 h-1 bg-[#777777] rounded-full transform -rotate-12"></div>
                     <div className="w-6 h-1 bg-[#777777] rounded-full transform -rotate-12"></div>
                  </div>
               </div>

               {/* Flying Kibbles */}
               <div className="absolute top-[45%] w-4 h-4 bg-[#777777] rounded-[40%] border-2 border-[#111111] animate-kibble-1 shadow-md"></div>
               <div className="absolute top-[38%] w-4 h-4 bg-[#777777] rounded-[40%] border-2 border-[#111111] animate-kibble-2 shadow-md"></div>
               <div className="absolute top-[52%] w-4 h-4 bg-[#777777] rounded-[40%] border-2 border-[#111111] animate-kibble-3 shadow-md"></div>

               {/* Cat Food Can */}
               <div className="absolute bottom-[20%] w-12 h-10 bg-[#BEB8AD] border-4 border-[#111111] rounded-md relative flex items-center justify-center animate-can shadow-xl">
                  <div className="absolute -top-2 left-0 w-full h-2 border-4 border-b-0 border-[#111111] rounded-t-md"></div>
                  <div className="w-4 h-4 border-2 border-[#111111] rounded-full bg-[#F6F4EE] flex items-center justify-center">
                     <div className="w-1.5 h-1.5 bg-[#111111] rounded-full"></div>
                  </div>
               </div>
            </div>

          </div>
        </div>

        {/* Specifications Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 border-t border-[#BEB8AD] pt-12">
          
          {/* SYSTEM */}
          <div className="col-span-1 md:col-span-4 border-r border-[#BEB8AD] pr-8">
            <h3 className="text-xs tracking-[0.2em] font-bold text-[#777777] mb-8">SYSTEM</h3>
            <div className="flex justify-between items-end gap-2 text-center text-xs font-bold">
               <div className="flex flex-col items-center gap-4 group cursor-pointer">
                 <div className="w-10 h-10 bg-[#111111] rounded-full relative group-hover:scale-110 transition-transform">
                    <div className="absolute -left-3 top-1/2 w-4 h-0.5 bg-[#777777]"></div>
                    <div className="absolute -left-4 top-1/3 w-3 h-0.5 bg-[#777777]"></div>
                 </div>
                 <span>走る</span>
               </div>
               <div className="flex flex-col items-center gap-4 group cursor-pointer">
                 <div className="w-10 h-10 bg-[#111111] rounded-full transform -translate-y-4 relative group-hover:-translate-y-6 transition-transform"></div>
                 <span>跳ぶ</span>
               </div>
               <div className="flex flex-col items-center gap-4 group cursor-pointer">
                 <div className="w-10 h-10 bg-[#111111] rounded-[40%] translate-y-2 group-hover:translate-y-4 transition-transform"></div>
                 <span>落ちる</span>
               </div>
            </div>
          </div>

          {/* CAT STATE */}
          <div className="col-span-1 md:col-span-4 border-r border-[#BEB8AD] pr-8">
            <h3 className="text-xs tracking-[0.2em] font-bold text-[#777777] mb-8">CAT STATE</h3>
            <div className="flex justify-between items-end text-center text-xs font-bold">
               <div className="flex flex-col items-center gap-4 group cursor-pointer">
                 <div className="w-8 h-10 bg-[#F6F4EE] border-2 border-[#111111] rounded-t-full rounded-b-md relative group-hover:scale-105 transition-transform">
                    <div className="absolute right-0 top-0 w-3 h-6 bg-[#111111] rounded-tr-full"></div>
                 </div>
                 <span>軽い</span>
               </div>
               <span className="text-lg pb-6">&rarr;</span>
               <div className="flex flex-col items-center gap-4 group cursor-pointer">
                 <div className="w-12 h-12 bg-[#F6F4EE] border-2 border-[#111111] rounded-t-full rounded-b-xl relative group-hover:scale-105 transition-transform">
                    <div className="absolute right-0 top-0 w-5 h-8 bg-[#111111] rounded-tr-full"></div>
                 </div>
                 <span>ふつう</span>
               </div>
               <span className="text-lg pb-6">&rarr;</span>
               <div className="flex flex-col items-center gap-4 group cursor-pointer">
                 <div className="w-16 h-14 bg-[#F6F4EE] border-2 border-[#111111] rounded-t-full rounded-b-2xl relative group-hover:scale-105 transition-transform">
                    <div className="absolute right-0 top-0 w-7 h-10 bg-[#111111] rounded-tr-full"></div>
                 </div>
                 <span>重い</span>
               </div>
            </div>
          </div>

          {/* ITEMS */}
          <div className="col-span-1 md:col-span-4">
            <h3 className="text-xs tracking-[0.2em] font-bold text-[#777777] mb-8">ITEMS</h3>
            <div className="flex justify-around items-end text-center text-xs font-bold">
               <div className="flex flex-col items-center gap-4 group cursor-pointer">
                 <div className="grid grid-cols-2 gap-1 mb-2 group-hover:-translate-y-2 transition-transform">
                    <div className="w-4 h-4 bg-[#777777] rounded-full border-2 border-[#111111]"></div>
                    <div className="w-4 h-4 bg-[#777777] rounded-full border-2 border-[#111111]"></div>
                    <div className="w-4 h-4 bg-[#777777] rounded-full border-2 border-[#111111] col-span-2 mx-auto"></div>
                 </div>
                 <span>カリカリ</span>
               </div>
               <div className="flex flex-col items-center gap-4 group cursor-pointer">
                 <div className="w-14 h-10 bg-[#BEB8AD] border-2 border-[#111111] rounded-md relative flex items-center justify-center group-hover:-translate-y-2 transition-transform">
                    <div className="absolute -top-2 left-0 w-full h-2 border-2 border-b-0 border-[#111111] rounded-t-md"></div>
                    <div className="w-4 h-4 border-2 border-[#111111] rounded-full bg-[#F6F4EE]"></div>
                 </div>
                 <span>ねこ缶</span>
               </div>
            </div>
          </div>

        </div>

        {/* Footer Settings */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 border-t border-[#BEB8AD] pt-12 mt-12 mb-12">
           
           {/* WEIGHT GAUGE */}
           <div className="col-span-1 md:col-span-5 border-r border-[#BEB8AD] pr-8">
             <h3 className="text-xs tracking-[0.2em] font-bold text-[#777777] mb-6">WEIGHT GAUGE</h3>
             <div className="flex justify-between items-center text-xs font-bold">
                <div className="flex flex-col items-center gap-2 w-1/3 hover:-translate-y-1 transition-transform cursor-pointer">
                   <div className="w-full h-3 border border-[#333333] rounded-full"></div>
                   <span>0%</span>
                </div>
                <span>&rarr;</span>
                <div className="flex flex-col items-center gap-2 w-1/3 hover:-translate-y-1 transition-transform cursor-pointer">
                   <div className="w-full h-3 border border-[#333333] rounded-full p-[1px]">
                     <div className="w-1/2 h-full bg-[#111111] rounded-full"></div>
                   </div>
                   <span>50%</span>
                </div>
                <span>&rarr;</span>
                <div className="flex flex-col items-center gap-2 w-1/3 hover:-translate-y-1 transition-transform cursor-pointer">
                   <div className="w-full h-3 border border-[#333333] rounded-full p-[1px]">
                     <div className="w-full h-full bg-[#111111] rounded-full"></div>
                   </div>
                   <span>100%</span>
                </div>
             </div>
           </div>

           {/* KEYWORDS / COLOR PALETTE */}
           <div className="col-span-1 md:col-span-7">
             <div className="mb-8">
                <h3 className="text-xs tracking-[0.2em] font-bold text-[#777777] mb-4">KEYWORDS</h3>
                <div className="flex flex-wrap gap-2 text-xs font-bold text-[#333333]">
                   <span className="px-4 py-1.5 border border-[#777777] rounded-full hover:bg-[#333333] hover:text-white transition-colors cursor-pointer">肥満</span>
                   <span className="px-4 py-1.5 border border-[#777777] rounded-full hover:bg-[#333333] hover:text-white transition-colors cursor-pointer">ジャンプ</span>
                   <span className="px-4 py-1.5 border border-[#777777] rounded-full hover:bg-[#333333] hover:text-white transition-colors cursor-pointer">横スクロール</span>
                   <span className="px-4 py-1.5 border border-[#777777] rounded-full hover:bg-[#333333] hover:text-white transition-colors cursor-pointer">シンプル</span>
                   <span className="px-4 py-1.5 border border-[#777777] rounded-full hover:bg-[#333333] hover:text-white transition-colors cursor-pointer">Bauhaus</span>
                </div>
             </div>
             
             <div>
                <h3 className="text-xs tracking-[0.2em] font-bold text-[#777777] mb-4">COLOR PALETTE</h3>
                <div className="flex gap-4 items-center">
                   {[
                     { hex: '#111111', label: '111111' },
                     { hex: '#333333', label: '333333' },
                     { hex: '#777777', label: '777777' },
                     { hex: '#BEB8AD', label: 'BEB8AD' },
                     { hex: '#E6E1D7', label: 'E6E1D7' },
                     { hex: '#F6F4EE', label: 'F6F4EE' }
                   ].map(c => (
                     <div key={c.hex} className="flex flex-col items-center gap-2 group cursor-pointer">
                       <div className="w-8 h-8 rounded-full border border-black/10 group-hover:scale-125 transition-transform shadow-sm" style={{ backgroundColor: c.hex }}></div>
                       <span className="text-[10px] text-[#777777] tracking-wider group-hover:text-[#111111] transition-colors">{c.label}</span>
                     </div>
                   ))}
                </div>
             </div>
           </div>

        </div>

      </div>
    </div>
  );
}
