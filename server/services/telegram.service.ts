import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getTDLibClient, TDLibError, splitFile, joinChunks } from '../tdlib';
import pino from 'pino';
import { configDotenv } from 'dotenv';

const logger = pino({
  transport: {
    target: 'pino-pretty'
  }
});

/**
 * Service for interacting with Telegram via TDLib
 */
class TelegramService {
  private client: any;
  private channelId: string;
  private initialized: boolean = false;
  private tempDir: string;

  constructor() {
    this.channelId = process.env.TELEGRAM_CHANNEL_ID || '-1002538087779';
    logger.info(`Telegram channel ID: ${this.channelId}`);
    this.tempDir = path.join(os.tmpdir(), 'telestore_temp');
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Initialize the TDLib client and authenticate
   */
  async initialize(): Promise<void> {
    try {
      // If already initialized, return
      if (this.initialized) {
        return;
      }

      // Check if channel ID is set
      if (!this.channelId) {
        logger.warn('TELEGRAM_CHANNEL_ID not found in environment variables.');
        this.channelId = '-1002538087779'; // Fallback for development
      }

      // Initialize TDLib client
      this.client = getTDLibClient();
      await this.client.initialize();

      // Check if authenticated
      if (!this.client.isAuthenticated()) {
        logger.error('TDLib client is not authenticated. Please check your configuration.');
        throw new Error('TDLib authentication failed');
      }

      logger.info('TDLib client initialized and authenticated successfully');
      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize TDLib client:', error);
      throw error;
    }
  }

  /**
   * Send a file to the configured Telegram channel
   * @param filePath Path to the file to send
   * @param caption Optional caption for the file
   * @returns Object containing messageId and channelId
   */
  async sendFile(filePath: string, fileName: string): Promise<{
    messageId: string;
    channelId: string;
    fileId?: string;
    filePath?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    isUploadingCompleted?: boolean;
    isUploadingActive?: boolean;
    isDownloadingCompleted?: boolean;
    isDownloadingActive?: boolean;
    isDownloadingFailed?: boolean;
    isUploadingFailed?: boolean;
    isUploadingCanceled?: boolean;
  }> {
    // Ensure TDLib is initialized
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      // Get file size
      const stats = fs.statSync(filePath);
      
      // Check if file exceeds Telegram's 2GB limit
      const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
      
      if (stats.size > maxSize) {
        // Split file into chunks
        logger.info(`File size (${stats.size} bytes) exceeds 2GB limit. Splitting file...`);
        const chunkPaths = await splitFile(filePath);
        
        // Send each chunk
        const results = [];
        for (let i = 0; i < chunkPaths.length; i++) {
          const chunkPath = chunkPaths[i];
          const chunkCaption = `${fileName}.part${i + 1}/${chunkPaths.length}`;
          
          logger.info(`Sending chunk ${i + 1}/${chunkPaths.length}: ${chunkPath}`);
          const result = await this.client.sendMessageWithFile(
            this.channelId,
            chunkPath,
            chunkCaption
          );

          logger.info(`Chunk sent successfully: ${result.messageId}`);
          
          results.push(result);
          
          // Cleanup chunk file
          fs.unlinkSync(chunkPath);
        }

        
        
        // Return the first chunk's message ID (we'll use this as the reference)
        return {
          messageId: results[0].messageId,
          channelId: this.channelId
        };
      } else {
        // Send file normally
        logger.info(`Sending file: ${filePath}`);
        const result = await this.client.sendMessageWithFile(
          this.channelId,
          filePath,
          fileName
        );

        logger.info(`File sent successfully result is: ${JSON.stringify(result)}`);
        logger.info(`File sent successfully: ${result.messageId}`);
        logger.info(`File Result: ${JSON.stringify(result)}`);

        
        return {
          messageId: result.messageId,
          fileId: result.fileId,
          channelId: this.channelId,
          filePath: result.filePath,
          fileName: result.fileName,
          fileSize: result.fileSize,
          mimeType: result.mimeType,
        };
      }
    } catch (error) {
      logger.error('Failed to send file:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const channelID = this.channelId;
      const error_result = {errorMessage, channelID, filePath};
      throw new Error(`Failed to send file to Telegram: ${JSON.stringify(error_result)}`);
    }
  }

  /**
   * Download a file from Telegram
   * @param messageId ID of the message containing the file
   * @param channelId ID of the channel containing the message
   * @returns Path to the downloaded file
   */
  async downloadFile(messageId: string, channelId: string, fileId: number): Promise<string> {
    // Ensure TDLib is initialized
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      // Get the message
      logger.info(`Downloading file with message ID: ${messageId} from channel ID: ${channelId}`);
      let message;
      try {
        message = await this.client.send({
          _: 'getMessage',
          chat_id: channelId,
          message_id: messageId
        });
        logger.info(`Message: ${JSON.stringify(message)}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error fetching message: ${errorMessage}`);
        logger.error(`Error details: ${JSON.stringify(error)}`);
        if (error instanceof TDLibError && error.message.includes('Not Found')) {
          logger.warn(`Message with ID ${messageId} not found in channel ${channelId}. It might have been deleted.`);
          throw new Error('File message not found on Telegram.');
        }
        throw error; // Re-throw other errors
      }

      // const message = await this.client.send('getMessage', {
      //   file_id: fileId,
      //   limit: 0,            // 0 = full file
      //   synchronous: true    // wait until download completes
      // });
      
      // Check if the message contains a file
      if (!message || !message.content || !message.content.document) {
        throw new Error('Message does not contain a file');
      }
      
      // Check if the file is a chunk (part of a larger file)
      const caption = message.content.caption?.text || '';
      const partMatch = caption.match(/\.part(\d+)\/(\d+)$/);
      
      if (partMatch) {
        // This is a chunk of a larger file
        const partNumber = parseInt(partMatch[1]);
        const totalParts = parseInt(partMatch[2]);
        
        logger.info(`File is split into ${totalParts} parts. Downloading part ${partNumber}...`);
        
        // We need to download all parts
        const chunkPaths = [];
        
        // Generate the base name (without the .partX/Y suffix)
        const baseName = caption.replace(/\.part\d+\/\d+$/, '');
        
        // Download the current chunk
        const fileId = message.content.document.document.id;
        const chunkPath = await this.client.downloadFile(fileId);
        chunkPaths[partNumber - 1] = chunkPath;
        
        // Find and download the other chunks
        for (let i = 1; i <= totalParts; i++) {
          if (i === partNumber) continue; // Skip the part we already downloaded
          
          // Search for the other parts
          const otherPartCaption = `${baseName}.part${i}/${totalParts}`;
          const search = await this.client.send('searchChatMessages', {
            chat_id: channelId,
            query: otherPartCaption,
            limit: 1
          });
          
          if (!search.messages || search.messages.length === 0) {
            throw new Error(`Could not find part ${i} of the file`);
          }
          
          const otherPartMessage = search.messages[0];
          const otherFileId = otherPartMessage.content.document.document.id;
          const otherChunkPath = await this.client.downloadFile(otherFileId);
          chunkPaths[i - 1] = otherChunkPath;
        }
        
        // Join the chunks
        const outputPath = path.join(this.tempDir, baseName);
        await joinChunks(chunkPaths, outputPath);
        
        return outputPath;
      } else {
        // This is a single file
        const fileId = message.content.document.document.id;
        logger.info(`Downloading file with ID: ${fileId}`);
        const filePath = await this.client.downloadFile(fileId);
        
        // Copy to our temp directory with the original filename
        const outputPath = path.join(this.tempDir, message.content.caption?.text || 'downloaded_file');
        fs.copyFileSync(filePath, outputPath);
        
        return outputPath;
      }
    } catch (error) {
      logger.error('Failed to download file:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);
      throw Error(`Failed to download file from Telegram: ${errorMessage}`);
    }
  }

  /**
   * Check if the TDLib client is authenticated
   * @returns Boolean indicating authentication status
   */
  isAuthenticated(): boolean {
    return this.initialized && this.client.isAuthenticated();
  }

  /**
   * Get the status of the TDLib client
   * @returns Object containing status information
   */
  getStatus(): { initialized: boolean, authenticated: boolean } {
    return {
      initialized: this.initialized,
      authenticated: this.isAuthenticated()
    };
  }
}


// Export singleton instance
export const telegramService = new TelegramService();
