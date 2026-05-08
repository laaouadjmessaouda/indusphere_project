'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ALL_PERMISSIONS } from '@/lib/permissions'
import { useLocale, useTranslations } from 'next-intl'
import styles from '@/styles/pages/settings.module.css'

interface Role {
  _id: string
  name: string
  permissions: string[]
  isDefault: boolean
}

interface User {
  _id: string
  email: string
  isActive: boolean
  roleId: { _id: string; name: string } | null
  createdAt: string
}

const permissionGroups = [
  // CMMS
  { label: 'CMMS — الأصول',      prefix: 'cmms.assets' },
  { label: 'CMMS — أوامر العمل', prefix: 'cmms.workorders' },
  { label: 'CMMS — قطع الغيار',  prefix: 'cmms.spareparts' },
  { label: 'CMMS — طلبات صيانة', prefix: 'cmms.maintenance' },
  { label: 'CMMS — صيانة وقائية',prefix: 'cmms.preventive' },
  // ERP
  { label: 'ERP — المالية',       prefix: 'erp.finance' },
  { label: 'ERP — الإنتاج',       prefix: 'erp.production' },
  { label: 'ERP — المخزون',       prefix: 'erp.inventory' },
  { label: 'ERP — المشتريات',     prefix: 'erp.procurement' },
  { label: 'ERP — الموارد البشرية',prefix: 'erp.hr' },
  // Accounting
  { label: 'المحاسبة — الموردين',    prefix: 'accounting.suppliers' },
  { label: 'المحاسبة — العملاء',    prefix: 'accounting.customers' },
  { label: 'المحاسبة — الفواتير',   prefix: 'accounting.invoices' },
  { label: 'المحاسبة — الرواتب',    prefix: 'accounting.payroll' },
  { label: 'المحاسبة — الضرائب',    prefix: 'accounting.taxes' },
  { label: 'المحاسبة — تكاليف الإنتاج', prefix: 'accounting.production' },
  // Settings
  { label: 'الإعدادات — المستخدمين',prefix: 'settings.users' },
  { label: 'الإعدادات — الأدوار',  prefix: 'settings.roles' },
]

export default function SettingsPage() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('Common')
  const tSettings = useTranslations('Settings')
  
  const [tab, setTab] = useState<'users' | 'roles'>('users')
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  // User Form
  const [showUserForm, setShowUserForm] = useState(false)
  const [userForm, setUserForm] = useState({ email: '', password: '', roleId: '' })
  const [savingUser, setSavingUser] = useState(false)

  // Role Form
  const [showRoleForm, setShowRoleForm] = useState(false)
  const [roleForm, setRoleForm] = useState({ name: '', permissions: [] as string[] })
  const [savingRole, setSavingRole] = useState(false)

  // Edit Role
  const [editingRole, setEditingRole] = useState<Role | null>(null)

  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [])

  const fetchUsers = async () => {
    const res = await fetch('/api/users')
    const data = await res.json()
    if (data.success) setUsers(data.data)
    setLoading(false)
  }

  const fetchRoles = async () => {
    const res = await fetch('/api/roles')
    const data = await res.json()
    if (data.success) setRoles(data.data)
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingUser(true)
    try {
      const passwordToSend = userForm.password || ''
      
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userForm.email,
          password: passwordToSend,
          roleId: userForm.roleId,
          name: userForm.email.split('@')[0],
        }),
      })
      const data = await res.json()
      if (data.success) {
        fetchUsers()
        setShowUserForm(false)
        setUserForm({ email: '', password: '', roleId: '' })
        
        if (data.data?.generatedPassword) {
          alert(`${t('addSuccess')}\n\n${t('temporaryPassword')}: ${data.data.generatedPassword}\n\n${t('passwordSentToEmail')}`)
        } else {
          alert(t('addSuccess'))
        }
      } else {
        alert(`${t('error')}: ${data.message}`)
      }
    } catch (error) {
      alert(t('serverError'))
    } finally {
      setSavingUser(false)
    }
  }

  const handleToggleUser = async (id: string, isActive: boolean) => {
    await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
    fetchUsers()
  }

  // ✅ دالة لتعديل المستخدم (الانتقال إلى صفحة التعديل)
  const handleEditUser = (userId: string) => {
    router.push(`/${locale}/settings/users/${userId}/edit`)
  }

  const handleDeleteUser = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return
    await fetch(`/api/users/${id}`, { method: 'DELETE' })
    fetchUsers()
  }

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingRole(true)
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleForm),
      })
      const data = await res.json()
      if (data.success) {
        fetchRoles()
        setShowRoleForm(false)
        setRoleForm({ name: '', permissions: [] })
        alert(t('addSuccess'))
      } else {
        alert(data.message)
      }
    } finally {
      setSavingRole(false)
    }
  }

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRole) return
    setSavingRole(true)
    try {
      const res = await fetch(`/api/roles/${editingRole._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingRole.name, permissions: editingRole.permissions }),
      })
      const data = await res.json()
      if (data.success) {
        fetchRoles()
        setEditingRole(null)
        alert(t('editSuccess'))
      } else {
        alert(data.message)
      }
    } finally {
      setSavingRole(false)
    }
  }

  const handleDeleteRole = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return
    await fetch(`/api/roles/${id}`, { method: 'DELETE' })
    fetchRoles()
  }

  const togglePermission = (perm: string, target: 'form' | 'edit') => {
    if (target === 'form') {
      setRoleForm(prev => ({
        ...prev,
        permissions: prev.permissions.includes(perm)
          ? prev.permissions.filter(p => p !== perm)
          : [...prev.permissions, perm]
      }))
    } else if (editingRole) {
      setEditingRole(prev => prev ? ({
        ...prev,
        permissions: prev.permissions.includes(perm)
          ? prev.permissions.filter(p => p !== perm)
          : [...prev.permissions, perm]
      }) : null)
    }
  }

  const toggleGroupPermissions = (prefix: string, target: 'form' | 'edit') => {
    const groupPerms = ALL_PERMISSIONS.filter(p => p.startsWith(prefix))
    if (target === 'form') {
      const allSelected = groupPerms.every(p => roleForm.permissions.includes(p))
      setRoleForm(prev => ({
        ...prev,
        permissions: allSelected
          ? prev.permissions.filter(p => !p.startsWith(prefix))
          : [...new Set([...prev.permissions, ...groupPerms])]
      }))
    } else if (editingRole) {
      const allSelected = groupPerms.every(p => editingRole.permissions.includes(p))
      setEditingRole(prev => prev ? ({
        ...prev,
        permissions: allSelected
          ? prev.permissions.filter(p => !p.startsWith(prefix))
          : [...new Set([...prev.permissions, ...groupPerms])]
      }) : null)
    }
  }

  const PermissionsGrid = ({ perms, target }: { perms: string[], target: 'form' | 'edit' }) => (
    <div className={styles.permissionsGrid}>
      {permissionGroups.map(group => {
        const groupPerms = ALL_PERMISSIONS.filter(p => p.startsWith(group.prefix))
        const allSelected = groupPerms.every(p => perms.includes(p))
        return (
          <div key={group.prefix} className={styles.permissionGroup}>
            <div className={styles.permissionHeader}>
              <span className={styles.permissionLabel}>{group.label}</span>
              <button 
                type="button" 
                onClick={() => toggleGroupPermissions(group.prefix, target)}
                className={`${styles.groupButton} ${allSelected ? styles.groupButtonSelected : ''}`}
              >
                {allSelected ? t('deselectAll') : t('selectAll')}
              </button>
            </div>
            <div className={styles.permissionActions}>
              {groupPerms.map(perm => {
                const action = perm.split('.')[2]
                const selected = perms.includes(perm)
                const actionLabel = action === 'view' ? t('view') : action === 'create' ? t('create') : t('edit')
                const actionIcon = action === 'view' ? '👁' : action === 'create' ? '➕' : '✏️'
                return (
                  <button 
                    key={perm} 
                    type="button" 
                    onClick={() => togglePermission(perm, target)}
                    className={`${styles.permissionButton} ${selected ? styles.permissionButtonSelected : styles.permissionButtonUnselected}`}
                  >
                    {actionIcon} {actionLabel}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
  
  return (
    <div className={styles.page} dir="rtl">
      <div className={styles.container}>

        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>{tSettings('title')}</h1>
          <p className={styles.subtitle}>{tSettings('title')}</p>
        </div>

        {/* 🔑 رابط تغيير كلمة المرور */}
        <div className={styles.changePasswordLink}>
          <a 
            href={`/${locale}/settings/change-password`}
            className={styles.link}
            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
          >
            🔑 {tSettings('changePassword')}
          </a>
        </div>

        {/* Tabs */}
        <div className={styles.tabsContainer}>
          <button 
            onClick={() => setTab('users')}
            className={`${styles.tabButton} ${tab === 'users' ? styles.tabButtonActive : ''}`}
          >
            {tSettings('users')}
          </button>
          <button 
            onClick={() => setTab('roles')}
            className={`${styles.tabButton} ${tab === 'roles' ? styles.tabButtonActive : ''}`}
          >
            {tSettings('roles')}
          </button>
        </div>

        {/* Users Tab */}
        {tab === 'users' && (
          <div>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionCount}>{users.length} {t('users')}</span>
              <button onClick={() => setShowUserForm(!showUserForm)} className={styles.addButton}>
                + {t('add')}
              </button>
            </div>

            {/* Add User Form */}
            {showUserForm && (
              <div className={styles.formContainer}>
                <h3 className={styles.formTitle}>{t('addUser')}</h3>
                <form onSubmit={handleAddUser} className={styles.formGrid}>
                  <div>
                    <label className={styles.formLabel}>{t('email')}</label>
                    <input required type="email" value={userForm.email}
                      onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                      dir="ltr" placeholder="user@factory.dz"
                      className={styles.formInput} />
                  </div>
                  <div>
                    <label className={styles.formLabel}>{t('password')} ({t('optional')})</label>
                    <input type="password" value={userForm.password}
                      onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                      dir="ltr" placeholder={t('leaveEmptyForRandom')}
                      className={styles.formInput} />
                    <p className={styles.hintText}>{t('leaveEmptyHint')}</p>
                  </div>
                  <div>
                    <label className={styles.formLabel}>{t('role')}</label>
                    <select value={userForm.roleId}
                      onChange={e => setUserForm({ ...userForm, roleId: e.target.value })}
                      className={styles.formSelect}>
                      <option value="">{t('noRole')}</option>
                      {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div className={styles.formActions}>
                    <button type="submit" disabled={savingUser} className={styles.saveButton}>
                      {savingUser ? t('saving') : t('add')}
                    </button>
                    <button type="button" onClick={() => setShowUserForm(false)} className={styles.cancelButton}>
                      {t('cancel')}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Users Table */}
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr className={styles.tableHeader}>
                    <th className={styles.tableHeaderCell}>{t('email')}</th>
                    <th className={styles.tableHeaderCell}>{t('role')}</th>
                    <th className={styles.tableHeaderCell}>{t('status')}</th>
                    <th className={styles.tableHeaderCell}>{t('createdAt')}</th>
                    <th className={styles.tableHeaderCell}>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className={styles.loadingState}>{t('loading')}</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={5} className={styles.emptyState}>{t('noData')}</td></tr>
                  ) : (
                    users.map(user => (
                      <tr key={user._id} className={styles.tableRow}>
                        <td className={`${styles.tableCell} ${styles.cellEmail}`} dir="ltr">{user.email}</td>
                        <td className={styles.tableCell}>
                          <span className={styles.roleBadge}>{user.roleId?.name || '—'}</span>
                        </td>
                        <td className={styles.tableCell}>
                          <span className={user.isActive ? styles.statusActive : styles.statusInactive}>
                            {user.isActive ? t('active') : t('inactive')}
                          </span>
                        </td>
                        <td className={styles.tableCell}>{new Date(user.createdAt).toLocaleDateString('ar-DZ')}</td>
                        <td className={styles.tableCell}>
                          <div className={styles.actionButtons}>
                            {/* ✅ زر تعديل المستخدم */}
                            <button 
                              onClick={() => handleEditUser(user._id)}
                              className={`${styles.actionBtn} ${styles.actionEdit}`}
                            >
                              {t('edit')}
                            </button>
                            <button 
                              onClick={() => handleToggleUser(user._id, user.isActive)}
                              className={`${styles.actionBtn} ${styles.actionEdit}`}
                            >
                              {user.isActive ? t('deactivate') : t('activate')}
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user._id)}
                              className={`${styles.actionBtn} ${styles.actionDelete}`}
                            >
                              {t('delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Roles Tab */}
        {tab === 'roles' && (
          <div>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionCount}>{roles.length} {t('roles')}</span>
              <button onClick={() => { setShowRoleForm(!showRoleForm); setEditingRole(null) }} className={styles.addButton}>
                + {t('addRole')}
              </button>
            </div>

            {/* Add Role Form */}
            {showRoleForm && !editingRole && (
              <div className={styles.formContainer}>
                <h3 className={styles.formTitle}>{t('newRole')}</h3>
                <form onSubmit={handleAddRole} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label className={styles.formLabel}>{t('roleName')}</label>
                    <input required value={roleForm.name}
                      onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                      placeholder={t('rolePlaceholder')}
                      className={styles.formInput} style={{ maxWidth: '300px' }} />
                  </div>
                  <div>
                    <label className={styles.formLabel}>{t('permissions')}</label>
                    <PermissionsGrid perms={roleForm.permissions} target="form" />
                  </div>
                  <div className={styles.formActions}>
                    <button type="submit" disabled={savingRole} className={styles.saveButton}>
                      {savingRole ? t('saving') : t('save')}
                    </button>
                    <button type="button" onClick={() => setShowRoleForm(false)} className={styles.cancelButton}>
                      {t('cancel')}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Edit Role Form */}
            {editingRole && (
              <div className={styles.formContainer} style={{ borderColor: 'rgba(26, 188, 156, 0.3)' }}>
                <h3 className={styles.formTitle} style={{ color: 'var(--color-secondary)' }}>
                  {t('editRole')}: {editingRole.name}
                </h3>
                <form onSubmit={handleUpdateRole} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label className={styles.formLabel}>{t('roleName')}</label>
                    <input required value={editingRole.name}
                      onChange={e => setEditingRole({ ...editingRole, name: e.target.value })}
                      className={styles.formInput} style={{ maxWidth: '300px' }} />
                  </div>
                  <div>
                    <label className={styles.formLabel}>{t('permissions')}</label>
                    <PermissionsGrid perms={editingRole.permissions} target="edit" />
                  </div>
                  <div className={styles.formActions}>
                    <button type="submit" disabled={savingRole} className={styles.saveButton}>
                      {savingRole ? t('saving') : t('save')}
                    </button>
                    <button type="button" onClick={() => setEditingRole(null)} className={styles.cancelButton}>
                      {t('cancel')}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Roles Grid */}
            <div className={styles.rolesGrid}>
              {roles.map(role => (
                <div key={role._id} className={styles.roleCard}>
                  <div className={styles.roleHeader}>
                    <h3 className={styles.roleName}>🔐 {role.name}</h3>
                    <div className={styles.roleActions}>
                      <button onClick={() => { setEditingRole(role); setShowRoleForm(false) }}
                        className={`${styles.actionBtn} ${styles.actionEdit}`}>
                        {t('edit')}
                      </button>
                      <button onClick={() => handleDeleteRole(role._id)}
                        className={`${styles.actionBtn} ${styles.actionDelete}`}>
                        {t('delete')}
                      </button>
                    </div>
                  </div>
                  <div className={styles.roleCount}>
                    {role.permissions.length} {t('permissions')}
                  </div>
                  <div className={styles.moduleTags}>
                    {['cmms', 'erp', 'settings', 'accounting'].map(module => {
                      const count = role.permissions.filter(p => p.startsWith(module)).length
                      if (count === 0) return null
                      return (
                        <span key={module} className={styles.moduleTag}>
                          {module.toUpperCase()} ({count})
                        </span>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}