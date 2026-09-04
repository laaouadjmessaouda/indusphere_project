// src/app/[locale]/(dashboard)/cmms/failure-prediction/page.tsx
'use client';

import { use } from 'react';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import styles from '@/styles/pages/failure-prediction.module.css';

type Props = {
  params: Promise<{ locale: string }>;
};

interface Prediction {
  assetId: string;
  assetName: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  riskPercentage: number;
  reasons: string[];
  recommendation: string;
  urgency: string;
}

interface PredictionData {
  predictions: Prediction[];
  summary: string;
}

const riskConfig = {
  critical: { 
    label: 'critical', 
    color: '#ef4444', 
    bg: 'rgba(239,68,68,0.1)', 
    border: 'rgba(239,68,68,0.3)', 
    icon: '🔴' 
  },
  high: { 
    label: 'high', 
    color: '#f97316', 
    bg: 'rgba(249,115,22,0.1)', 
    border: 'rgba(249,115,22,0.3)', 
    icon: '🟠' 
  },
  medium: { 
    label: 'medium', 
    color: '#f59e0b', 
    bg: 'rgba(245,158,11,0.1)', 
    border: 'rgba(245,158,11,0.3)', 
    icon: '🟡' 
  },
  low: { 
    label: 'low', 
    color: '#10b981', 
    bg: 'rgba(16,185,129,0.1)', 
    border: 'rgba(16,185,129,0.3)', 
    icon: '🟢' 
  },
};

type FilterType = 'all' | 'critical' | 'high' | 'medium' | 'low';

export default function FailurePredictionPage({ params }: Props) {
  const { locale } = use(params);
  const t = useTranslations('CMMS');
  const tCommon = useTranslations('Common');
  
  const [data, setData] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  const isRTL = locale === 'ar';

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/failure-prediction');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

  const filtered = data?.predictions.filter(p => filter === 'all' || p.riskLevel === filter) || [];

  const counts = {
    critical: data?.predictions.filter(p => p.riskLevel === 'critical').length || 0,
    high: data?.predictions.filter(p => p.riskLevel === 'high').length || 0,
    medium: data?.predictions.filter(p => p.riskLevel === 'medium').length || 0,
    low: data?.predictions.filter(p => p.riskLevel === 'low').length || 0,
  };

  const getRiskClass = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return styles.riskCritical;
      case 'high': return styles.riskHigh;
      case 'medium': return styles.riskMedium;
      case 'low': return styles.riskLow;
      default: return '';
    }
  };

  const getBgClass = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return styles.bgCritical;
      case 'high': return styles.bgHigh;
      case 'medium': return styles.bgMedium;
      case 'low': return styles.bgLow;
      default: return '';
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'critical': return t('riskCritical');
      case 'high': return t('riskHigh');
      case 'medium': return t('riskMedium');
      case 'low': return t('riskLow');
      default: return level;
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'فوري': return t('urgencyImmediate');
      case 'خلال أسبوع': return t('urgencyWeek');
      case 'خلال شهر': return t('urgencyMonth');
      case 'منخفض': return t('urgencyLow');
      default: return urgency;
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <span className={styles.icon}>🤖</span>
              <h1 className={styles.title}>{t('failurePrediction')}</h1>
            </div>
            <p className={styles.description}>
              {t('failurePredictionDescription')}
            </p>
            {lastUpdated && (
              <p className={styles.lastUpdated}>
                {t('lastUpdated')}: {lastUpdated.toLocaleTimeString(isRTL ? 'ar-DZ' : 'en-US')}
              </p>
            )}
          </div>
          <button
            onClick={fetchPredictions}
            disabled={loading}
            className={styles.refreshButton}
          >
            {loading ? `⏳ ${t('analyzing')}` : `🔄 ${t('refresh')}`}
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingIcon}>🤖</div>
            <p className={styles.loadingTitle}>{t('analyzingData')}</p>
            <p className={styles.loadingSubtitle}>
              {t('analyzingSubtitle')}
            </p>
          </div>
        )}

        {/* Data Display */}
        {!loading && data && (
          <>
            {/* Summary */}
            {data.summary && (
              <div className={styles.summaryCard}>
                <span className={styles.summaryIcon}>💡</span>
                <p className={styles.summaryText}>{data.summary}</p>
              </div>
            )}

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
              {Object.entries(counts).map(([level, count]) => {
                const cfg = riskConfig[level as keyof typeof riskConfig];
                const isActive = filter === level;
                return (
                  <div
                    key={level}
                    className={`${styles.statCard} ${isActive ? styles.statCardActive : ''}`}
                    onClick={() => setFilter(isActive ? 'all' : level as FilterType)}
                    style={{ borderColor: isActive ? cfg.color : 'transparent' }}
                  >
                    <div className={styles.statIcon}>{cfg.icon}</div>
                    <div className={styles.statNumber} style={{ color: cfg.color }}>
                      {count}
                    </div>
                    <div className={styles.statLabel}>{getRiskLabel(level)}</div>
                  </div>
                );
              })}
            </div>

            {/* Filter Tabs */}
            <div className={styles.filterTabs}>
              {[
                { key: 'all', label: t('all') },
                { key: 'critical', label: `🔴 ${t('riskCritical')}` },
                { key: 'high', label: `🟠 ${t('riskHigh')}` },
                { key: 'medium', label: `🟡 ${t('riskMedium')}` },
                { key: 'low', label: `🟢 ${t('riskLow')}` },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key as FilterType)}
                  className={`${styles.filterButton} ${filter === f.key ? styles.filterButtonActive : ''}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Predictions List */}
            {filtered.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📭</div>
                <p>{t('noAssetsInCategory')}</p>
              </div>
            ) : (
              <div className={styles.predictionsList}>
                {filtered
                  .sort((a, b) => b.riskPercentage - a.riskPercentage)
                  .map((prediction) => {
                    const cfg = riskConfig[prediction.riskLevel];
                    const riskClass = getRiskClass(prediction.riskLevel);
                    const bgClass = getBgClass(prediction.riskLevel);
                    
                    return (
                      <div key={prediction.assetId} className={`${styles.predictionCard} ${bgClass}`}>
                        <div className={styles.predictionHeader}>
                          <div className={styles.predictionInfo}>
                            <span className={styles.predictionIcon}>{cfg.icon}</span>
                            <div>
                              <h3 className={styles.predictionTitle}>{prediction.assetName}</h3>
                              <span 
                                className={styles.predictionUrgency}
                                style={{ 
                                  backgroundColor: cfg.bg, 
                                  color: cfg.color, 
                                  border: `1px solid ${cfg.border}` 
                                }}
                              >
                                {getUrgencyLabel(prediction.urgency)}
                              </span>
                            </div>
                          </div>
                          <div className={styles.predictionRisk}>
                            <div className={`${styles.riskPercentage} ${riskClass}`}>
                              {prediction.riskPercentage}%
                            </div>
                            <div className={styles.riskLabel}>{t('failureProbability')}</div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className={styles.progressBar}>
                          <div 
                            className={styles.progressFill}
                            style={{ 
                              width: `${prediction.riskPercentage}%`,
                              backgroundColor: cfg.color 
                            }}
                          />
                        </div>

                        <div className={styles.predictionContent}>
                          {/* Reasons */}
                          <div className={styles.reasonsSection}>
                            <p className={styles.reasonsTitle}>⚠️ {t('reasons')}</p>
                            <ul className={styles.reasonsList}>
                              {prediction.reasons.map((reason, i) => (
                                <li key={i} className={styles.reasonItem}>
                                  <span className={styles.reasonBullet} style={{ color: cfg.color }}>•</span>
                                  <span>{reason}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          {/* Recommendation */}
                          <div className={styles.recommendationSection}>
                            <p className={styles.recommendationTitle}>🔧 {t('recommendation')}</p>
                            <p className={styles.recommendationText}>{prediction.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        )}

        {/* Initial State */}
        {!loading && !data && (
          <div className={styles.initialState}>
            <div className={styles.initialIcon}>🤖</div>
            <p className={styles.initialText}>{t('clickToAnalyze')}</p>
          </div>
        )}
      </div>
    </div>
  );
}