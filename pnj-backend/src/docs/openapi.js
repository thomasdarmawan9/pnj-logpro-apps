'use strict'

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'PNJ Backend API',
    version: '1.0.0',
    description: 'Dokumentasi API PNJ Backend. Mencakup Auth, User Management, Surat Jalan, dan Invoice.',
  },
  servers: [
    {
      url: 'http://localhost:3001/api/v1',
      description: 'Local development',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Login, refresh token, profil akun, logout, dan ganti password.' },
    { name: 'Users', description: 'Manajemen pengguna. Semua endpoint Users hanya untuk super_admin.' },
    { name: 'Invoice', description: 'Pembuatan, update, status, pembayaran, attach SJ, export, PDF, dan lampiran Invoice.' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validasi data gagal.' },
          code: { type: 'string', nullable: true, example: 'ACCOUNT_LOCKED' },
          errors: {
            type: 'array',
            nullable: true,
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'email' },
                message: { type: 'string', example: 'Email wajib diisi.' },
              },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '1' },
          uuid: { type: 'string', format: 'uuid', example: '534c8389-3b1b-4b2d-9834-3cd47d262b1d' },
          name: { type: 'string', example: 'Admin PNJ' },
          email: { type: 'string', format: 'email', example: 'admin@pnj.co.id' },
          role: { type: 'string', enum: ['super_admin', 'admin_ops', 'admin_finance'], example: 'super_admin' },
          is_active: { type: 'boolean', example: true },
          login_attempt: { type: 'integer', example: 0 },
          locked_until: { type: 'string', format: 'date-time', nullable: true },
          last_login_at: { type: 'string', format: 'date-time', nullable: true },
          created_at: { type: 'string', format: 'date-time', nullable: true },
          updated_at: { type: 'string', format: 'date-time', nullable: true },
          deleted_at: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      AuthLoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@pnj.co.id' },
          password: { type: 'string', format: 'password', example: 'PNJ@admin2026' },
        },
      },
      AuthLoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Login berhasil.' },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
              refresh_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            },
          },
        },
      },
      RefreshRequest: {
        type: 'object',
        required: ['refresh_token'],
        properties: {
          refresh_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        },
      },
      TokenResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Token berhasil diperbarui.' },
          data: {
            type: 'object',
            properties: {
              access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
              refresh_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            },
          },
        },
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['old_password', 'new_password', 'confirm_password'],
        properties: {
          old_password: { type: 'string', format: 'password', example: 'PNJ@admin2026' },
          new_password: { type: 'string', format: 'password', minLength: 8, example: 'PNJ@admin2026New' },
          confirm_password: { type: 'string', format: 'password', example: 'PNJ@admin2026New' },
        },
      },
      CreateUserRequest: {
        type: 'object',
        required: ['name', 'email', 'password', 'role'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100, example: 'Admin Operasional' },
          email: { type: 'string', format: 'email', maxLength: 150, example: 'ops2@pnj.co.id' },
          password: { type: 'string', format: 'password', minLength: 8, maxLength: 100, example: 'Secret123!' },
          role: { type: 'string', enum: ['super_admin', 'admin_ops', 'admin_finance'], example: 'admin_ops' },
          is_active: { type: 'boolean', default: true, example: true },
        },
      },
      UpdateUserRequest: {
        type: 'object',
        minProperties: 1,
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100, example: 'Admin Operasional Updated' },
          email: { type: 'string', format: 'email', maxLength: 150, example: 'ops2.updated@pnj.co.id' },
          role: { type: 'string', enum: ['super_admin', 'admin_ops', 'admin_finance'], example: 'admin_ops' },
          is_active: { type: 'boolean', example: true },
        },
      },
      ResetPasswordRequest: {
        type: 'object',
        required: ['new_password'],
        properties: {
          new_password: { type: 'string', format: 'password', minLength: 8, maxLength: 100, example: 'Secret456!' },
        },
      },
      UserSuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Berhasil.' },
          data: { $ref: '#/components/schemas/User' },
        },
      },
      UserListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/User' },
          },
          meta: {
            type: 'object',
            properties: {
              total: { type: 'integer', example: 3 },
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 20 },
              totalPages: { type: 'integer', example: 1 },
            },
          },
        },
      },
      GenericSuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Berhasil.' },
          data: { nullable: true, example: null },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Token tidak valid, token tidak ada, atau login gagal.',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
        },
      },
      Forbidden: {
        description: 'Role tidak memiliki akses atau akun sedang terkunci.',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
        },
      },
      ValidationError: {
        description: 'Payload, query, atau params tidak valid.',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
        },
      },
      NotFound: {
        description: 'Data tidak ditemukan.',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
        },
      },
      Conflict: {
        description: 'Data konflik, misalnya email sudah terdaftar.',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
        },
      },
    },
  },
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login pengguna',
        description: 'Mengembalikan access token, refresh token, dan profil pengguna.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthLoginRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Login berhasil.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthLoginResponse' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          422: { $ref: '#/components/responses/ValidationError' },
          429: {
            description: 'Terlalu banyak percobaan login.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Token baru berhasil dibuat.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenResponse' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          422: { $ref: '#/components/responses/ValidationError' },
          429: {
            description: 'Terlalu banyak request refresh token.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout pengguna',
        description: 'Memasukkan access token aktif ke blacklist Redis sampai token kedaluwarsa.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Logout berhasil.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericSuccessResponse' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Ambil profil pengguna login',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Profil pengguna.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UserSuccessResponse' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/change-password': {
      put: {
        tags: ['Auth'],
        summary: 'Ganti password akun sendiri',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChangePasswordRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Password berhasil diubah.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericSuccessResponse' } } },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'Daftar pengguna',
        description: 'Hanya super_admin.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['super_admin', 'admin_ops', 'admin_finance'] } },
          { name: 'is_active', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: {
          200: {
            description: 'Daftar pengguna.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UserListResponse' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
      post: {
        tags: ['Users'],
        summary: 'Buat pengguna',
        description: 'Hanya super_admin.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateUserRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Pengguna berhasil dibuat.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UserSuccessResponse' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          409: { $ref: '#/components/responses/Conflict' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/users/{uuid}': {
      get: {
        tags: ['Users'],
        summary: 'Detail pengguna',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'uuid', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: {
            description: 'Detail pengguna.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UserSuccessResponse' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
      put: {
        tags: ['Users'],
        summary: 'Update pengguna',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'uuid', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateUserRequest' } } },
        },
        responses: {
          200: {
            description: 'Pengguna berhasil diperbarui.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UserSuccessResponse' } } },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/Conflict' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Hapus pengguna (soft delete)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'uuid', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: {
            description: 'Pengguna berhasil dihapus.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericSuccessResponse' } } },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/users/{uuid}/toggle': {
      patch: {
        tags: ['Users'],
        summary: 'Toggle status aktif pengguna',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'uuid', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: {
            description: 'Status pengguna diperbarui.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UserSuccessResponse' } } },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/users/{uuid}/unlock': {
      patch: {
        tags: ['Users'],
        summary: 'Unlock akun pengguna',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'uuid', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: {
            description: 'Akun pengguna berhasil di-unlock.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UserSuccessResponse' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/users/{uuid}/reset-password': {
      post: {
        tags: ['Users'],
        summary: 'Reset password pengguna',
        description: 'Hanya super_admin. Tidak bisa digunakan untuk akun sendiri.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'uuid', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ResetPasswordRequest' } } },
        },
        responses: {
          200: {
            description: 'Password pengguna berhasil direset.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericSuccessResponse' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
  },
}

openApiSpec.tags.push({
  name: 'Surat Jalan',
  description: 'Pembuatan, update, assignment, POD, delivery, void, export, PDF, dan lampiran Surat Jalan.',
})

Object.assign(openApiSpec.components.schemas, {
  SuratJalan: {
    type: 'object',
    properties: {
      id: { type: 'string', example: '1' },
      uuid: { type: 'string', format: 'uuid' },
      sj_number: { type: 'string', example: 'SJ-2026-0001' },
      project_id: { type: 'string', example: '1' },
      customer_id: { type: 'string', example: '1' },
      fleet_id: { type: 'string', example: '1' },
      driver_id: { type: 'string', nullable: true, example: '1' },
      driver_name_manual: { type: 'string', nullable: true, example: 'Budi' },
      sj_date: { type: 'string', format: 'date', example: '2026-04-28' },
      origin: { type: 'string', example: 'Pontianak' },
      destination: { type: 'string', example: 'Kubu Raya' },
      cargo_description: { type: 'string', nullable: true, example: 'Muatan barang proyek' },
      operational_cost: { type: 'number', example: 150000 },
      status: { type: 'string', enum: ['draft', 'assigned', 'delivered', 'void'], example: 'draft' },
      invoice_attachment_status: { type: 'string', enum: ['no_invoice', 'attached'], example: 'no_invoice' },
      pod_photo_path: { type: 'string', nullable: true, example: 'pod/abc.webp' },
      delivered_at: { type: 'string', format: 'date-time', nullable: true },
      void_reason: { type: 'string', nullable: true },
      internal_notes: { type: 'string', nullable: true },
      lampiran_paths: {
        type: 'array',
        items: { type: 'string' },
        example: ['sj-lampiran/abc.webp'],
      },
      project: { type: 'object', nullable: true },
      customer: { type: 'object', nullable: true },
      fleet: { type: 'object', nullable: true },
      driver: { type: 'object', nullable: true },
      invoice: { type: 'object', nullable: true },
      created_at: { type: 'string', format: 'date-time', nullable: true },
      updated_at: { type: 'string', format: 'date-time', nullable: true },
      deleted_at: { type: 'string', format: 'date-time', nullable: true },
    },
  },
  SuratJalanListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: { type: 'array', items: { $ref: '#/components/schemas/SuratJalan' } },
      meta: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 1 },
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          totalPages: { type: 'integer', example: 1 },
        },
      },
    },
  },
  SuratJalanSuccessResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Berhasil.' },
      data: { $ref: '#/components/schemas/SuratJalan' },
    },
  },
  CreateSuratJalanRequest: {
    type: 'object',
    required: ['project_uuid', 'fleet_uuid', 'sj_date', 'origin', 'destination'],
    properties: {
      project_uuid: { type: 'string', format: 'uuid' },
      fleet_uuid: { type: 'string', format: 'uuid' },
      driver_uuid: { type: 'string', format: 'uuid', nullable: true },
      driver_name_manual: { type: 'string', nullable: true, maxLength: 100, example: 'Supir Manual' },
      sj_date: { type: 'string', format: 'date', example: '2026-04-28' },
      origin: { type: 'string', minLength: 2, maxLength: 200, example: 'Pontianak' },
      destination: { type: 'string', minLength: 2, maxLength: 200, example: 'Kubu Raya' },
      cargo_description: { type: 'string', nullable: true, example: 'Muatan proyek' },
      operational_cost: { type: 'number', minimum: 0, default: 0, example: 150000 },
      internal_notes: { type: 'string', nullable: true },
      publish: { type: 'boolean', default: false, example: false },
    },
  },
  UpdateSuratJalanRequest: {
    type: 'object',
    minProperties: 1,
    properties: {
      fleet_uuid: { type: 'string', format: 'uuid' },
      driver_uuid: { type: 'string', format: 'uuid', nullable: true },
      driver_name_manual: { type: 'string', nullable: true, maxLength: 100 },
      sj_date: { type: 'string', format: 'date' },
      origin: { type: 'string', minLength: 2, maxLength: 200 },
      destination: { type: 'string', minLength: 2, maxLength: 200 },
      cargo_description: { type: 'string', nullable: true },
      operational_cost: { type: 'number', minimum: 0 },
      internal_notes: { type: 'string', nullable: true },
      lampiran_paths: { type: 'array', nullable: true, items: { type: 'string' } },
    },
  },
  AssignSuratJalanRequest: {
    type: 'object',
    required: ['fleet_uuid'],
    properties: {
      fleet_uuid: { type: 'string', format: 'uuid' },
      driver_uuid: { type: 'string', format: 'uuid', nullable: true },
      driver_name_manual: { type: 'string', nullable: true, maxLength: 100 },
    },
  },
  DeliverSuratJalanRequest: {
    type: 'object',
    required: ['delivered_at'],
    properties: {
      delivered_at: { type: 'string', format: 'date-time', example: '2026-04-28T10:00:00.000Z' },
    },
  },
  VoidSuratJalanRequest: {
    type: 'object',
    required: ['void_reason', 'confirmation'],
    properties: {
      void_reason: { type: 'string', minLength: 10, maxLength: 500, example: 'Salah input data surat jalan.' },
      confirmation: { type: 'string', enum: ['VOID'], example: 'VOID' },
      force_detach: { type: 'boolean', default: false, example: false },
    },
  },
  GenerateSJPdfRequest: {
    type: 'object',
    properties: {
      options: {
        type: 'object',
        properties: {
          includeHeader: { type: 'boolean', default: true },
          includeSign: { type: 'boolean', default: true },
          includeNotes: { type: 'boolean', default: false },
        },
      },
    },
  },
  PdfJobResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'PDF SJ sedang diproses.' },
      data: {
        type: 'object',
        properties: {
          uuid: { type: 'string', format: 'uuid' },
          job_type: { type: 'string', example: 'surat_jalan' },
          record_id: { type: 'integer', example: 1 },
          status: { type: 'string', enum: ['pending', 'processing', 'done', 'failed'], example: 'pending' },
          download_url: { type: 'string', nullable: true },
          error_message: { type: 'string', nullable: true },
          requested_by: { type: 'integer', nullable: true },
          processed_at: { type: 'string', format: 'date-time', nullable: true },
          completed_at: { type: 'string', format: 'date-time', nullable: true },
          created_at: { type: 'string', format: 'date-time', nullable: true },
        },
      },
    },
  },
})

const sjQueryParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
  { name: 'search', in: 'query', schema: { type: 'string' } },
  { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'assigned', 'delivered', 'void', 'all'], default: 'all' } },
  { name: 'invoice_status', in: 'query', schema: { type: 'string', enum: ['no_invoice', 'attached', 'all'], default: 'all' } },
  { name: 'project_uuid', in: 'query', schema: { type: 'string', format: 'uuid' } },
  { name: 'customer_uuid', in: 'query', schema: { type: 'string', format: 'uuid' } },
  { name: 'period', in: 'query', schema: { type: 'string', enum: ['today', 'week', 'month', 'last_month', 'all'], default: 'all' } },
  { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
  { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
]

const uuidPathParam = {
  name: 'uuid',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
}

const filenamePathParam = {
  name: 'filename',
  in: 'path',
  required: true,
  schema: { type: 'string' },
}

Object.assign(openApiSpec.paths, {
  '/surat-jalan': {
    get: {
      tags: ['Surat Jalan'],
      summary: 'Daftar Surat Jalan',
      security: [{ bearerAuth: [] }],
      parameters: sjQueryParams,
      responses: {
        200: {
          description: 'Daftar Surat Jalan.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SuratJalanListResponse' } } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
    post: {
      tags: ['Surat Jalan'],
      summary: 'Buat Surat Jalan',
      description: 'Role: super_admin atau admin_ops.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateSuratJalanRequest' } } },
      },
      responses: {
        201: {
          description: 'Surat Jalan berhasil dibuat.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SuratJalanSuccessResponse' } } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
  '/surat-jalan/export': {
    get: {
      tags: ['Surat Jalan'],
      summary: 'Export daftar Surat Jalan ke Excel',
      security: [{ bearerAuth: [] }],
      parameters: sjQueryParams,
      responses: {
        200: {
          description: 'File XLSX Surat Jalan.',
          content: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
              schema: { type: 'string', format: 'binary' },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
  '/surat-jalan/{uuid}': {
    get: {
      tags: ['Surat Jalan'],
      summary: 'Detail Surat Jalan',
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam],
      responses: {
        200: {
          description: 'Detail Surat Jalan.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SuratJalanSuccessResponse' } } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
    put: {
      tags: ['Surat Jalan'],
      summary: 'Update Surat Jalan',
      description: 'Role: super_admin atau admin_ops. SJ void tidak bisa diedit.',
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateSuratJalanRequest' } } },
      },
      responses: {
        200: {
          description: 'Surat Jalan berhasil diperbarui.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SuratJalanSuccessResponse' } } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
  '/surat-jalan/{uuid}/assign': {
    patch: {
      tags: ['Surat Jalan'],
      summary: 'Assign armada dan supir ke Surat Jalan',
      description: 'Hanya dari status draft ke assigned.',
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/AssignSuratJalanRequest' } } },
      },
      responses: {
        200: {
          description: 'Surat Jalan berhasil di-assign.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SuratJalanSuccessResponse' } } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        409: { $ref: '#/components/responses/Conflict' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
  '/surat-jalan/{uuid}/pod': {
    post: {
      tags: ['Surat Jalan'],
      summary: 'Upload foto POD',
      description: 'Field multipart: photo. File image JPEG/PNG/WebP.',
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['photo'],
              properties: {
                photo: { type: 'string', format: 'binary' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Foto POD berhasil diunggah.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SuratJalanSuccessResponse' } } },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/surat-jalan/{uuid}/deliver': {
    patch: {
      tags: ['Surat Jalan'],
      summary: 'Konfirmasi Surat Jalan delivered',
      description: 'Butuh POD sudah diupload.',
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/DeliverSuratJalanRequest' } } },
      },
      responses: {
        200: {
          description: 'SJ ditandai sudah sampai.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SuratJalanSuccessResponse' } } },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        409: { $ref: '#/components/responses/Conflict' },
      },
    },
  },
  '/surat-jalan/{uuid}/void': {
    patch: {
      tags: ['Surat Jalan'],
      summary: 'Void Surat Jalan',
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/VoidSuratJalanRequest' } } },
      },
      responses: {
        200: {
          description: 'Surat Jalan berhasil di-void.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SuratJalanSuccessResponse' } } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        409: { $ref: '#/components/responses/Conflict' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
  '/surat-jalan/{uuid}/generate-pdf': {
    post: {
      tags: ['Surat Jalan'],
      summary: 'Generate PDF Surat Jalan',
      description: 'Membuat job async. Cek status lewat endpoint Pdf Jobs.',
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam],
      requestBody: {
        required: false,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/GenerateSJPdfRequest' } } },
      },
      responses: {
        202: {
          description: 'PDF SJ sedang diproses.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PdfJobResponse' } } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
  '/surat-jalan/{uuid}/lampiran': {
    post: {
      tags: ['Surat Jalan'],
      summary: 'Upload lampiran Surat Jalan',
      description: 'Field multipart: file. File image JPEG/PNG/WebP atau PDF.',
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: {
                file: { type: 'string', format: 'binary' },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Lampiran berhasil diunggah.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SuratJalanSuccessResponse' } } },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/surat-jalan/{uuid}/lampiran/{filename}': {
    get: {
      tags: ['Surat Jalan'],
      summary: 'Download lampiran Surat Jalan',
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam, filenamePathParam],
      responses: {
        200: {
          description: 'File lampiran.',
          content: {
            'application/pdf': { schema: { type: 'string', format: 'binary' } },
            'image/webp': { schema: { type: 'string', format: 'binary' } },
            'image/png': { schema: { type: 'string', format: 'binary' } },
            'image/jpeg': { schema: { type: 'string', format: 'binary' } },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
    delete: {
      tags: ['Surat Jalan'],
      summary: 'Hapus lampiran Surat Jalan',
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam, filenamePathParam],
      responses: {
        200: {
          description: 'Lampiran berhasil dihapus.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SuratJalanSuccessResponse' } } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
})

Object.assign(openApiSpec.components.schemas, {
  InvoiceItemRequest: {
    type: 'object',
    required: ['fleet_label', 'qty', 'unit_price'],
    properties: {
      fleet_uuid: { type: 'string', format: 'uuid', nullable: true },
      fleet_label: { type: 'string', minLength: 1, maxLength: 150, example: 'Toyota Zenix KB 1561 HX' },
      description: { type: 'string', nullable: true, example: 'Sewa kendaraan operasional' },
      period_start: { type: 'string', format: 'date', nullable: true },
      period_end: { type: 'string', format: 'date', nullable: true },
      qty: { type: 'number', minimum: 0.01, example: 1 },
      unit: { type: 'string', default: 'Unit', example: 'Unit' },
      unit_price: { type: 'number', minimum: 0, example: 2500000 },
      sort_order: { type: 'integer', minimum: 0, default: 0 },
    },
  },
  InvoiceItem: {
    allOf: [
      { $ref: '#/components/schemas/InvoiceItemRequest' },
      {
        type: 'object',
        properties: {
          id: { type: 'string', example: '1' },
          uuid: { type: 'string', format: 'uuid' },
          invoice_id: { type: 'string', example: '1' },
          fleet_id: { type: 'string', nullable: true, example: '1' },
          subtotal: { type: 'number', example: 2500000 },
          fleet: { type: 'object', nullable: true },
        },
      },
    ],
  },
  Payment: {
    type: 'object',
    properties: {
      id: { type: 'string', example: '1' },
      uuid: { type: 'string', format: 'uuid' },
      invoice_id: { type: 'string', example: '1' },
      payment_date: { type: 'string', format: 'date', example: '2026-04-28' },
      amount: { type: 'number', example: 1000000 },
      method: { type: 'string', enum: ['transfer', 'cash', 'check'], example: 'transfer' },
      proof_path: { type: 'string', nullable: true },
      notes: { type: 'string', nullable: true },
      created_by_name: { type: 'string', nullable: true, example: 'Admin PNJ' },
      created_at: { type: 'string', format: 'date-time', nullable: true },
    },
  },
  AttachedSJ: {
    type: 'object',
    properties: {
      uuid: { type: 'string', format: 'uuid' },
      sj_number: { type: 'string', example: 'SJ-2026-0001' },
      sj_date: { type: 'string', format: 'date' },
      origin: { type: 'string' },
      destination: { type: 'string' },
      fleet_label: { type: 'string' },
      driver_name: { type: 'string' },
      status: { type: 'string', example: 'delivered' },
    },
  },
  Invoice: {
    type: 'object',
    properties: {
      id: { type: 'string', example: '1' },
      uuid: { type: 'string', format: 'uuid' },
      invoice_number: { type: 'string', example: 'INV-2026-2832' },
      project_id: { type: 'string', example: '1' },
      customer_id: { type: 'string', example: '1' },
      invoice_date: { type: 'string', format: 'date', example: '2026-04-28' },
      due_date: { type: 'string', format: 'date', example: '2026-05-28' },
      subtotal_amount: { type: 'number', example: 2500000 },
      tax_percent: { type: 'number', example: 11 },
      tax_amount: { type: 'number', example: 275000 },
      pph_percent: { type: 'number', example: 2 },
      pph_amount: { type: 'number', example: 50000 },
      total_amount: { type: 'number', example: 2725000 },
      paid_amount: { type: 'number', example: 0 },
      remaining_amount: { type: 'number', example: 2725000 },
      status: { type: 'string', enum: ['draft', 'sent', 'outstanding', 'paid', 'void'], example: 'draft' },
      notes: { type: 'string', nullable: true },
      sent_at: { type: 'string', format: 'date-time', nullable: true },
      void_reason: { type: 'string', nullable: true },
      lampiran_paths: { type: 'array', nullable: true, items: { type: 'string' }, example: ['invoice-lampiran/abc.webp'] },
      project: { type: 'object', nullable: true },
      customer: { type: 'object', nullable: true },
      items: { type: 'array', items: { $ref: '#/components/schemas/InvoiceItem' } },
      attachedSJs: { type: 'array', items: { $ref: '#/components/schemas/AttachedSJ' } },
      payments: { type: 'array', items: { $ref: '#/components/schemas/Payment' } },
      created_at: { type: 'string', format: 'date-time', nullable: true },
      updated_at: { type: 'string', format: 'date-time', nullable: true },
    },
  },
  InvoiceListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: { type: 'array', items: { $ref: '#/components/schemas/Invoice' } },
      meta: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 1 },
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          totalPages: { type: 'integer', example: 1 },
        },
      },
    },
  },
  InvoiceSuccessResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Berhasil.' },
      data: { $ref: '#/components/schemas/Invoice' },
    },
  },
  CreateInvoiceRequest: {
    type: 'object',
    required: ['project_uuid', 'invoice_date', 'due_date', 'items'],
    properties: {
      project_uuid: { type: 'string', format: 'uuid' },
      invoice_date: { type: 'string', format: 'date', example: '2026-04-28' },
      due_date: { type: 'string', format: 'date', example: '2026-05-28' },
      tax_percent: { type: 'number', minimum: 0, maximum: 100, default: 0, example: 11 },
      pph_percent: { type: 'number', minimum: 0, maximum: 100, default: 0, example: 2 },
      notes: { type: 'string', nullable: true },
      items: { type: 'array', minItems: 1, items: { $ref: '#/components/schemas/InvoiceItemRequest' } },
      send_immediately: { type: 'boolean', default: false },
    },
  },
  UpdateInvoiceRequest: {
    type: 'object',
    minProperties: 1,
    properties: {
      invoice_date: { type: 'string', format: 'date' },
      due_date: { type: 'string', format: 'date' },
      tax_percent: { type: 'number', minimum: 0, maximum: 100 },
      pph_percent: { type: 'number', minimum: 0, maximum: 100 },
      notes: { type: 'string', nullable: true },
      items: { type: 'array', minItems: 1, items: { $ref: '#/components/schemas/InvoiceItemRequest' } },
      lampiran_paths: { type: 'array', nullable: true, items: { type: 'string' } },
    },
  },
  RecordPaymentRequest: {
    type: 'object',
    required: ['payment_date', 'amount', 'method'],
    properties: {
      payment_date: { type: 'string', format: 'date', example: '2026-04-28' },
      amount: { type: 'number', minimum: 0.01, example: 1000000 },
      method: { type: 'string', enum: ['transfer', 'cash', 'check'], example: 'transfer' },
      proof_path: { type: 'string', nullable: true },
      notes: { type: 'string', nullable: true },
    },
  },
  VoidInvoiceRequest: {
    type: 'object',
    required: ['void_reason', 'confirmation'],
    properties: {
      void_reason: { type: 'string', minLength: 10, maxLength: 500, example: 'Invoice salah input dan perlu dibatalkan.' },
      confirmation: { type: 'string', enum: ['VOID'], example: 'VOID' },
    },
  },
  AttachSJRequest: {
    type: 'object',
    required: ['sj_uuids'],
    properties: {
      sj_uuids: { type: 'array', minItems: 1, items: { type: 'string', format: 'uuid' } },
    },
  },
  GenerateInvoicePdfRequest: {
    type: 'object',
    properties: {
      options: {
        type: 'object',
        properties: {
          includeLogo: { type: 'boolean', default: true },
          includeSig: { type: 'boolean', default: true },
          includeSJ: { type: 'boolean', default: false },
        },
      },
    },
  },
})

const invoiceQueryParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
  { name: 'search', in: 'query', schema: { type: 'string' } },
  { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'sent', 'outstanding', 'paid', 'void', 'all'], default: 'all' } },
  { name: 'customer_uuid', in: 'query', schema: { type: 'string', format: 'uuid' } },
  { name: 'project_uuid', in: 'query', schema: { type: 'string', format: 'uuid' } },
  { name: 'period', in: 'query', schema: { type: 'string', enum: ['today', 'week', 'month', 'last_month', 'all'], default: 'all' } },
  { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
  { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
]

Object.assign(openApiSpec.paths, {
  '/invoices': {
    get: {
      tags: ['Invoice'],
      summary: 'Daftar Invoice',
      security: [{ bearerAuth: [] }],
      parameters: invoiceQueryParams,
      responses: {
        200: { description: 'Daftar Invoice.', content: { 'application/json': { schema: { $ref: '#/components/schemas/InvoiceListResponse' } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
    post: {
      tags: ['Invoice'],
      summary: 'Buat Invoice',
      description: 'Role: super_admin atau admin_finance.',
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateInvoiceRequest' } } } },
      responses: {
        201: { description: 'Invoice berhasil dibuat.', content: { 'application/json': { schema: { $ref: '#/components/schemas/InvoiceSuccessResponse' } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
  '/invoices/export': {
    get: {
      tags: ['Invoice'],
      summary: 'Export daftar Invoice ke Excel',
      security: [{ bearerAuth: [] }],
      parameters: invoiceQueryParams,
      responses: {
        200: {
          description: 'File XLSX Invoice.',
          content: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { schema: { type: 'string', format: 'binary' } } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
  '/invoices/{uuid}': {
    get: {
      tags: ['Invoice'],
      summary: 'Detail Invoice',
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam],
      responses: {
        200: { description: 'Detail Invoice.', content: { 'application/json': { schema: { $ref: '#/components/schemas/InvoiceSuccessResponse' } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
    put: {
      tags: ['Invoice'],
      summary: 'Update Invoice',
      description: 'Tidak bisa update invoice paid/void.',
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam],
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateInvoiceRequest' } } } },
      responses: {
        200: { description: 'Invoice berhasil diperbarui.', content: { 'application/json': { schema: { $ref: '#/components/schemas/InvoiceSuccessResponse' } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
  '/invoices/{uuid}/send': {
    patch: {
      tags: ['Invoice'],
      summary: 'Tandai Invoice sent',
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam],
      responses: {
        200: { description: 'Invoice ditandai terkirim.', content: { 'application/json': { schema: { $ref: '#/components/schemas/InvoiceSuccessResponse' } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        409: { $ref: '#/components/responses/Conflict' },
      },
    },
  },
  '/invoices/{uuid}/mark-outstanding': {
    patch: {
      tags: ['Invoice'],
      summary: 'Tandai Invoice outstanding',
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam],
      responses: {
        200: { description: 'Invoice ditandai outstanding.', content: { 'application/json': { schema: { $ref: '#/components/schemas/InvoiceSuccessResponse' } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        409: { $ref: '#/components/responses/Conflict' },
      },
    },
  },
  '/invoices/{uuid}/payments': {
    post: {
      tags: ['Invoice'],
      summary: 'Catat pembayaran Invoice',
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam],
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RecordPaymentRequest' } } } },
      responses: {
        201: { description: 'Pembayaran berhasil dicatat.', content: { 'application/json': { schema: { $ref: '#/components/schemas/InvoiceSuccessResponse' } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        409: { $ref: '#/components/responses/Conflict' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
  '/invoices/{uuid}/void': {
    patch: {
      tags: ['Invoice'],
      summary: 'Void Invoice',
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam],
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/VoidInvoiceRequest' } } } },
      responses: {
        200: { description: 'Invoice berhasil di-void.', content: { 'application/json': { schema: { $ref: '#/components/schemas/InvoiceSuccessResponse' } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        409: { $ref: '#/components/responses/Conflict' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
  '/invoices/{uuid}/attach-sj': {
    post: {
      tags: ['Invoice'],
      summary: 'Attach Surat Jalan ke Invoice',
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam],
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AttachSJRequest' } } } },
      responses: {
        200: { description: 'SJ berhasil di-attach ke invoice.', content: { 'application/json': { schema: { $ref: '#/components/schemas/InvoiceSuccessResponse' } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        409: { $ref: '#/components/responses/Conflict' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
  '/invoices/{uuid}/detach-sj/{sjUuid}': {
    delete: {
      tags: ['Invoice'],
      summary: 'Detach Surat Jalan dari Invoice',
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam, { name: 'sjUuid', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        200: { description: 'SJ berhasil di-detach dari invoice.', content: { 'application/json': { schema: { $ref: '#/components/schemas/InvoiceSuccessResponse' } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
  '/invoices/{uuid}/attachable-sj': {
    get: {
      tags: ['Invoice'],
      summary: 'Daftar SJ yang bisa di-attach ke Invoice',
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam],
      responses: {
        200: { description: 'Daftar SJ attachable.', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/SuratJalan' } } } } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
  '/invoices/{uuid}/generate-pdf': {
    post: {
      tags: ['Invoice'],
      summary: 'Generate PDF Invoice',
      description: 'Membuat job async. Cek status lewat endpoint Pdf Jobs.',
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam],
      requestBody: { required: false, content: { 'application/json': { schema: { $ref: '#/components/schemas/GenerateInvoicePdfRequest' } } } },
      responses: {
        202: { description: 'PDF Invoice sedang diproses.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PdfJobResponse' } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
  '/invoices/{uuid}/lampiran': {
    post: {
      tags: ['Invoice'],
      summary: 'Upload lampiran Invoice',
      description: 'Field multipart: file. File image JPEG/PNG/WebP atau PDF.',
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam],
      requestBody: {
        required: true,
        content: { 'multipart/form-data': { schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } } } },
      },
      responses: {
        201: { description: 'Lampiran berhasil diunggah.', content: { 'application/json': { schema: { $ref: '#/components/schemas/InvoiceSuccessResponse' } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/invoices/{uuid}/lampiran/{filename}': {
    get: {
      tags: ['Invoice'],
      summary: 'Download lampiran Invoice',
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam, filenamePathParam],
      responses: {
        200: { description: 'File lampiran.', content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } }, 'image/webp': { schema: { type: 'string', format: 'binary' } }, 'image/png': { schema: { type: 'string', format: 'binary' } }, 'image/jpeg': { schema: { type: 'string', format: 'binary' } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
    delete: {
      tags: ['Invoice'],
      summary: 'Hapus lampiran Invoice',
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam, filenamePathParam],
      responses: {
        200: { description: 'Lampiran berhasil dihapus.', content: { 'application/json': { schema: { $ref: '#/components/schemas/InvoiceSuccessResponse' } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        422: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
})

openApiSpec.tags.push(
  { name: 'Stock', description: 'Master barang, stok masuk, stok keluar, rekap, summary, dan export stok.' },
  { name: 'Dashboard', description: 'Ringkasan dashboard operasional dan feed aktivitas.' },
  { name: 'Reports', description: 'Aging AR, Profit & Loss, Fleet Utilization, Audit Trail, refresh, dan export XLSX.' },
)

const stockItemUuidQuery = {
  name: 'stock_item_uuid',
  in: 'query',
  required: true,
  schema: { type: 'string', format: 'uuid' },
}
const xlsxResponse = {
  description: 'File XLSX.',
  content: {
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
      schema: { type: 'string', format: 'binary' },
    },
  },
}

Object.assign(openApiSpec.components.schemas, {
  StockItem: {
    type: 'object',
    properties: {
      id: { type: 'string', example: '1' },
      uuid: { type: 'string', format: 'uuid' },
      code: { type: 'string', example: 'TB-001' },
      name: { type: 'string', example: 'Tiang Beton' },
      category: { type: 'string', nullable: true, example: 'Material' },
      unit: { type: 'string', example: 'Batang' },
      description: { type: 'string', nullable: true },
      is_active: { type: 'boolean', example: true },
      current_stock: { type: 'number', example: 21 },
      peak_stock: { type: 'number', example: 30 },
      stock_level: { type: 'string', enum: ['empty', 'low', 'medium', 'high', 'unknown'], example: 'high' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  },
  CreateStockItemRequest: {
    type: 'object',
    required: ['code', 'name', 'unit'],
    properties: {
      code: { type: 'string', maxLength: 30, example: 'TB-001' },
      name: { type: 'string', minLength: 2, maxLength: 150, example: 'Tiang Beton' },
      category: { type: 'string', nullable: true, maxLength: 50 },
      unit: { type: 'string', maxLength: 20, example: 'Batang' },
      description: { type: 'string', nullable: true },
      is_active: { type: 'boolean', default: true },
    },
  },
  StockReceiptItemRequest: {
    type: 'object',
    required: ['qty'],
    properties: {
      stock_item_uuid: { type: 'string', format: 'uuid', nullable: true },
      stock_item_id: { type: 'integer', nullable: true, example: 1 },
      qty: { type: 'number', minimum: 0.01, example: 25 },
      kategori_name: { type: 'string', nullable: true, maxLength: 50, example: 'TM 12/200' },
      notes: { type: 'string', nullable: true },
    },
  },
  StockReceipt: {
    type: 'object',
    properties: {
      id: { type: 'string', example: '1' },
      uuid: { type: 'string', format: 'uuid' },
      receipt_number: { type: 'string', example: 'STK-MSK-2026-001' },
      receipt_date: { type: 'string', format: 'date' },
      supplier_name: { type: 'string', nullable: true },
      document_number: { type: 'string', nullable: true },
      customer_id: { type: 'string', nullable: true },
      customer: { type: 'object', nullable: true },
      notes: { type: 'string', nullable: true },
      items: { type: 'array', items: { type: 'object' } },
      created_by_name: { type: 'string', nullable: true },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  },
  CreateStockReceiptRequest: {
    type: 'object',
    required: ['receipt_date', 'items'],
    properties: {
      receipt_date: { type: 'string', format: 'date' },
      supplier_name: { type: 'string', nullable: true, maxLength: 150 },
      document_number: { type: 'string', nullable: true, maxLength: 100 },
      customer_uuid: { type: 'string', format: 'uuid', nullable: true },
      customer_id: { type: 'integer', nullable: true },
      notes: { type: 'string', nullable: true },
      items: { type: 'array', minItems: 1, items: { $ref: '#/components/schemas/StockReceiptItemRequest' } },
    },
  },
  StockDisbursement: {
    type: 'object',
    properties: {
      id: { type: 'string', example: '1' },
      uuid: { type: 'string', format: 'uuid' },
      disbursement_number: { type: 'string', example: 'STK-KLR-2026-001' },
      disbursement_date: { type: 'string', format: 'date' },
      stock_item_id: { type: 'string', example: '1' },
      stock_item: { $ref: '#/components/schemas/StockItem' },
      qty: { type: 'number', example: 7 },
      delivery_order_id: { type: 'string', nullable: true },
      sj_number_manual: { type: 'string', nullable: true },
      invoice_number_manual: { type: 'string', nullable: true },
      driver_name: { type: 'string', nullable: true },
      vehicle_plate: { type: 'string', nullable: true },
      destination: { type: 'string', nullable: true },
      customer_id: { type: 'string', nullable: true },
      customer: { type: 'object', nullable: true },
      notes: { type: 'string', nullable: true },
    },
  },
  CreateStockDisbursementRequest: {
    type: 'object',
    required: ['disbursement_date', 'qty'],
    properties: {
      disbursement_date: { type: 'string', format: 'date' },
      stock_item_uuid: { type: 'string', format: 'uuid', nullable: true },
      stock_item_id: { type: 'integer', nullable: true },
      qty: { type: 'number', minimum: 0.01 },
      delivery_order_uuid: { type: 'string', format: 'uuid', nullable: true },
      delivery_order_id: { type: 'integer', nullable: true },
      sj_number_manual: { type: 'string', nullable: true },
      invoice_number_manual: { type: 'string', nullable: true },
      driver_name: { type: 'string', nullable: true },
      vehicle_plate: { type: 'string', nullable: true },
      destination: { type: 'string', nullable: true },
      customer_uuid: { type: 'string', format: 'uuid', nullable: true },
      customer_id: { type: 'integer', nullable: true },
      notes: { type: 'string', nullable: true },
    },
  },
  DashboardSummaryResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          metrics: { type: 'array', items: { type: 'object' } },
          sj_distribution: { type: 'array', items: { type: 'object' } },
          top_armada: { type: 'array', items: { type: 'object' } },
          revenue_chart: { type: 'object' },
        },
      },
    },
  },
  ReportEnvelope: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Berhasil.' },
      data: { type: 'object' },
    },
  },
})

Object.assign(openApiSpec.paths, {
  '/stock/items': {
    get: {
      tags: ['Stock'],
      summary: 'Daftar master barang stok',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'category', in: 'query', schema: { type: 'string' } },
        { name: 'is_active', in: 'query', schema: { type: 'boolean' } },
      ],
      responses: { 200: { description: 'Daftar barang.', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/StockItem' } }, meta: { type: 'object' } } } } } }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
    post: {
      tags: ['Stock'],
      summary: 'Buat master barang stok',
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateStockItemRequest' } } } },
      responses: { 201: { description: 'Barang dibuat.', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/StockItem' } } } } } }, 403: { $ref: '#/components/responses/Forbidden' }, 422: { $ref: '#/components/responses/ValidationError' } },
    },
  },
  '/stock/items/{uuid}': {
    get: { tags: ['Stock'], summary: 'Detail barang stok', security: [{ bearerAuth: [] }], parameters: [uuidPathParam], responses: { 200: { description: 'Detail barang.', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/StockItem' } } } } } }, 404: { $ref: '#/components/responses/NotFound' } } },
    put: { tags: ['Stock'], summary: 'Update barang stok', security: [{ bearerAuth: [] }], parameters: [uuidPathParam], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateStockItemRequest' } } } }, responses: { 200: { description: 'Barang diperbarui.', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/StockItem' } } } } } }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } } },
    delete: { tags: ['Stock'], summary: 'Hapus barang stok', security: [{ bearerAuth: [] }], parameters: [uuidPathParam], responses: { 200: { description: 'Barang dihapus.', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericSuccessResponse' } } } }, 403: { $ref: '#/components/responses/Forbidden' }, 409: { $ref: '#/components/responses/Conflict' } } },
  },
  '/stock/items/{uuid}/toggle': {
    patch: { tags: ['Stock'], summary: 'Toggle aktif/nonaktif barang stok', security: [{ bearerAuth: [] }], parameters: [uuidPathParam], responses: { 200: { description: 'Status barang diperbarui.', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/StockItem' } } } } } } } },
  },
  '/stock/receipts': {
    get: { tags: ['Stock'], summary: 'Daftar stok masuk', security: [{ bearerAuth: [] }], parameters: [{ name: 'period', in: 'query', schema: { type: 'string', enum: ['this_month', 'last_month', 'all', 'custom'], default: 'all' } }], responses: { 200: { description: 'Daftar stok masuk.', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/StockReceipt' } }, meta: { type: 'object' } } } } } } } },
    post: { tags: ['Stock'], summary: 'Catat stok masuk', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateStockReceiptRequest' } } } }, responses: { 201: { description: 'Stok masuk dicatat.', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/StockReceipt' } } } } } }, 409: { $ref: '#/components/responses/Conflict' }, 422: { $ref: '#/components/responses/ValidationError' } } },
  },
  '/stock/receipts/{uuid}': {
    get: { tags: ['Stock'], summary: 'Detail stok masuk', security: [{ bearerAuth: [] }], parameters: [uuidPathParam], responses: { 200: { description: 'Detail stok masuk.', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/StockReceipt' } } } } } } } },
    put: { tags: ['Stock'], summary: 'Update stok masuk', security: [{ bearerAuth: [] }], parameters: [uuidPathParam], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateStockReceiptRequest' } } } }, responses: { 200: { description: 'Stok masuk diperbarui.' }, 409: { $ref: '#/components/responses/Conflict' } } },
    delete: { tags: ['Stock'], summary: 'Hapus stok masuk dan rollback saldo', security: [{ bearerAuth: [] }], parameters: [uuidPathParam], responses: { 200: { description: 'Stok masuk dihapus.', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericSuccessResponse' } } } }, 409: { $ref: '#/components/responses/Conflict' } } },
  },
  '/stock/disbursements': {
    get: { tags: ['Stock'], summary: 'Daftar stok keluar', security: [{ bearerAuth: [] }], parameters: [{ name: 'period', in: 'query', schema: { type: 'string', enum: ['this_month', 'last_month', 'all', 'custom'], default: 'all' } }], responses: { 200: { description: 'Daftar stok keluar.', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/StockDisbursement' } }, meta: { type: 'object' } } } } } } } },
    post: { tags: ['Stock'], summary: 'Catat stok keluar', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateStockDisbursementRequest' } } } }, responses: { 201: { description: 'Stok keluar dicatat.', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/StockDisbursement' } } } } } }, 409: { $ref: '#/components/responses/Conflict' }, 422: { $ref: '#/components/responses/ValidationError' } } },
  },
  '/stock/disbursements/{uuid}': {
    get: { tags: ['Stock'], summary: 'Detail stok keluar', security: [{ bearerAuth: [] }], parameters: [uuidPathParam], responses: { 200: { description: 'Detail stok keluar.', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/StockDisbursement' } } } } } } } },
    put: { tags: ['Stock'], summary: 'Update stok keluar dan recompute saldo', security: [{ bearerAuth: [] }], parameters: [uuidPathParam], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateStockDisbursementRequest' } } } }, responses: { 200: { description: 'Stok keluar diperbarui.' }, 409: { $ref: '#/components/responses/Conflict' } } },
    delete: { tags: ['Stock'], summary: 'Hapus stok keluar dan rollback saldo', security: [{ bearerAuth: [] }], parameters: [uuidPathParam], responses: { 200: { description: 'Stok keluar dihapus.', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericSuccessResponse' } } } } } },
  },
  '/stock/report/recap': {
    get: { tags: ['Stock'], summary: 'Rekap running balance stok per barang', security: [{ bearerAuth: [] }], parameters: [stockItemUuidQuery, { name: 'period', in: 'query', schema: { type: 'string', enum: ['this_month', 'last_month', 'all', 'custom'], default: 'all' } }], responses: { 200: { description: 'Rekap stok.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReportEnvelope' } } } } } },
  },
  '/stock/report/summary': {
    get: { tags: ['Stock'], summary: 'Summary saldo semua barang', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Summary stok.', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/StockItem' } } } } } } } } },
  },
  '/stock/report/export': {
    get: { tags: ['Stock'], summary: 'Export laporan stok XLSX', security: [{ bearerAuth: [] }], responses: { 200: xlsxResponse } },
  },
  '/dashboard/summary': {
    get: { tags: ['Dashboard'], summary: 'Summary dashboard utama', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Summary dashboard.', content: { 'application/json': { schema: { $ref: '#/components/schemas/DashboardSummaryResponse' } } } }, 401: { $ref: '#/components/responses/Unauthorized' } } },
  },
  '/dashboard/activity': {
    get: { tags: ['Dashboard'], summary: 'Feed aktivitas dashboard SJ dan Invoice', security: [{ bearerAuth: [] }], parameters: [{ name: 'module', in: 'query', schema: { type: 'string', enum: ['all', 'sj', 'invoice'], default: 'all' } }, { name: 'status', in: 'query', schema: { type: 'string', default: 'all' } }, { name: 'period', in: 'query', schema: { type: 'string', enum: ['all', 'this_month', 'last_month'], default: 'this_month' } }, { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }], responses: { 200: { description: 'Feed aktivitas.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReportEnvelope' } } } } } },
  },
  '/reports/aging-ar': {
    get: { tags: ['Reports'], summary: 'Laporan Aging AR', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Aging AR.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReportEnvelope' } } } } } },
  },
  '/reports/aging-ar/refresh': {
    post: { tags: ['Reports'], summary: 'Refresh Aging AR', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Refresh berhasil.', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericSuccessResponse' } } } } } },
  },
  '/reports/aging-ar/customers/{id}': {
    get: { tags: ['Reports'], summary: 'Detail Aging AR per customer', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Detail customer.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReportEnvelope' } } } } } },
  },
  '/reports/aging-ar/projects/{id}': {
    get: { tags: ['Reports'], summary: 'Detail Aging AR per project', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Detail project.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReportEnvelope' } } } } } },
  },
  '/reports/aging-ar/export': {
    get: { tags: ['Reports'], summary: 'Export Aging AR XLSX', security: [{ bearerAuth: [] }], responses: { 200: xlsxResponse } },
  },
  '/reports/profit-loss': {
    get: { tags: ['Reports'], summary: 'Laporan Profit & Loss', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Profit & Loss.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReportEnvelope' } } } } } },
  },
  '/reports/profit-loss/refresh': {
    post: { tags: ['Reports'], summary: 'Refresh Profit & Loss', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Refresh berhasil.', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericSuccessResponse' } } } } } },
  },
  '/reports/profit-loss/export': {
    get: { tags: ['Reports'], summary: 'Export Profit & Loss XLSX', security: [{ bearerAuth: [] }], responses: { 200: xlsxResponse } },
  },
  '/reports/fleet-utilization': {
    get: { tags: ['Reports'], summary: 'Laporan utilisasi armada', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Fleet utilization.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReportEnvelope' } } } }, 403: { $ref: '#/components/responses/Forbidden' } } },
  },
  '/reports/fleet-utilization/export': {
    get: { tags: ['Reports'], summary: 'Export utilisasi armada XLSX', security: [{ bearerAuth: [] }], responses: { 200: xlsxResponse, 403: { $ref: '#/components/responses/Forbidden' } } },
  },
  '/reports/audit-trail': {
    get: { tags: ['Reports'], summary: 'Audit trail aktivitas sistem', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Audit trail.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReportEnvelope' } } } } } },
  },
})

module.exports = openApiSpec
