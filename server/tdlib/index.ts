import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { getTdjson } from 'prebuilt-tdlib';
import { log } from 'console';
import { loginWithGoogle } from '@/lib/firebase';

import pino from 'pino';
import tdl, { Client } from 'tdl';
import { check } from 'drizzle-orm/mysql-core';
import { is } from 'drizzle-orm';

const logger = pino({
  transport: {
    target: 'pino-pretty'
  }
});

// Configure tdl to use prebuilt-tdlib
tdl.configure({ tdjson: getTdjson() });

// TDLib interface
export interface TDLibClient {
  initialize(): Promise<void>;
  send(query: any): Promise<any>; // Changed to accept any query object
  receive(timeout?: number): Promise<any>;
  destroy(): Promise<void>;
  isAuthenticated(): boolean;
  downloadFile(fileId: number, priority?: number): Promise<string>; // fileId is number in TDLib
  uploadFile(filePath: string, fileType?: any): Promise<any>; // fileType is an object in TDLib
  sendMessageWithFile(
    channelId: string,
    filePath: string,
    caption: string
  ): Promise<any>; // Return type is message object
  getFile(fileId: number): Promise<any>; // fileId is number in TDLib
}

// Configuration for TDLib
interface TDLibConfig {
  apiId: number;
  apiHash: string;
  phoneNumber: string;
  databaseDirectory: string;
  filesDirectory: string;
  useTestDc: boolean;
  useChatInfoDatabase: boolean;
  useMessageDatabase: boolean;
  useSecretChats: boolean;
  systemLanguageCode: string;
  deviceModel: string;
  systemVersion: string;
  applicationVersion: string;
  enableStorageOptimizer: boolean;
  useFileDatabase: boolean;
}

// Error class for TDLib errors
export class TDLibError extends Error {
  code: number;

  constructor(message: string, code = 0) {
    super(message);
    this.name = 'TDLibError';
    this.code = code;
  }
}

/**
 * TDLib client implementation
 * In a real implementation, this would interact with the TDLib binary
 * For this example, we're creating a mock implementation
 */
export class TDLibClientImpl implements TDLibClient {
  private config: TDLibConfig;
  private client: Client | null = null;
  private authenticated: boolean = false;
  private events: EventEmitter = new EventEmitter();
  private channelId: string;

  constructor(
    config: Partial<TDLibConfig> = {},
    channelId = ''
  ) {
    this.channelId = channelId || process.env.TELEGRAM_CHANNEL_ID || '';

    // Default configuration
    this.config = {
      apiId: parseInt(process.env.TELEGRAM_APP_API_ID || '0'),
      apiHash: process.env.TELEGRAM_APP_API_HASH || '',
      phoneNumber: process.env.TELEGRAM_PHONE || '',
      databaseDirectory: path.join(os.tmpdir(), 'tdlib'),
      filesDirectory: path.join(os.tmpdir(), 'tdlib_files'),
      useTestDc: false,
      useChatInfoDatabase: true,
      useMessageDatabase: true,
      useSecretChats: false,
      systemLanguageCode: 'en',
      deviceModel: 'Server',
      systemVersion: 'Unknown',
      applicationVersion: '1.0.0',
      enableStorageOptimizer: true,
      useFileDatabase: true,
      ...config
    };

    // Create directories if they don't exist
    if (!fs.existsSync(this.config.databaseDirectory)) {
      fs.mkdirSync(this.config.databaseDirectory, { recursive: true });
    }

    if (!fs.existsSync(this.config.filesDirectory)) {
      fs.mkdirSync(this.config.filesDirectory, { recursive: true });
    }
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing TDLib client...');

      // Check if the required configuration (API ID, API Hash) is present
      if (!this.config.apiId || !this.config.apiHash) {
        throw new TDLibError('Missing required configuration (API ID or API Hash)', 400);
      }

      // Create the tdl client
      this.client = tdl.createClient({
        apiId: this.config.apiId,
        apiHash: this.config.apiHash,
        databaseDirectory: this.config.databaseDirectory,
        filesDirectory: this.config.filesDirectory,
        useTestDc: this.config.useTestDc,
        tdlibParameters: {
          use_message_database: this.config.useMessageDatabase,
          use_secret_chats: this.config.useSecretChats,
          system_language_code: this.config.systemLanguageCode,
          application_version: this.config.applicationVersion,
          device_model: this.config.deviceModel,
          system_version: this.config.systemVersion,
          use_file_database: this.config.useFileDatabase,
          use_chat_info_database: this.config.useChatInfoDatabase,
          enable_storage_optimizer: this.config.enableStorageOptimizer,
        }
      });

      // Set up error handling
      this.client.on('error', (error) => {
        logger.error('TDLib client error:', error);
        this.events.emit('error', error);
      });

      // Set up update handling (for authentication)
      this.client.on('update', (update) => {
        // logger.info('Received update:', update);
        if (update._ === 'updateAuthorizationState') {
          if (update.authorization_state._ === 'authorizationStateReady') {
            this.authenticated = true;
            logger.info('TDLib client authenticated successfully');
            this.events.emit('authenticated');
          } else if (update.authorization_state._ === 'authorizationStateClosed') {
            this.authenticated = false;
            logger.info('TDLib client closed');
            this.events.emit('close');
          }
        }
      });

      // Log in to Telegram
      await this.client.login({
        getPhoneNumber: async (retry?: boolean) => {
          if (retry) {
            logger.error('Invalid phone number provided during login.');
            throw new Error('Invalid phone number'); // Or handle retry logic
          }
          return this.config.phoneNumber;
        },
      });


      // Wait for authentication to complete
      await new Promise<void>((resolve) => {
        if (this.authenticated) {
          resolve();
        } else {
          this.events.once('authenticated', resolve);
        }
      });

      logger.info('TDLib client initialized and authenticated');
    } catch (error) {
      logger.error('Failed to initialize TDLib client:', error);
      throw error;
    }
  }

  async send(query: any): Promise<any> {
    if (!this.client) {
      throw new TDLibError('TDLib client not initialized', 500);
    }
    try {
      return await this.client.invoke(query);
    } catch (error: any) {
      logger.error(`TDLib send error for query ${query._}:`, error);
      throw new TDLibError(`TDLib method ${query._} failed: ${error.message}`, error.code);
    }
  }

  async receive(timeout: number = 10): Promise<any> {
    // This method is not typically used directly with tdl's event-based approach
    // Updates are received via client.on('update', ...) or client.iterUpdates()
    // Returning a placeholder or throwing an error might be appropriate
    throw new Error('Receive method is not supported with this TDLib client implementation');
  }

  async destroy(): Promise<void> {
    if (this.client) {
      logger.info('Closing TDLib client...');
      await this.client.close();
      this.client = null;
      this.authenticated = false;
      logger.info('TDLib client closed');
    }
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  async downloadFile(fileId: number, priority: number = 1): Promise<string> {
    if (!this.client) {
      throw new TDLibError('TDLib client not initialized', 500);
    }
    if (!this.authenticated) {
      throw new TDLibError('Not authenticated', 401);
    }

    try {
      // Get file information first to check if it's already downloaded
      const fileInfo = await this.getFile(fileId);

      // if (fileInfo.local.is_downloading_completed) {
      //   logger.info(`File ${fileId} already downloaded to ${fileInfo.local.path}`);
      //   return fileInfo.local.path;
      // }

      logger.info(`Downloading file with ID: ${fileId}, priority: ${priority}`);
      // Use client.invoke with the downloadFile method
      // const downloadedFile = await this.client.invoke({
      //   _: 'downloadFile',
      //   file_id: fileId, // Set to true if you want to wait for download to complete
      //   priority: priority,
      //   synchronous: false, // async download
      // });
      const downloadedFile = await this.client.invoke({
        _: 'downloadFile',
        file_id: fileId,
        priority: 32,
        offset: 0,
        limit: 0,
        synchronous: false // Use asynchronous download instead
      }).catch((error: any) => {
        // console.error('Error initiating download:', error);
        logger.error(`Error initiating download for file ID ${fileId}:`, error);
        logger.error(`error is : ${error}`);
      });

      this.client.on('update', update => {
        if (update._ === 'updateFile') {
          const file = update.file;
          if (file.local && file.local.path && file.local.is_downloading_completed) {
            logger.info('Downloaded:', file.local.path);
          }
        }
      });
      

      logger.info(`Download request sent for file ID: ${fileId}`);
      logger.info(`Download response: ${JSON.stringify(downloadedFile)}`);

      // The downloadFile method in TDLib doesn't return the file path directly.
      // It returns an updated file object. We need to wait for the update
      // indicating the download is complete and the local path is available.
      // This requires listening for 'updateFile' events.

      // For simplicity in this implementation, we'll just return the file info
      // and assume the download will happen in the background.
      // A more robust implementation would involve waiting for the 'updateFile'
      // with is_downloading_completed: true and then getting the file info again.

      // Let's get the file info again to return the current state,
      // which might include the local path if the download was very fast.
      // const fileInfoAfterDownloadRequest = await this.getFile(fileId);

      // if (fileInfoAfterDownloadRequest.local.path && fileInfoAfterDownloadRequest.local.is_downloading_completed) {
      //    logger.info(`File ${fileId} downloaded successfully to ${fileInfoAfterDownloadRequest.local.path}`);
      //    return fileInfoAfterDownloadRequest.local.path;
      // } else if (fileInfoAfterDownloadRequest.local.path && fileInfoAfterDownloadRequest.local.is_downloading_active) {
      //    logger.info(`Download started for file ${fileId}. Local path: ${fileInfoAfterDownloadRequest.local.path}`);
      //    // In a real application, you would track the download progress
      //    // and wait for completion. For now, we return the path where it will be saved.
      //    return fileInfoAfterDownloadRequest.local.path;
      // }
      // else {
      //   // If no local path is immediately available, we can't return a path yet.
      //   // A real implementation would need to handle this asynchronously.
      //   throw new TDLibError(`Download initiated for file ${fileId}, but local path not immediately available.`, 200); // Use a non-error code to indicate download is in progress
      // }

      return downloadedFile.local.path; // Return the local path where the file will be saved


    } catch (error: any) {
      logger.error(`TDLib downloadFile error for file ID ${fileId}:`, error);
      throw new TDLibError(`TDLib downloadFile failed for file ID ${fileId}: ${error.message}`, error.code);
    }
    // return downloadedFile.local.path;
  }

  async checkChatIdExistance(checkerchatId: number): Promise<boolean> {
    //bflix_files_storage_channel
    const channelUsername = '@bflix_files_storage_channel';
    try {
      // const chat = await this.client?.invoke({
      //   '@type': 'searchPublicChat',
      //   username: channelUsername.replace('@', ''),
      // });
      const chats = await this.client?.invoke({
        _: 'getChats',
        chat_list: { _: 'chatListMain' },
        limit: 4000
      });
      // logger.info(`Chats retrieved successfully: ${JSON.stringify(chats)}`);
      // Check if the chat ID exists in the retrieved chats
      if(typeof checkerchatId != 'number') {
        checkerchatId = parseInt(checkerchatId);
      }
      
      const chat = chats?.chat_ids.find((chatId: number) => {
        return chatId === checkerchatId;
      });

      logger.info(`Chat for ${channelUsername} retrieved successfully: ${chat}`);

      if (chat) {
        logger.info(`Chat ID ${checkerchatId} exists.`);
        return true;
      } else {
        logger.info(`Chat ID ${checkerchatId} does not exist.`);
        return false;
      }
    } catch (error: any) {
      logger.error('Error getting chat:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = error.code || 500;
      throw new TDLibError(`Failed to get chat: ${errorMessage}`, errorCode);
    }
  }

  async uploadFile(filePath: string, fileType: any = { _: 'fileTypeDocument' }): Promise<any> {
    if (!this.client) {
      throw new TDLibError('TDLib client not initialized', 500);
    }
    if (!this.authenticated) {
      throw new TDLibError('Not authenticated', 401);
    }

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      throw new TDLibError(`File not found: ${filePath}`, 404);
    }

    try {
      logger.info(`Uploading file: ${filePath}, type: ${fileType._}`);
      let channelID: number = typeof this.channelId === 'number'
        ? this.channelId
        : parseInt(this.channelId);

      return await this.checkChatIdExistance(channelID).then(
        async (chatId) => {
          if (chatId) {
            logger.info(`Chat ID ${channelID} exists.`);

            const fileId = await this.client?.invoke({
              _: 'preliminaryUploadFile',
              file: {
                _: 'inputFileLocal',
                path: filePath
              },
              file_type: {
                _: 'fileTypeDocument'
              },
              priority: 32
            });
            logger.info(`file id is ${fileId}`);
            // file sending with message result
            const uploadedFile = await this.client?.invoke({
              _: 'sendMessage',
              chat_id: channelID,
              input_message_content: {
                _: 'inputMessageDocument',
                document: {
                  _: 'inputFileId',
                  id: fileId.id
                },
                // document: {
                //   _: 'inputFileLocal',
                //   path: filePath,
                // },
              },
            });
            // Create a file object from the local file path
            // const fileBuffer = fs.readFileSync(filePath);
            // const file = new File([fileBuffer], path.basename(filePath));
            // const UpdatingFile = await this.client?.invoke({
            //   _: 'updateFile',
            //   file: {
            //     _: 'inputFileLocal',
            //     path: filePath
            //   }
            // });
            let completedMessage: any = null;
            const messageId = uploadedFile.id;
            const fileMiMEType = uploadedFile?.content?.document?.mime_type || 'application/octet-stream';
            const uploadfileName = uploadedFile?.content?.document?.file_name || 'unknown';

            logger.info(`File upload response: ${JSON.stringify(uploadedFile)}`);

            if (uploadedFile && uploadedFile._ === 'message' && uploadedFile.content && uploadedFile.content.document && uploadedFile.content.document.document && uploadedFile.content.document.document.local) {
              const fileId = uploadedFile.content.document.document.id;
              logger.info(`File upload initiated with file ID: ${fileId}. Waiting for upload to complete...`);

              // Wait for the file upload to complete
              await new Promise<void>((resolve, reject) => {
                
                // let is_done:boolean = false;
                const onUpdateFile = (update: any) => {
                  if (update._ === 'updateFile' && update.file.id === fileId) {
                    logger.info(`Update for file ${fileId}: ${JSON.stringify(update)}`);
                    if (update.file.local.is_downloading_completed === true && update.file.local.is_downloading_active === false) {
                      logger.info(`File ${fileId} upload completed.`);
                      completedMessage = update;
                      this.client?.off('update', onUpdateFile); // Stop listening
                      resolve();
                    } else if (update.file.local.is_downloading_completed === false && update.file.local.is_downloading_active === true) {
                      logger.info(`File ${fileId} is still uploading...`);
                      this.client?.on('update', onUpdateFile);
                    } else if (update.file.local.is_downloading_completed === false && update.file.local.is_downloading_active === false) {
                      logger.error(`File ${fileId} upload failed.`);
                      this.client?.off('update', onUpdateFile); // Stop listening
                      reject(new TDLibError(`File upload failed for file ID ${fileId}`, 500));
                    }
                  }
                };
                this.client?.on('update', onUpdateFile);

              });

              // Get the updated message after upload completion
              // const completedMessage = await this.client?.invoke({
              //   _: 'getMessage',
              //   chat_id: channelID,
              //   message_id: uploadedFile.id, // Use the message ID from the initial response
              // });

              // logger.info(`Completed message after upload: ${JSON.stringify(completedMessage)}`);

              if (completedMessage && completedMessage._ === 'updateFile' && completedMessage.file && completedMessage.file.local && completedMessage.file.local.is_downloading_completed) {
                 logger.info(`File uploaded successfully and message updated: ${JSON.stringify(completedMessage)}`);
                 const fileId = completedMessage.file.id;
                 const filePath = completedMessage.file.local.path;
                 const fileSize = completedMessage.file.size;
                 const result = {
                   messageId: messageId,
                   fileName: uploadfileName,
                   mimeType: fileMiMEType,
                   fileId: fileId,
                   remoteFileId: fileId,
                   localFileId: fileId,
                   filePath: filePath,
                   fileSize: fileSize,
                 };
                 logger.info(`File upload completed successfully: ${JSON.stringify(result)}`);
                 return result; // Return the full message object with completed upload info
              } else {
                logger.error(`Failed to get updated message after file upload completion: ${JSON.stringify(completedMessage)}`);
                throw new TDLibError('Failed to get updated message after file upload completion', 500);
              }

            }
          } else {
            throw new TDLibError(`Chat ID ${channelID} does not exist`, 404);
          }
      });
    } catch (error: any) {
      logger.error(`TDLib uploadFile error for file ${filePath}:`, error);
      throw new TDLibError(`TDLib uploadFile failed for file ${filePath}: ${error.message}`, error.code);
    }
  }

  async sendMessageWithFile(
    channelId: string,
    filePath: string,
    caption: string
  ): Promise<any> {
    if (!this.client) {
      throw new TDLibError('TDLib client not initialized', 500);
    }
    if (!this.authenticated) {
      throw new TDLibError('Not authenticated', 401);
    }

    try {
      // First, upload the file
      // The uploadFile method now waits for the upload to complete and returns the message object
      const message = await this.uploadFile(filePath);

      logger.info(`File uploaded successfully: ${JSON.stringify(message)}`);

      if (!message || !message.messageId) {
        throw new TDLibError('message is undefined', 500);
      }

      // if (!message || message._ !== 'message' || !message.id) {
      //   throw new TDLibError('File upload and message sending failed', 500);
      // }

      logger.info(`Message sent successfully with ID: ${message.messageId}`);
      return message; // Return the full message object

    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`TDLib sendMessageWithFile error for file ${filePath}: ${errorMessage}`);
      const errorCode = error.code || 500;
      throw new TDLibError(`TDLib sendMessageWithFile failed for file ${filePath}: ${errorMessage}`, errorCode);
    }
  }

  async getFile(fileId: number): Promise<any> {
    if (!this.client) {
      throw new TDLibError('TDLib client not initialized', 500);
    }
    if (!this.authenticated) {
      throw new TDLibError('Not authenticated', 401);
    }

    try {
      logger.info(`Getting file info for file ID: ${fileId}`);
      // Use client.invoke with the getFile method
      const fileInfo = await this.client.invoke({
        _: 'getFile',
        file_id: fileId,
      });
      logger.info(`File info retrieved: ${JSON.stringify(fileInfo)}`);

      if (fileInfo && fileInfo._ === 'file') {
        logger.info(`File info retrieved successfully for file ID: ${fileId}`);
        return fileInfo; // Return the full file object
      } else {
        throw new TDLibError('TDLib getFile did not return a valid file object', 500);
      }

    } catch (error: any) {
      logger.error(`TDLib getFile error for file ID ${fileId}:`, error);
      throw new TDLibError(`TDLib getFile failed for file ID ${fileId}: ${error.message}`, error.code);
    }
  }
}

// Singleton instance
let tdLibInstance: TDLibClient | null = null;

// Create or get the TDLib client instance
export function getTDLibClient(): TDLibClient {
  if (!tdLibInstance) {
    tdLibInstance = new TDLibClientImpl();
  }
  return tdLibInstance;
}

// Split a file into chunks (for large files > 2GB)
export async function splitFile(filePath: string, chunkSize: number = 1.9 * 1024 * 1024 * 1024): Promise<string[]> {
  // Check if the file exists
  if (!fs.existsSync(filePath)) {
    throw new TDLibError(`File not found: ${filePath}`, 404);
  }

  // Get file size
  const stats = fs.statSync(filePath);

  // If file is smaller than chunk size, return the original file
  if (stats.size <= chunkSize) {
    return [filePath];
  }

  // Calculate number of chunks
  const numChunks = Math.ceil(stats.size / chunkSize);
  const chunkPaths: string[] = [];

  const fd = fs.openSync(filePath, 'r');
  try {
    for (let i = 0; i < numChunks; i++) {
      const chunkPath = `${filePath}.part${i + 1}`;
      chunkPaths.push(chunkPath);

      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, stats.size);
      const buffer = Buffer.alloc(end - start);

      fs.readSync(fd, buffer, 0, end - start, start);
      fs.writeFileSync(chunkPath, buffer);
    }
  } finally {
    fs.closeSync(fd);
  }

  return chunkPaths;
}

// Join chunks back into a single file
export async function joinChunks(chunkPaths: string[], outputPath: string): Promise<string> {
  // Create the write stream for the output file
  const writeStream = fs.createWriteStream(outputPath);

  for (const chunkPath of chunkPaths) {
    // Read the chunk
    const chunkData = fs.readFileSync(chunkPath);

    // Write the chunk to the output file
    writeStream.write(chunkData);

    // Delete the chunk file
    fs.unlinkSync(chunkPath);
  }

  // Close the write stream
  await new Promise((resolve) => {
    writeStream.end(resolve);
  });

  return outputPath;
}
