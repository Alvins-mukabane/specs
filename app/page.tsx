"use client";

import { useEffect, useState, useRef } from "react";

interface TokenWithId {
  token: string;
  id: number;
}

export default function Home() {
  const [status, setStatus] = useState<string>("Downloading AI Model to Browser...");
  const [inputText, setInputText] = useState<string>(
    "The bank of the river was muddy, but the bank closed at 5 PM."
  );
  const [tokens, setTokens] = useState<TokenWithId[]>([]);
  const [attention, setAttention] = useState<number[][]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL("../lib/worker.js", import.meta.url));

    workerRef.current.onmessage = (event) => {
      const { type, status: workerStatus, error, tokens: resultTokens, attention: attentionMatrix } = event.data;

      if (type === "loading") {
        setStatus(workerStatus);
      } else if (type === "ready") {
        setStatus(workerStatus);
      } else if (type === "result") {
        setTokens(resultTokens);
        setAttention(attentionMatrix);
        setIsProcessing(false);
      } else if (type === "error") {
        setStatus(`Error: ${error}`);
        setIsProcessing(false);
      }
    };

    workerRef.current.postMessage({ type: "init" });

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleTeardown = () => {
    if (!workerRef.current || isProcessing) return;

    setIsProcessing(true);
    setTokens([]);
    setAttention([]);

    workerRef.current.postMessage({
      type: "teardown",
      payload: { text: inputText }
    });
  };

  const getAttentionColor = (score: number) => {
    // Map attention score to indigo-500 with varying opacity
    const opacity = Math.min(1, Math.max(0, score));
    return `rgba(99, 102, 241, ${opacity})`;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      <div className="max-w-5xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            AI Under the Hood
          </h1>
          <p className="text-gray-400">
            Visualizing how Large Language Models process text
          </p>
          <p className="text-sm text-gray-500 mt-2">{status}</p>
        </div>

        {/* Input Section */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Enter a sentence (max ~30 words)
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full h-32 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            placeholder="Type a sentence to analyze..."
            maxLength={200}
          />
          <button
            onClick={handleTeardown}
            disabled={isProcessing || status !== "Model Ready!"}
            className="mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {isProcessing ? "Processing..." : "Teardown"}
          </button>
        </div>

        {/* Module 1: Tokenizer UI */}
        {tokens.length > 0 && (
          <div className="mb-12">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-indigo-400 mb-1">
                Module 1: Tokenization
              </h2>
              <p className="text-sm text-gray-400">
                The input text is split into tokens. GPT-2 uses byte-pair encoding.
                Spaces are represented as "Ġ" internally (shown as regular spaces below).
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {tokens.map((token, index) => (
                <div
                  key={index}
                  className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-full"
                >
                  <div className="text-white font-medium">{token.token}</div>
                  <div className="text-xs text-gray-500 mt-1">ID: {token.id}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Module 2: Attention Heatmap */}
        {attention.length > 0 && (
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-purple-400 mb-1">
                Module 2: Self-Attention (Layer 0, Head 0)
              </h2>
              <p className="text-sm text-gray-400">
                Each cell shows how much the token on the left attends to the token on top.
                Brighter indigo = stronger attention connection.
              </p>
            </div>
            <div className="overflow-x-auto">
              <div
                className="inline-grid gap-px bg-gray-800 p-px rounded-lg"
                style={{
                  gridTemplateColumns: `auto repeat(${attention.length}, minmax(3rem, 1fr))`
                }}
              >
                {/* Empty corner */}
                <div className="p-2 bg-gray-900"></div>

                {/* Top axis labels (tokens) */}
                {tokens.map((token, index) => (
                  <div
                    key={`top-${index}`}
                    className="p-2 text-xs text-gray-400 font-medium whitespace-nowrap rotate-0"
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                  >
                    {token.token}
                  </div>
                ))}

                {/* Rows */}
                {attention.map((row, rowIndex) => (
                  <>
                    {/* Left axis label (token) */}
                    <div
                      key={`left-${rowIndex}`}
                      className="p-2 text-xs text-gray-400 font-medium whitespace-nowrap text-right"
                    >
                      {tokens[rowIndex]?.token}
                    </div>

                    {/* Attention cells */}
                    {row.map((score, colIndex) => (
                      <div
                        key={`cell-${rowIndex}-${colIndex}`}
                        className="w-12 h-12 sm:w-14 sm:h-14 transition-all"
                        style={{
                          backgroundColor: getAttentionColor(score)
                        }}
                        title={`${tokens[rowIndex]?.token} → ${tokens[colIndex]?.token}: ${score.toFixed(4)}`}
                      ></div>
                    ))}
                  </>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
