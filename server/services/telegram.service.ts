import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getTDLibClient, TDLibError, splitFile, joinChunks } from '../tdlib';

/**
 * Service for interacting with Telegram via TDLib
 */
class TelegramService {
  private client: any;
  private channelId: string;
  private initialized: boolean = false;
  private tempDir: string;

  constructor() {
    this.channelId = process.env.TELEGRAM_CHANNEL_ID || '';
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
        console.warn('TELEGRAM_CHANNEL_ID not found in environment variables.');
        this.channelId = 'default_channel_id'; // Fallback for development
      }
      
      // Initialize TDLib client
      this.client = getTDLibClient();
      await this.client.initialize();
      
      // Check if authenticated
      if (!this.client.isAuthenticated()) {
        console.error('TDLib client is not authenticated. Please check your configuration.');
        throw new Error('TDLib authentication failed');
      }
      
      console.log('TDLib client initialized and authenticated successfully');
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize TDLib client:', error);
      throw error;
    }
  }

  /**
   * Send a file to the configured Telegram channel
   * @param filePath Path to the file to send
   * @param caption Optional caption for the file
   * @returns Object containing messageId and channelId
   */
  async sendFile(filePath: string, fileName: string): Promise<{ messageId: string, channelId: string }> {
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
        console.log(`File size (${stats.size} bytes) exceeds 2GB limit. Splitting file...`);
        const chunkPaths = await splitFile(filePath);
        
        // Send each chunk
        const results = [];
        for (let i = 0; i < chunkPaths.length; i++) {
          const chunkPath = chunkPaths[i];
          const chunkCaption = `${fileName}.part${i + 1}/${chunkPaths.length}`;
          
          console.log(`Sending chunk ${i + 1}/${chunkPaths.length}: ${chunkPath}`);
          const result = await this.client.sendMessageWithFile(
            this.channelId,
            chunkPath,
            chunkCaption
          );
          
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
        console.log(`Sending file: ${filePath}`);
        const result = await this.client.sendMessageWithFile(
          this.channelId,
          filePath,
          fileName
        );
        
        return {
          messageId: result.messageId,
          channelId: this.channelId
        };
      }
    } catch (error) {
      console.error('Failed to send file:', error);
      throw new Error(`Failed to send file to Telegram: ${error.message}`);
    }
  }

  /**
   * Download a file from Telegram
   * @param messageId ID of the message containing the file
   * @param channelId ID of the channel containing the message
   * @returns Path to the downloaded file
   */
  async downloadFile(messageId: string, channelId: string): Promise<string> {
    // Ensure TDLib is initialized
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      // Get the message
      const message = await this.client.send('getMessage', {
        chat_id: channelId,
        message_id: messageId
      });
      
      // Check if the message contains a file
      if (!message.content || !message.content.document) {
        throw new Error('Message does not contain a file');
      }
      
      // Check if the file is a chunk (part of a larger file)
      const caption = message.content.caption?.text || '';
      const partMatch = caption.match(/\.part(\d+)\/(\d+)$/);
      
      if (partMatch) {
        // This is a chunk of a larger file
        const partNumber = parseInt(partMatch[1]);
        const totalParts = parseInt(partMatch[2]);
        
        console.log(`File is split into ${totalParts} parts. Downloading part ${partNumber}...`);
        
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
        const filePath = await this.client.downloadFile(fileId);
        
        // Copy to our temp directory with the original filename
        const outputPath = path.join(this.tempDir, message.content.caption?.text || 'downloaded_file');
        fs.copyFileSync(filePath, outputPath);
        
        return outputPath;
      }
    } catch (error) {
      console.error('Failed to download file:', error);
      throw new Error(`Failed to download file from Telegram: ${error.message}`);
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
