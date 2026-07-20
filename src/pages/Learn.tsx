import { useState } from 'react';

const VIDEOS = [
  {
    id: 'vu9bTTACWgs',
    title: 'Tele Sales Technique – Cold Calling Technique, Sales Tips & Tricks (Tamil)',
    description: 'Covers telesales and cold calling technique with sales tips and tricks in Tamil.',
    language: 'Tamil',
  },
  {
    id: 'HLWwmijL5co',
    title: 'Tele Call | Sales Training Tamil | Sales Tips Technique – Ganesh Gandhi',
    description: 'A Tamil sales training video covering tele-call technique and marketing strategy.',
    language: 'Tamil',
  },
  {
    id: 'dS4AzSrpYqE',
    title: 'How to Prepare for a Sales Call in Tamil | How to Sell Anything to Anyone',
    description: 'Explains how to prepare for a sales call in Tamil, part of a "How to Sell Anything to Anyone" series.',
    language: 'Tamil',
  },
  {
    id: 'kc6tv4GKspA',
    title: '10 Cold Calling Tips: Go From Beginner to Master',
    description: 'Gives 10 beginner-friendly cold calling tips aimed at improving overall sales results.',
    language: 'English',
  },
  {
    id: 'RLMbSNStnLc',
    title: 'How To Cold Call – Best Script and Tips for Cold Calling',
    description: 'A practical breakdown of a cold-call script and structure with real examples.',
    language: 'English',
  },
  {
    id: 'aW8jAYnvqyI',
    title: '35 Minutes of Expert Cold Calling Tips (B2B & Software Sales)',
    description: 'A deep dive into B2B and software sales cold calling with expert advice.',
    language: 'English',
  },
  {
    id: 'NdIPxKIPVc0',
    title: 'The BEST Cold Call Opening Lines 2025',
    description: '8 sales trainers and practitioners share what they think is the best way to open a cold call.',
    language: 'English',
  },
  {
    id: 'gtKZ7fP1HZM',
    title: 'Cold Calling Masterclass: 52 Minutes of Proven Cold Calling Tips',
    description: 'A masterclass covering proven cold calling tips for B2B sales professionals.',
    language: 'English',
  },
];

export default function Learn() {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Learn Cold Calling</h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">Master the art of cold calling with these curated training videos in Tamil and English.</p>
      </div>

      {activeVideo && (
        <div className="mb-12 bg-gray-900 rounded-xl overflow-hidden shadow-2xl relative" style={{ paddingBottom: '56.25%' }}>
          <iframe 
            className="absolute top-0 left-0 w-full h-full"
            src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`} 
            title="YouTube video player" 
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            allowFullScreen
          ></iframe>
          <button 
            onClick={() => setActiveVideo(null)}
            className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg z-10 transition-colors"
            title="Close Video"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      )}

      {['Tamil', 'English'].map(lang => (
        <div key={lang} className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center">
            <span className={`w-3 h-3 rounded-full mr-3 ${lang === 'Tamil' ? 'bg-orange-500' : 'bg-blue-500'}`}></span>
            {lang} Training Videos
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {VIDEOS.filter(v => v.language === lang).map(video => (
              <div 
                key={video.id} 
                className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer border border-gray-100 dark:border-gray-700 flex flex-col"
                onClick={() => setActiveVideo(video.id)}
              >
                <div className="relative group aspect-video">
                  <img 
                    src={`https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`} 
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback if maxresdefault doesn't exist
                      (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-red-600 text-white rounded-full p-3 shadow-lg">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2 mb-2">{video.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mt-auto">{video.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
