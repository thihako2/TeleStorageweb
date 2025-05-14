import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainHeader from "@/components/MainHeader";
import FilePreviewModal from "@/components/modals/FilePreviewModal";
import ShareFileModal from "@/components/modals/ShareFileModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileWithShareInfo } from "@shared/schema";
import { Search, Clock, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import FileCard from "@/components/FileCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function Shared() {
  const [searchQuery, setSearchQuery] = useState("");
  const [previewFile, setPreviewFile] = useState<FileWithShareInfo | null>(null);
  const [shareFile, setShareFile] = useState<FileWithShareInfo | null>(null);

  // Fetch shared files - would be a real API call in production
  const { data: sharedFiles = [], isLoading: sharedFilesLoading } = useQuery({
    queryKey: ['/api/files/shared'],
    queryFn: () => Promise.resolve([]) // Mock query function
  });

  // Fetch files shared by me - would be a real API call in production
  const { data: mySharedFiles = [], isLoading: mySharedFilesLoading } = useQuery({
    queryKey: ['/api/files/shared/outgoing'],
    queryFn: () => Promise.resolve([]) // Mock query function
  });

  // Filter files based on search query
  const filteredSharedFiles = searchQuery 
    ? sharedFiles.filter((file: any) => file.fileName.toLowerCase().includes(searchQuery.toLowerCase()))
    : sharedFiles;

  const filteredMySharedFiles = searchQuery 
    ? mySharedFiles.filter((file: any) => file.fileName.toLowerCase().includes(searchQuery.toLowerCase()))
    : mySharedFiles;

  return (
    <div className="flex flex-col min-h-screen">
      <MainHeader onUploadClick={() => {}} />
      
      <main className="flex-grow p-4 sm:p-6 lg:p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Shared Files</h1>
              <p className="text-gray-500">Manage files shared with you and by you</p>
            </div>
            
            <div className="w-full md:w-64 mt-4 md:mt-0">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search shared files..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="shared-with-me" className="space-y-6">
            <TabsList>
              <TabsTrigger value="shared-with-me">Shared with me</TabsTrigger>
              <TabsTrigger value="shared-by-me">Shared by me</TabsTrigger>
            </TabsList>
            
            {/* Files shared with me */}
            <TabsContent value="shared-with-me">
              {sharedFilesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <div className="flex items-center space-x-2">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardContent>
                      <CardFooter>
                        <Skeleton className="h-9 w-full" />
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : filteredSharedFiles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* This is a placeholder that would display actual shared files in production */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center space-x-2">
                        <Avatar>
                          <AvatarFallback>JD</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">John Doe</p>
                          <p className="text-xs text-gray-500">Shared yesterday</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-2 mb-3">
                        <svg className="h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          <text x="8.5" y="16" fontSize="4.5" fill="currentColor" fontFamily="sans-serif">DOC</text>
                        </svg>
                        <div>
                          <p className="text-sm font-medium truncate">Project Proposal.docx</p>
                          <p className="text-xs text-gray-500">1.2 MB</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        "Please review the updated project proposal for next week's meeting."
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button size="sm" variant="outline" className="w-full">View File</Button>
                    </CardFooter>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <div className="flex items-center space-x-2">
                        <Avatar>
                          <AvatarFallback>AS</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">Anna Smith</p>
                          <p className="text-xs text-gray-500">Shared 3 days ago</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-2 mb-3">
                        <svg className="h-8 w-8 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          <text x="9" y="16" fontSize="4.5" fill="currentColor" fontFamily="sans-serif">XLS</text>
                        </svg>
                        <div>
                          <p className="text-sm font-medium truncate">Q3 Financial Report.xlsx</p>
                          <p className="text-xs text-gray-500">2.4 MB</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        "Here's the financial report for Q3. Let's discuss it on Monday."
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button size="sm" variant="outline" className="w-full">View File</Button>
                    </CardFooter>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <div className="flex items-center space-x-2">
                        <Avatar>
                          <AvatarFallback>RJ</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">Robert Johnson</p>
                          <p className="text-xs text-gray-500">Shared a week ago</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-2 mb-3">
                        <svg className="h-8 w-8 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          <text x="9.5" y="16" fontSize="5" fill="currentColor" fontFamily="sans-serif">PDF</text>
                        </svg>
                        <div>
                          <p className="text-sm font-medium truncate">Marketing Strategy.pdf</p>
                          <p className="text-xs text-gray-500">3.7 MB</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        "Updated marketing strategy for the next quarter."
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button size="sm" variant="outline" className="w-full">View File</Button>
                    </CardFooter>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No shared files</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No one has shared any files with you yet.
                  </p>
                </div>
              )}
            </TabsContent>
            
            {/* Files shared by me */}
            <TabsContent value="shared-by-me">
              {mySharedFilesLoading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-lg shadow bg-white overflow-hidden">
                      <div className="p-4 h-32 bg-gray-100">
                        <Skeleton className="h-full w-full" />
                      </div>
                      <div className="p-4 border-t border-gray-200">
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2 mb-4" />
                        <div className="flex justify-between">
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="h-6 w-16" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredMySharedFiles.length > 0 ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {/* This is a placeholder that would display actual shared files in production */}
                    <div className="rounded-lg shadow bg-white overflow-hidden">
                      <div className="p-4 flex items-center justify-center bg-blue-50 h-32 relative">
                        <div className="file-icon transform transition-transform">
                          <svg className="h-16 w-16 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            <text x="8.5" y="16" fontSize="4.5" fill="currentColor" fontFamily="sans-serif">DOCX</text>
                          </svg>
                        </div>
                        <div className="absolute top-2 right-2 flex space-x-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <ArrowUpRight className="h-4 w-4 text-gray-400" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-4 border-t border-gray-200">
                        <h3 className="text-sm font-medium text-gray-900 truncate">Meeting_Notes.docx</h3>
                        <div className="flex items-center mt-1">
                          <Clock className="h-3 w-3 text-gray-400 mr-1" />
                          <p className="text-xs text-gray-500">Shared 2 days ago • 3 views</p>
                        </div>
                        <div className="mt-3 flex items-center">
                          <Avatar className="h-5 w-5 mr-1">
                            <AvatarFallback className="text-xs">JD</AvatarFallback>
                          </Avatar>
                          <p className="text-xs text-gray-500">Shared with John Doe</p>
                        </div>
                        <div className="mt-3 flex justify-between">
                          <Button variant="link" size="sm" className="text-xs text-primary hover:text-blue-700 font-medium p-0">
                            Manage
                          </Button>
                          <Button variant="link" size="sm" className="text-xs text-gray-600 hover:text-gray-900 font-medium p-0">
                            Revoke
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="rounded-lg shadow bg-white overflow-hidden">
                      <div className="p-4 flex items-center justify-center bg-green-50 h-32 relative">
                        <div className="file-icon transform transition-transform">
                          <svg className="h-16 w-16 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            <text x="9" y="16" fontSize="4.5" fill="currentColor" fontFamily="sans-serif">XLS</text>
                          </svg>
                        </div>
                        <div className="absolute top-2 right-2 flex space-x-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <ArrowUpRight className="h-4 w-4 text-gray-400" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-4 border-t border-gray-200">
                        <h3 className="text-sm font-medium text-gray-900 truncate">Budget_2023.xlsx</h3>
                        <div className="flex items-center mt-1">
                          <Clock className="h-3 w-3 text-gray-400 mr-1" />
                          <p className="text-xs text-gray-500">Shared 1 week ago • 7 views</p>
                        </div>
                        <div className="mt-3 flex items-center">
                          <div className="flex -space-x-1">
                            <Avatar className="h-5 w-5 border-2 border-white">
                              <AvatarFallback className="text-xs">AS</AvatarFallback>
                            </Avatar>
                            <Avatar className="h-5 w-5 border-2 border-white">
                              <AvatarFallback className="text-xs">RJ</AvatarFallback>
                            </Avatar>
                          </div>
                          <p className="text-xs text-gray-500 ml-2">Shared with 2 people</p>
                        </div>
                        <div className="mt-3 flex justify-between">
                          <Button variant="link" size="sm" className="text-xs text-primary hover:text-blue-700 font-medium p-0">
                            Manage
                          </Button>
                          <Button variant="link" size="sm" className="text-xs text-gray-600 hover:text-gray-900 font-medium p-0">
                            Revoke
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Separator className="my-6" />
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Link Sharing</h3>
                    
                    <div className="space-y-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center space-x-2">
                              <svg className="h-6 w-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                <text x="9.5" y="16" fontSize="5" fill="currentColor" fontFamily="sans-serif">PDF</text>
                              </svg>
                              <div>
                                <CardTitle className="text-base">Annual_Report.pdf</CardTitle>
                                <CardDescription className="text-xs">3.5 MB • Created 10 days ago</CardDescription>
                              </div>
                            </div>
                            <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                              Expires in 3 days
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-gray-50 p-2 rounded text-sm flex items-center justify-between">
                            <code className="text-xs truncate">https://telestore.app/s/aB3xYz789</code>
                            <Button variant="ghost" size="sm" className="h-6 px-2">Copy</Button>
                          </div>
                          <div className="mt-2 text-xs text-gray-500 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            12 accesses • Last accessed yesterday
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                          <Button variant="ghost" size="sm">Manage</Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800 hover:bg-red-50">
                            Revoke Access
                          </Button>
                        </CardFooter>
                      </Card>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No shared files</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You haven't shared any files yet.
                  </p>
                  <div className="mt-6">
                    <Button onClick={() => window.location.href = '/dashboard'}>
                      Go to Files
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      {previewFile && (
        <FilePreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          file={previewFile}
        />
      )}

      {shareFile && (
        <ShareFileModal
          isOpen={!!shareFile}
          onClose={() => setShareFile(null)}
          file={shareFile}
        />
      )}
    </div>
  );
}
