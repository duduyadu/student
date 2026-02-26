'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Agency } from '@/lib/types'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { useAdminAuth } from '@/lib/useAdminAuth'
import { AppLayout } from '@/components/Layout/AppLayout'

export default function AgenciesPage() {
  const router = useRouter()
  const { user, handleLogout } = useAdminAuth()
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [lang, toggleLang]      = useLang()

  // 신규 등록 폼
  const [form, setForm] = useState({
    agency_name_vn: '', agency_name_kr: '',
    contact_person: '', contact_phone: '',
    email: '', password: '',
  })

  // 수정 상태
  const [editId, setEditId]     = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    agency_name_vn: '', agency_name_kr: '',
    contact_person: '', contact_phone: '',
  })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError]   = useState('')

  // 유학원 계정 이메일 (user_id → email 매핑)
  const [agencyEmails, setAgencyEmails] = useState<Record<string, string>>({})

  // 계정 추가 / 비밀번호 재설정 상태
  const [addAccountId, setAddAccountId]   = useState<string | null>(null)
  const [addAccountForm, setAddAccountForm] = useState({ email: '', password: '' })
  const [addAccountSaving, setAddAccountSaving] = useState(false)
  const [addAccountError, setAddAccountError]   = useState('')
  const [resetId, setResetId]       = useState<string | null>(null)
  const [resetPw, setResetPw]       = useState('')
  const [resetSaving, setResetSaving] = useState(false)
  const [resetError, setResetError]   = useState('')
  const [resetSuccess, setResetSuccess] = useState('')

  useEffect(() => {
    if (!user) return
    if (user.role !== 'master') { router.push('/'); return }
    loadAgencies().then(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const loadAgencies = async () => {
    const { data } = await supabase
      .from('agencies')
      .select('*')
      .order('agency_number')
    if (!data) return
    setAgencies(data)

    // 계정 있는 유학원의 이메일 가져오기
    const userIds = data.filter(a => a.user_id).map(a => a.user_id!).join(',')
    if (!userIds) return
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/agency-accounts?user_ids=${userIds}`, {
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
    })
    if (res.ok) setAgencyEmails(await res.json())
  }

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  // ── 수정 시작 ────────────────────────────────────────────────
  const startEdit = (a: Agency) => {
    setEditId(a.id)
    setEditForm({
      agency_name_vn: a.agency_name_vn ?? '',
      agency_name_kr: a.agency_name_kr ?? '',
      contact_person: a.contact_person ?? '',
      contact_phone:  a.contact_phone  ?? '',
    })
    setEditError('')
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditError('')
  }

  const handleUpdate = async (id: string) => {
    if (!editForm.agency_name_vn) {
      setEditError(t('agencyRequired', lang))
      return
    }
    setEditSaving(true)
    const { error: dbError } = await supabase
      .from('agencies')
      .update({
        agency_name_vn: editForm.agency_name_vn,
        agency_name_kr: editForm.agency_name_kr || null,
        contact_person: editForm.contact_person || null,
        contact_phone:  editForm.contact_phone  || null,
      })
      .eq('id', id)

    if (dbError) {
      setEditError(t('saveFail', lang) + dbError.message)
    } else {
      await loadAgencies()
      setEditId(null)
    }
    setEditSaving(false)
  }

  // ── 비활성화 (소프트 삭제) ────────────────────────────────────
  const handleToggleActive = async (a: Agency) => {
    const action = a.is_active ? t('deactivateBtn', lang) : t('activateBtn', lang)
    if (!confirm(`${a.agency_name_vn ?? a.agency_name_kr}를 ${action}하시겠습니까?`)) return
    await supabase.from('agencies').update({ is_active: !a.is_active }).eq('id', a.id)
    await loadAgencies()
  }

  // ── 신규 등록 ────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (!form.agency_name_vn) {
      setError(t('agencyRequired', lang))
      setSaving(false)
      return
    }

    const nextNumber = agencies.length > 0 ? Math.max(...agencies.map(a => a.agency_number)) + 1 : 1
    const autoCode   = String(nextNumber).padStart(3, '0')

    let userId: string | null = null
    if (form.email && form.password) {
      // Authorization 헤더로 현재 사용자 토큰 전달 (보안 수정)
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/create-agency-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          email:          form.email,
          password:       form.password,
          agency_code:    autoCode,
          agency_name_kr: form.agency_name_vn,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(t('accountCreateFail', lang) + json.error)
        setSaving(false)
        return
      }
      userId = json.user_id
    }

    const { error: dbError } = await supabase.from('agencies').insert({
      agency_code:    autoCode,
      agency_number:  nextNumber,
      agency_name_vn: form.agency_name_vn,
      agency_name_kr: form.agency_name_kr || null,
      contact_person: form.contact_person || null,
      contact_phone:  form.contact_phone  || null,
      user_id:        userId,
      is_active:      true,
    })

    if (dbError) {
      setError(t('saveFail', lang) + dbError.message)
      setSaving(false)
      return
    }

    await loadAgencies()
    setShowForm(false)
    setForm({ agency_name_vn: '', agency_name_kr: '', contact_person: '', contact_phone: '', email: '', password: '' })
    setSaving(false)
  }

  // ── 계정 추가 ────────────────────────────────────────────────
  const handleAddAccount = async (a: Agency) => {
    setAddAccountError('')
    if (!addAccountForm.email || !addAccountForm.password) {
      setAddAccountError('이메일과 비밀번호를 입력하세요.')
      return
    }
    setAddAccountSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/add-agency-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` },
      body: JSON.stringify({
        email: addAccountForm.email,
        password: addAccountForm.password,
        agency_id: a.id,
        agency_code: a.agency_code,
        agency_name_kr: a.agency_name_kr ?? a.agency_name_vn,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setAddAccountError(json.error)
      setAddAccountSaving(false)
      return
    }
    await loadAgencies()
    setAddAccountId(null)
    setAddAccountForm({ email: '', password: '' })
    setAddAccountSaving(false)
  }

  // ── 비밀번호 재설정 ────────────────────────────────────────────
  const handleResetPassword = async (a: Agency) => {
    setResetError(''); setResetSuccess('')
    if (!resetPw || resetPw.length < 8) { setResetError(t('resetPwMin8', lang)); return }
    if (!a.user_id) { setResetError(t('noLinkedAccount', lang)); return }
    setResetSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/reset-agency-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` },
      body: JSON.stringify({ user_id: a.user_id, new_password: resetPw }),
    })
    const json = await res.json()
    if (!res.ok) { setResetError(json.error); setResetSaving(false); return }
    setResetSuccess(t('pwChanged2', lang))
    setResetPw('')
    setResetSaving(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">{t('loading', lang)}</p></div>

  return (
    <AppLayout user={user} lang={lang} onToggleLang={toggleLang} onLogout={handleLogout} activeNav="agencies">
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">{t('agencyMgmtTitle', lang)} <span className="text-slate-400 font-normal text-base">({agencies.length}개)</span></h2>
          <button
            onClick={() => { setShowForm(!showForm); setEditId(null) }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            {showForm ? t('closeForm', lang) : t('addAgency', lang)}
          </button>
        </div>

        {/* 신규 등록 폼 */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">{t('agencyNewTitle', lang)}</h3>
              <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                {t('autoCode', lang)}: {String(agencies.length > 0 ? Math.max(...agencies.map(a => a.agency_number)) + 1 : 1).padStart(3, '0')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('agencyNameVn', lang)} *</label>
                <input value={form.agency_name_vn} onChange={e => set('agency_name_vn', e.target.value)} className={inp} placeholder="Trung tâm du học Hà Nội" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('agencyNameKr', lang)}</label>
                <input value={form.agency_name_kr} onChange={e => set('agency_name_kr', e.target.value)} className={inp} placeholder="하노이 유학원" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('contactPerson', lang)}</label>
                <input value={form.contact_person} onChange={e => set('contact_person', e.target.value)} className={inp} placeholder="Tran Minh" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('contactPhone', lang)}</label>
                <input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} className={inp} placeholder="+84-912-345-678" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 mb-3">{t('accountOptional', lang)}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t('fieldEmail', lang)}</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inp} placeholder="agency@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t('fieldPassword', lang)}</label>
                  <input type="password" value={form.password} onChange={e => set('password', e.target.value)} className={inp} placeholder="8자 이상" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">{t('noAccountNote', lang)}</p>
            </div>
            {error && <p className="mt-3 text-red-600 text-sm bg-red-50 px-4 py-2 rounded-xl">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50">{t('cancel', lang)}</button>
              <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-medium">
                {saving ? t('saving', lang) : t('saveAgency', lang)}
              </button>
            </div>
          </form>
        )}

        {/* 유학원 목록 */}
        <div className="space-y-3">
          {agencies.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm text-center py-16 text-slate-400">
              <p className="text-4xl mb-3">🏫</p>
              <p>{t('noAgencies', lang)}</p>
            </div>
          ) : agencies.map(a => (
            <div key={a.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* 수정 모드 */}
              {editId === a.id ? (
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-700">{t('editAgencyTitle', lang)}</h3>
                    <span className="font-mono text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">{a.agency_code}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t('agencyNameVn', lang)} *</label>
                      <input value={editForm.agency_name_vn} onChange={e => setEditForm(p => ({ ...p, agency_name_vn: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t('agencyNameKr', lang)}</label>
                      <input value={editForm.agency_name_kr} onChange={e => setEditForm(p => ({ ...p, agency_name_kr: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t('contactPerson', lang)}</label>
                      <input value={editForm.contact_person} onChange={e => setEditForm(p => ({ ...p, contact_person: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t('contactPhone', lang)}</label>
                      <input value={editForm.contact_phone} onChange={e => setEditForm(p => ({ ...p, contact_phone: e.target.value }))} className={inp} />
                    </div>
                  </div>
                  {editError && <p className="mt-2 text-red-600 text-xs bg-red-50 px-3 py-2 rounded-xl">{editError}</p>}
                  <div className="flex gap-2 mt-4">
                    <button onClick={cancelEdit} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50">{t('cancel', lang)}</button>
                    <button onClick={() => handleUpdate(a.id)} disabled={editSaving}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-medium">
                      {editSaving ? t('saving', lang) : t('save', lang)}
                    </button>
                  </div>
                </div>
              ) : (
                /* 보기 모드 */
                <>
                <div className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="font-mono text-sm font-medium text-slate-400 shrink-0">{a.agency_code}</span>
                    <div className="min-w-0">
                      <p className={`font-semibold text-slate-800 ${!a.is_active ? 'opacity-40' : ''}`}>
                        {a.agency_name_vn ?? a.agency_name_kr}
                      </p>
                      {a.agency_name_vn && a.agency_name_kr && (
                        <p className="text-xs text-slate-400">{a.agency_name_kr}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="hidden md:block text-right">
                      {a.contact_person && <p className="text-sm text-slate-600">{a.contact_person}</p>}
                      {a.contact_phone  && <p className="text-xs text-slate-400">{a.contact_phone}</p>}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${a.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {a.is_active ? t('activeStatus', lang) : t('inactiveStatus', lang)}
                    </span>
                    <div className="shrink-0 text-right">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${a.user_id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                        {a.user_id ? t('hasAccount', lang) : t('noAccount', lang)}
                      </span>
                      {a.user_id && agencyEmails[a.user_id] && (
                        <p className="text-xs text-slate-500 mt-1 font-mono">
                          {agencyEmails[a.user_id]}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(a)}
                        className="text-xs text-slate-500 hover:text-blue-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
                        {t('editBtn', lang)}
                      </button>
                      {a.user_id ? (
                        <button onClick={() => { setResetId(resetId === a.id ? null : a.id); setResetPw(''); setResetError(''); setResetSuccess('') }}
                          className="text-xs text-slate-500 hover:text-violet-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-violet-300 transition-colors">
                          {t('resetPwBtn', lang)}
                        </button>
                      ) : (
                        <button onClick={() => { setAddAccountId(addAccountId === a.id ? null : a.id); setAddAccountForm({ email: '', password: '' }); setAddAccountError('') }}
                          className="text-xs text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-400 transition-colors font-medium">
                          {t('addAccountBtn', lang)}
                        </button>
                      )}
                      <button onClick={() => handleToggleActive(a)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          a.is_active
                            ? 'text-slate-400 hover:text-red-500 border-slate-200 hover:border-red-200'
                            : 'text-emerald-600 hover:text-emerald-700 border-emerald-200'
                        }`}>
                        {a.is_active ? t('deactivateBtn', lang) : t('activateBtn', lang)}
                      </button>
                    </div>
                  </div>
                </div>
                {/* 계정 추가 인라인 폼 */}
                {addAccountId === a.id && (
                  <div className="px-5 pb-4 border-t border-slate-100 pt-4 bg-blue-50">
                    <p className="text-xs font-semibold text-slate-600 mb-3">{t('addAccountTitle', lang)}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">{t('accountEmailLbl', lang)}</label>
                        <input value={addAccountForm.email} onChange={e => setAddAccountForm(p => ({ ...p, email: e.target.value }))}
                          className={inp} placeholder="staff@agency.com" type="email" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">{t('accountPwLbl', lang)}</label>
                        <input value={addAccountForm.password} onChange={e => setAddAccountForm(p => ({ ...p, password: e.target.value }))}
                          className={inp} type="password" placeholder="••••••••" />
                      </div>
                    </div>
                    {addAccountError && <p className="text-xs text-red-600 mt-2">{addAccountError}</p>}
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setAddAccountId(null)} className="px-4 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-50">{t('cancel', lang)}</button>
                      <button onClick={() => handleAddAccount(a)} disabled={addAccountSaving}
                        className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-xs font-medium">
                        {addAccountSaving ? t('processing', lang) : t('createAccountBtn', lang)}
                      </button>
                    </div>
                  </div>
                )}
                {/* 비밀번호 재설정 인라인 폼 */}
                {resetId === a.id && (
                  <div className="px-5 pb-4 border-t border-slate-100 pt-4 bg-violet-50">
                    <p className="text-xs font-semibold text-slate-600 mb-1">{t('resetPwTitle', lang)}</p>
                    {a.user_id && agencyEmails[a.user_id] && (
                      <p className="text-xs text-slate-500 mb-3">
                        {t('accountEmailInfo', lang)}: <span className="font-mono font-medium text-slate-700">{agencyEmails[a.user_id]}</span>
                      </p>
                    )}
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-xs text-slate-500 mb-1">{t('newPasswordLbl', lang)}</label>
                        <input value={resetPw} onChange={e => setResetPw(e.target.value)}
                          className={inp} type="password" placeholder="••••••••" />
                      </div>
                      <button onClick={() => handleResetPassword(a)} disabled={resetSaving}
                        className="px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white rounded-lg text-xs font-medium">
                        {resetSaving ? t('processing', lang) : t('pwChangeBtn', lang)}
                      </button>
                      <button onClick={() => setResetId(null)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-50">{t('cancel', lang)}</button>
                    </div>
                    {resetError   && <p className="text-xs text-red-600 mt-2">{resetError}</p>}
                    {resetSuccess && <p className="text-xs text-emerald-600 mt-2">{resetSuccess}</p>}
                  </div>
                )}
                </>
              )}
            </div>
          ))}
        </div>
      </main>
    </AppLayout>
  )
}

const inp = 'w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'
