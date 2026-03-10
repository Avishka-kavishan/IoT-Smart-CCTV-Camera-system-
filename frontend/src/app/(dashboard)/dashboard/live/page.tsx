"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { db } from "@/lib/firebase/config";
import { Camera } from "@/lib/types";
import { collection, getDocs } from "firebase/firestore";
import { Maximize2, Minimize2, Video, Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function LiveCameraCard({ camera }: { camera: Camera }) {
  const [isOnline, setIsOnline] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [streamKey, setStreamKey] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  // Direct ESP32 stream for minimal latency
  const esp32IP = camera.ipAddress;
  const streamUrl = `http://${esp32IP}/stream?v=${streamKey}`;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    // Reset error and reload stream when camera IP changes or component mounts
    setImgError(false);
    setStreamKey((prev) => prev + 1);

    // Cleanup: force disconnect when component unmounts or IP changes
    return () => {
      if (imgRef.current) {
        imgRef.current.src = "";
      }
    };
  }, [camera.ipAddress]);

  return (
    <Card className="overflow-hidden">
      {/* Camera Header */}
      <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              isOnline ? "bg-green-500/20" : "bg-red-500/20"
            }`}
          >
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-400" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-400" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-white">{camera.name}</h3>
            <p className="text-xs text-slate-400">{camera.location}</p>
          </div>
        </div>
        <Badge variant={isOnline ? "success" : "danger"}>
          {isOnline ? "Online" : "Offline"}
        </Badge>
      </div>

      {/* Camera Feed */}
      <div
        ref={containerRef}
        className="relative aspect-video bg-slate-900 group"
      >
        {imgError ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <WifiOff className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Camera offline</p>
              <button
                onClick={() => {
                  setImgError(false);
                  setStreamKey((prev) => prev + 1);
                }}
                className="mt-4 text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Retry Connection
              </button>
            </div>
          </div>
        ) : (
          <img
            ref={imgRef}
            src={streamUrl}
            alt={`Live feed from ${camera.name}`}
            className="w-full h-full object-contain"
            onError={() => {
              setImgError(true);
              setIsOnline(false);
            }}
            onLoad={() => setIsOnline(true)}
          />
        )}

        {/* Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-white" />
              <span className="text-sm text-white font-medium">
                Live Stream
              </span>
            </div>
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4 text-white" />
              ) : (
                <Maximize2 className="h-4 w-4 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function LiveFeedPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    try {
      const snapshot = await getDocs(collection(db, "cameras"));
      const cameraList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Camera[];
      setCameras(cameraList);
    } catch (error) {
      console.error("Failed to load cameras:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Live Camera Feeds</h1>
        <p className="text-slate-400 mt-1">
          Monitor all your cameras in real-time
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-400">Loading cameras...</div>
        </div>
      ) : cameras.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Video className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No Cameras Found
            </h3>
            <p className="text-slate-400">
              Add cameras from the Cameras page to view live feeds
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {cameras.map((camera) => (
            <LiveCameraCard key={camera.id} camera={camera} />
          ))}
        </div>
      )}
    </div>
  );
}
