"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [status, setStatus] = useState<string>("Loading Model...");

  useEffect(() => {
    const worker = new Worker(new URL("../lib/worker.js", import.meta.url));

    worker.onmessage = (event) => {
      const { type, status: workerStatus, error } = event.data;

      if (type === "ready") {
        setStatus(workerStatus);
      } else if (type === "error") {
        setStatus(`Error: ${error}`);
      }
    };

    worker.postMessage({ type: "init" });

    return () => {
      worker.terminate();
    };
  }, []);

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-4 px-16 bg-white dark:bg-black">
        <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
          LatentLens
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          {status}
        </p>
      </main>
    </div>
  );
}
