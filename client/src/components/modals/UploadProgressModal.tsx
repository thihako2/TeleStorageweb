import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle, Cloud } from "lucide-react";

interface UploadingFile {
  file: File;
  id: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
}

interface UploadProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  uploads: UploadingFile[];
}

export default function UploadProgressModal({ isOpen, onClose, uploads }: UploadProgressModalProps) {
  // Check if all uploads are completed or errored
  const allFinished = uploads.length > 0 && uploads.every(file => 
    file.status === "completed" || file.status === "error"
  );

  // Count successful uploads
  const successCount = uploads.filter(file => file.status === "completed").length;
  
  // Count failed uploads
  const failedCount = uploads.filter(file => file.status === "error").length;
  
  // Calculate overall progress
  const overallProgress = uploads.length === 0 
    ? 0 
    : uploads.reduce((sum, file) => sum + file.progress, 0) / uploads.length;
  
  // Format bytes to human-readable format
  const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  
  // Calculate the uploaded and total size for a file
  const getFileProgress = (file: UploadingFile) => {
    const totalSize = file.file.size;
    const uploadedSize = (file.progress / 100) * totalSize;
    
    return {
      uploaded: formatBytes(uploadedSize),
      total: formatBytes(totalSize),
    };
  };
  
  // Estimate the remaining time based on progress
  // This is a simplified estimate and would be more accurate with actual upload speed tracking
  const getEstimatedTime = (file: UploadingFile) => {
    // If file is pending or completed, no time estimate
    if (file.status !== "uploading" || file.progress >= 100) {
      return "";
    }
    
    // Very simple remaining time estimate
    if (file.progress < 10) return "calculating...";
    if (file.progress < 25) return "~1 minute left";
    if (file.progress < 50) return "~40 seconds left";
    if (file.progress < 75) return "~25 seconds left";
    if (file.progress < 90) return "~10 seconds left";
    return "almost done...";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
            <Cloud className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center pt-2">
            {allFinished ? "Upload Complete" : "Uploading Files"}
          </DialogTitle>
          {!allFinished && (
            <p className="text-center text-sm text-gray-500">
              Please wait while your files are being uploaded to TeleStore.
            </p>
          )}
          {allFinished && (
            <p className="text-center text-sm text-gray-500">
              {successCount === uploads.length
                ? `All ${successCount} ${successCount === 1 ? 'file has' : 'files have'} been uploaded successfully.`
                : `${successCount} of ${uploads.length} files uploaded successfully. ${failedCount} ${failedCount === 1 ? 'file' : 'files'} failed.`}
            </p>
          )}
        </DialogHeader>
        
        <div className="space-y-4 my-4">
          {/* Overall progress */}
          {!allFinished && uploads.length > 1 && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-xs font-medium">{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>
          )}
          
          {/* Individual file progress */}
          {uploads.map((file) => {
            const { uploaded, total } = getFileProgress(file);
            const timeEstimate = getEstimatedTime(file);
            
            return (
              <div 
                key={file.id} 
                className={`p-3 rounded-lg ${
                  file.status === "completed" 
                    ? "bg-green-50" 
                    : file.status === "error" 
                    ? "bg-red-50" 
                    : "bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center overflow-hidden">
                    {file.status === "completed" ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    ) : file.status === "error" ? (
                      <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                    ) : (
                      <div className="h-5 w-5 mr-2 flex-shrink-0" />
                    )}
                    <span className="text-sm text-gray-900 truncate max-w-xs">{file.file.name}</span>
                  </div>
                  <span 
                    className={`text-xs font-medium ${
                      file.status === "completed" 
                        ? "text-green-600" 
                        : file.status === "error" 
                        ? "text-red-600" 
                        : "text-blue-600"
                    }`}
                  >
                    {file.status === "completed" 
                      ? "Completed" 
                      : file.status === "error" 
                      ? "Failed" 
                      : `${Math.round(file.progress)}%`}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      file.status === "completed" 
                        ? "bg-green-500" 
                        : file.status === "error" 
                        ? "bg-red-500" 
                        : "bg-primary"
                    }`} 
                    style={{ width: `${file.progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-500">
                    {file.status === "completed" 
                      ? total 
                      : file.status === "error" 
                      ? file.error || "Upload failed" 
                      : `${uploaded} / ${total}`}
                  </span>
                  {file.status === "uploading" && timeEstimate && (
                    <span className="text-xs text-gray-500">{timeEstimate}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant={allFinished ? "default" : "outline"} 
            onClick={onClose}
            className="w-full"
          >
            {allFinished ? "Done" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
