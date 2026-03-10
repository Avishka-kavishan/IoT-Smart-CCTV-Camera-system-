/**
 * Environment Configuration
 *
 * ⚠️ IMPORTANT: Change BACKEND_URL to match your backend server's IP address
 *
 * Examples:
 * - Same PC: "http://localhost:5001"
 * - Different PC on same network: "http://192.168.1.50:5001"
 * - Cloud server: "https://your-domain.com"
 */

export const ENV = {
  // 👇 CHANGE THIS LINE - Set your backend server IP address here
  BACKEND_URL: "http://localhost:5001",
} as const;
