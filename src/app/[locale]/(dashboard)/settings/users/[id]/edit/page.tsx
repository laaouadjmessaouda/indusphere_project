'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import styles from '@/styles/pages/settings.module.css';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

interface User {
  _id: string;
  email: string;
  isActive: boolean;
  roleId: { _id: string; name: string } | null;
}

interface Role {
  _id: string;
  name: string;
}

export default function EditUserPage({ params }: Props) {
  const { locale, id } = use(params);
  const router = useRouter();
  const t = useTranslations('Common');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState({
    email: '',
    roleId: '',
    isActive: true,
  });

  useEffect(() => {
    fetchUser();
    fetchRoles();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch(`/api/users/${id}`);
      const data = await res.json();
      if (data.success) {
        setUser(data.data);
        setForm({
          email: data.data.email,
          roleId: data.data.roleId?._id || '',
          isActive: data.data.isActive,
        });
      } else {
        setError(data.message);
      }
    } catch {
      setError(t('fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    const res = await fetch('/api/roles');
    const data = await res.json();
    if (data.success) setRoles(data.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        alert(t('editSuccess'));
        router.push(`/${locale}/settings`);
      } else {
        setError(data.message);
      }
    } catch {
      setError(t('error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.loadingState}>{t('loading')}</div>;

  return (
    <div className={styles.page} dir="rtl">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t('editUser')}</h1>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.formContainer}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('email')}</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={styles.formInput}
              dir="ltr"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('role')}</label>
            <select
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              className={styles.formSelect}
            >
              <option value="">{t('noRole')}</option>
              {roles.map((role) => (
                <option key={role._id} value={role._id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('status')}</label>
            <select
              value={form.isActive ? 'active' : 'inactive'}
              onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })}
              className={styles.formSelect}
            >
              <option value="active">{t('active')}</option>
              <option value="inactive">{t('inactive')}</option>
            </select>
          </div>

          <div className={styles.formActions}>
            <button type="submit" disabled={saving} className={styles.saveButton}>
              {saving ? t('saving') : t('save')}
            </button>
            <button type="button" onClick={() => router.push(`/${locale}/settings`)} className={styles.cancelButton}>
              {t('cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}