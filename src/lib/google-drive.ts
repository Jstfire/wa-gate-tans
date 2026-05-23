import { SignJWT, importPKCS8 } from 'jose'

export interface GoogleDriveConfig {
  folderId: string
  clientId?: string
  clientSecret?: string
  refreshToken?: string
  serviceAccountJson?: string
  serviceAccountEmail?: string
  serviceAccountPrivateKey?: string
}

type EnvRecord = Record<string, string | undefined>

type DriveFileResponse = {
  id?: string
  name?: string
  mimeType?: string
  webViewLink?: string
}

type DriveListResponse = {
  files?: DriveFileResponse[]
}

type TokenResponse = {
  access_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

type ServiceAccountCredentials = {
  client_email?: string
  private_key?: string
}

export type DriveAuthMode = 'service-account' | 'oauth-refresh-token'

export class GoogleDriveClient {
  private folderId: string
  private authMode: DriveAuthMode
  private clientId?: string
  private clientSecret?: string
  private refreshToken?: string
  private serviceAccountEmail?: string
  private serviceAccountPrivateKey?: string
  private accessToken: string | null = null
  private accessTokenExpiresAt = 0

  constructor(config: GoogleDriveConfig) {
    this.folderId = config.folderId

    const serviceAccount = parseServiceAccount(config.serviceAccountJson)
    this.serviceAccountEmail = config.serviceAccountEmail ?? serviceAccount?.client_email
    this.serviceAccountPrivateKey = normalizePrivateKey(
      config.serviceAccountPrivateKey ?? serviceAccount?.private_key
    )

    this.clientId = config.clientId
    this.clientSecret = config.clientSecret
    this.refreshToken = config.refreshToken

    if (this.serviceAccountEmail && this.serviceAccountPrivateKey) {
      this.authMode = 'service-account'
    } else if (this.clientId && this.clientSecret && this.refreshToken) {
      this.authMode = 'oauth-refresh-token'
    } else {
      throw new Error('Google Drive is not configured. Provide service account credentials or OAuth refresh token credentials.')
    }
  }

  getMode(): DriveAuthMode {
    return this.authMode
  }

  async uploadFile(
    fileName: string,
    mimeType: string,
    fileBuffer: Buffer
  ): Promise<{ id: string; url: string }> {
    const token = await this.getAccessToken()
    const metadata = {
      name: fileName,
      parents: [this.folderId],
    }

    const form = new FormData()
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json; charset=UTF-8' }))
    form.append('file', new Blob([fileBuffer], { type: mimeType }), fileName)

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    const data = await parseDriveResponse<DriveFileResponse>(response)

    if (!data.id || !data.webViewLink) {
      throw new Error('Google Drive upload response did not include id/webViewLink')
    }

    await this.makePublic(data.id)

    return { id: data.id, url: data.webViewLink }
  }

  async deleteFile(fileId: string): Promise<void> {
    const token = await this.getAccessToken()
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok && response.status !== 404) {
      throw new Error(`Google Drive delete failed: ${response.status} ${await response.text()}`)
    }
  }

  async getFile(fileId: string): Promise<Buffer> {
    const token = await this.getAccessToken()
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
      throw new Error(`Google Drive get file failed: ${response.status} ${await response.text()}`)
    }
    return Buffer.from(await response.arrayBuffer())
  }

  async listFiles(): Promise<Array<{ id: string; name: string; mimeType: string }>> {
    const token = await this.getAccessToken()
    const query = encodeURIComponent(`'${this.folderId}' in parents and trashed=false`)
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType)&pageSize=1000&spaces=drive`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await parseDriveResponse<DriveListResponse>(response)
    return (data.files ?? []).map((file) => ({
      id: file.id ?? '',
      name: file.name ?? '',
      mimeType: file.mimeType ?? '',
    }))
  }

  async verifyConnection(): Promise<{ mode: DriveAuthMode; folderId: string; fileCount: number }> {
    const files = await this.listFiles()
    return { mode: this.authMode, folderId: this.folderId, fileCount: files.length }
  }

  private async makePublic(fileId: string): Promise<void> {
    const token = await this.getAccessToken()
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    })
    if (!response.ok) {
      throw new Error(`Google Drive permission failed: ${response.status} ${await response.text()}`)
    }
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now()
    if (this.accessToken && now < this.accessTokenExpiresAt - 60_000) {
      return this.accessToken
    }

    const token = this.authMode === 'service-account'
      ? await this.fetchServiceAccountAccessToken()
      : await this.fetchOauthAccessToken()

    this.accessToken = token.access_token ?? null
    this.accessTokenExpiresAt = now + ((token.expires_in ?? 3600) * 1000)

    if (!this.accessToken) {
      throw new Error(token.error_description ?? token.error ?? 'Google token response did not include access_token')
    }

    return this.accessToken
  }

  private async fetchOauthAccessToken(): Promise<TokenResponse> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId ?? '',
        client_secret: this.clientSecret ?? '',
        refresh_token: this.refreshToken ?? '',
        grant_type: 'refresh_token',
      }),
    })
    return parseDriveResponse<TokenResponse>(response)
  }

  private async fetchServiceAccountAccessToken(): Promise<TokenResponse> {
    const email = this.serviceAccountEmail
    const privateKey = this.serviceAccountPrivateKey
    if (!email || !privateKey) throw new Error('Service account credentials are incomplete')

    const key = await importPKCS8(privateKey, 'RS256')
    const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/drive' })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuer(email)
      .setAudience('https://oauth2.googleapis.com/token')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(key)

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    })
    return parseDriveResponse<TokenResponse>(response)
  }
}

let driveClient: GoogleDriveClient | null = null
let driveClientMode: string | null = null

export function getGoogleDriveClient(env?: EnvRecord): GoogleDriveClient {
  const source = env ?? process.env
  const serviceAccountJson = source.GOOGLE_SERVICE_ACCOUNT_JSON
  const serviceAccountEmail = source.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const serviceAccountPrivateKey = source.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  const modeKey = serviceAccountJson || `${serviceAccountEmail ?? ''}:${serviceAccountPrivateKey ? 'key' : ''}` || 'oauth'

  if (!driveClient || driveClientMode !== modeKey) {
    driveClient = new GoogleDriveClient({
      folderId: source.GOOGLE_DRIVE_FOLDER_ID ?? '',
      clientId: source.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: source.GOOGLE_OAUTH_CLIENT_SECRET,
      refreshToken: source.GOOGLE_OAUTH_REFRESH_TOKEN,
      serviceAccountJson,
      serviceAccountEmail,
      serviceAccountPrivateKey,
    })
    driveClientMode = modeKey
  }
  return driveClient
}

function parseServiceAccount(value: string | undefined): ServiceAccountCredentials | null {
  if (!value) return null
  try {
    return JSON.parse(value) as ServiceAccountCredentials
  } catch {
    return null
  }
}

function normalizePrivateKey(value: string | undefined): string | undefined {
  return value?.replace(/\\n/g, '\n')
}

async function parseDriveResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  const data = text ? JSON.parse(text) as T : {} as T
  if (!response.ok) {
    throw new Error(`Google Drive API error ${response.status}: ${text}`)
  }
  return data
}
