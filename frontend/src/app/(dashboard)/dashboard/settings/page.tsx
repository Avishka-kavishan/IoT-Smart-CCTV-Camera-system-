"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { db } from "@/lib/firebase/config";
import { Robot } from "@/lib/types";
import { collection, getDocs } from "firebase/firestore";
import { Bell, Lightbulb, Shield, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { ENV } from "../../../../../env";

export default function SettingsPage() {
  const [alertKnown, setAlertKnown] = useState(false);
  const [flashlight, setFlashlight] = useState(false);
  const [loading, setLoading] = useState(false);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);
  const [ledMode, setLedMode] = useState<"auto" | "on" | "off">("auto");

  // Fetch current setting on mount (You might need a GET endpoint or just default to false)
  // Since we don't have a GET endpoint for this specific setting yet, we'll default to false
  // or we can add a GET endpoint to main.py. For now, let's assume false.
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        // Fetch alertKnown state
        const alertKnownResponse = await fetch(
          `${ENV.BACKEND_URL}/settings/alert-known`
        );
        if (alertKnownResponse.ok) {
          const data = await alertKnownResponse.json();
          setAlertKnown(data.enabled);
        } else {
          console.error("Failed to fetch alertKnown setting");
        }

        // Fetch flashlight state
        const flashlightResponse = await fetch(
          `${ENV.BACKEND_URL}/settings/flashlight`
        );
        if (flashlightResponse.ok) {
          const data = await flashlightResponse.json();
          setFlashlight(data.enabled);
        } else {
          console.error("Failed to fetch flashlight setting");
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };

    const loadRobots = async () => {
      try {
        const snapshot = await getDocs(collection(db, "robots"));
        const robotList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Robot[];
        setRobots(robotList);
        if (robotList.length > 0 && !selectedRobotId) {
          setSelectedRobotId(robotList[0].id);
        }
      } catch (error) {
        console.error("Failed to load robots:", error);
      }
    };

    fetchSettings();
    loadRobots();
  }, []);

  const toggleAlertKnown = async () => {
    setLoading(true);
    try {
      const newState = !alertKnown;
      const response = await fetch(`${ENV.BACKEND_URL}/settings/alert-known`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled: newState }),
      });

      if (response.ok) {
        setAlertKnown(newState);
      } else {
        console.error("Failed to update setting");
      }
    } catch (error) {
      console.error("Error updating setting:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFlashlight = async () => {
    try {
      const newState = !flashlight;
      const response = await fetch(`${ENV.BACKEND_URL}/control`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ led: newState }),
      });

      if (response.ok) {
        setFlashlight(newState);
      } else {
        console.error("Failed to toggle flashlight");
      }
    } catch (error) {
      console.error("Error toggling flashlight:", error);
    }
  };

  const handleLEDControl = async (mode: "auto" | "on" | "off") => {
    const selectedRobot = robots.find((r) => r.id === selectedRobotId);
    if (!selectedRobot) return;

    setLedMode(mode);
    try {
      const command =
        mode === "auto" ? "led:auto" : mode === "on" ? "led:on" : "led:off";
      const response = await fetch(
        `http://${selectedRobot.ipAddress}/command`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command }),
        }
      );

      if (!response.ok) {
        console.error("Failed to control LED");
      }
    } catch (error) {
      console.error("Error controlling LED:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">
          Configure your security preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Security Settings Card */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Shield className="h-6 w-6 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Security Rules</h2>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
              <div className="flex items-start gap-3">
                <UserCheck className="h-5 w-5 text-slate-400 mt-1" />
                <div>
                  <h3 className="font-medium text-white">
                    Known Person Alerts
                  </h3>
                  <p className="text-sm text-slate-400">
                    Receive notifications when registered family members are
                    detected.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={alertKnown}
                  onChange={toggleAlertKnown}
                  disabled={loading}
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Placeholder for other settings */}
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800 opacity-50 cursor-not-allowed">
              <div className="flex items-start gap-3">
                <Bell className="h-5 w-5 text-slate-400 mt-1" />
                <div>
                  <h3 className="font-medium text-white">Push Notifications</h3>
                  <p className="text-sm text-slate-400">
                    Send alerts to mobile device (Coming Soon)
                  </p>
                </div>
              </div>
              <div className="w-11 h-6 bg-slate-700 rounded-full"></div>
            </div>
          </div>
        </Card>

        {/* Camera Controls Card */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Lightbulb className="h-6 w-6 text-yellow-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              Camera Controls
            </h2>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-slate-400 mt-1" />
                <div>
                  <h3 className="font-medium text-white">Camera Flashlight</h3>
                  <p className="text-sm text-slate-400">
                    Turn on the ESP32-CAM high-power LED.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={flashlight}
                  onChange={toggleFlashlight}
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
              </label>
            </div>
          </div>
        </Card>

        {/* Robot LED Control Card */}
        {robots.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Lightbulb className="h-6 w-6 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Robot LED</h2>
            </div>

            <div className="space-y-4">
              {/* Robot Selector */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Select Robot
                </label>
                <select
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={selectedRobotId || ""}
                  onChange={(e) => setSelectedRobotId(e.target.value)}
                >
                  {robots.map((robot) => (
                    <option key={robot.id} value={robot.id}>
                      {robot.name} ({robot.ipAddress})
                    </option>
                  ))}
                </select>
              </div>

              {/* LED Control Buttons */}
              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                <div className="flex items-start gap-3 mb-3">
                  <Lightbulb className="h-5 w-5 text-slate-400 mt-1" />
                  <div>
                    <h3 className="font-medium text-white">
                      LED Light Control
                    </h3>
                    <p className="text-sm text-slate-400">
                      Control robot LED: Auto (LDR sensor), Manual ON, or Manual
                      OFF
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant={ledMode === "on" ? "primary" : "secondary"}
                    className="flex-1"
                    onClick={() => handleLEDControl("on")}
                  >
                    ON
                  </Button>
                  <Button
                    variant={ledMode === "off" ? "primary" : "secondary"}
                    className="flex-1"
                    onClick={() => handleLEDControl("off")}
                  >
                    OFF
                  </Button>
                  <Button
                    variant={ledMode === "auto" ? "primary" : "secondary"}
                    className="flex-1"
                    onClick={() => handleLEDControl("auto")}
                  >
                    AUTO
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
