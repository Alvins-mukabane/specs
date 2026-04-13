"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const TOKEN_COLORS = [
  "bg-indigo-500", "bg-purple-500", "bg-pink-500",
  "bg-blue-500", "bg-cyan-500", "bg-teal-500", "bg-emerald-500"
];

interface TokenWithId {
  token: string;
  id: number;
  color: string;
}

export default function Home() {
  const [status, setStatus] = useState<string>("Downloading AI Model to Browser (One time only)...");
  const [inputText, setInputText] = useState<string>(
    "The bank of the river was muddy, but the bank closed at 5 PM."
  );
  const [tokens, setTokens] = useState<TokenWithId[]>([]);
  const [attention, setAttention] = useState<number[][]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [modelReady, setModelReady] = useState<boolean>(false);

  // Use useRef to persist model instances across renders
  const tokenizerRef = useRef<any>(null);
  const modelRef = useRef<any>(null);

  // Load model on mount via dynamic import
  useEffect(() => {
    async function loadModels() {
      try {
        const { AutoTokenizer, AutoModel } = await import("@xenova/transformers");

        const [t, m] = await Promise.all([
          AutoTokenizer.from_pretrained("Xenova/distilgpt2"),
          AutoModel.from_pretrained("Xenova/distilgpt2")
        ]);

        tokenizerRef.current = t;
        modelRef.current = m;
        setModelReady(true);
        setStatus("Model Ready!");
      } catch (error: any) {
        setStatus(`Error loading model: ${error.message}`);
      }
    }
    loadModels();
  }, []);

  const handleTeardown = useCallback(async () => {
    if (!tokenizerRef.current || !modelRef.current || !inputText.trim() || isProcessing) return;

    setIsProcessing(true);
    setTokens([]);
    setAttention([]);

    try {
      const { Tensor } = await import("@xenova/transformers");

      // --- TOKENIZATION ---
      const wordChunks = tokenizerRef.current.tokenize(inputText);
      const ids = tokenizerRef.current.encode(inputText);

      const tokenData = wordChunks.map((word: string, index: number) => ({
        token: word.replace(/Ġ/g, " "),
        id: ids[index],
        color: TOKEN_COLORS[index % TOKEN_COLORS.length]
      }));
      setTokens(tokenData);

      // --- ATTENTION EXTRACTION ---
      const inputIdsTensor = new Tensor(
        'int64',
        BigInt64Array.from(ids.map(BigInt)),
        [1, ids.length]
      );

      const output = await modelRef.current({
        input_ids: inputIdsTensor,
        output_attentions: true
      });

      // Extract Layer 0, Head 0 from [batch, layers, heads, seq_len, seq_len]
      const layerZero = output.attentions[0];
      const headZero = layerZero[0][0];
      const matrix = headZero.toArray() as number[][];

      setAttention(matrix);
    } catch (error: any) {
      setStatus(`Analysis failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [inputText, isProcessing]);

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-8 font-sans">
      <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
        AI Under the Hood
      </h1>
      <p className="text-gray-400 mb-2">Stop memorizing AI. Start playing with it.</p>
      <p className="text-sm text-gray-500 mb-10">{status}</p>

      {/* INPUT SECTION */}
      <div className="w-full max-w-2xl mb-12">
        <textarea
          className="w-full p-4 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg resize-none"
          rows={3}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a sentence to dissect..."
          maxLength={200}
        />
        <button
          onClick={handleTeardown}
          disabled={!modelReady || isProcessing}
          className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-400 rounded-lg font-semibold transition-colors"
        >
          {isProcessing ? "Analyzing..." : "Teardown"}
        </button>
      </div>

      {/* MODULE 1: TOKENIZER */}
      <div className="w-full max-w-4xl mb-16">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xl font-semibold">Step 1: Tokenization</h2>
          <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-full">The Dictionary</span>
        </div>
        <p className="text-sm text-gray-400 mb-6">
          AI doesn&apos;t read letters. It chops text into chunks and assigns each a unique ID number.
        </p>

        <div className="flex flex-wrap gap-3 min-h-[80px] p-4 bg-gray-900 rounded-xl border border-gray-800">
          {tokens.length === 0 && (
            <span className="text-gray-600 italic">Your exploded tokens will appear here...</span>
          )}
          {tokens.map((t, index) => (
            <div
              key={index}
              className={`flex flex-col items-center p-3 rounded-lg ${t.color} shadow-lg transition-transform hover:scale-105`}
            >
              <span className="text-white font-mono font-bold text-lg">{t.token}</span>
              <span className="text-xs bg-black/30 rounded px-2 py-0.5 mt-1 text-gray-200 font-mono">ID: {t.id}</span>
            </div>
          ))}
        </div>
      </div>

      {/* MODULE 2: ATTENTION HEATMAP */}
      <div className="w-full max-w-5xl">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xl font-semibold">Step 2: Self-Attention</h2>
          <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-full">Layer 0, Head 0</span>
        </div>
        <p className="text-sm text-gray-400 mb-6">
          How does the AI know what words relate? It assigns &quot;attention scores&quot;. Bright colors mean the word on the left is paying close attention to the word on the top.
        </p>

        {attention.length === 0 ? (
          <div className="p-10 bg-gray-900 rounded-xl border border-gray-800 text-center text-gray-600 italic">
            Run the teardown to generate the heatmap...
          </div>
        ) : (
          <div className="overflow-x-auto p-6 bg-gray-900 rounded-xl border border-gray-800">
            <div className="flex gap-1 min-w-[500px]">
              {/* Y-Axis Labels */}
              <div className="flex flex-col gap-1 mr-2">
                <div className="h-8"></div>
                {tokens.map((t, i) => (
                  <div key={i} className="h-8 w-24 flex items-center justify-end text-xs text-gray-400 pr-2 font-mono truncate">
                    {t.token}
                  </div>
                ))}
              </div>

              {/* The Grid */}
              <div className="flex flex-col gap-1 flex-1">
                {/* X-Axis Labels (rotated) */}
                <div className="flex gap-1 mb-1">
                  {tokens.map((t, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 flex items-center justify-center text-[10px] text-gray-400 font-mono origin-top-left rotate-45 translate-x-2"
                    >
                      {t.token}
                    </div>
                  ))}
                </div>

                {/* Heatmap Cells */}
                {attention.map((row, i) => (
                  <div key={i} className="flex gap-1">
                    {row.map((score, j) => {
                      const intensity = Math.min(score * 2.5, 1);
                      return (
                        <div
                          key={j}
                          className="w-8 h-8 rounded-sm transition-colors"
                          style={{ backgroundColor: `rgba(99, 102, 241, ${intensity})` }}
                          title={`${tokens[i]?.token} → ${tokens[j]?.token}: ${score.toFixed(4)}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}