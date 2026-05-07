import { API_BASE_URL, apiRequest } from '@/lib/apiClient'
import { SystemUser } from '../../domain/entities/SystemUser'
import { NumberingSettings, CompanyProfile, BankAccount, DEFAULT_NUMBERING, DEFAULT_COMPANY } from '../../domain/entities/SystemSetting'
import { CreateSystemUserPayload } from './ISettingsRepository'

class MockSettingsRepository {
  private normalizeUser(user: SystemUser & { id: number | string }): SystemUser {
    return {
      ...user,
      id: Number(user.id),
      login_attempt: Number(user.login_attempt || 0),
      locked_until: user.locked_until ?? null,
      last_login_at: user.last_login_at ?? null,
    }
  }

  async getUsers(): Promise<SystemUser[]> {
    const response = await apiRequest<(SystemUser & { id: number | string })[]>('/users?limit=100', {
      method: 'GET',
    })
    return response.data.map(user => this.normalizeUser(user))
  }

  async createUser(data: CreateSystemUserPayload): Promise<SystemUser> {
    const response = await apiRequest<SystemUser & { id: number | string }>('/users', {
      method: 'POST',
      body: data,
    })
    return this.normalizeUser(response.data)
  }

  async updateUser(uuid: string, data: Partial<SystemUser>): Promise<SystemUser> {
    const response = await apiRequest<SystemUser & { id: number | string }>(`/users/${uuid}`, {
      method: 'PUT',
      body: {
        name: data.name,
        email: data.email,
        role: data.role,
        is_active: data.is_active,
      },
    })
    return this.normalizeUser(response.data)
  }

  async resetPassword(uuid: string, newPassword: string): Promise<void> {
    await apiRequest<null>(`/users/${uuid}/reset-password`, {
      method: 'POST',
      body: { new_password: newPassword },
    })
  }

  async toggleUserStatus(uuid: string): Promise<SystemUser> {
    const response = await apiRequest<SystemUser & { id: number | string }>(`/users/${uuid}/toggle`, {
      method: 'PATCH',
    })
    return this.normalizeUser(response.data)
  }

  async unlockUser(uuid: string): Promise<SystemUser> {
    const response = await apiRequest<SystemUser & { id: number | string }>(`/users/${uuid}/unlock`, {
      method: 'PATCH',
    })
    return this.normalizeUser(response.data)
  }

  async getNumberingSettings(): Promise<NumberingSettings> {
    const response = await apiRequest<NumberingSettings>('/settings/numbering', {
      method: 'GET',
    })
    return {
      ...DEFAULT_NUMBERING,
      ...response.data,
      sj_seq_current: Number(response.data.sj_seq_current || 0),
      invoice_seq_current: Number(response.data.invoice_seq_current || 0),
    }
  }

  async updateNumberingSettings(data: Partial<NumberingSettings>): Promise<NumberingSettings> {
    const response = await apiRequest<NumberingSettings>('/settings/numbering', {
      method: 'PUT',
      body: {
        sj_format: data.sj_format,
        sj_seq_current: data.sj_seq_current,
        sj_seq_reset: data.sj_seq_reset,
        invoice_format: data.invoice_format,
        invoice_seq_current: data.invoice_seq_current,
        invoice_seq_reset: data.invoice_seq_reset,
      },
    })
    return {
      ...DEFAULT_NUMBERING,
      ...response.data,
      sj_seq_current: Number(response.data.sj_seq_current || 0),
      invoice_seq_current: Number(response.data.invoice_seq_current || 0),
    }
  }

  async getCompanyProfile(): Promise<CompanyProfile> {
    const response = await apiRequest<CompanyProfile>('/settings/company', {
      method: 'GET',
    })
    return normalizeCompany(response.data)
  }

  async updateCompanyProfile(data: Partial<CompanyProfile>): Promise<CompanyProfile> {
    const response = await apiRequest<CompanyProfile>('/settings/company', {
      method: 'PUT',
      body: {
        company_name: data.company_name,
        company_address: data.company_address,
        company_phone: data.company_phone,
        company_email: data.company_email,
        company_website: data.company_website,
        company_bank_name: data.company_bank_name,
        company_bank_account: data.company_bank_account,
        company_bank_holder: data.company_bank_holder,
        default_tax_percent: data.default_tax_percent,
      },
    })
    return normalizeCompany(response.data)
  }

  async getBankAccounts(): Promise<BankAccount[]> {
    const response = await apiRequest<BankAccount[]>('/settings/bank-accounts', { method: 'GET' })
    return response.data.map(normalizeBankAccount)
  }

  async createBankAccount(data: Omit<BankAccount, 'id' | 'uuid'>): Promise<BankAccount> {
    const response = await apiRequest<BankAccount>('/settings/bank-accounts', {
      method: 'POST',
      body: data,
    })
    return normalizeBankAccount(response.data)
  }

  async updateBankAccount(uuid: string, data: Partial<Omit<BankAccount, 'id' | 'uuid'>>): Promise<BankAccount> {
    const response = await apiRequest<BankAccount>(`/settings/bank-accounts/${uuid}`, {
      method: 'PUT',
      body: data,
    })
    return normalizeBankAccount(response.data)
  }

  async deleteBankAccount(uuid: string): Promise<void> {
    await apiRequest<null>(`/settings/bank-accounts/${uuid}`, { method: 'DELETE' })
  }
}

function normalizeBankAccount(data: BankAccount): BankAccount {
  return {
    ...data,
    id: Number(data.id),
    is_active: Boolean(data.is_active),
    sort_order: Number(data.sort_order ?? 0),
  }
}

function normalizeCompany(data: CompanyProfile): CompanyProfile {
  return {
    ...DEFAULT_COMPANY,
    ...data,
    company_logo_path: normalizeAssetUrl(data.company_logo_path),
    default_tax_percent: Number(data.default_tax_percent || 0),
  }
}

function normalizeAssetUrl(path: string | null): string | null {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  const base = new URL(API_BASE_URL)
  return `${base.origin}${path}`
}

export const settingsRepository = new MockSettingsRepository()
