import React, { useState, useEffect } from "react";
import { FileUpload } from "./components/FileUpload";
import { ManifestDisplay } from "./components/ManifestDisplay";
import { extractClientData } from "./services/gemini";
import { optimizeManifests } from "./lib/optimizer";
import { ClientInfo, DeliveryManifest } from "./types";
import { Users, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";

export default function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [numTeams, setNumTeams] = useState(3);
  const [manifests, setManifests] = useState<DeliveryManifest[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleDataExtracted = async (text: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const extractedClients = await extractClientData(text);
      if (extractedClients.length === 0) {
        setError("No client data could be extracted from the file.");
      } else {
        setClients(extractedClients);
      }
    } catch (err) {
      console.error("Error extracting data:", err);
      setError("Failed to process the file content. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (clients.length > 0) {
      const optimized = optimizeManifests(clients, numTeams);
      setManifests(optimized);
    }
  }, [clients, numTeams]);

  const handleReset = () => {
    setClients([]);
    setManifests([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a 
              href="https://www.ccrt.org/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 overflow-hidden border border-gray-100 transition-transform hover:scale-105"
            >
              <img 
                src="https://lirp.cdn-website.com/1f6efa2a/dms3rep/multi/opt/CCRT+LOGO+FINAL+5.29-1920w.png" 
                alt="CCRT Logo" 
                className="w-full h-full object-contain p-1"
                referrerPolicy="no-referrer"
              />
            </a>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
                CCRT-Manifest<span className="text-blue-600">Pro</span>
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Christian Community Response Team
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {clients.length > 0 && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Start Over
              </button>
            )}
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-bold text-gray-700">{clients.length} Clients</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AnimatePresence mode="wait">
          {clients.length === 0 ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="text-center space-y-4 max-w-2xl mx-auto">
                <h2 className="text-4xl font-black text-gray-900 leading-tight">
                  Optimize Delivery Routes
                </h2>
                <p className="text-lg text-gray-500 font-medium">
                  Upload your client file in .docx, .txt, .csv, .xls, or .xlsx format and we'll automatically extract, geocode, and balance your delivery manifests.
                </p>
              </div>

              <FileUpload onDataExtracted={handleDataExtracted} isProcessing={isProcessing} />

              {error && (
                <div className="max-w-md mx-auto p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium text-center">
                  {error}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12"
            >
              {/* Controls */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-gray-900">Optimization Controls</h3>
                    <p className="text-sm text-gray-500">Adjust the number of teams to re-balance the manifests</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400 px-4">Teams</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <button
                        key={n}
                        onClick={() => setNumTeams(n)}
                        className={cn(
                          "w-10 h-10 rounded-xl font-bold text-sm transition-all",
                          numTeams === n
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                            : "text-gray-500 hover:bg-white hover:text-gray-900"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <ManifestDisplay manifests={manifests} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-100 mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-gray-400">
            <a href="https://www.ccrt.org/" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-80">
              <img 
                src="https://lirp.cdn-website.com/1f6efa2a/dms3rep/multi/opt/CCRT+LOGO+FINAL+5.29-1920w.png" 
                alt="CCRT Logo" 
                className="w-8 h-8 object-contain"
                referrerPolicy="no-referrer"
              />
            </a>
            <span className="text-sm font-bold uppercase tracking-widest">CCRT-ManifestPro v1.0</span>
          </div>
          <p className="text-sm text-gray-400">© 2026 Christian Community Response Team. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
