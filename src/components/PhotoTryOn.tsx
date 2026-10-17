import { useCallback, useRef, useState } from 'react';
import { Upload, User, Shirt, Download, Loader2, Sparkles, AlertTriangle, RefreshCw, X, ShieldCheck } from 'lucide-react';

type Slot = 'person' | 'clothing';

interface ImageFile {
  base64: string; // raw base64, no data: prefix
  mime: string;
  previewUrl: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

function fileToImage(file: File): Promise<ImageFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const match = result.match(/^data:(.*?);base64,(.*)$/);
      if (!match) {
        reject(new Error('Could not read image'));
        return;
      }
      resolve({
        mime: match[1],
        base64: match[2],
        previewUrl: result,
      });
    };
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(file);
  });
}

export default function PhotoTryOn() {
  const [personImg, setPersonImg] = useState<ImageFile | null>(null);
  const [clothingImg, setClothingImg] = useState<ImageFile | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const personInputRef = useRef<HTMLInputElement>(null);
  const clothingInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (slot: Slot, file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload an image file.');
      setStatus('error');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Image must be under 8 MB.');
      setStatus('error');
      return;
    }
    try {
      const img = await fileToImage(file);
      if (slot === 'person') setPersonImg(img);
      else setClothingImg(img);
      // reset previous result when inputs change
      setResultUrl(null);
      setResultText(null);
      setStatus('idle');
      setErrorMsg('');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Could not load image');
      setStatus('error');
    }
  }, []);

  const onFileChange = (slot: Slot) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(slot, file);
  };

  const clearSlot = (slot: Slot) => {
    if (slot === 'person') setPersonImg(null);
    else setClothingImg(null);
    setResultUrl(null);
    setResultText(null);
    setStatus('idle');
  };

  const generate = useCallback(async () => {
    if (!personImg || !clothingImg) return;
    setStatus('loading');
    setErrorMsg('');
    setResultUrl(null);
    setResultText(null);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/gemini-tryon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          personImage: personImg.base64,
          personMime: personImg.mime,
          clothingImage: clothingImg.base64,
          clothingMime: clothingImg.mime,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      if (!data.image) {
        throw new Error('The AI did not return an image. Please try again.');
      }
      const url = `data:${data.mime || 'image/png'};base64,${data.image}`;
      setResultUrl(url);
      setResultText(data.text || null);
      setStatus('done');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong');
      setStatus('error');
    }
  }, [personImg, clothingImg, SUPABASE_URL, SUPABASE_ANON_KEY]);

  const download = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = 'tryfit-result.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const reset = () => {
    setPersonImg(null);
    setClothingImg(null);
    setResultUrl(null);
    setResultText(null);
    setStatus('idle');
    setErrorMsg('');
  };

  const canGenerate = personImg && clothingImg && status !== 'loading';

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Upload slots */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Person */}
        <UploadCard
          label="Your Photo"
          icon={<User className="w-5 h-5" />}
          accent="pink"
          image={personImg}
          onPick={() => personInputRef.current?.click()}
          onClear={() => clearSlot('person')}
        />
        <input
          ref={personInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange('person')}
        />

        {/* Clothing */}
        <UploadCard
          label="Clothing Item"
          icon={<Shirt className="w-5 h-5" />}
          accent="purple"
          image={clothingImg}
          onPick={() => clothingInputRef.current?.click()}
          onClear={() => clearSlot('clothing')}
        />
        <input
          ref={clothingInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange('clothing')}
        />
      </div>

      {/* Generate button */}
      <div className="flex flex-col items-center gap-3">
        <button
          className="btn-primary w-full sm:w-auto"
          disabled={!canGenerate}
          onClick={generate}
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Dressing you up…
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" /> Generate Try-On
            </>
          )}
        </button>
        {status === 'error' && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 max-w-md">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {!personImg && !clothingImg && (
          <p className="text-sm text-purple-400 text-center">
            Upload a photo of yourself and a photo of the clothing item you want to try on.
          </p>
        )}
        <p className="text-xs text-purple-300 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3 h-3" /> Photos are sent securely to AI for processing and are not stored.
        </p>
      </div>

      {/* Result */}
      {resultUrl && (
        <div className="animate-fade-in flex flex-col items-center gap-4">
          <div className="w-full max-w-md rounded-3xl overflow-hidden bg-white shadow-xl ring-4 ring-pink-200/60">
            <img src={resultUrl} alt="Try-on result" className="w-full h-auto" />
          </div>
          {resultText && (
            <p className="text-sm text-purple-500 max-w-md text-center italic">{resultText}</p>
          )}
          <div className="flex gap-3">
            <button className="btn-primary" onClick={download}>
              <Download className="w-5 h-5" /> Download
            </button>
            <button className="btn-ghost" onClick={reset}>
              <RefreshCw className="w-4 h-4" /> Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface UploadCardProps {
  label: string;
  icon: React.ReactNode;
  accent: 'pink' | 'purple';
  image: ImageFile | null;
  onPick: () => void;
  onClear: () => void;
}

function UploadCard({ label, icon, accent, image, onPick, onClear }: UploadCardProps) {
  const ring = accent === 'pink' ? 'hover:border-pink-400 hover:bg-pink-50' : 'hover:border-purple-400 hover:bg-purple-50';
  const badge = accent === 'pink' ? 'bg-pink-100 text-pink-600' : 'bg-purple-100 text-purple-600';

  if (image) {
    return (
      <div className="relative group rounded-2xl overflow-hidden bg-white shadow-md ring-1 ring-pink-100 aspect-square">
        <img src={image.previewUrl} alt={label} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition" />
        <div className="absolute top-2 left-2 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-purple-700 flex items-center gap-1.5">
          {icon} {label}
        </div>
        <button
          onClick={onClear}
          className="absolute top-2 right-2 rounded-full bg-black/40 p-1.5 text-white transition hover:bg-black/60 active:scale-90"
          aria-label={`Remove ${label}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onPick}
      className={[
        'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-pink-200 bg-white/50 aspect-square transition-all active:scale-95',
        ring,
      ].join(' ')}
    >
      <div className={`w-14 h-14 rounded-2xl ${badge} flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-1">
          {icon}
          <Upload className="w-4 h-4" />
        </div>
      </div>
      <div className="text-center">
        <p className="font-display font-semibold text-purple-800">{label}</p>
        <p className="text-xs text-purple-400 mt-0.5">Tap to upload</p>
      </div>
    </button>
  );
}
