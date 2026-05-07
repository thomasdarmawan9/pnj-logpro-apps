import { SystemUser } from '../../domain/entities/SystemUser'
import { NumberingSettings, CompanyProfile, BankAccount } from '../../domain/entities/SystemSetting'

export type CreateSystemUserPayload = Omit<SystemUser, 'id' | 'uuid' | 'login_attempt' | 'locked_until' | 'last_login_at' | 'created_at'> & {
  password: string
}

export interface ISettingsRepository {
  // User management
  getUsers(): Promise<SystemUser[]>
  createUser(data: CreateSystemUserPayload): Promise<SystemUser>
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

  // Bank accounts
  getBankAccounts(): Promise<BankAccount[]>
  createBankAccount(data: Omit<BankAccount, 'id' | 'uuid'>): Promise<BankAccount>
  updateBankAccount(uuid: string, data: Partial<Omit<BankAccount, 'id' | 'uuid'>>): Promise<BankAccount>
  deleteBankAccount(uuid: string): Promise<void>
}
