import { useState } from "react";
import MainHeader from "@/components/MainHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Shield, Mail, Bell, User, Key, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Profile form schema
const profileFormSchema = z.object({
  displayName: z.string().min(2, {
    message: "Display name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }).optional(),
});

// Notification settings schema
const notificationFormSchema = z.object({
  emailNotifications: z.boolean(),
  newShares: z.boolean(),
  newUploads: z.boolean(),
  securityAlerts: z.boolean(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type NotificationFormValues = z.infer<typeof notificationFormSchema>;

export default function Settings() {
  const { user, logout, refreshUserData } = useAuth();
  const { toast } = useToast();
  
  // Format bytes to human readable format
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Get user's initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const displayName = user?.user.displayName || user?.user.email?.split('@')[0] || 'User';
  const initials = getInitials(displayName);
  
  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: user?.user.displayName || user?.user.email?.split('@')[0] || '',
      email: user?.user.email || '',
    },
  });

  // Notification form
  const notificationForm = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      emailNotifications: true,
      newShares: true,
      newUploads: true,
      securityAlerts: true,
    },
  });

  // Handle profile update
  const onProfileSubmit = async (values: ProfileFormValues) => {
    try {
      toast({
        title: "Profile Updated",
        description: "Your profile settings have been saved.",
      });
      
      // Normally would update the user profile here
      // await updateUserProfile(values);
      await refreshUserData();
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update your profile.",
        variant: "destructive",
      });
    }
  };

  // Handle notification settings update
  const onNotificationSubmit = async (values: NotificationFormValues) => {
    try {
      toast({
        title: "Notification Settings Updated",
        description: "Your notification preferences have been saved.",
      });
    } catch (error) {
      console.error("Notification settings update error:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update notification settings.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <MainHeader onUploadClick={() => {}} />
      
      <div className="flex-grow p-4 sm:p-6 lg:p-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>
          
          <Tabs defaultValue="account" className="space-y-6">
            <TabsList className="grid grid-cols-4 w-full md:w-auto">
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="storage">Storage</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>
            
            {/* Account Settings */}
            <TabsContent value="account" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>
                    Update your personal information and profile settings.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8">
                      <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="flex flex-col items-center space-y-2">
                          <Avatar className="h-24 w-24">
                            <AvatarImage src={user?.user.photoURL || ''} alt={displayName} />
                            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-violet-500 text-white text-2xl">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <Button variant="outline" size="sm">Change Photo</Button>
                        </div>
                        
                        <div className="flex-1 space-y-4">
                          <FormField
                            control={profileForm.control}
                            name="displayName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Display Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormDescription>
                                  This is the name displayed to others.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input {...field} disabled />
                                </FormControl>
                                <FormDescription>
                                  Email changes require verification.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button type="submit">Save Changes</Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Account Management</CardTitle>
                  <CardDescription>
                    Manage your account settings and deactivation options.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Account Status</h4>
                      <p className="text-sm text-gray-500">Your account is active and in good standing</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      Active
                    </span>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Danger Zone</h4>
                    <div className="flex items-center justify-between p-4 border border-red-200 rounded-md bg-red-50">
                      <div>
                        <h4 className="text-sm font-medium text-red-800">Deactivate Account</h4>
                        <p className="text-xs text-red-600">Temporarily disable your account</p>
                      </div>
                      <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">
                        Deactivate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Storage Settings */}
            <TabsContent value="storage" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Storage Usage</CardTitle>
                  <CardDescription>
                    Monitor and manage your storage space.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Used Storage</span>
                      <span className="text-sm text-gray-500">
                        {formatBytes(user?.storageInfo.used || 0)} of {formatBytes(user?.storageInfo.total || 0)}
                      </span>
                    </div>
                    <Progress value={user?.storageInfo.percentage || 0} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <svg className="h-6 w-6 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h4 className="font-medium">Documents</h4>
                      </div>
                      <p className="mt-2 text-xl font-semibold">1.2 GB</p>
                      <p className="text-xs text-gray-500">42 files</p>
                    </div>
                    
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <svg className="h-6 w-6 text-red-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <h4 className="font-medium">Images</h4>
                      </div>
                      <p className="mt-2 text-xl font-semibold">840 MB</p>
                      <p className="text-xs text-gray-500">128 files</p>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <svg className="h-6 w-6 text-purple-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <h4 className="font-medium">Media</h4>
                      </div>
                      <p className="mt-2 text-xl font-semibold">1.8 GB</p>
                      <p className="text-xs text-gray-500">25 files</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Storage Management</h4>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start text-left">
                        <Database className="h-4 w-4 mr-2" />
                        Clean up old files
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <Database className="h-4 w-4 mr-2" />
                        Manage file versions
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    Upgrade Storage Plan
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Security Settings */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Manage your account security and authentication methods.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium mb-4">Password</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-sm font-medium">Change Password</h5>
                          <p className="text-xs text-gray-500">Last updated 3 months ago</p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Key className="h-4 w-4 mr-2" />
                          Update
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="text-sm font-medium mb-4">Two-Factor Authentication</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-sm font-medium">2FA Status</h5>
                          <p className="text-xs text-gray-500">Add an extra layer of security</p>
                        </div>
                        <Switch id="2fa" />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="text-sm font-medium mb-4">Sessions</h4>
                    <div className="space-y-4">
                      <div className="p-3 border rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Shield className="h-5 w-5 text-green-500 mr-2" />
                            <div>
                              <h5 className="text-sm font-medium">Current Device</h5>
                              <p className="text-xs text-gray-500">Chrome on Windows • IP: 192.168.1.1</p>
                            </div>
                          </div>
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Active</span>
                        </div>
                      </div>
                      
                      <Button variant="outline" size="sm" className="w-full">
                        Sign out from all devices
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Notification Settings */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Manage how and when you receive notifications.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...notificationForm}>
                    <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-8">
                      <div className="space-y-4">
                        <FormField
                          control={notificationForm.control}
                          name="emailNotifications"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between space-y-0 rounded-md border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Email Notifications</FormLabel>
                                <FormDescription>
                                  Receive notifications via email.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <Separator />
                        
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium">Notification Types</h4>
                          
                          <FormField
                            control={notificationForm.control}
                            name="newShares"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between space-y-0 rounded-md border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">File Shares</FormLabel>
                                  <FormDescription>
                                    When someone shares a file with you.
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={notificationForm.control}
                            name="newUploads"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between space-y-0 rounded-md border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Upload Completed</FormLabel>
                                  <FormDescription>
                                    When your file uploads are complete.
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={notificationForm.control}
                            name="securityAlerts"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between space-y-0 rounded-md border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Security Alerts</FormLabel>
                                  <FormDescription>
                                    Important security notifications and alerts.
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button type="submit">Save Preferences</Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
