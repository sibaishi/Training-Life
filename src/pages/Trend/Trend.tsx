import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../contexts/AppContext';
import { getTodayString, addDays, parseDate } from '../../utils/date';
import styles from './Trend.module.css';

type MetricType = 'weight' | 'bodyFat' | 'sleep';
type TimeRange = 'week' | 'month' | 'cycle';

const METRIC_LABELS: Record<MetricType, string> = {
  weight: '体重',
  bodyFat: '体脂率',
  sleep: '睡眠',
};

const METRIC_UNITS: Record<MetricType, string> = {
  weight: 'kg',
  bodyFat: '%',
  sleep: '小时',
};

const TIME_LABELS: Record<TimeRange, string> = {
  week: '本周',
  month: '本月',
  cycle: '本周期',
};

export default function Trend() {
  const navigate = useNavigate();
  const { state } = useAppState();
  const [metric, setMetric] = useState<MetricType>('weight');
  const [timeRange, setTimeRange] = useState<TimeRange>('week');

  const today = getTodayString();
  const currentPlan = state.plans.find(p => p.id === state.currentPlanId);

  const targetValue = useMemo(() => {
    if (!currentPlan) return undefined;

    switch (metric) {
      case 'weight':
        return currentPlan.targetWeight;
      case 'bodyFat':
        return currentPlan.targetBodyFat;
      case 'sleep':
        return 7.5;
      default:
        return undefined;
    }
  }, [currentPlan, metric]);

  const trendData = useMemo(() => {
    const days: string[] = [];

    switch (timeRange) {
      case 'week':
        for (let i = 6; i >= 0; i--) {
          days.push(addDays(today, -i));
        }
        break;
      case 'month':
        for (let i = 29; i >= 0; i--) {
          days.push(addDays(today, -i));
        }
        break;
      case 'cycle':
        if (currentPlan) {
          const totalDays = currentPlan.totalWeeks * 7;
          const limitedDays = Math.min(totalDays, 90);
          for (let i = limitedDays - 1; i >= 0; i--) {
            days.push(addDays(today, -i));
          }
        } else {
          for (let i = 6; i >= 0; i--) {
            days.push(addDays(today, -i));
          }
        }
        break;
    }

    const dataPoints: { date: string; value?: number }[] = days.map(date => {
      const checkin = state.checkins[date];
      let value: number | undefined;

      switch (metric) {
        case 'weight':
          value = checkin?.weight;
          break;
        case 'bodyFat':
          value = checkin?.bodyFat;
          break;
        case 'sleep':
          value = checkin?.sleepHours;
          break;
      }

      return { date, value };
    });

    const validValues = dataPoints.filter(d => d.value !== undefined).map(d => d.value!);
    const hasData = validValues.length >= 2;

    let min = 0, max = 0, avg = 0, change = 0;
    let trend: 'up' | 'down' | 'stable' | 'none' = 'none';

    if (validValues.length > 0) {
      min = Math.min(...validValues);
      max = Math.max(...validValues);
      avg = validValues.reduce((a, b) => a + b, 0) / validValues.length;
    }

    if (hasData) {
      const first = validValues[0];
      const last = validValues[validValues.length - 1];
      change = last - first;

      if (Math.abs(change) < 0.1) {
        trend = 'stable';
      } else if (change > 0) {
        trend = 'up';
      } else {
        trend = 'down';
      }
    }

    let distanceToTarget: number | undefined;
    let targetDirection: 'above' | 'below' | 'reached' | undefined;

    if (targetValue !== undefined && validValues.length > 0) {
      const latest = validValues[validValues.length - 1];
      distanceToTarget = latest - targetValue;

      if (Math.abs(distanceToTarget) < 0.1) {
        targetDirection = 'reached';
      } else if (distanceToTarget > 0) {
        targetDirection = 'above';
      } else {
        targetDirection = 'below';
      }
    }

    let chartMin = min;
    let chartMax = max;

    if (targetValue !== undefined && validValues.length > 0) {
      chartMin = Math.min(chartMin, targetValue);
      chartMax = Math.max(chartMax, targetValue);
    }

    const chartPadding = (chartMax - chartMin) * 0.15 || 1;
    chartMin = chartMin - chartPadding;
    chartMax = chartMax + chartPadding;
    const chartRange = chartMax - chartMin;

    return {
      dataPoints,
      validCount: validValues.length,
      totalCount: days.length,
      hasData,
      min,
      max,
      avg,
      change,
      trend,
      latest: validValues.length > 0 ? validValues[validValues.length - 1] : undefined,
      distanceToTarget,
      targetDirection,
      chartMin,
      chartMax,
      chartRange,
    };
  }, [state.checkins, metric, timeRange, today, currentPlan, targetValue]);

  const getChartY = (value: number | undefined): number => {
    if (value === undefined) return 0;
    return ((value - trendData.chartMin) / trendData.chartRange) * 100;
  };

  const targetLineY = targetValue !== undefined ? getChartY(targetValue) : null;

  const getPointX = (index: number): number => {
    const padding = 5;
    const width = 100 - padding * 2;
    return padding + (index / (trendData.dataPoints.length - 1)) * width;
  };

  const getTrendIcon = () => {
    switch (trendData.trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
      default: return '📊';
    }
  };

  const isTrendGood = () => {
    if (metric === 'sleep') {
      return trendData.trend === 'up';
    }
    return trendData.trend === 'down';
  };

  const isTargetGood = () => {
    if (trendData.targetDirection === 'reached') return true;
    if (metric === 'sleep') {
      return trendData.targetDirection === 'above';
    }
    return trendData.targetDirection === 'below';
  };

  const formatValue = (value: number): string => {
    return value.toFixed(1);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          ← 返回
        </button>
        <div className={styles.headerTitle}>趋势详情</div>
        <div className={styles.headerPlaceholder}></div>
      </div>

      <div className={styles.content}>
        {/* 指标选择 */}
        <div className={styles.selectorCard}>
          <div className={styles.selectorLabel}>选择指标</div>
          <div className={styles.selector}>
            {(['weight', 'bodyFat', 'sleep'] as MetricType[]).map(m => (
              <button
                key={m}
                className={`${styles.selectorBtn} ${metric === m ? styles.selectorBtnActive : ''}`}
                onClick={() => setMetric(m)}
              >
                {METRIC_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {/* 时间范围选择 */}
        <div className={styles.selectorCard}>
          <div className={styles.selectorLabel}>选择时间</div>
          <div className={styles.selector}>
            {(['week', 'month', 'cycle'] as TimeRange[]).map(t => (
              <button
                key={t}
                className={`${styles.selectorBtn} ${timeRange === t ? styles.selectorBtnActive : ''}`}
                onClick={() => setTimeRange(t)}
              >
                {TIME_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* 图表卡片 */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <span className={styles.chartTitle}>
              {METRIC_LABELS[metric]}趋势 · {TIME_LABELS[timeRange]}
            </span>
            <span className={styles.chartCount}>
              {trendData.validCount}/{trendData.totalCount} 天有数据
            </span>
          </div>

          {trendData.hasData ? (
            <>
              <div className={styles.chartWrapper}>
                <div className={styles.chartYAxis}>
                  <span>{formatValue(trendData.chartMax)}</span>
                  <span>{formatValue((trendData.chartMax + trendData.chartMin) / 2)}</span>
                  <span>{formatValue(trendData.chartMin)}</span>
                </div>

                <div className={styles.chartSvgContainer}>
                  <svg className={styles.chartSvg} viewBox="0 0 100 50">
                    <line x1="5" y1="12.5" x2="95" y2="12.5" className={styles.gridLine} />
                    <line x1="5" y1="25" x2="95" y2="25" className={styles.gridLine} />
                    <line x1="5" y1="37.5" x2="95" y2="37.5" className={styles.gridLine} />

                    {targetLineY !== null && (
                      <line
                        x1="5"
                        y1={50 - (targetLineY / 100) * 50}
                        x2="95"
                        y2={50 - (targetLineY / 100) * 50}
                        className={styles.targetLine}
                      />
                    )}

                    <polyline
                      points={trendData.dataPoints
                        .map((point, index) => {
                          if (point.value === undefined) return null;
                          const x = getPointX(index);
                          const y = 50 - (getChartY(point.value) / 100) * 50;
                          return `${x},${y}`;
                        })
                        .filter(Boolean)
                        .join(' ')}
                      className={styles.dataLine}
                      fill="none"
                    />

                    {trendData.dataPoints.map((point, index) => {
                      if (point.value === undefined) return null;
                      const x = getPointX(index);
                      const y = 50 - (getChartY(point.value) / 100) * 50;
                      return (
                        <circle
                          key={point.date}
                          cx={x}
                          cy={y}
                          r="1"
                          className={styles.dataPoint}
                        />
                      );
                    })}
                  </svg>

                  {targetLineY !== null && (
                    <div
                      className={styles.targetLabel}
                      style={{ bottom: `${(targetLineY / 100) * 100}%` }}
                    >
                      目标 {targetValue}{METRIC_UNITS[metric]}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.chartXAxis}>
                {timeRange === 'week' ? (
                  trendData.dataPoints.map(point => (
                    <span key={point.date} className={styles.chartXLabel}>
                      {['日', '一', '二', '三', '四', '五', '六'][parseDate(point.date).getDay()]}
                    </span>
                  ))
                ) : (
                  <>
                    <span className={styles.chartXLabel}>
                      {parseDate(trendData.dataPoints[0]?.date || today).getDate()}日
                    </span>
                    <span className={styles.chartXLabel}>
                      {parseDate(trendData.dataPoints[Math.floor(trendData.dataPoints.length / 2)]?.date || today).getDate()}日
                    </span>
                    <span className={styles.chartXLabel}>
                      {parseDate(trendData.dataPoints[trendData.dataPoints.length - 1]?.date || today).getDate()}日
                    </span>
                  </>
                )}
              </div>

              <div className={styles.chartSummary}>
                <div className={styles.summaryRow}>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryIcon}>{getTrendIcon()}</span>
                    <span className={styles.summaryLabel}>变化</span>
                    <span
                      className={`${styles.summaryValue} ${
                        trendData.trend !== 'none' && trendData.trend !== 'stable'
                          ? (isTrendGood() ? styles.good : styles.bad)
                          : ''
                      }`}
                    >
                      {trendData.trend === 'up' ? '+' : ''}
                      {formatValue(trendData.change)} {METRIC_UNITS[metric]}
                    </span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryIcon}>📊</span>
                    <span className={styles.summaryLabel}>平均</span>
                    <span className={styles.summaryValue}>
                      {formatValue(trendData.avg)} {METRIC_UNITS[metric]}
                    </span>
                  </div>
                </div>

                <div className={styles.summaryRow}>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryIcon}>⬆️</span>
                    <span className={styles.summaryLabel}>最高</span>
                    <span className={styles.summaryValue}>
                      {formatValue(trendData.max)} {METRIC_UNITS[metric]}
                    </span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryIcon}>⬇️</span>
                    <span className={styles.summaryLabel}>最低</span>
                    <span className={styles.summaryValue}>
                      {formatValue(trendData.min)} {METRIC_UNITS[metric]}
                    </span>
                  </div>
                </div>

                {targetValue !== undefined && trendData.latest !== undefined && (
                  <div className={styles.targetRow}>
                    <div className={styles.targetInfo}>
                      <span className={styles.targetIcon}>🎯</span>
                      <span className={styles.targetText}>
                        目标 {targetValue} {METRIC_UNITS[metric]}
                      </span>
                    </div>
                    <div className={`${styles.targetDistance} ${isTargetGood() ? styles.good : styles.bad}`}>
                      {trendData.targetDirection === 'reached' ? (
                        <span>🎉 已达标</span>
                      ) : (
                        <span>
                          {trendData.targetDirection === 'above' ? '高于目标 ' : '低于目标 '}
                          {formatValue(Math.abs(trendData.distanceToTarget!))} {METRIC_UNITS[metric]}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📊</div>
              <div className={styles.emptyText}>暂无足够数据</div>
              <div className={styles.emptyHint}>
                需要至少 2 天的{METRIC_LABELS[metric]}数据才能显示趋势
              </div>
              <button
                className={styles.emptyBtn}
                onClick={() => navigate('/checkin')}
              >
                去记录数据
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
