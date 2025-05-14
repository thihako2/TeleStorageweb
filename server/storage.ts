import { 
  users, type User, type InsertUser, 
  files, type File, type InsertFile,
  sharedFiles, type SharedFile, type InsertSharedFile,
  FileWithShareInfo, UserWithStorage
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUid(uid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStorage(userId: number, bytesAdded: number): Promise<User>;
  getUserWithStorageInfo(userId: number): Promise<UserWithStorage | undefined>;
  
  // File operations
  createFile(file: InsertFile): Promise<File>;
  getFile(id: number): Promise<File | undefined>;
  getUserFiles(userId: number): Promise<File[]>;
  getRecentUserFiles(userId: number, limit: number): Promise<File[]>;
  getFilesByType(userId: number, fileType: string): Promise<File[]>;
  deleteFile(id: number): Promise<boolean>;
  starFile(id: number, starred: boolean): Promise<File | undefined>;
  getFileWithShareInfo(id: number): Promise<FileWithShareInfo | undefined>;
  
  // Shared file operations
  createSharedFile(sharedFile: InsertSharedFile): Promise<SharedFile>;
  getSharedFile(id: number): Promise<SharedFile | undefined>;
  getSharedFileByLink(shareLink: string): Promise<SharedFile | undefined>;
  deleteSharedFile(id: number): Promise<boolean>;
  incrementAccessCount(id: number): Promise<SharedFile | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private files: Map<number, File>;
  private sharedFiles: Map<number, SharedFile>;
  private userIdCounter: number;
  private fileIdCounter: number;
  private sharedFileIdCounter: number;

  constructor() {
    this.users = new Map();
    this.files = new Map();
    this.sharedFiles = new Map();
    this.userIdCounter = 1;
    this.fileIdCounter = 1;
    this.sharedFileIdCounter = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUid(uid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.uid === uid);
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { 
      ...userData, 
      id, 
      createdAt: now, 
      quota: 5368709120, // 5GB in bytes
      usedStorage: 0 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserStorage(userId: number, bytesAdded: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    const updatedUser = {
      ...user,
      usedStorage: Math.max(0, user.usedStorage + bytesAdded)
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getUserWithStorageInfo(userId: number): Promise<UserWithStorage | undefined> {
    const user = await this.getUser(userId);
    if (!user) {
      return undefined;
    }
    
    return {
      user,
      storageInfo: {
        used: user.usedStorage,
        total: user.quota,
        percentage: (user.usedStorage / user.quota) * 100
      }
    };
  }

  // File operations
  async createFile(fileData: InsertFile): Promise<File> {
    const id = this.fileIdCounter++;
    const now = new Date();
    const file: File = {
      ...fileData,
      id,
      uploadTimestamp: now,
      isDeleted: false,
      isStarred: false
    };
    this.files.set(id, file);
    return file;
  }

  async getFile(id: number): Promise<File | undefined> {
    return this.files.get(id);
  }

  async getUserFiles(userId: number): Promise<File[]> {
    return Array.from(this.files.values())
      .filter(file => file.uploaderId === userId && !file.isDeleted)
      .sort((a, b) => b.uploadTimestamp.getTime() - a.uploadTimestamp.getTime());
  }

  async getRecentUserFiles(userId: number, limit: number): Promise<File[]> {
    return (await this.getUserFiles(userId)).slice(0, limit);
  }

  async getFilesByType(userId: number, fileType: string): Promise<File[]> {
    return Array.from(this.files.values())
      .filter(file => file.uploaderId === userId && !file.isDeleted && file.fileType.includes(fileType))
      .sort((a, b) => b.uploadTimestamp.getTime() - a.uploadTimestamp.getTime());
  }

  async deleteFile(id: number): Promise<boolean> {
    const file = await this.getFile(id);
    if (!file) {
      return false;
    }
    
    // Mark as deleted instead of removing
    const updatedFile = { ...file, isDeleted: true };
    this.files.set(id, updatedFile);
    return true;
  }

  async starFile(id: number, starred: boolean): Promise<File | undefined> {
    const file = await this.getFile(id);
    if (!file) {
      return undefined;
    }

    const updatedFile = { ...file, isStarred: starred };
    this.files.set(id, updatedFile);
    return updatedFile;
  }

  async getFileWithShareInfo(id: number): Promise<FileWithShareInfo | undefined> {
    const file = await this.getFile(id);
    if (!file) {
      return undefined;
    }

    // Find share info if exists
    const shareInfo = Array.from(this.sharedFiles.values())
      .find(sf => sf.fileId === id);
    
    if (!shareInfo) {
      return file;
    }

    return {
      ...file,
      shareInfo: {
        shareLink: shareInfo.shareLink,
        expiryDate: shareInfo.expiryDate
      }
    };
  }

  // Shared file operations
  async createSharedFile(sharedFileData: InsertSharedFile): Promise<SharedFile> {
    const id = this.sharedFileIdCounter++;
    const now = new Date();
    const sharedFile: SharedFile = {
      ...sharedFileData,
      id,
      createdAt: now,
      accessCount: 0
    };
    this.sharedFiles.set(id, sharedFile);
    return sharedFile;
  }

  async getSharedFile(id: number): Promise<SharedFile | undefined> {
    return this.sharedFiles.get(id);
  }

  async getSharedFileByLink(shareLink: string): Promise<SharedFile | undefined> {
    return Array.from(this.sharedFiles.values())
      .find(sf => sf.shareLink === shareLink);
  }

  async deleteSharedFile(id: number): Promise<boolean> {
    return this.sharedFiles.delete(id);
  }

  async incrementAccessCount(id: number): Promise<SharedFile | undefined> {
    const sharedFile = await this.getSharedFile(id);
    if (!sharedFile) {
      return undefined;
    }

    const updatedSharedFile = {
      ...sharedFile,
      accessCount: sharedFile.accessCount + 1
    };
    this.sharedFiles.set(id, updatedSharedFile);
    return updatedSharedFile;
  }
}

export const storage = new MemStorage();
