"use client";

import { useState, useEffect, useRef } from "react";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/trpc/client";


export default function HomePage() {
  const [numbersStr, setNumbersStr] = useState("");
  const [repeat, setRepeat] = useState(5);
  const [logs, setLogs] = useState<string[]>([]);
  const [success, setSuccess] = useState(0);
  const [failed, setFailed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [activeInput, setActiveInput] = useState<{ numbers: string[]; repeat: number } | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Initialize anonymous session on mount
  useEffect(() => {
    authClient.signIn.anonymous().catch(console.error);
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleStart = async () => {
    const nums = numbersStr.split('\n').map(n => n.trim()).filter(Boolean);
    if (nums.length === 0) return alert("Enter at least one number.");
    setLogs([]);
    setSuccess(0);
    setFailed(0);
    setIsRunning(true);
    setActiveInput({ numbers: nums, repeat });

    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numbers: nums, repeat })
      });

      if (!res.ok) {
        setLogs(prev => [...prev, `[ERROR] Server responded with ${res.status}: ${res.statusText}`]);
        setIsRunning(false);
        setActiveInput(null);
        return;
      }

      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'log' || data.type === 'progress') {
                  setLogs(prev => [...prev, data.message]);
                  if (data.success !== undefined) setSuccess(data.success);
                  if (data.failed !== undefined) setFailed(data.failed);
                } else if (data.type === 'error') {
                  setLogs(prev => [...prev, `[ERROR] ${data.message}`]);
                }
                
                if (data.message === 'Completed.') {
                  setActiveInput(null);
                  setIsRunning(false);
                }
              } catch (e) {
                // Ignore parse errors for incomplete chunks (handled by buffer)
              }
            }
          }
        }
      }
    } catch (err: any) {
      setLogs(prev => [...prev, `[NETWORK ERROR] ${err.message}`]);
      setActiveInput(null);
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    setActiveInput(null);
    setIsRunning(false);
    setLogs(prev => [...prev, '[STOPPED BY USER]']);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 font-mono selection:bg-white selection:text-black">
      <div className="max-w-2xl mx-auto border border-white/30 p-6 space-y-8">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-widest border-b border-white/30 pb-4 mb-2">SJCET_SMS_BOMB</h1>
          <p className="text-xs text-neutral-400 uppercase">Warning: Educational Use Only.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="numbers" className="block text-sm uppercase text-neutral-300">Targets</label>
            <textarea
              id="numbers"
              placeholder="9876543210&#10;8765432109"
              className="w-full bg-transparent border border-white/30 p-3 text-sm focus:outline-none focus:border-white h-32 resize-y placeholder-neutral-700"
              value={numbersStr}
              onChange={(e) => setNumbersStr(e.target.value)}
              disabled={isRunning}
            />
          </div>

          <div className="flex gap-4 items-end">
            <div className="space-y-2 flex-1">
              <label htmlFor="repeat" className="block text-sm uppercase text-neutral-300">Repeat</label>
              <input
                id="repeat"
                type="number"
                min={1}
                max={500}
                className="w-full bg-transparent border border-white/30 p-3 text-sm focus:outline-none focus:border-white"
                value={repeat}
                onChange={(e) => setRepeat(parseInt(e.target.value) || 1)}
                disabled={isRunning}
              />
            </div>
            
            <button
              className={`flex-1 font-bold uppercase text-sm p-3 transition-none border border-white/30 ${isRunning ? 'bg-red-600 text-white hover:bg-red-500 border-red-500' : 'bg-white text-black hover:bg-neutral-200'}`}
              onClick={isRunning ? handleStop : handleStart}
            >
              {isRunning ? "[ ABORT ]" : "[ EXECUTE ]"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-y border-white/30 py-4">
          <div>
            <div className="text-xs text-neutral-400 uppercase">Success</div>
            <div className="text-xl">{success}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-400 uppercase">Failed</div>
            <div className="text-xl">{failed}</div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm uppercase text-neutral-300">Output_Log</label>
          <div className="h-64 bg-transparent border border-white/30 p-3 text-xs overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-neutral-600 italic">...</div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, i) => (
                  <div key={i} className={log.includes('ERROR') || log.includes('✗') ? 'text-red-500' : 'text-neutral-300'}>
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}