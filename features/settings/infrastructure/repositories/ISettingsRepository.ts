import { SystemUser } from '../../domain/entities/SystemUser'
import { NumberingSettings, CompanyProfile } from '../../domain/entities/SystemSetting'

export interface ISettingsRepository {
  // User management
  getUsers(): Promise<SystemUser[]>
  createUser(data: Omit<SystemUser, 'id' | 'uuid' | 'login_attempt' | 'locked_until' | 'last_login_at' | 'created_at'>): Promise<SystemUser>
  updateUser(uuid: string, data: Partial<SystemUser>): Promise<SystemUser>
  resetPassword(uuid: string, newPassword: string): Promise<void>
  toggleUserStatus(uuid: string): Promise<SystemUser>
  unlockUser(uuid: string): Promise<SystemUser>

  // Numbering settings
  getNumberingSettings(): Promise<NumberingSettings>
  updateNumberingSettings(data: Partial<NumberingSettings>): Promise<NumberingSettings>

  // Company profile
  getCompanyProfile(): Promise<CompanyProfile>
  updateCompanyProfile(data: Partial<CompanyProfile>): Promise<CompanyProfile>
}
