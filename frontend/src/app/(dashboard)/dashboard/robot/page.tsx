"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { db } from "@/lib/firebase/config";
import { Camera, Robot } from "@/lib/types";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import {
  ArrowDown,
  ArrowDownCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpCircle,
  Camera as CameraIcon,
  Crosshair,
  Plus,
  RotateCcw,
  RotateCw,
  StopCircle,
  Trash2,
  WifiOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ENV } from "../../../../../env";

function LiveFeedViewer({
  robot,
  camera,
  hasServos,
  hasMotors,
  children,
}: {
  robot: Robot;
  camera: Camera;
  hasServos: boolean;
  hasMotors: boolean;
  children: React.ReactNode;
}) {
  const [imgError, setImgError] = useState(false);
  const [streamKey, setStreamKey] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const streamUrl = `http://${camera.ipAddress}/stream?v=${streamKey}`;

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
      <div className="relative aspect-video bg-slate-900 group">
        {/* Stream Image */}
        {imgError ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <WifiOff className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Camera stream offline</p>
              <button
                onClick={() => setImgError(false)}
                className="mt-3 text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <img
            ref={imgRef}
            src={streamUrl}
            alt={`Live feed from ${robot.name}`}
            className="w-full h-full object-contain"
            onError={() => setImgError(true)}
          />
        )}

        {/* Overlay for controls - positioned at bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4">
          <div className="flex items-end justify-center gap-4">{children}</div>
        </div>
      </div>
    </Card>
  );
}

export default function RobotPage() {
  const [robots, setRobots] = useState<Robot[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedRobotId");
    }
    return null;
  });
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(
    () => {
      if (typeof window !== "undefined") {
        return localStorage.getItem("selectedCameraId");
      }
      return null;
    }
  );
  const [pan, setPan] = useState(90);
  const [tilt, setTilt] = useState(90);
  const [ledMode, setLedMode] = useState<"auto" | "on" | "off">("auto");
  const [loading, setLoading] = useState(false);

  // Add robot form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRobotName, setNewRobotName] = useState("");
  const [newRobotIp, setNewRobotIp] = useState("");
  const [newRobotType, setNewRobotType] = useState<
    "camera-mount" | "car" | "both"
  >("both");

  useEffect(() => {
    loadRobots();
    loadCameras();
  }, []);

  // Save selected robot to localStorage whenever it changes
  useEffect(() => {
    if (selectedRobotId) {
      localStorage.setItem("selectedRobotId", selectedRobotId);
    }
  }, [selectedRobotId]);

  // Save selected camera to localStorage whenever it changes
  useEffect(() => {
    if (selectedCameraId) {
      localStorage.setItem("selectedCameraId", selectedCameraId);
    }
  }, [selectedCameraId]);

  const loadRobots = async () => {
    try {
      const snapshot = await getDocs(collection(db, "robots"));
      const robotList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Robot[];
      setRobots(robotList);

      // Restore from localStorage or select first robot
      const savedRobotId = localStorage.getItem("selectedRobotId");
      if (savedRobotId && robotList.some((r) => r.id === savedRobotId)) {
        setSelectedRobotId(savedRobotId);
      } else if (robotList.length > 0 && !selectedRobotId) {
        const firstId = robotList[0].id;
        setSelectedRobotId(firstId);
        localStorage.setItem("selectedRobotId", firstId);
      }
    } catch (error) {
      console.error("Failed to load robots:", error);
    }
  };

  const loadCameras = async () => {
    try {
      const snapshot = await getDocs(collection(db, "cameras"));
      const cameraList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Camera[];
      setCameras(cameraList);

      // Restore from localStorage or select first camera
      const savedCameraId = localStorage.getItem("selectedCameraId");
      if (savedCameraId && cameraList.some((c) => c.id === savedCameraId)) {
        setSelectedCameraId(savedCameraId);
      } else if (cameraList.length > 0 && !selectedCameraId) {
        const firstId = cameraList[0].id;
        setSelectedCameraId(firstId);
        localStorage.setItem("selectedCameraId", firstId);
      }
    } catch (error) {
      console.error("Failed to load cameras:", error);
    }
  };

  const addRobot = async () => {
    if (!newRobotName || !newRobotIp) return;

    try {
      const newRobot = {
        name: newRobotName,
        ipAddress: newRobotIp,
        type: newRobotType,
        status: "offline" as const,
        lastSeen: Timestamp.now(),
        capabilities: {
          hasServos: newRobotType === "camera-mount" || newRobotType === "both",
          hasMotors: newRobotType === "car" || newRobotType === "both",
        },
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, "robots"), newRobot);

      setNewRobotName("");
      setNewRobotIp("");
      setNewRobotType("both");
      setShowAddForm(false);
      loadRobots();
    } catch (error) {
      console.error("Failed to add robot:", error);
    }
  };

  const deleteRobot = async (robotId: string) => {
    if (!confirm("Are you sure you want to delete this robot?")) return;

    try {
      await deleteDoc(doc(db, "robots", robotId));
      if (selectedRobotId === robotId) {
        setSelectedRobotId(null);
      }
      loadRobots();
    } catch (error) {
      console.error("Failed to delete robot:", error);
    }
  };

  const sendCommand = async (command: string) => {
    if (!selectedRobotId) return;

    const robot = robots.find((r) => r.id === selectedRobotId);
    if (!robot) return;

    setLoading(true);
    try {
      // Send command directly to ESP32
      await fetch(`http://${robot.ipAddress}/command`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: command,
      });
      console.log(`✅ Command sent to ${robot.ipAddress}: ${command}`);
    } catch (error) {
      console.error("Failed to send command:", error);
      // Fallback: try through backend (for legacy compatibility)
      try {
        await fetch(`${ENV.BACKEND_URL}/robot/command`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            robot_id: selectedRobotId,
            command,
          }),
        });
      } catch (backendError) {
        console.error("Backend fallback also failed:", backendError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleServoMove = (axis: "pan" | "tilt", direction: number) => {
    const step = 10;
    let newPan = pan;
    let newTilt = tilt;

    if (axis === "pan") {
      newPan = Math.min(180, Math.max(0, pan + direction * step));
      setPan(newPan);
      sendCommand(`pan:${newPan}`);
    } else {
      newTilt = Math.min(180, Math.max(0, tilt + direction * step));
      setTilt(newTilt);
      sendCommand(`tilt:${newTilt}`);
    }
  };

  const handleCenter = () => {
    setPan(90);
    setTilt(90);
    sendCommand("pan:90");
    setTimeout(() => sendCommand("tilt:90"), 100);
  };

  const handleMotorCommand = (command: string) => {
    sendCommand(command);
  };

  const handleLEDControl = (mode: "auto" | "on" | "off") => {
    setLedMode(mode);
    if (mode === "auto") {
      sendCommand("led:auto");
    } else if (mode === "on") {
      sendCommand("led:on");
    } else {
      sendCommand("led:off");
    }
  };

  const selectedRobot = robots.find((r) => r.id === selectedRobotId);
  const hasServos = selectedRobot?.capabilities.hasServos ?? false;
  const hasMotors = selectedRobot?.capabilities.hasMotors ?? false;

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default for arrow keys and WASD
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "w",
          "a",
          "s",
          "d",
        ].includes(e.key)
      ) {
        e.preventDefault();
      }

      // Motor controls (Arrow keys)
      if (hasMotors) {
        switch (e.key) {
          case "ArrowUp":
            handleMotorCommand("forward");
            break;
          case "ArrowDown":
            handleMotorCommand("backward");
            break;
          case "ArrowLeft":
            handleMotorCommand("left");
            break;
          case "ArrowRight":
            handleMotorCommand("right");
            break;
        }
      }

      // Servo controls (WASD keys)
      if (hasServos) {
        switch (e.key.toLowerCase()) {
          case "w":
            handleServoMove("tilt", -1); // Up
            break;
          case "s":
            handleServoMove("tilt", 1); // Down
            break;
          case "a":
            handleServoMove("pan", 1); // Left
            break;
          case "d":
            handleServoMove("pan", -1); // Right
            break;
          case " ":
            e.preventDefault();
            handleCenter(); // Spacebar to center
            break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Stop motors when arrow keys are released
      if (
        hasMotors &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        handleMotorCommand("stop");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [hasMotors, hasServos, pan, tilt, selectedRobotId]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">Robot Control</h1>
          <p className="text-slate-400 mt-1">Manage and control your robots</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Robot
        </Button>
      </div>

      {/* Keyboard Controls Info */}
      {selectedRobot && (
        <Card className="p-4 bg-blue-500/10 border-blue-500/30">
          <div className="flex items-start gap-3">
            <div className="text-blue-400 mt-1">⌨️</div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-300 mb-2">
                Keyboard Controls
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
                {hasMotors && (
                  <div>
                    <span className="font-medium text-blue-300">Motors:</span>{" "}
                    Arrow Keys (↑↓←→) to move, release to stop
                  </div>
                )}
                {hasServos && (
                  <div>
                    <span className="font-medium text-blue-300">Camera:</span>{" "}
                    WASD to pan/tilt, Space to center
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Add Robot Form */}
      {showAddForm && (
        <Card className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">Add New Robot</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Robot Name
              </label>
              <Input
                value={newRobotName}
                onChange={(e) => setNewRobotName(e.target.value)}
                placeholder="e.g., Camera Mount 1"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                IP Address
              </label>
              <Input
                value={newRobotIp}
                onChange={(e) => setNewRobotIp(e.target.value)}
                placeholder="e.g., 192.168.1.100"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Type</label>
              <select
                value={newRobotType}
                onChange={(e) => setNewRobotType(e.target.value as any)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="camera-mount">Camera Mount (Servos Only)</option>
                <option value="car">Robot Car (Motors Only)</option>
                <option value="both">Both (Servos + Motors)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="primary" onClick={addRobot}>
              Add Robot
            </Button>
            <Button variant="secondary" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Robot Selection */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Select Robot</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {robots.map((robot) => (
            <div
              key={robot.id}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedRobotId === robot.id
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
              }`}
              onClick={() => setSelectedRobotId(robot.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-white">{robot.name}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteRobot(robot.id);
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-slate-400">{robot.ipAddress}</p>
              <div className="flex gap-2 mt-2">
                {robot.capabilities.hasServos && (
                  <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                    Servos
                  </span>
                )}
                {robot.capabilities.hasMotors && (
                  <span className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded">
                    Motors
                  </span>
                )}
              </div>
            </div>
          ))}
          {robots.length === 0 && (
            <p className="text-slate-500 col-span-3 text-center py-8">
              No robots added yet. Click "Add Robot" to get started.
            </p>
          )}
        </div>
      </Card>

      {/* Camera Selection */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Select Camera Stream
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {cameras.map((camera) => (
            <div
              key={camera.id}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedCameraId === camera.id
                  ? "border-green-500 bg-green-500/10"
                  : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
              }`}
              onClick={() => setSelectedCameraId(camera.id)}
            >
              <div className="flex items-center gap-2 mb-2">
                <CameraIcon className="h-4 w-4 text-green-400" />
                <h3 className="font-semibold text-white">{camera.name}</h3>
              </div>
              <p className="text-xs text-slate-400">{camera.location}</p>
              <p className="text-xs text-slate-500 mt-1">{camera.ipAddress}</p>
            </div>
          ))}
          {cameras.length === 0 && (
            <p className="text-slate-500 col-span-4 text-center py-8">
              No cameras found. Add a camera from the Cameras page.
            </p>
          )}
        </div>
      </Card>

      {selectedRobot &&
        selectedCameraId &&
        cameras.find((c) => c.id === selectedCameraId) && (
          <LiveFeedViewer
            robot={selectedRobot}
            camera={cameras.find((c) => c.id === selectedCameraId)!}
            hasServos={hasServos}
            hasMotors={hasMotors}
          >
            {/* Servo Control - Smaller and Compact */}
            {hasServos && (
              <div className="flex flex-col items-center">
                <h3 className="text-sm font-semibold text-white mb-2">
                  Pan/Tilt
                </h3>
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <Button
                    variant="secondary"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-8 w-8 rounded-full p-0"
                    onClick={() => handleServoMove("tilt", -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-8 w-8 rounded-full p-0"
                    onClick={() => handleServoMove("tilt", 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full p-0"
                    onClick={() => handleServoMove("pan", 1)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full p-0"
                    onClick={() => handleServoMove("pan", -1)}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="primary"
                    className="h-10 w-10 rounded-full p-0"
                    onClick={handleCenter}
                  >
                    <Crosshair className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Motor Control - Smaller and Compact */}
            {hasMotors && (
              <div className="flex flex-col items-center">
                <h3 className="text-sm font-semibold text-white mb-2">Drive</h3>
                <div className="relative w-32 h-32 flex items-center justify-center">
                  {/* Forward */}
                  <Button
                    variant="secondary"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-8 w-8 rounded-full p-0"
                    onMouseDown={() => handleMotorCommand("forward")}
                    onMouseUp={() => handleMotorCommand("stop")}
                    onMouseLeave={() => handleMotorCommand("stop")}
                    onTouchStart={() => handleMotorCommand("forward")}
                    onTouchEnd={() => handleMotorCommand("stop")}
                  >
                    <ArrowUpCircle className="h-4 w-4" />
                  </Button>

                  {/* Backward */}
                  <Button
                    variant="secondary"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-8 w-8 rounded-full p-0"
                    onMouseDown={() => handleMotorCommand("backward")}
                    onMouseUp={() => handleMotorCommand("stop")}
                    onMouseLeave={() => handleMotorCommand("stop")}
                    onTouchStart={() => handleMotorCommand("backward")}
                    onTouchEnd={() => handleMotorCommand("stop")}
                  >
                    <ArrowDownCircle className="h-4 w-4" />
                  </Button>

                  {/* Turn Left */}
                  {/* <Button
                    variant="secondary"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full p-0"
                    onMouseDown={() => handleMotorCommand("left")}
                    onMouseUp={() => handleMotorCommand("stop")}
                    onMouseLeave={() => handleMotorCommand("stop")}
                    onTouchStart={() => handleMotorCommand("left")}
                    onTouchEnd={() => handleMotorCommand("stop")}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button> */}

                  {/* Turn Right */}
                  {/* <Button
                    variant="secondary"
                    className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full p-0"
                    onMouseDown={() => handleMotorCommand("right")}
                    onMouseUp={() => handleMotorCommand("stop")}
                    onMouseLeave={() => handleMotorCommand("stop")}
                    onTouchStart={() => handleMotorCommand("right")}
                    onTouchEnd={() => handleMotorCommand("stop")}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button> */}

                  {/* Stop */}
                  <Button
                    variant="primary"
                    className="h-10 w-10 rounded-full p-0 bg-red-600 hover:bg-red-500"
                    onClick={() => handleMotorCommand("stop")}
                  >
                    <StopCircle className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {/* LED Control */}
            <div className="flex flex-col items-center gap-2">
              <h3 className="text-sm font-semibold text-white">LED</h3>
              <div className="flex gap-2">
                <Button
                  variant={ledMode === "on" ? "primary" : "secondary"}
                  className="h-8 px-3 text-xs"
                  onClick={() => handleLEDControl("on")}
                >
                  ON
                </Button>
                <Button
                  variant={ledMode === "off" ? "primary" : "secondary"}
                  className="h-8 px-3 text-xs"
                  onClick={() => handleLEDControl("off")}
                >
                  OFF
                </Button>
                <Button
                  variant={ledMode === "auto" ? "primary" : "secondary"}
                  className="h-8 px-3 text-xs"
                  onClick={() => handleLEDControl("auto")}
                >
                  AUTO
                </Button>
              </div>
            </div>
          </LiveFeedViewer>
        )}
    </div>
  );
}
