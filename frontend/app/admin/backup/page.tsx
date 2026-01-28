'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft, 
  Download, 
  Upload,
  Database,
  HardDrive,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import Navigation from '@/components/layout/navigation'

export default function AdminBackup() {
  const [backupInProgress, setBackupInProgress] = useState(false)
  const [restoreInProgress, setRestoreInProgress] = useState(false)

  const createBackup = async () => {
    setBackupInProgress(true)
    setTimeout(() => {
      alert('Backup created successfully!')
      setBackupInProgress(false)
    }, 3000)
  }

  const restoreBackup = async () => {
    setRestoreInProgress(true)
    setTimeout(() => {
      alert('System restored successfully!')
      setRestoreInProgress(false)
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold mcc-text-primary font-serif">Backup & Restore</h1>
            <p className="text-gray-600">Manage system backups and data recovery</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="mcc-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Create Backup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">Create a complete backup of all system data including users, items, and settings.</p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">Database</span>
                  </div>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">File Storage</span>
                  </div>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">System Settings</span>
                  </div>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
              </div>
              
              <Button 
                onClick={createBackup}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={backupInProgress}
              >
                {backupInProgress ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Creating Backup...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Create Full Backup
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="mcc-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Restore System
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-orange-300 rounded-lg p-6 bg-orange-50">
                <AlertTriangle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-sm text-orange-700 text-center font-medium">
                  Warning: Restoring will overwrite all current data
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Select Backup File</label>
                <input 
                  type="file" 
                  accept=".backup,.sql,.zip"
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <Button 
                onClick={restoreBackup}
                className="w-full bg-orange-600 hover:bg-orange-700"
                disabled={restoreInProgress}
              >
                {restoreInProgress ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Restoring System...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Restore from Backup
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mcc-card mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Backup History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { date: '2024-01-15 10:30 AM', size: '45.2 MB', type: 'Full Backup', status: 'Success' },
                { date: '2024-01-14 10:30 AM', size: '44.8 MB', type: 'Full Backup', status: 'Success' },
                { date: '2024-01-13 10:30 AM', size: '44.1 MB', type: 'Full Backup', status: 'Success' },
                { date: '2024-01-12 10:30 AM', size: '43.9 MB', type: 'Full Backup', status: 'Failed' }
              ].map((backup, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${backup.status === 'Success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div>
                      <p className="font-medium">{backup.date}</p>
                      <p className="text-sm text-gray-600">{backup.type} - {backup.size}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {backup.status === 'Success' && (
                      <>
                        <Button size="sm" variant="outline">
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                        <Button size="sm" variant="outline">
                          <Upload className="w-4 h-4 mr-1" />
                          Restore
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}