"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Bell,
  Shield,
  CreditCard,
  Palette,
  Globe,
  Mail,
  Smartphone,
  Upload,
  Key,
  LogOut,
  Trash2,
  Save,
  Check,
  AlertTriangle
} from "lucide-react";

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-6 lg:w-fit">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Integrations</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details and public profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-2xl">AC</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Photo
                  </Button>
                  <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max 2MB.</p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="John" defaultValue="Acme" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Doe" defaultValue="Corp" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="john@example.com" defaultValue="admin@acme.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" placeholder="+1 (555) 000-0000" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Input id="bio" placeholder="Tell us about yourself..." />
              </div>

              <div className="flex justify-end">
                <Button>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/20">
            <CardHeader>
              <CardTitle className="text-red-500 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>Irreversible actions for your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Delete Account</p>
                  <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                </div>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Configure what emails you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Account Activity</Label>
                  <p className="text-sm text-muted-foreground">Get notified about important account changes</p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Post Performance</Label>
                  <p className="text-sm text-muted-foreground">Weekly summary of your top performing content</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Product Updates</Label>
                  <p className="text-sm text-muted-foreground">News about new features and improvements</p>
                </div>
                <Switch
                  checked={marketingEmails}
                  onCheckedChange={setMarketingEmails}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Push Notifications</CardTitle>
              <CardDescription>Mobile and browser notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive push notifications on your devices</p>
                </div>
                <Switch
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Scheduled Posts</Label>
                  <p className="text-sm text-muted-foreground">Get notified when posts are published</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Change your password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" />
              </div>
              <Button>
                <Key className="mr-2 h-4 w-4" />
                Update Password
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable 2FA</Label>
                  <p className="text-sm text-muted-foreground">Use an authenticator app for 2FA</p>
                </div>
                <Switch
                  checked={twoFactorEnabled}
                  onCheckedChange={setTwoFactorEnabled}
                />
              </div>
              {twoFactorEnabled && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="font-medium mb-2">Recovery Codes</p>
                  <p className="text-sm text-muted-foreground mb-3">Save these codes in a secure place</p>
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {['ABCD-1234-WXYZ', 'EFGH-5678-UVWX', 'IJKL-9012-QRST', 'MNOP-3456-UVWX'].map((code, i) => (
                      <div key={i} className="bg-background p-2 rounded border">{code}</div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Manage devices where you're logged in</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Chrome on macOS</p>
                    <p className="text-sm text-muted-foreground">Current session • Phoenix, AZ</p>
                  </div>
                </div>
                <Badge>Current</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Safari on iPhone</p>
                    <p className="text-sm text-muted-foreground">Last active 2 days ago • Phoenix, AZ</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Revoke</Button>
              </div>
              <Button variant="outline" className="w-full">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out All Devices
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Manage your subscription plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-6 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-primary">Current Plan</p>
                    <p className="text-2xl font-bold">Pro Plan</p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  $49/month • Renews on March 1, 2025
                </p>
                <div className="flex gap-2">
                  <Button variant="outline">Change Plan</Button>
                  <Button variant="outline">Cancel</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Usage</Label>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Posts per month</span>
                      <span>156 / 500</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '31%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Team members</span>
                      <span>3 / 5</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '60%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Connected platforms</span>
                      <span>4 / 10</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '40%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>Manage your payment methods</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                    VISA
                  </div>
                  <div>
                    <p className="font-medium">Visa ending in 4242</p>
                    <p className="text-sm text-muted-foreground">Expires 12/25</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Edit</Button>
                </div>
              </div>
              <Button variant="outline" className="mt-4 w-full">
                <CreditCard className="mr-2 h-4 w-4" />
                Add Payment Method
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how Nexus looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Theme</Label>
                <div className="grid grid-cols-3 gap-4">
                  <button className="p-4 border rounded-lg hover:border-primary text-center">
                    <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-white border" />
                    <span className="text-sm">Light</span>
                  </button>
                  <button className="p-4 border border-primary rounded-lg bg-primary/5 text-center">
                    <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-slate-900" />
                    <span className="text-sm font-medium">Dark</span>
                  </button>
                  <button className="p-4 border rounded-lg hover:border-primary text-center">
                    <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-gradient-to-r from-white to-slate-900" />
                    <span className="text-sm">System</span>
                  </button>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <Label>Accent Color</Label>
                <div className="flex gap-3">
                  {['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'].map((color) => (
                    <button
                      key={color}
                      className="w-10 h-10 rounded-full border-2 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color, borderColor: color === '#6366f1' ? 'white' : 'transparent' }}
                    />
                  ))}
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">Reduce spacing and padding</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Language & Region</CardTitle>
              <CardDescription>Set your language and timezone preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Language</Label>
                <Select defaultValue="en">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select defaultValue="america-phoenix">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="america-phoenix">America/Phoenix (MST)</SelectItem>
                    <SelectItem value="america-new_york">America/New_York (EST)</SelectItem>
                    <SelectItem value="america-los_angeles">America/Los_Angeles (PST)</SelectItem>
                    <SelectItem value="europe-london">Europe/London (GMT)</SelectItem>
                    <SelectItem value="asia-tokyo">Asia/Tokyo (JST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>24-Hour Time</Label>
                  <p className="text-sm text-muted-foreground">Display time in 24-hour format</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connected Apps</CardTitle>
              <CardDescription>Manage third-party integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: "Slack", description: "Receive notifications in Slack", connected: true },
                { name: "Zapier", description: "Automate workflows", connected: true },
                { name: "Google Analytics", description: "Track website traffic", connected: false },
                { name: "Notion", description: "Sync content to Notion", connected: false },
              ].map((app) => (
                <div key={app.name} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{app.name}</p>
                    <p className="text-sm text-muted-foreground">{app.description}</p>
                  </div>
                  {app.connected ? (
                    <Button variant="outline" size="sm">
                      <Check className="mr-1 h-4 w-4" />
                      Connected
                    </Button>
                  ) : (
                    <Button size="sm">Connect</Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Access</CardTitle>
              <CardDescription>Manage API keys for programmatic access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">Production API Key</p>
                  <Button variant="outline" size="sm">Regenerate</Button>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background p-2 rounded text-sm font-mono">
                    npx_live_xxxxxxxxxxxxxxxx
                  </code>
                  <Button variant="outline" size="icon">
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">Test API Key</p>
                  <Button variant="outline" size="sm">Regenerate</Button>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background p-2 rounded text-sm font-mono">
                    npx_test_xxxxxxxxxxxxxxxx
                  </code>
                  <Button variant="outline" size="icon">
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
