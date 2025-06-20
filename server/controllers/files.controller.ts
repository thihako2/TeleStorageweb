import { Request, Response } from 'express';
import { storage } from '../storage';
import { telegramService } from '../services/telegram.service';
import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { firebaseService } from 'server/services/firebase.service';

const logger = pino({
  transport: {
    target: 'pino-pretty'
  }
});


// Validation schemas
const fileSchema = z.object({
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  telegramMessageId: z.string(),
  channelId: z.string(),
});

const shareFileSchema = z.object({
  expiryDays: z.number().optional(),
});

const starFileSchema = z.object({
  starred: z.boolean(),
});

// Helper function to determine file type from mimetype or extension
const getFileType = (originalname: string, mimetype: string): string => {
  // Get file extension
  const ext = path.extname(originalname).toLowerCase();
  
  // Common document formats
  const documentTypes = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'];
  const spreadsheetTypes = ['.xls', '.xlsx', '.csv', '.ods'];
  const presentationTypes = ['.ppt', '.pptx', '.odp'];
  
  // Image formats
  const imageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
  
  // Audio formats
  const audioTypes = ['.mp3', '.wav', '.ogg', '.flac', '.m4a'];
  
  // Video formats
  const videoTypes = ['.mp4', '.webm', '.avi', '.mov', '.wmv'];
  
  // Archive formats
  const archiveTypes = ['.zip', '.rar', '.7z', '.tar', '.gz'];
  
  // Check by MIME type first
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.startsWith('video/')) return 'video';
  
  // Check by extension
  if (documentTypes.includes(ext)) return 'document';
  if (spreadsheetTypes.includes(ext)) return 'spreadsheet';
  if (presentationTypes.includes(ext)) return 'presentation';
  if (imageTypes.includes(ext)) return 'image';
  if (audioTypes.includes(ext)) return 'audio';
  if (videoTypes.includes(ext)) return 'video';
  if (archiveTypes.includes(ext)) return 'archive';
  
  // Default
  return 'other';
};

export const filesController = {
  /**
   * Upload a file to Telegram and store metadata
   */
  /**
   * Save a file temporarily on the server
   */
  saveTempFile: async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Return the temporary file path
      return res.status(200).json({ tempPath: req.file.path });
    } catch (error) {
      console.error('Save temp file error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ message: 'Failed to save file temporarily', error: errorMessage });
    }
  },

  /**
   * Upload a file to Telegram and store metadata
   */
  uploadFile: async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      let filePath: string;
      let originalname: string;
      let mimetype: string;
      let size: number;
      let isTempFile = false;

      // Check if a temporary file path is provided
      if (req.body.tempPath) {
        filePath = req.body.tempPath;
        isTempFile = true;

        // Get file details from the temporary file
        try {
          const stats = fs.statSync(filePath);
          size = stats.size;
          // Attempt to derive originalname and mimetype from the filename
          originalname = path.basename(filePath).split('-').slice(2).join('-'); // Assuming filename format: timestamp-random-originalname
          mimetype = ''; // Mimetype cannot be reliably determined from path alone, might need a library or store it with temp file
        } catch (error) {
          console.error('Error getting temp file stats:', error);
          return res.status(400).json({ message: 'Invalid temporary file path' });
        }

      } else if (req.file) {
        // Use the directly uploaded file
        filePath = req.file.path;
        originalname = req.file.originalname;
        mimetype = req.file.mimetype;
        size = req.file.size;
      } else {
        return res.status(400).json({ message: 'No file or temporary file path provided' });
      }

      console.log('Uploading file:', originalname, 'from path:', filePath);

      // Check file size - Telegram has a 2GB limit
      const maxSizeBytes = 2 * 1024 * 1024 * 1024; // 2GB
      if (size > maxSizeBytes) {
        // For files > 2GB, we would split them in a real implementation
        // But for simplicity, we'll just reject them in this example
        return res.status(400).json({
          message: 'File too large. Maximum size is 2GB.',
          maxSize: maxSizeBytes,
          actualSize: size
        });
      }

      // Check user quota
      const userInfo = await storage.getUserWithStorageInfo(req.user.id);
      if (userInfo && (userInfo.storageInfo.used + size > userInfo.storageInfo.total)) {
        return res.status(400).json({
          message: 'Storage quota exceeded',
          used: userInfo.storageInfo.used,
          total: userInfo.storageInfo.total,
          required: size
        });
      }

      // Determine file type (using mimetype if available, otherwise fallback to originalname)
      const fileType = getFileType(originalname, mimetype || originalname);

      // Send file to Telegram
      const result = await telegramService.sendFile(filePath, originalname);

      // Store file metadata
      const fileData = {
        fileName: originalname,
        fileType: fileType,
        fileSize: size,
        fileLink: '', // Would be set for certain file types like images in a real implementation
        uploaderId: req.user.id,
        telegramMessageId: result.messageId,
        channelId: result.channelId,
        fileId: result.fileId,
        mimeType: result.mimeType,
        isUploadingCompleted: result.isUploadingCompleted,
        isUploadingActive: result.isUploadingActive,
        isDownloadingCompleted: result.isDownloadingCompleted,
        isDownloadingActive: result.isDownloadingActive,
        isDownloadingFailed: result.isDownloadingFailed,
        isUploadingFailed: result.isUploadingFailed,
        isUploadingCanceled: result.isUploadingCanceled,
      };

      // save file metadata to the firestore database
      // 
      firebaseService.setDatabaseData(`files/${result.fileId}`, {
        fileName: originalname,
        fileType: fileType,
        fileSize: size,
        fileLink: '', // Would be set for certain file types like images in a real implementation
        uploaderId: req.user.id,
        telegramMessageId: result.messageId,
        channelId: result.channelId,
        fileId: result.fileId,
        mimeType: result.mimeType,
        isUploadingCompleted: result.isUploadingCompleted,
        isUploadingActive: result.isUploadingActive,
        isDownloadingCompleted: result.isDownloadingCompleted,
        isDownloadingActive: result.isDownloadingActive,
        isDownloadingFailed: result.isDownloadingFailed,
        isUploadingFailed: result.isUploadingFailed,
        isUploadingCanceled: result.isUploadingCanceled,
      });

      // Memorize file metadata
      const file = await storage.createFile(fileData);

      // Update user storage usage
      await storage.updateUserStorage(req.user.id, size);

      // Return file metadata
      const fileWithShareInfo = await storage.getFileWithShareInfo(file.id);

      // Clean up temporary file after successful upload if it was a temp file
      if (isTempFile) {
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupError) {
          console.error('Failed to clean up temporary file:', cleanupError);
          // Continue even if cleanup fails
        }
      }

      return res.status(201).json(fileWithShareInfo);
    } catch (error) {
      console.error('File upload error:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ message: 'File upload failed', error: errorMessage });
    }
  },

  /**
   * Get all files for the authenticated user
   */
  getUserFiles: async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Get user ID
      const userId = req.user.id;
      
      // Get all files for the user
      const files = await storage.getUserFiles(userId);
      let fileList = [];

      files.forEach(element => {
        // console.log(`File ID: ${element.id}, File Name: ${element.fileName}, File Type: ${element.fileType}`);
        // const file = telegramService.downloadFile(element.telegramMessageId, element.channelId, element.id);
        const file = telegramService.downloadFile(element.telegramMessageId, element.channelId, element.id);
        fileList.push(file);
      });

      // logger.info(`Files List is ${JSON.stringify(fileList)}`);

      return res.status(200).json(files);
    } catch (error) {
      console.error('Get user files error:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ message: 'Failed to get files', error: errorMessage });
    }
  },
  
  /**
   * Get recent files for the authenticated user
   */
  getRecentFiles: async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Get user ID
      const userId = req.user.id;
      
      // Get limit from query params (default to 4)
      const limit = parseInt(req.query.limit as string) || 4;
      // Get recent files for the user
      const files = await storage.getRecentUserFiles(userId, limit);
      return res.status(200).json(files);
    } catch (error) {
      console.error('Get recent files error:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ message: 'Failed to get recent files', error: errorMessage });
    }
  },
  
  /**
   * Get files by type for the authenticated user
   */
  getFilesByType: async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Get user ID
      const userId = req.user.id;
      // Get file type from params
      const fileType = req.params.type;
      
      // Handle special case for "starred" - this isn't a file type but a flag
      if (fileType === 'starred') {
        // In a real implementation, we would filter by the isStarred flag
        // For now, we'll just return an empty array
        return res.status(200).json([]);
      }
      
      // Get files of the specified type for the user
      const files = await storage.getFilesByType(userId, fileType);
      
      return res.status(200).json(files);
    } catch (error) {
      console.error('Get files by type error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ message: 'Failed to get files by type',error: errorMessage});
    }
  },
  
  /**
   * Get a specific file's details
   */
  getFile: async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Get file ID from params
      const fileId = parseInt(req.params.id);
      
      // Get the file
      const file = await storage.getFile(fileId);
      
      // Check if file exists
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      // Check if user is the owner
      if (file.uploaderId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Get file with share info
      const fileWithShareInfo = await storage.getFileWithShareInfo(fileId);
      
      return res.status(200).json(fileWithShareInfo);
    } catch (error) {
      console.error('Get file error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ message: 'Failed to get file',error: errorMessage});
    }
  },
  
  /**
   * Download a file
   */
  downloadFile: async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Get file ID from params
      const fileId = parseInt(req.params.id);
      
      // Get the file
      const file = await storage.getFile(fileId);
      
      // Check if file exists
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      // Check if user is the owner
      if (file.uploaderId !== req.user.id) {
        // Check if file is shared with the user
        // In a real implementation, we would check shared permissions
        // For now, we'll just deny access
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Download file from Telegram
      const filePath = await telegramService.downloadFile(file.telegramMessageId, file.channelId, file.id);
      
      // Set appropriate headers
      res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', file.fileSize);
      
      // Stream the file to the response
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      // Clean up temp file after sending
      fileStream.on('end', () => {
        // Delete the temporary file
        fs.unlinkSync(filePath);
      });
    } catch (error) {
      console.error('Download file error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ message: 'Failed to download file',error: errorMessage});
    }
  },
  
  /**
   * Delete a file
   */
  deleteFile: async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Get file ID from params
      const fileId = parseInt(req.params.id);
      
      // Get the file
      const file = await storage.getFile(fileId);
      
      // Check if file exists
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      // Check if user is the owner
      if (file.uploaderId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Mark file as deleted
      const success = await storage.deleteFile(fileId);
      
      // Update user storage usage (subtract file size)
      await storage.updateUserStorage(req.user.id, -file.fileSize);
      
      return res.status(200).json({ success });
    } catch (error) {
      console.error('Delete file error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ message: 'Failed to delete file',error: errorMessage});
    }
  },
  
  /**
   * Star/unstar a file
   */
  starFile: async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Validate request
      const validatedData = starFileSchema.parse(req.body);
      // Get file ID from params
      const fileId = parseInt(req.params.id);
      // Get the file
      const file = await storage.getFile(fileId);
      
      // Check if file exists
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      // Check if user is the owner
      if (file.uploaderId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Star/unstar the file
      const updatedFile = await storage.starFile(fileId, validatedData.starred);
      
      if (!updatedFile) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      // Get file with share info
      const fileWithShareInfo = await storage.getFileWithShareInfo(fileId);
      return res.status(200).json(fileWithShareInfo);
    } catch (error) {
      console.error('Star file error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ message: 'Failed to star file',error: errorMessage});
    }
  },
  
  /**
   * Share a file
   */
  shareFile: async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Validate request
      const validatedData = shareFileSchema.parse(req.body);
      
      // Get file ID from params
      const fileId = parseInt(req.params.id);
      
      // Get the file
      const file = await storage.getFile(fileId);
      
      // Check if file exists
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      // Check if user is the owner
      if (file.uploaderId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Generate a unique share link
      const shareLink = uuidv4();
      
      // Calculate expiry date if provided
      let expiryDate: Date | undefined = undefined;
      if (validatedData.expiryDays) {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + validatedData.expiryDays);
      }
      
      // Create shared file record
      const sharedFile = await storage.createSharedFile({
        fileId,
        shareLink,
        expiryDate,
      });

      return res.status(200).json({
        id: sharedFile.id,
        shareLink,
        expiryDate: sharedFile.expiryDate
      });
    } catch (error) {
      console.error('Share file error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ message: 'Failed to share file',error: errorMessage});
    }
  },
  
  /**
   * Delete a shared link
   */
  deleteSharedLink: async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Get shared ID from params
      const sharedId = parseInt(req.params.id);
      
      // Get the shared file
      const sharedFile = await storage.getSharedFile(sharedId);
      
      // Check if shared file exists
      if (!sharedFile) {
        return res.status(404).json({ message: 'Shared file not found' });
      }
      
      // Get the original file
      const file = await storage.getFile(sharedFile.fileId);
      
      // Check if file exists
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      // Check if user is the owner
      if (file.uploaderId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Delete the shared link
      const success = await storage.deleteSharedFile(sharedId);
      
      return res.status(200).json({ success });
    } catch (error) {
      console.error('Delete shared link error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ message: 'Failed to delete shared link',error: errorMessage});
    }
  },
  
  /**
   * Get a shared file
   */
  getSharedFile: async (req: Request, res: Response) => {
    try {
      // Get share link from params
      const shareLink = req.params.shareLink;
      
      // Get the shared file
      const sharedFile = await storage.getSharedFileByLink(shareLink);
      
      // Check if shared file exists
      if (!sharedFile) {
        return res.status(404).json({ message: 'Shared file not found' });
      }
      
      // Check if link has expired
      if (sharedFile.expiryDate && new Date() > new Date(sharedFile.expiryDate)) {
        return res.status(403).json({ message: 'Share link has expired' });
      }
      
      // Get the file
      const file = await storage.getFile(sharedFile.fileId);
      
      // Check if file exists
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      // Increment access count
      await storage.incrementAccessCount(sharedFile.id);
      
      return res.status(200).json({ file });
    } catch (error) {
      console.error('Get shared file error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ message: 'Failed to get shared file',error: errorMessage});
    }
  },
};
