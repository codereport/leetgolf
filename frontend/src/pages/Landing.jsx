import { getGitHubLoginUrl } from '../api';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-7xl font-bold text-white mb-4">
          Leet<span className="text-green-400">Golf</span>
        </h1>
        <p className="text-gray-400 text-xl mb-8">
          Six array languages. How will you rank?
        </p>
        
        <div className="flex items-center justify-center gap-6 mb-12">
          <img src="/logos/apl.png" alt="APL" className="h-12 w-12 object-contain" title="APL" />
          <img src="/logos/bqn.svg" alt="BQN" className="h-12 w-12 object-contain" title="BQN" />
          <img src="/logos/j_logo.png" alt="J" className="h-12 w-12 object-contain" title="J" />
          <img src="/logos/uiua.png" alt="Uiua" className="h-12 w-12 object-contain" title="Uiua" />
          <img src="/logos/kap.png" alt="Kap" className="h-12 w-12 object-contain" title="Kap" />
          <img src="/logos/tinyapl.svg" alt="TinyAPL" className="h-12 w-12 object-contain" title="TinyAPL" />
        </div>
        
        <a
          href={getGitHubLoginUrl()}
          className="inline-flex items-center gap-3 bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-colors border border-gray-600 hover:border-gray-500"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"/>
          </svg>
          Login with GitHub
        </a>
      </div>
      
      <div className="absolute bottom-8 text-center">
        <div className="text-gray-500 text-sm">Every character counts.</div>
        <div className="text-gray-600 text-xs mt-1">beta - under construction</div>
      </div>
    </div>
  );
}
