import { useState } from 'react';
import { Sparkles, Scan, ShoppingBag, Camera } from 'lucide-react';
import VirtualMirror from '@/components/VirtualMirror';
import PhotoTryOn from '@/components/PhotoTryOn';

type Tab = 'mirror' | 'photo';

function App() {
  const [tab, setTab] = useState<Tab>('mirror');

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-purple-50">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-pink-100/80 bg-white/70 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shadow-md shadow-pink-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <h1 className="font-display font-bold text-purple-900 text-lg">TryFit Mirror</h1>
              <p className="text-[11px] text-purple-400 -mt-0.5">See it before you buy it</p>
            </div>
          </div>
        </div>
        {/* Tab bar */}
        <div className="mx-auto max-w-5xl px-4 pb-2">
          <div className="flex gap-2 rounded-full bg-pink-100/60 p-1 w-full max-w-sm mx-auto">
            <TabButton
              active={tab === 'mirror'}
              onClick={() => setTab('mirror')}
              icon={<Camera className="w-4 h-4" />}
              label="Live Mirror"
            />
            <TabButton
              active={tab === 'photo'}
              onClick={() => setTab('photo')}
              icon={<ShoppingBag className="w-4 h-4" />}
              label="Photo Try-On"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        {tab === 'mirror' ? (
          <>
            <section className="text-center mb-8 animate-slide-up">
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600">
                Live Virtual Mirror
              </h2>
              <p className="mt-2 text-purple-500 max-w-xl mx-auto">
                Turn on your camera and try on sunglasses, earrings, and necklaces in real time.
                Move your head — the accessories follow you.
              </p>
            </section>
            <section className="animate-slide-up">
              <VirtualMirror />
            </section>
          </>
        ) : (
          <>
            <section className="text-center mb-8 animate-slide-up">
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600">
                Photo Try-On
              </h2>
              <p className="mt-2 text-purple-500 max-w-xl mx-auto">
                Upload a photo of yourself and a clothing item. AI will show you how it looks on you.
              </p>
            </section>
            <section className="animate-slide-up">
              <PhotoTryOn />
            </section>
          </>
        )}
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-purple-400">
        TryFit Mirror — your virtual fitting room.
      </footer>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex-1 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 font-display font-medium text-sm transition-all',
        active
          ? 'bg-white text-purple-700 shadow-md'
          : 'text-purple-400 hover:text-purple-600',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  );
}

export default App;
