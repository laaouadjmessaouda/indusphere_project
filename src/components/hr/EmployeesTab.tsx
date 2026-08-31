'use client';

import { use } from 'react';
import { useTranslations } from 'next-intl';

type Props = {
  params: Promise<{ locale: string }>;
};
// src/components/hr/EmployeeEvaluationsTab.tsx
import { useState, useEffect } from 'react';

import styles from '@/styles/pages/employee-evaluations.module.css';

interface Employee {
  _id: string;
  fullName: string;
  employeeCode: string;
  department: string;
  position: string;
}

interface Evaluation {
  _id: string;
  employeeId: Employee;
  evaluatorId: { name: string; email: string };
  department: string;
  evaluationDate: string;
  period: string;
  objectivesScore: number;
  objectivesComment: string;
  clientOrientationScore: number;
  clientOrientationComment: string;
  collaborationScore: number;
  collaborationComment: string;
  leadershipScore: number;
  leadershipComment: string;
  totalScore: number;
  averageScore: number;
  rating: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  status: string;
}

export default function EmployeeEvaluationsTab({ params }: Props) {
  const { locale } = use(params);
  const t = useTranslations('Evaluations');
  const tCommon = useTranslations('Common');
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [form, setForm] = useState({
    period: '',
    evaluationDate: new Date().toISOString().split('T')[0],
    objectivesScore: 0,
    objectivesComment: '',
    clientOrientationScore: 0,
    clientOrientationComment: '',
    collaborationScore: 0,
    collaborationComment: '',
    leadershipScore: 0,
    leadershipComment: '',
    strengths: [''],
    improvements: [''],
    recommendations: [''],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('');

  useEffect(() => {
    fetchEmployees();
    fetchEvaluations();
  }, []);

  useEffect(() => {
    fetchEvaluations();
  }, [filterDepartment, filterPeriod]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees?status=active');
      const data = await res.json();
      if (data.success) setEmployees(data.data);
    } catch {
      console.error('Error fetching employees');
    }
  };

  const fetchEvaluations = async () => {
    try {
      let url = '/api/employee-evaluations';
      const params = new URLSearchParams();
      if (filterDepartment !== 'all') params.append('department', filterDepartment);
      if (filterPeriod) params.append('period', filterPeriod);
      if (params.toString()) url += `?${params}`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setEvaluations(data.data);
    } catch {
      console.error('Error fetching evaluations');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployee(employeeId);
    const emp = employees.find(e => e._id === employeeId);
    if (emp) setSelectedDepartment(emp.department);
  };

  const addField = (field: 'strengths' | 'improvements' | 'recommendations') => {
    setForm({ ...form, [field]: [...form[field], ''] });
  };

  const removeField = (field: 'strengths' | 'improvements' | 'recommendations', index: number) => {
    const newList = [...form[field]];
    newList.splice(index, 1);
    setForm({ ...form, [field]: newList });
  };

  const updateField = (field: 'strengths' | 'improvements' | 'recommendations', index: number, value: string) => {
    const newList = [...form[field]];
    newList[index] = value;
    setForm({ ...form, [field]: newList });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) {
      setError(t('selectEmployee'));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/employee-evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployee,
          department: selectedDepartment,
          period: form.period,
          evaluationDate: form.evaluationDate,
          objectivesScore: form.objectivesScore,
          objectivesComment: form.objectivesComment,
          clientOrientationScore: form.clientOrientationScore,
          clientOrientationComment: form.clientOrientationComment,
          collaborationScore: form.collaborationScore,
          collaborationComment: form.collaborationComment,
          leadershipScore: form.leadershipScore,
          leadershipComment: form.leadershipComment,
          strengths: form.strengths.filter(s => s.trim()),
          improvements: form.improvements.filter(i => i.trim()),
          recommendations: form.recommendations.filter(r => r.trim()),
          status: 'submitted',
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(t('evaluationAdded'));
        setShowForm(false);
        setSelectedEmployee('');
        setSelectedDepartment('');
        setForm({
          period: '',
          evaluationDate: new Date().toISOString().split('T')[0],
          objectivesScore: 0,
          objectivesComment: '',
          clientOrientationScore: 0,
          clientOrientationComment: '',
          collaborationScore: 0,
          collaborationComment: '',
          leadershipScore: 0,
          leadershipComment: '',
          strengths: [''],
          improvements: [''],
          recommendations: [''],
        });
        fetchEvaluations();
      } else {
        setError(data.message);
      }
    } catch {
      setError(tCommon('error'));
    } finally {
      setSaving(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return styles.scoreHigh;
    if (score >= 60) return styles.scoreMedium;
    return styles.scoreLow;
  };

  const getRatingClass = (rating: string) => {
    switch (rating) {
      case 'excellent': return styles.ratingExcellent;
      case 'very_good': return styles.ratingVeryGood;
      case 'good': return styles.ratingGood;
      case 'satisfactory': return styles.ratingSatisfactory;
      case 'needs_improvement': return styles.ratingNeedsImprovement;
      default: return '';
    }
  };

  const getRatingLabel = (rating: string) => {
    switch (rating) {
      case 'excellent': return t('excellent');
      case 'very_good': return t('veryGood');
      case 'good': return t('good');
      case 'satisfactory': return t('satisfactory');
      case 'needs_improvement': return t('needsImprovement');
      default: return rating;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'ar' ? 'ar-DZ' : locale === 'fr' ? 'fr-FR' : 'en-US');
  };

  const departmentLabels: Record<string, string> = {
    cmms: 'CMMS - الصيانة',
    erp: 'ERP - الموارد',
    accounting: 'المحاسبة',
  };

  return (
    <div>
      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>{t('filterByDepartment')}</label>
          <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className={styles.filterSelect}>
            <option value="all">{t('allDepartments')}</option>
            <option value="cmms">CMMS</option>
            <option value="erp">ERP</option>
            <option value="accounting">{t('accounting')}</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>{t('filterByPeriod')}</label>
          <input type="text" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} placeholder={t('periodPlaceholder')} className={styles.filterInput} />
        </div>
      </div>

      {/* Add Button */}
      <div className={styles.addButtonContainer}>
        <button onClick={() => setShowForm(!showForm)} className={styles.addButton}>+ {t('addEvaluation')}</button>
      </div>

      {error && <div className={styles.errorMessage}><p className={styles.errorText}>{error}</p></div>}

      {/* Form */}
      {showForm && (
        <div className={styles.formContainer}>
          <h2 className={styles.formTitle}>{t('addEvaluation')}</h2>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <div className={styles.formFieldFull}>
                <label className={styles.formLabel}>{t('employee')} *</label>
                <select required value={selectedEmployee} onChange={(e) => handleEmployeeChange(e.target.value)} className={styles.formSelect}>
                  <option value="">{t('selectEmployee')}</option>
                  {employees.map((emp) => (<option key={emp._id} value={emp._id}>{emp.employeeCode} - {emp.fullName} ({emp.position})</option>))}
                </select>
              </div>

              <div><label className={styles.formLabel}>{t('period')} *</label><input type="text" required value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="مثال: 2024-Q1" className={styles.formInput} /></div>
              <div><label className={styles.formLabel}>{t('evaluationDate')} *</label><input type="date" required value={form.evaluationDate} onChange={(e) => setForm({ ...form, evaluationDate: e.target.value })} className={styles.formInput} /></div>

              {/* Section 1 */}
              <div className={styles.formFieldFull}>
                <div className={styles.sectionCard}>
                  <h3 className={styles.sectionTitle}>1. {t('objectivesTitle')}</h3>
                  <p className={styles.sectionDesc}>{t('objectivesDesc')}</p>
                  <div className={styles.scoreRow}>
                    <label>{t('score')} (0-100)</label>
                    <input type="range" min="0" max="100" value={form.objectivesScore} onChange={(e) => setForm({ ...form, objectivesScore: Number(e.target.value) })} className={styles.rangeInput} />
                    <span className={getScoreColor(form.objectivesScore)}>{form.objectivesScore}%</span>
                  </div>
                  <textarea value={form.objectivesComment} onChange={(e) => setForm({ ...form, objectivesComment: e.target.value })} rows={2} className={styles.formTextarea} placeholder={t('commentsPlaceholder')} />
                </div>
              </div>

              {/* Section 2 */}
              <div className={styles.formFieldFull}>
                <div className={styles.sectionCard}>
                  <h3 className={styles.sectionTitle}>2. {t('clientOrientationTitle')}</h3>
                  <p className={styles.sectionDesc}>{t('clientOrientationDesc')}</p>
                  <div className={styles.scoreRow}>
                    <label>{t('score')} (0-100)</label>
                    <input type="range" min="0" max="100" value={form.clientOrientationScore} onChange={(e) => setForm({ ...form, clientOrientationScore: Number(e.target.value) })} className={styles.rangeInput} />
                    <span className={getScoreColor(form.clientOrientationScore)}>{form.clientOrientationScore}%</span>
                  </div>
                  <textarea value={form.clientOrientationComment} onChange={(e) => setForm({ ...form, clientOrientationComment: e.target.value })} rows={2} className={styles.formTextarea} placeholder={t('commentsPlaceholder')} />
                </div>
              </div>

              {/* Section 3 */}
              <div className={styles.formFieldFull}>
                <div className={styles.sectionCard}>
                  <h3 className={styles.sectionTitle}>3. {t('collaborationTitle')}</h3>
                  <p className={styles.sectionDesc}>{t('collaborationDesc')}</p>
                  <div className={styles.scoreRow}>
                    <label>{t('score')} (0-100)</label>
                    <input type="range" min="0" max="100" value={form.collaborationScore} onChange={(e) => setForm({ ...form, collaborationScore: Number(e.target.value) })} className={styles.rangeInput} />
                    <span className={getScoreColor(form.collaborationScore)}>{form.collaborationScore}%</span>
                  </div>
                  <textarea value={form.collaborationComment} onChange={(e) => setForm({ ...form, collaborationComment: e.target.value })} rows={2} className={styles.formTextarea} placeholder={t('commentsPlaceholder')} />
                </div>
              </div>

              {/* Section 4 */}
              <div className={styles.formFieldFull}>
                <div className={styles.sectionCard}>
                  <h3 className={styles.sectionTitle}>4. {t('leadershipTitle')}</h3>
                  <p className={styles.sectionDesc}>{t('leadershipDesc')}</p>
                  <div className={styles.scoreRow}>
                    <label>{t('score')} (0-100)</label>
                    <input type="range" min="0" max="100" value={form.leadershipScore} onChange={(e) => setForm({ ...form, leadershipScore: Number(e.target.value) })} className={styles.rangeInput} />
                    <span className={getScoreColor(form.leadershipScore)}>{form.leadershipScore}%</span>
                  </div>
                  <textarea value={form.leadershipComment} onChange={(e) => setForm({ ...form, leadershipComment: e.target.value })} rows={2} className={styles.formTextarea} placeholder={t('commentsPlaceholder')} />
                </div>
              </div>

              {/* Strengths */}
              <div className={styles.formFieldFull}>
                <div className={styles.listSection}>
                  <label className={styles.formLabel}>{t('strengths')}</label>
                  {form.strengths.map((item, idx) => (
                    <div key={idx} className={styles.listItem}>
                      <input type="text" value={item} onChange={(e) => updateField('strengths', idx, e.target.value)} className={styles.formInput} placeholder={t('strengthPlaceholder')} />
                      {form.strengths.length > 1 && <button type="button" onClick={() => removeField('strengths', idx)} className={styles.removeBtn}>✖</button>}
                    </div>
                  ))}
                  <button type="button" onClick={() => addField('strengths')} className={styles.addBtn}>+ {t('addStrength')}</button>
                </div>
              </div>

              {/* Improvements */}
              <div className={styles.formFieldFull}>
                <div className={styles.listSection}>
                  <label className={styles.formLabel}>{t('improvements')}</label>
                  {form.improvements.map((item, idx) => (
                    <div key={idx} className={styles.listItem}>
                      <input type="text" value={item} onChange={(e) => updateField('improvements', idx, e.target.value)} className={styles.formInput} placeholder={t('improvementPlaceholder')} />
                      {form.improvements.length > 1 && <button type="button" onClick={() => removeField('improvements', idx)} className={styles.removeBtn}>✖</button>}
                    </div>
                  ))}
                  <button type="button" onClick={() => addField('improvements')} className={styles.addBtn}>+ {t('addImprovement')}</button>
                </div>
              </div>

              {/* Recommendations */}
              <div className={styles.formFieldFull}>
                <div className={styles.listSection}>
                  <label className={styles.formLabel}>{t('recommendations')}</label>
                  {form.recommendations.map((item, idx) => (
                    <div key={idx} className={styles.listItem}>
                      <input type="text" value={item} onChange={(e) => updateField('recommendations', idx, e.target.value)} className={styles.formInput} placeholder={t('recommendationPlaceholder')} />
                      {form.recommendations.length > 1 && <button type="button" onClick={() => removeField('recommendations', idx)} className={styles.removeBtn}>✖</button>}
                    </div>
                  ))}
                  <button type="button" onClick={() => addField('recommendations')} className={styles.addBtn}>+ {t('addRecommendation')}</button>
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="submit" disabled={saving} className={styles.saveButton}>{saving ? tCommon('saving') : tCommon('save')}</button>
                <button type="button" onClick={() => setShowForm(false)} className={styles.cancelButton}>{tCommon('cancel')}</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Evaluations List */}
      <div className={styles.evaluationsList}>
        {loading ? (
          <div className={styles.loadingState}>{tCommon('loading')}</div>
        ) : evaluations.length === 0 ? (
          <div className={styles.emptyState}>{t('noEvaluations')}</div>
        ) : (
          evaluations.map((evalItem) => {
            const avgScore = evalItem.averageScore;
            return (
              <div key={evalItem._id} className={styles.evaluationCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.employeeName}>{evalItem.employeeId?.fullName}</h3>
                    <p className={styles.employeeInfo}>{evalItem.employeeId?.employeeCode} - {evalItem.employeeId?.position}</p>
                    <span className={`${styles.departmentBadge} ${styles[`dept${evalItem.department}`]}`}>{departmentLabels[evalItem.department]}</span>
                  </div>
                  <div className={styles.cardScore}>
                    <div className={`${styles.scoreCircle} ${getRatingClass(evalItem.rating)}`}>
                      <span className={styles.scoreValue}>{Math.round(avgScore)}</span>
                      <span className={styles.scoreLabel}>%</span>
                    </div>
                    <span className={`${styles.ratingBadge} ${getRatingClass(evalItem.rating)}`}>{getRatingLabel(evalItem.rating)}</span>
                  </div>
                </div>

                <div className={styles.cardDetails}>
                  <div className={styles.detailRow}><span className={styles.detailLabel}>{t('period')}:</span><span>{evalItem.period}</span></div>
                  <div className={styles.detailRow}><span className={styles.detailLabel}>{t('evaluationDate')}:</span><span>{formatDate(evalItem.evaluationDate)}</span></div>
                  <div className={styles.detailRow}><span className={styles.detailLabel}>{t('evaluator')}:</span><span>{evalItem.evaluatorId?.name}</span></div>
                </div>

                <div className={styles.scoresGrid}>
                  <div className={styles.scoreItem}><span>1. {t('objectivesShort')}</span><span className={getScoreColor(evalItem.objectivesScore)}>{evalItem.objectivesScore}%</span></div>
                  <div className={styles.scoreItem}><span>2. {t('clientOrientationShort')}</span><span className={getScoreColor(evalItem.clientOrientationScore)}>{evalItem.clientOrientationScore}%</span></div>
                  <div className={styles.scoreItem}><span>3. {t('collaborationShort')}</span><span className={getScoreColor(evalItem.collaborationScore)}>{evalItem.collaborationScore}%</span></div>
                  <div className={styles.scoreItem}><span>4. {t('leadershipShort')}</span><span className={getScoreColor(evalItem.leadershipScore)}>{evalItem.leadershipScore}%</span></div>
                </div>

                {evalItem.strengths.length > 0 && (
                  <div className={styles.sectionBox}><h4>✅ {t('strengths')}</h4><ul>{evalItem.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                )}
                {evalItem.improvements.length > 0 && (
                  <div className={styles.sectionBox}><h4>⚠️ {t('improvements')}</h4><ul>{evalItem.improvements.map((i, idx) => <li key={idx}>{i}</li>)}</ul></div>
                )}
                {evalItem.recommendations.length > 0 && (
                  <div className={styles.sectionBox}><h4>🔧 {t('recommendations')}</h4><ul>{evalItem.recommendations.map((r, idx) => <li key={idx}>{r}</li>)}</ul></div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}