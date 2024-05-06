/*
 * Silex website builder, free/libre no-code tool for makers.
 * Copyright (c) 2023 lexoyo and Silex Labs foundation
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { API_CONNECTOR_LOGIN_CALLBACK, API_CONNECTOR_PATH, API_PATH, WEBSITE_DATA_FILE } from '../../constants'
import { ServerConfig } from '../../server/config'
import { ConnectorFile, ConnectorFileContent, StatusCallback, StorageConnector, contentToBuffer, contentToString, toConnectorData } from '../../server/connectors/connectors'
import { ApiError, ConnectorType, ConnectorUser, WebsiteData, WebsiteId, WebsiteMeta, WebsiteMetaFileContent } from '../../types'
import fetch from 'node-fetch'
import crypto, { createHash } from 'crypto'
import { join } from 'path'

/**
 * Gitlab connector
 * @fileoverview Gitlab connector for Silex, connect to the user's Gitlab account to store websites
 * @see https://docs.gitlab.com/ee/api/oauth2.html
 */

export interface GitlabOptions {
  clientId: string
  clientSecret: string
  branch: string
  assetsFolder: string
  //metaRepo: string
  //metaRepoFile: string
  repoPrefix: string
  scope: string
  domain: string
}

interface GitlabToken {
  state: string
  codeVerifier: string
  codeChallenge: string
  token?: {
    access_token: string
    token_type: string
    expires_in: number
    refresh_token: string
    created_at: number
    id_token: string
    scope: string
  }
  userId?: number
  username?: string
}

interface GitlabSession {
  gitlab?: GitlabToken
}

interface GitlabAction {
  action: 'create' | 'delete' | 'move' | 'update'
  file_path: string
  content?: string
}

interface GitlabWriteFile {
  branch: string
  commit_message: string
  id?: string
  actions?: GitlabAction[]
  content?: string
  file_path?: string
  encoding?: 'base64' | 'text'
}

interface GitlabGetToken {
  grant_type: 'authorization_code'
  client_id: string
  client_secret: string
  code: string
  redirect_uri: string
  code_verifier: string
}

interface GitlabWebsiteName {
  name: string
}

interface GitlabCreateBranch {
  branch: string
  ref: string
}

interface MetaRepoFileContent {
  websites: {
    [websiteId: string]: {
      meta: WebsiteMetaFileContent,
      createdAt: string,
      updatedAt: string,
    }
  }
}

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg
   xmlns:svg="http://www.w3.org/2000/svg"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
   width="1000"
   height="963.197"
   viewBox="0 0 1000 963.197"
   version="1.1"
   id="svg85">
  <sodipodi:namedview
     id="namedview87"
     pagecolor="#ffffff"
     bordercolor="#666666"
     borderopacity="1.0"
     inkscape:pageshadow="2"
     inkscape:pageopacity="0.0"
     inkscape:pagecheckerboard="0"
     showgrid="false"
     inkscape:zoom="1"
     inkscape:cx="991.5"
     inkscape:cy="964.5"
     inkscape:window-width="1126"
     inkscape:window-height="895"
     inkscape:window-x="774"
     inkscape:window-y="12"
     inkscape:window-maximized="0"
     inkscape:current-layer="svg85" />
  <defs
     id="defs74">
    <style
       id="style72">.cls-1{fill:#e24329;}.cls-2{fill:#fc6d26;}.cls-3{fill:#fca326;}</style>
  </defs>
  <g
     id="LOGO"
     transform="matrix(5.2068817,0,0,5.2068817,-489.30756,-507.76085)">
    <path
       class="cls-1"
       d="m 282.83,170.73 -0.27,-0.69 -26.14,-68.22 a 6.81,6.81 0 0 0 -2.69,-3.24 7,7 0 0 0 -8,0.43 7,7 0 0 0 -2.32,3.52 l -17.65,54 h -71.47 l -17.65,-54 a 6.86,6.86 0 0 0 -2.32,-3.53 7,7 0 0 0 -8,-0.43 6.87,6.87 0 0 0 -2.69,3.24 L 97.44,170 l -0.26,0.69 a 48.54,48.54 0 0 0 16.1,56.1 l 0.09,0.07 0.24,0.17 39.82,29.82 19.7,14.91 12,9.06 a 8.07,8.07 0 0 0 9.76,0 l 12,-9.06 19.7,-14.91 40.06,-30 0.1,-0.08 a 48.56,48.56 0 0 0 16.08,-56.04 z"
       id="path76" />
    <path
       class="cls-2"
       d="m 282.83,170.73 -0.27,-0.69 a 88.3,88.3 0 0 0 -35.15,15.8 L 190,229.25 c 19.55,14.79 36.57,27.64 36.57,27.64 l 40.06,-30 0.1,-0.08 a 48.56,48.56 0 0 0 16.1,-56.08 z"
       id="path78" />
    <path
       class="cls-3"
       d="m 153.43,256.89 19.7,14.91 12,9.06 a 8.07,8.07 0 0 0 9.76,0 l 12,-9.06 19.7,-14.91 c 0,0 -17.04,-12.89 -36.59,-27.64 -19.55,14.75 -36.57,27.64 -36.57,27.64 z"
       id="path80" />
    <path
       class="cls-2"
       d="M 132.58,185.84 A 88.19,88.19 0 0 0 97.44,170 l -0.26,0.69 a 48.54,48.54 0 0 0 16.1,56.1 l 0.09,0.07 0.24,0.17 39.82,29.82 c 0,0 17,-12.85 36.57,-27.64 z"
       id="path82" />
  </g>
</svg>`
const encodedSvg = encodeURIComponent(svg)
const ICON = `data:image/svg+xml,${encodedSvg}`

export default class GitlabConnector implements StorageConnector {
  connectorId = 'gitlab'
  connectorType = ConnectorType.STORAGE
  displayName = 'GitLab'
  icon = ICON
  disableLogout = false
  color = '#2B1B63'
  background = 'rgba(252, 109, 38, 0.2)'
  options: GitlabOptions

  constructor(private config: ServerConfig, opts: Partial<GitlabOptions>) {
    this.options = {
      branch: 'main',
      assetsFolder: 'assets',
      //metaRepo: 'silex-meta',
      //metaRepoFile: 'websites.json',
      repoPrefix: 'silex_',
      scope: 'api', // 'api+read_api+read_user+read_repository+write_repository+email+sudo+profile+openid'
      ...opts,
    } as GitlabOptions
    if(!this.options.clientId) throw new Error('Missing Gitlab client ID')
    if(!this.options.clientSecret) throw new Error('Missing Gitlab client secret')
    if(!this.options.domain) throw new Error('Missing Gitlab domain')

  }

  // **
  // Convenience methods for the Gitlab API
  private getAssetPath(path: string): string {
    return encodeURIComponent(join(this.options.assetsFolder, path))
  }

  private async createFile(session: GitlabSession, websiteId: WebsiteId, path: string, content: string, isBase64 = false): Promise<void> {
    // Remove leading slash
    const safePath = path.replace(/^\//, '')
    return this.callApi(session, `api/v4/projects/${websiteId}/repository/files/${safePath}`, 'POST', {
      id: websiteId,
      branch: this.options.branch,
      content,
      commit_message: `Create file ${path} from Silex`,
      encoding: isBase64 ? 'base64' : undefined,
    })
  }

  private async updateFile(session: GitlabSession, websiteId: WebsiteId, path: string, content: string, isBase64 = false): Promise<void> {
    // Remove leading slash
    const safePath = path.replace(/^\//, '')
    return this.callApi(session, `api/v4/projects/${websiteId}/repository/files/${safePath}`, 'PUT', {
      id: websiteId,
      branch: this.options.branch,
      content: await contentToString(content),
      commit_message: `Update website asset ${path} from Silex`,
      encoding: isBase64 ? 'base64' : undefined,
    })
  }

  async readFile(session: GitlabSession, websiteId: string, fileName: string): Promise<Buffer> {
    const safePath = fileName.replace(/^\//, '')
    // Call the API
    const url = `${this.options.domain}/api/v4/projects/${websiteId}/repository/files/${safePath}?ref=${this.options.branch}&access_token=${session.gitlab?.token?.access_token}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const json = await response.json()
    if(!response.ok) throw new ApiError(`Error reading file "${fileName}" from Gitlab: ${json?.message ?? json?.error ?? response.statusText}`, response.status)
    // From base64 string to buffer
    const buf = Buffer.from(json.content, 'base64')
    // Return the image bytes
    return buf
  }

  /*
   * Get the meta repo path for the current user
   * The meta repo contains a JSON file which contains the list of websites
   */
  //private getMetaRepoPath(session: GitlabSession): string {
  //  if(!session.gitlab?.username) throw new ApiError('Missing Gitlab user ID. User not logged in?', 401)
  //  return encodeURIComponent(`${session.gitlab.username}/${this.options.metaRepo}`)
  //}

  ///**
  // * Initialize the storage with a meta repo
  // */
  //private async initStorage(session: GitlabSession): Promise<void> {
  //  // Create the meta repo
  //  try {
  //    const project = await this.callApi(session, 'api/v4/projects/', 'POST', {
  //      name: this.options.metaRepo,
  //    }) as any
  //    return this.createFile(session, this.getMetaRepoPath(session), this.options.metaRepoFile, JSON.stringify({
  //      websites: {}
  //    } as MetaRepoFileContent))
  //  } catch (e) {
  //    console.error('Could not init storage', e.statusCode, e.httpStatusCode, e)
  //    throw e
  //  }
  //}

  /**
   * Call the Gitlab API with the user's token and handle errors
   */
  private async callApi(session: GitlabSession, path: string, method: 'POST' | 'GET' | 'PUT' | 'DELETE' = 'GET', body: GitlabWriteFile | GitlabGetToken | GitlabWebsiteName | GitlabCreateBranch | null = null, params: any = {}): Promise<any> {
    const token = session?.gitlab?.token
    const tokenParam = token ? `access_token=${token.access_token}&` : ''
    const paramsStr = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent((v as any).toString())}`).join('&')
    const url = `${this.options.domain}/${path}?${tokenParam}${paramsStr}`
    const headers = {
      'Content-Type': 'application/json',
    }
    if(method === 'GET' && body) {
      console.error('Gitlab API error (4) - GET request with body', {url, method, body, params})
    }
    // With or without body
    const response = await fetch(url, body && method !== 'GET' ? {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    } : {
      method,
      headers,
    })
    let json: { message: string, error: string } | any
    // Handle the case when the server returns an non-JSON response (e.g. 400 Bad Request)
    const text = await response.text()
    if(!response.ok) {
      if (text.includes('A file with this name doesn\'t exist')) {
        throw new ApiError('Gitlab API error (5): Not Found', 404)
      } else if (response.status === 401 && session?.gitlab?.token?.refresh_token) {
        // Refresh the token
        const token = session?.gitlab?.token
        const body = {
          grant_type: 'refresh_token',
          refresh_token: token.refresh_token,
          client_id: this.options.clientId,
          client_secret: this.options.clientSecret,
        }
        const response = await fetch(this.options.domain + '/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body)
        })
        const refreshJson = await response.json()
        if (response.ok) {
          session.gitlab.token = {
            ...token,
            ...refreshJson,
          }
          return await this.callApi(session, path, method, body as any, params)
        } else {
          const message = typeof refreshJson?.message === 'object' ? Object.entries(refreshJson.message).map(entry => entry.join(' ')).join(' ') : refreshJson?.message ?? refreshJson?.error ?? response.statusText
          console.error('Gitlab API error (2) - could not refresh token', response.status, response.statusText, {message}, 'refresh_token:', token.refresh_token)
          // Workaround for when the token is invalid
          // It happens often which is not normal (refresh token should last 6 months)
          this.logout(session)
          // Notify the user
          throw new ApiError(`Gitlab API error (2): ${message}`, response.status)
        }
      } else {
        const message = typeof json?.message === 'object' ? Object.entries(json.message).map(entry => entry.join(' ')).join(' ') : json?.message ?? json?.error ?? response.statusText
        throw new ApiError(`Gitlab API error (1): ${message}`, response.status)
      }
    }
    try {
      json = JSON.parse(text)
    } catch (e) {
      if(!response.ok) {
        // A real error
        throw e
      } else {
        // Useless error linked to the fact that the response is not JSON
        console.error('Gitlab API error (3) - could not parse response', response.status, response.statusText, {url, method, body, params, text})
        return text
      }
    }
    return json
  }

  private generateCodeVerifier() {
    return crypto.randomBytes(64).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
      .substr(0, 128)
  }

  private async generateCodeChallenge(verifier) {
    const hashed = createHash('sha256').update(verifier).digest()
    let base64Url = hashed.toString('base64')
    // Replace '+' with '-', '/' with '_', and remove '='
    base64Url = base64Url.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    return base64Url
  }


  private getRedirect() {
    const params = `connectorId=${this.connectorId}&type=${this.connectorType}`
    return `${this.config.url}${API_PATH}${API_CONNECTOR_PATH}${API_CONNECTOR_LOGIN_CALLBACK}?${params}`
  }

  /**
   * Get the OAuth URL to redirect the user to
   * The URL should look like
   * https://gitlab.example.com/oauth/authorize?client_id=APP_ID&redirect_uri=REDIRECT_URI&response_type=code&state=STATE&scope=REQUESTED_SCOPES&code_challenge=CODE_CHALLENGE&code_challenge_method=S256
   * OAuth2 Step #1 from https://docs.gitlab.com/ee/api/oauth2.html#authorization-code-with-proof-key-for-code-exchange-pkce
   */
  async getOAuthUrl(session: GitlabSession): Promise<string> {
    const redirect_uri = encodeURIComponent(this.getRedirect())

    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const codeVerifier = this.generateCodeVerifier()

    // Create the code challenge
    const codeChallenge = await this.generateCodeChallenge(codeVerifier)

    // Store the code verifier and code challenge in the session
    session.gitlab = {
      ...session.gitlab,
      state,
      codeVerifier,
      codeChallenge,
    }
    return `${this.options.domain}/oauth/authorize?client_id=${this.options.clientId}&redirect_uri=${redirect_uri}&response_type=code&state=${session.gitlab.state}&scope=${this.options.scope}&code_challenge=${codeChallenge}&code_challenge_method=S256`
  }

  getOptions(formData: object): object {
    return {} // FIXME: store branch
  }

  async getLoginForm(session: GitlabSession, redirectTo: string): Promise<null> {
    return null
  }

  async getSettingsForm(session: GitlabSession, redirectTo: string): Promise<null> {
    return null
  }

  async isLoggedIn(session: GitlabSession): Promise<boolean> {
    return !!session?.gitlab?.token
  }

  /**
   * Get the token from return code
   * Set the token in the session
   * OAuth2 Step #2 from https://docs.gitlab.com/ee/api/oauth2.html#authorization-code-with-proof-key-for-code-exchange-pkce
   */
  async setToken(session: GitlabSession, loginResult: any): Promise<void> {
    if(!loginResult.state || loginResult.state !== session.gitlab?.state) throw new ApiError('Invalid state', 401)
    if(!session.gitlab?.codeVerifier) throw new ApiError('Missing code verifier', 401)
    if(!session.gitlab?.codeChallenge) throw new ApiError('Missing code challenge', 401)

    const response = await fetch(this.options.domain + '/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        code: loginResult.code,
        grant_type: 'authorization_code',
        redirect_uri: this.getRedirect(),
        code_verifier: session.gitlab.codeVerifier,
      }),
    })

    const token = await response.json()

    // Store the token in the session
    session.gitlab = { token, state: session.gitlab.state, codeVerifier: session.gitlab.codeVerifier, codeChallenge: session.gitlab.codeChallenge }

    // We need to get the user ID for listWebsites
    const user = await this.callApi(session, 'api/v4/user') as any
    session.gitlab.userId = user.id
    session.gitlab.username = user.username
  }

  async logout(session: GitlabSession): Promise<void> {
    delete session.gitlab
  }

  async getUser(session: GitlabSession): Promise<ConnectorUser> {
    const user = await this.callApi(session, 'api/v4/user') as any
    return {
      name: user.name,
      email: user.email,
      picture: user.avatar_url,
      storage: await toConnectorData(session, this as StorageConnector),
    }
  }

  async listWebsites(session: GitlabSession): Promise<WebsiteMeta[]> {
    //try {
    //  const result = await this.callApi(session, `api/v4/projects/${this.getMetaRepoPath(session)}/repository/files/${this.options.metaRepoFile}`, 'GET', null, {
    //    ref: this.options.branch,
    //  })
    //  const { content } = result
    //  const contentDecoded = Buffer.from(content, 'base64').toString('utf8')
    //  const websites = (JSON.parse(contentDecoded) as MetaRepoFileContent).websites
    //  return Object.entries(websites).map(([websiteId, {meta, createdAt, updatedAt}]) => ({
    //    websiteId,
    //    createdAt: new Date(createdAt),
    //    updatedAt: new Date(updatedAt),
    //    ...meta,
    //  }))
    //} catch (e) {
    //  console.error('Could not list websites', e.statusCode, e.httpStatusCode, e.code)
    //  if (e.statusCode === 404 || e.httpStatusCode === 404) {
    //    await this.initStorage(session)
    //    return []
    //  } else {
    //    throw e
    //  }
    //}
    const projects = await this.callApi(session, `api/v4/users/${session.gitlab?.userId}/projects`) as any[]
    return projects
      .filter(p => p.name.startsWith(this.options.repoPrefix))
      .map(p => ({
        websiteId: p.id,
        name: p.name.replace(this.options.repoPrefix, ''),
        createdAt: p.created_at,
        updatedAt: p.last_activity_at,
        connectorUserSettings: {},
      }))
  }

  async readWebsite(session: GitlabSession, websiteId: string): Promise<WebsiteData> {
    const result = await this.callApi(session, `api/v4/projects/${websiteId}/repository/files/${WEBSITE_DATA_FILE}`, 'GET', null, {
      ref: this.options.branch,
    }) as any
    const { content } = result
    const contentDecoded = Buffer.from(content, 'base64').toString('utf8')
    const websiteData = JSON.parse(contentDecoded) as WebsiteData
    return websiteData
  }

  async createWebsite(session: GitlabSession, websiteMeta: WebsiteMetaFileContent): Promise<WebsiteId> {
    const project = await this.callApi(session, 'api/v4/projects/', 'POST', {
      name: this.options.repoPrefix + websiteMeta.name,
    }) as any
    await this.createFile(session, project.id, WEBSITE_DATA_FILE, JSON.stringify({} as WebsiteData))
    //await this.createFile(session, project.id, WEBSITE_META_DATA_FILE, JSON.stringify(websiteMeta))
    //await this.updateWebsite(session, project.id, {} as WebsiteData)
    //await this.setWebsiteMeta(session, project.id, websiteMeta)
    return project.id
  }

  async updateWebsite(session: GitlabSession, websiteId: WebsiteId, websiteData: WebsiteData): Promise<void> {
    const project = await this.callApi(session, `api/v4/projects/${websiteId}/repository/files/${WEBSITE_DATA_FILE}`, 'PUT', {
      branch: this.options.branch,
      commit_message: 'Update website data from Silex',
      content: JSON.stringify(websiteData),
      id: websiteId,
    })
  }

  async deleteWebsite(session: GitlabSession, websiteId: WebsiteId): Promise<void> {
    // Delete repo
    await this.callApi(session, `api/v4/projects/${websiteId}`, 'DELETE')
    //// Load the meta repo data
    //const file = await this.callApi(session, `api/v4/projects/${this.getMetaRepoPath(session)}/repository/files/${this.options.metaRepoFile}`, 'GET', null, {
    //  ref: this.options.branch,
    //})
    //const metaRepo = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')) as MetaRepoFileContent
    //const data = metaRepo.websites[websiteId]
    //if(!data) throw new ApiError(`Website ${websiteId} not found`, 404)
    //// Update or create the website meta data
    //delete metaRepo.websites[websiteId]
    //// Save the meta repo data
    //const project = await this.callApi(session, `api/v4/projects/${this.getMetaRepoPath(session)}/repository/files/${this.options.metaRepoFile}`, 'PUT', {
    //  branch: this.options.branch,
    //  commit_message: `Delete meta data of ${data.meta.name} (${websiteId}) from Silex`,
    //  content: JSON.stringify(metaRepo),
    //  file_path: this.options.metaRepoFile,
    //})
  }

  async duplicateWebsite(session: GitlabSession, websiteId: string): Promise<void> {
    // Get the repo meta data
    const meta = await this.getWebsiteMeta(session, websiteId)
    // List all the repository files
    const blobs = await this.callApi(session, `api/v4/projects/${websiteId}/repository/tree`, 'GET', null, {
      recursive: true,
    })
    const files = blobs
      .filter(item => item.type === 'blob')
      .map(item => item.path)
    // Create a new repo
    const newId = await this.createWebsite(session, {
      ...meta,
      name: meta.name + ' Copy ' + new Date().toISOString().replace(/T.*/, '') + ' ' + Math.random().toString(36).substring(2, 4),
    })
    // Upload all files
    for(const file of files) {
      const path = encodeURIComponent(file)
      const content = await this.readFile(session, websiteId, path)
      // From buffer to string
      const contentStr = content.toString('base64')
      switch(file) {
      case WEBSITE_DATA_FILE:
        await this.updateFile(session, newId, path, contentStr, true)
        break
      default:
        await this.createFile(session, newId, path, contentStr, true)
      }
    }
  }

  async getWebsiteMeta(session: GitlabSession, websiteId: WebsiteId): Promise<WebsiteMeta> {
    //const file = await this.callApi(session, `api/v4/projects/${this.getMetaRepoPath(session)}/repository/files/${this.options.metaRepoFile}`, 'GET', null, {
    //  ref: this.options.branch,
    //})
    //const metaRepo = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')) as MetaRepoFileContent
    //if(!metaRepo.websites[websiteId]) throw new ApiError(`Website ${websiteId} not found`, 404)
    //return {
    //  websiteId,
    //  createdAt: new Date(metaRepo.websites[websiteId].createdAt),
    //  updatedAt: new Date(metaRepo.websites[websiteId].updatedAt),
    //  ...metaRepo.websites[websiteId].meta,
    //}
    // const response = await this.callApi(session, `api/v4/projects/${websiteId}/repository/files/${WEBSITE_META_DATA_FILE}`, 'GET', null, {
    //   ref: this.options.branch,
    // }) as any
    // Base64 to string to JSON
    // const contentDecoded = Buffer.from(response.content, 'base64').toString('utf8')
    // const websiteMeta = JSON.parse(contentDecoded) as WebsiteMetaFileContent
    const project = await this.callApi(session, `api/v4/projects/${websiteId}`)
    return {
      websiteId,
      name: project.name.replace(this.options.repoPrefix, ''),
      imageUrl: project.avatar_url,
      createdAt: project.created_at,
      updatedAt: project.last_activity_at,
      connectorUserSettings: {},
    }
  }

  async setWebsiteMeta(session: GitlabSession, websiteId: WebsiteId, websiteMeta: WebsiteMetaFileContent): Promise<void> {
    //// Load the meta repo data
    //const file = await this.callApi(session, `api/v4/projects/${this.getMetaRepoPath(session)}/repository/files/${this.options.metaRepoFile}`, 'GET', null, {
    //  ref: this.options.branch,
    //})
    //const metaRepo = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')) as MetaRepoFileContent
    //// Update or create the website meta data
    //metaRepo.websites[websiteId] = {
    //  updatedAt: new Date().toISOString(),
    //  createdAt: metaRepo.websites[websiteId]?.createdAt ?? new Date().toISOString(),
    //  meta: websiteMeta,
    //}
    //// Save the meta repo data
    //const project = await this.callApi(session, `api/v4/projects/${this.getMetaRepoPath(session)}/repository/files/${this.options.metaRepoFile}`, 'PUT', {
    //  branch: this.options.branch,
    //  commit_message: `Update website meta data of ${websiteMeta.name} (${websiteId}) from Silex`,
    //  content: JSON.stringify(metaRepo),
    //  file_path: this.options.metaRepoFile,
    //})

    // Rename the repo if needed
    const oldMeta = await this.getWebsiteMeta(session, websiteId)
    if(websiteMeta.name !== oldMeta.name) {
      await this.callApi(session, `api/v4/projects/${websiteId}`, 'PUT', {
        name: this.options.repoPrefix + websiteMeta.name,
      })
    }
    //// Update the metadata file
    //await this.callApi(session, `api/v4/projects/${websiteId}/repository/files/${WEBSITE_META_DATA_FILE}`, 'PUT', {
    //  branch: this.options.branch,
    //  commit_message: 'Update website meta data from Silex',
    //  content: JSON.stringify(websiteMeta),
    //  file_path: WEBSITE_META_DATA_FILE,
    //  id: websiteId,
    //})
  }

  async writeAssets(session: GitlabSession, websiteId: string, files: ConnectorFile[], status?: StatusCallback | undefined): Promise<void> {
    // For each file
    for (const file of files) {
      // Convert to base64
      const content = (await contentToBuffer(file.content)).toString('base64')
      const path = this.getAssetPath(file.path)

      try {
        await this.updateFile(session, websiteId, path, content, true)
      } catch (e) {
        // If the file does not exist, create it
        if (e.statusCode === 404 || e.httpStatusCode === 404 || e.message.endsWith('A file with this name doesn\'t exist')) {
          await this.createFile(session, websiteId, path, content, true)
        } else {
          throw e
        }
      }
    }
  }

  async readAsset(session: GitlabSession, websiteId: string, fileName: string): Promise<ConnectorFileContent> {
    // Remove leading slash
    const finalPath = this.getAssetPath(fileName)
    return this.readFile(session, websiteId, finalPath)
  }

  async deleteAssets(session: GitlabSession, websiteId: string, fileNames: string[]): Promise<void> {
    return this.callApi(session, `api/v4/projects/${websiteId}/repository/commits`, 'POST', {
      id: websiteId,
      branch: this.options.branch,
      commit_message: `Delete assets from Silex: ${fileNames.join(', ')}`,
      actions: fileNames.map(f => ({
        action: 'delete',
        file_path: this.getAssetPath(f),
      })),
    })
  }
}
