import { google } from 'googleapis'

export interface GoogleDriveConfig {
  clientId: string
  clientSecret: string
  refreshToken: string
  folderId: string
}

export class GoogleDriveClient {
  private drive: ReturnType<typeof google.drive>
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>
  private folderId: string

  constructor(config: GoogleDriveConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      'urn:ietf:wg:oauth:2.0:oob'
    )

    this.oauth2Client.setCredentials({
      refresh_token: config.refreshToken,
    })

    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client })
    this.folderId = config.folderId
  }

  async uploadFile(
    fileName: string,
    mimeType: string,
    fileBuffer: Buffer
  ): Promise<{ id: string; url: string }> {
    try {
      const { Readable } = await import('node:stream')
      const stream = Readable.from(fileBuffer)
      
      const response = await this.drive.files.create({
        requestBody: {
          name: fileName,
          parents: [this.folderId],
        },
        media: {
          mimeType,
          body: stream,
        },
        fields: 'id, webViewLink',
      })

      if (!response.data.id || !response.data.webViewLink) {
        throw new Error('Failed to upload file to Google Drive')
      }

      // Make file publicly accessible
      await this.drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      })

      return {
        id: response.data.id,
        url: response.data.webViewLink,
      }
    } catch (error) {
      console.error('Google Drive upload error:', error)
      throw new Error(`Failed to upload file: ${error}`)
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.drive.files.delete({
        fileId,
      })
    } catch (error) {
      console.error('Google Drive delete error:', error)
      throw new Error(`Failed to delete file: ${error}`)
    }
  }

  async getFile(fileId: string): Promise<Buffer> {
    try {
      const response = await this.drive.files.get(
        {
          fileId,
          alt: 'media',
        },
        { responseType: 'arraybuffer' }
      )

      return Buffer.from(response.data as ArrayBuffer)
    } catch (error) {
      console.error('Google Drive get file error:', error)
      throw new Error(`Failed to get file: ${error}`)
    }
  }

  async listFiles(): Promise<Array<{ id: string; name: string; mimeType: string }>> {
    try {
      const response = await this.drive.files.list({
        q: `'${this.folderId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType)',
        pageSize: 1000,
      })

      return (response.data.files ?? []).map((f) => ({
        id: f.id ?? '',
        name: f.name ?? '',
        mimeType: f.mimeType ?? '',
      }))
    } catch (error) {
      console.error('Google Drive list files error:', error)
      throw new Error(`Failed to list files: ${error}`)
    }
  }
}

// Singleton instance
let driveClient: GoogleDriveClient | null = null

export function getGoogleDriveClient(): GoogleDriveClient {
  if (!driveClient) {
    driveClient = new GoogleDriveClient({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN!,
      folderId: process.env.GOOGLE_DRIVE_FOLDER_ID!,
    })
  }
  return driveClient
}
