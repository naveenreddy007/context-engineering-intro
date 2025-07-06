'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { MainLayout } from '@/components/layout/main-layout'
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Save,
  Eye,
  EyeOff,
  Upload,
  Trash2,
  Key,
  Mail,
  Phone,
  Building,
  MapPin
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface UserSettings {
  profile: {
    name: string
    email: string
    phone: string
    company: string
    address: string
    city: string
    state: string
    pincode: string
    avatar?: string
  }
  notifications: {
    emailNotifications: boolean
    pushNotifications: boolean
    taskReminders: boolean
    eventUpdates: boolean
    clientMessages: boolean
    weeklyReports: boolean
  }
  preferences: {
    theme: string
    language: string
    timezone: string
    dateFormat: string
    currency: string
  }
  security: {
    twoFactorEnabled: boolean
    lastPasswordChange: string
  }
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('profile')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async (): Promise<UserSettings> => {
      const response = await fetch('/api/settings')
      if (!response.ok) {
        throw new Error('Failed to fetch settings')
      }
      return response.json()
    },
    enabled: !!session?.user
  })

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<UserSettings>) => {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      if (!response.ok) {
        throw new Error('Failed to update settings')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Settings updated successfully')
    },
    onError: () => {
      toast.error('Failed to update settings')
    }
  })

  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordData) => {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      if (!response.ok) {
        throw new Error('Failed to change password')
      }
      return response.json()
    },
    onSuccess: () => {
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast.success('Password changed successfully')
    },
    onError: () => {
      toast.error('Failed to change password')
    }
  })

  const handleProfileUpdate = (field: string, value: any) => {
    if (!settings) return
    
    const updatedSettings = {
      ...settings,
      profile: {
        ...settings.profile,
        [field]: value
      }
    }
    updateSettingsMutation.mutate(updatedSettings)
  }

  const handleNotificationUpdate = (field: string, value: boolean) => {
    if (!settings) return
    
    const updatedSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [field]: value
      }
    }
    updateSettingsMutation.mutate(updatedSettings)
  }

  const handlePreferenceUpdate = (field: string, value: string) => {
    if (!settings) return
    
    const updatedSettings = {
      ...settings,
      preferences: {
        ...settings.preferences,
        [field]: value
      }
    }
    updateSettingsMutation.mutate(updatedSettings)
  }

  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }
    changePasswordMutation.mutate(passwordData)
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'preferences', name: 'Preferences', icon: Palette },
    { id: 'security', name: 'Security', icon: Shield }
  ]

  return (
    <MainLayout title="Settings">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.name}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : settings ? (
              <>
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name
                          </label>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              value={settings.profile.name}
                              onChange={(e) => handleProfileUpdate('name', e.target.value)}
                              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email Address
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <input
                              type="email"
                              value={settings.profile.email}
                              onChange={(e) => handleProfileUpdate('email', e.target.value)}
                              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <input
                              type="tel"
                              value={settings.profile.phone}
                              onChange={(e) => handleProfileUpdate('phone', e.target.value)}
                              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Company
                          </label>
                          <div className="relative">
                            <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              value={settings.profile.company}
                              onChange={(e) => handleProfileUpdate('company', e.target.value)}
                              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address
                          </label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              value={settings.profile.address}
                              onChange={(e) => handleProfileUpdate('address', e.target.value)}
                              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            value={settings.profile.city}
                            onChange={(e) => handleProfileUpdate('city', e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            State
                          </label>
                          <input
                            type="text"
                            value={settings.profile.state}
                            onChange={(e) => handleProfileUpdate('state', e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            PIN Code
                          </label>
                          <input
                            type="text"
                            value={settings.profile.pincode}
                            onChange={(e) => handleProfileUpdate('pincode', e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
                      <div className="space-y-4">
                        {Object.entries(settings.notifications).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </p>
                              <p className="text-sm text-gray-600">
                                {key === 'emailNotifications' && 'Receive notifications via email'}
                                {key === 'pushNotifications' && 'Receive push notifications in browser'}
                                {key === 'taskReminders' && 'Get reminders for upcoming tasks'}
                                {key === 'eventUpdates' && 'Receive updates about event changes'}
                                {key === 'clientMessages' && 'Get notified of new client messages'}
                                {key === 'weeklyReports' && 'Receive weekly performance reports'}
                              </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={value}
                                onChange={(e) => handleNotificationUpdate(key, e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Preferences Tab */}
                {activeTab === 'preferences' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Application Preferences</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Theme
                          </label>
                          <select
                            value={settings.preferences.theme}
                            onChange={(e) => handlePreferenceUpdate('theme', e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="system">System</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Language
                          </label>
                          <select
                            value={settings.preferences.language}
                            onChange={(e) => handlePreferenceUpdate('language', e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="en">English</option>
                            <option value="hi">Hindi</option>
                            <option value="es">Spanish</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Timezone
                          </label>
                          <select
                            value={settings.preferences.timezone}
                            onChange={(e) => handlePreferenceUpdate('timezone', e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                            <option value="America/New_York">America/New_York (EST)</option>
                            <option value="Europe/London">Europe/London (GMT)</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date Format
                          </label>
                          <select
                            value={settings.preferences.dateFormat}
                            onChange={(e) => handlePreferenceUpdate('dateFormat', e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Currency
                          </label>
                          <select
                            value={settings.preferences.currency}
                            onChange={(e) => handlePreferenceUpdate('currency', e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="INR">INR (₹)</option>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
                      
                      {/* Change Password */}
                      <div className="bg-gray-50 rounded-lg p-6 mb-6">
                        <h4 className="text-md font-medium text-gray-900 mb-4">Change Password</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Current Password
                            </label>
                            <div className="relative">
                              <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              New Password
                            </label>
                            <input
                              type="password"
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Confirm New Password
                            </label>
                            <input
                              type="password"
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          
                          <button
                            onClick={handlePasswordChange}
                            disabled={changePasswordMutation.isPending}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                          </button>
                        </div>
                      </div>
                      
                      {/* Two Factor Authentication */}
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
                          <p className="text-sm text-gray-600">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.security.twoFactorEnabled}
                            onChange={(e) => {
                              // Handle 2FA toggle
                              console.log('2FA toggle:', e.target.checked)
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <p>Last password change: {new Date(settings.security.lastPasswordChange).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}