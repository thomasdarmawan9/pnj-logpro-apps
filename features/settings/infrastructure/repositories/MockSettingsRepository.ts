import { SystemUser, MOCK_USERS } from '../../domain/entities/SystemUser'
import { NumberingSettings, CompanyProfile, DEFAULT_NUMBERING, DEFAULT_COMPANY } from '../../domain/entities/SystemSetting'

class MockSettingsRepository {
  private users: SystemUser[] = [...MOCK_USERS]
  private numbering: NumberingSettings = { ...DEFAULT_NUMBERING }
  private company: CompanyProfile = { ...DEFAULT_COMPANY }
  private userSeq = MOCK_USERS.length

  private delay(ms = 400): Promise<void> {
    return new Promise(r => setTimeout(r, ms))
  }

  async getUsers(): Promise<SystemUser[]> {
    await this.delay()
    return [...this.users]
  }

  async createUser(data: Omit<SystemUser, 'id' | 'uuid' | 'login_attempt' | 'locked_until' | 'last_login_at' | 'created_at'>): Promise<SystemUser> {
    await this.delay()
    const exists = this.users.find(u => u.email === data.email)
    if (exists) throw new Error(`Email ${data.email} sudah digunakan.`)
    const newUser: SystemUser = {
      ...data, id: ++this.userSeq,
      uuid: `usr-${String(this.userSeq).padStart(3, '0')}`,
      login_attempt: 0, locked_until: null,
      last_login_at: null,
      created_at: new Date().toISOString(),
    }
    this.users.push(newUser)
    return newUser
  }

  async updateUser(uuid: string, data: Partial<SystemUser>): Promise<SystemUser> {
    await this.delay()
    const idx = this.users.findIndex(u => u.uuid === uuid)
    if (idx === -1) throw new Error('User tidak ditemukan')
    this.users[idx] = { ...this.users[idx], ...data }
    return this.users[idx]
  }

  async resetPassword(uuid: string, _newPassword: string): Promise<void> {
    await this.delay()
    const user = this.users.find(u => u.uuid === uuid)
    if (!user) throw new Error('User tidak ditemukan')
    // In a real app, hash and save new password
  }

  async toggleUserStatus(uuid: string): Promise<SystemUser> {
    await this.delay()
    const idx = this.users.findIndex(u => u.uuid === uuid)
    if (idx === -1) throw new Error('User tidak ditemukan')
    this.users[idx] = { ...this.users[idx], is_active: !this.users[idx].is_active }
    return this.users[idx]
  }

  async unlockUser(uuid: string): Promise<SystemUser> {
    await this.delay()
    const idx = this.users.findIndex(u => u.uuid === uuid)
    if (idx === -1) throw new Error('User tidak ditemukan')
    this.users[idx] = { ...this.users[idx], locked_until: null, login_attempt: 0 }
    return this.users[idx]
  }

  async getNumberingSettings(): Promise<NumberingSettings> {
    await this.delay(200)
    return { ...this.numbering }
  }

  async updateNumberingSettings(data: Partial<NumberingSettings>): Promise<NumberingSettings> {
    await this.delay()
    this.numbering = { ...this.numbering, ...data }
    return { ...this.numbering }
  }

  async getCompanyProfile(): Promise<CompanyProfile> {
    await this.delay(200)
    return { ...this.company }
  }

  async updateCompanyProfile(data: Partial<CompanyProfile>): Promise<CompanyProfile> {
    await this.delay()
    this.company = { ...this.company, ...data }
    return { ...this.company }
  }
}

export const settingsRepository = new MockSettingsRepository()
