import { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Upload, Image as ImageIcon, Loader2, Key, Sparkles, AlertCircle, Download, Cpu } from 'lucide-react';

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '');
  const [prompt, setPrompt] = useState('');
  const model = 'gemini-2.5-flash-image';
  const [sourceImage, setSourceImage] = useState<{ data: string; mimeType: string; url: string } | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const mimeType = file.type;
      const data = base64String.split(',')[1];

      setSourceImage({
        data,
        mimeType,
        url: base64String
      });
      setResultImage(null);
    };
    reader.readAsDataURL(file);
  };

  const generateImage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!apiKey) {
      setError('Please enter a Gemini API Key.');
      return;
    }
    if (!sourceImage) {
      setError('Please select a source image.');
      return;
    }
    if (!prompt) {
      setError('Please enter a prompt.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          apiVersion: 'v1alpha'
        }
      });

      const config: any = {
        responseModalities: ['IMAGE', 'TEXT'],
      };

      if (model === 'gemini-3-pro-image-preview') {
        config.imageConfig = {
          imageSize: "1K",
        };
      }

      const contents = [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: sourceImage.data,
                mimeType: sourceImage.mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ];

      const response = await ai.models.generateContentStream({
        model: model,
        contents: contents,
        config,
      });

      let foundImage = false;
      for await (const chunk of response) {
        if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
          continue;
        }

        const inlineData = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (inlineData) {
          const imageUrl = `data:${inlineData.mimeType || 'image/png'};base64,${inlineData.data}`;
          setResultImage(imageUrl);
          localStorage.setItem('geminiApiKey', apiKey);
          foundImage = true;
          break; // We only need the first image
        } else if (chunk.text) {
          console.log("Model text response:", chunk.text);
        }
      }

      if (!foundImage) {
        setError("No image generated. Please check your prompt or try again.");
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || JSON.stringify(err) || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const a = document.createElement('a');
    a.href = resultImage;
    a.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-indigo-500/30">
      <div className="max-w-md mx-auto p-4 sm:p-6 flex flex-col gap-6">

        {/* Header */}
        <header className="flex items-center gap-3 pt-4 pb-2 border-b border-zinc-800">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Nano Banana</h1>
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Img2Img Editor</p>
          </div>
        </header>

        <form onSubmit={generateImage} className="flex flex-col gap-6">
          {/* API Key Section */}
          <section className="space-y-2">
            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <Key className="w-4 h-4 text-zinc-500" />
              Gemini API Key
            </label>
            <input type="text" name="username" autoComplete="username" className="hidden" defaultValue="gemini-api-user" />
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-600"
            />
          </section>

          {/* Image Upload Section */}
          <section className="space-y-2">
            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-zinc-500" />
              Source Image
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/png, image/jpeg, image/webp, image/heic, image/heif"
              className="hidden"
            />

            {!sourceImage ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-square max-h-[300px] bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5 text-zinc-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-300">Tap to choose</p>
                  <p className="text-xs text-zinc-500 mt-1">PNG, JPG, WEBP</p>
                </div>
              </button>
            ) : (
              <div className="relative group rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800">
                <img
                  src={sourceImage.url}
                  alt="Source"
                  className="w-full h-auto max-h-[400px] object-contain"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm font-medium">
                    <Upload className="w-4 h-4" />
                    Change image
                  </div>
                </button>
              </div>
            )}
          </section>

          {/* Prompt Section */}
          <section className="space-y-2">
            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-zinc-500" />
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to generate from the image..."
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-600 resize-none"
            />
          </section>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !sourceImage || !prompt || !apiKey}
            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:active:scale-100 shadow-lg shadow-indigo-500/20 disabled:shadow-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Image
              </>
            )}
          </button>
        </form>

        {/* Result Section */}
        {resultImage && (
          <section className="space-y-4 pt-4 border-t border-zinc-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-300">Result</h2>
              <button
                onClick={handleDownload}
                className="text-xs flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 px-3 py-1.5 rounded-full"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl">
              <img
                src={resultImage}
                alt="Generated result"
                className="w-full h-auto"
              />
            </div>
          </section>
        )}

        <div className="h-8" /> {/* Bottom padding for mobile */}
      </div>
    </div>
  );
}
