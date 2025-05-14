// This file serves as a client-side interface to the TDLib functionality provided by the server.
// Since TDLib runs on the server, we don't need to implement the actual library here.

import { apiRequest } from "./queryClient";
import { getIdToken } from "./firebase";

export interface TelegramFile {
  id: string;
  name: string;
  size: number;
  path?: string;
  messageId: string;
  channelId: string;
}

// Initialize TDLib connection - this happens server-side
export const initializeTDLib = async (): Promise<{ success: boolean }> => {
  try {
    const token = await getIdToken();
    if (!token) throw new Error("No auth token available");
    
    const response = await apiRequest("POST", "/api/telegram/initialize", {}, token);
    return response.json();
  } catch (error) {
    console.error("Failed to initialize TDLib:", error);
    throw error;
  }
};

// Check TDLib connection status - this happens server-side
export const checkTDLibStatus = async (): Promise<{ connected: boolean }> => {
  try {
    const token = await getIdToken();
    if (!token) throw new Error("No auth token available");
    
    const response = await apiRequest("GET", "/api/telegram/status", undefined, token);
    return response.json();
  } catch (error) {
    console.error("Failed to check TDLib status:", error);
    return { connected: false };
  }
};

// These functions don't directly use TDLib on the client side,
// but instead act as interfaces to the server's TDLib implementation
