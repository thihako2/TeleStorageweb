import { getIdToken } from "./firebase";
import { apiRequest } from "./queryClient";
import { type User, type File as FileSchema, type UserWithStorage, type FileWithShareInfo } from "@shared/schema";

// Authentication API
export const loginUser = async (idToken: string) => {
  const response = await apiRequest("POST", "/api/auth/login", { idToken });
  return response.json();
};

export const registerUser = async (idToken: string, userData: { displayName?: string, photoURL?: string }) => {
  const response = await apiRequest("POST", "/api/auth/register", { idToken, ...userData });
  return response.json();
};

export const getCurrentUser = async (): Promise<UserWithStorage> => {
  const token = await getIdToken();
  if (!token) throw new Error("No auth token available");
  
  const response = await fetch("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch user data");
  }
  
  return response.json();
};

// Files API
export const getUserFiles = async (): Promise<FileSchema[]> => {
  const token = await getIdToken();
  if (!token) throw new Error("No auth token available");
  
  const response = await fetch("/api/files", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch files");
  }
  
  return response.json();
};

export const getRecentFiles = async (limit: number = 4): Promise<FileSchema[]> => {
  const token = await getIdToken();
  if (!token) throw new Error("No auth token available");
  
  const response = await fetch(`/api/files/recent?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch recent files");
  }
  
  return response.json();
};

export const getFilesByType = async (type: string): Promise<FileSchema[]> => {
  const token = await getIdToken();
  if (!token) throw new Error("No auth token available");
  
  const response = await fetch(`/api/files/type/${type}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch files of type ${type}`);
  }
  
  return response.json();
};

export const getFileDetails = async (fileId: number): Promise<FileWithShareInfo> => {
  const token = await getIdToken();
  if (!token) throw new Error("No auth token available");
  
  const response = await fetch(`/api/files/${fileId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch file details");
  }
  
  return response.json();
};

export const uploadFile = async (file: globalThis.File, onProgress?: (progress: number) => void): Promise<FileWithShareInfo> => {
  const token = await getIdToken();
  if (!token) throw new Error("No auth token available");
  
  const formData = new FormData();
  formData.append("file", file);
  
  const xhr = new XMLHttpRequest();
  
  return new Promise((resolve, reject) => {
    xhr.open("POST", "/api/files/upload");
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = (event.loaded / event.total) * 100;
        onProgress(percentComplete);
      }
    };
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    };
    
    xhr.onerror = () => {
      reject(new Error("Network error during upload"));
    };
    
    xhr.send(formData);
  });
};

export const downloadFile = async (fileId: number): Promise<Blob> => {
  const token = await getIdToken();
  if (!token) throw new Error("No auth token available");
  
  const response = await fetch(`/api/files/${fileId}/download`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Failed to download file");
  }
  
  return response.blob();
};

export const deleteFile = async (fileId: number): Promise<void> => {
  const token = await getIdToken();
  if (!token) throw new Error("No auth token available");
  
  const response = await fetch(`/api/files/${fileId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Failed to delete file");
  }
};

export const starFile = async (fileId: number, starred: boolean): Promise<FileWithShareInfo> => {
  const token = await getIdToken();
  if (!token) throw new Error("No auth token available");
  
  const response = await fetch(`/api/files/${fileId}/star`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ starred }),
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Failed to update star status");
  }
  
  return response.json();
};

export const shareFile = async (fileId: number, expiryDays?: number): Promise<{ shareLink: string }> => {
  const token = await getIdToken();
  if (!token) throw new Error("No auth token available");
  
  const response = await fetch(`/api/files/${fileId}/share`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiryDays }),
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Failed to share file");
  }
  
  return response.json();
};

export const deleteSharedLink = async (sharedId: number): Promise<void> => {
  const token = await getIdToken();
  if (!token) throw new Error("No auth token available");
  
  const response = await fetch(`/api/shared/${sharedId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Failed to delete shared link");
  }
};

export const getSharedFile = async (shareLink: string): Promise<{ file: File }> => {
  const response = await fetch(`/api/shared/${shareLink}`);
  
  if (!response.ok) {
    throw new Error("Failed to access shared file");
  }
  
  return response.json();
};
