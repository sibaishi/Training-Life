import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../contexts/AppContext';
import {
  getTodayString,
  getWeekday,
  getWeekdayLabel,
  formatDisplayDate,
  addDays,
  parseDate,
} from '../../utils/date';
import { MEAL_ORDER } from '../../types';
import styles from './Home.module.css';

// 获取当天已消除的提醒
const getDismissedReminders = (): Set<string> => {
  try {
    const today = getTodayString();
    const stored = localStorage.getItem('dismissed-reminders');
    if (stored) {
      const data = JSON.parse(stored);
      if (data.date === today) {
        return new Set(data.ids || []);
      }
    }
  } catch {}
  return new Set();
};

// 保存消除的提醒
const saveDismissedReminder = (id: string) => {
  try {
    const today = getTodayString();
    const stored = localStorage.getItem('dismissed-reminders');
    let data = { date: today, ids: [] as string[] };

    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.date === today) {
        data = parsed;
      }
    }

    if (!data.ids.includes(id)) {
      data.ids.push(id);
    }

    localStorage.setItem('dismissed-reminders', JSON.stringify(data));
  } catch {}
};

export default function Home() {
  const navigate = useNavigate();
  // ✅ 改动点 1：从 context 中取 getPlanForDate
  const { state, getPlanForDate } = useAppState();

  const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(() => getDismissedReminders());
  const [showBodyDetail, setShowBodyDetail] = useState(false);

  const today = getTodayString();
  const yesterday = addDays(today, -1);
  const weekday = getWeekday(today);

  const currentPlan = state.plans.find(p => p.id === state.currentPlanId);
  const pendingPlan = state.plans.find(p => p.id === state.pendingPlanId);
  const isTrainingDay = currentPlan?.trainingDays.includes(weekday) || false;
  const isWorkday = currentPlan?.workdays.includes(weekday) || false;

  // ✅ 改动点 2：昨天对应的“实际计划”
  const yesterdayPlan = getPlanForDate(yesterday);

  const todayCheckin = state.checkins[today];
  const yesterdayCheckin = state.checkins[yesterday];

  // ============ 采购数据计算 ============
  const groceryStats = useMemo(() => {
    if (!currentPlan) {
      return { completionRate: 0, weekCost: 0, monthCost: 0 };
    }

    const foodMap = new Map<string, { amount: number; unit: string }>();

    const addFoods = (diet: typeof currentPlan.trainingDayDiet, daysCount: number) => {
      Object.values(diet.meals).forEach(foods => {
        if (!foods) return;
        foods.forEach(food => {
          if (!food.name.trim()) return;
          const key = `${food.name}_${food.displayUnit}`;
          const existing = foodMap.get(key) || { amount: 0, unit: food.displayUnit };
          existing.amount += food.quantity * daysCount;
          foodMap.set(key, existing);
        });
      });
    };

    const trainingDaysCount = currentPlan.trainingDays.length;
    const restDaysCount = 7 - trainingDaysCount;

    addFoods(currentPlan.trainingDayDiet, trainingDaysCount);
    addFoods(currentPlan.restDayDiet, restDaysCount);

    const groceryRecord = state.groceries.find(g => g.planId === currentPlan.id);

    let completedCount = 0;
    let totalCount = 0;
    let weekCost = 0;

    foodMap.forEach((value, key) => {
      const foodName = key.split('_')[0];
      const requiredAmount = Math.ceil(value.amount * 1.1);
      const existingItem = groceryRecord?.items.find(i => i.foodName === foodName);
      const purchasedAmount = existingItem?.purchasedAmount || 0;

      totalCount++;
      if (purchasedAmount >= requiredAmount) {
        completedCount++;
      }
      weekCost += existingItem?.cost || 0;
    });

    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const monthCost = state.groceries.reduce((sum, g) => {
      return sum + g.items.reduce((s, i) => s + i.cost, 0);
    }, 0);

    return { completionRate, weekCost, monthCost };
  }, [currentPlan, state.groceries]);

  // ============ 趋势数据计算 ============
  const trendData = useMemo(() => {
    const days: {
      date: string;
      dayLabel: string;
      weight?: number;
      bodyFat?: number;
      sleep?: number;
    }[] = [];

    const WEEKDAY_SHORT = ['日', '一', '二', '三', '四', '五', '六'];

    // 获取最近7天的数据
    for (let i = 6; i >= 0; i--) {
      const dateStr = addDays(today, -i);
      const checkin = state.checkins[dateStr];
      const date = parseDate(dateStr);
      days.push({
        date: dateStr,
        dayLabel: WEEKDAY_SHORT[date.getDay()],
        weight: checkin?.weight,
        bodyFat: checkin?.bodyFat,
        sleep: checkin?.sleepHours,
      });
    }

    // 提取各指标数据
    const weights = days.map(d => d.weight).filter((v): v is number => v !== undefined);
    const bodyFats = days.map(d => d.bodyFat).filter((v): v is number => v !== undefined);
    const sleeps = days.map(d => d.sleep).filter((v): v is number => v !== undefined);

    // 计算各指标范围（用于归一化）
    const getRange = (values: number[]) => {
      if (values.length === 0) return { min: 0, max: 100, range: 100 };
      const min = Math.min(...values);
      const max = Math.max(...values);
      const padding = (max - min) * 0.2 || 1;
      return {
        min: min - padding,
        max: max + padding,
        range: (max - min + padding * 2) || 1
      };
    };

    const weightRange = getRange(weights);
    const bodyFatRange = getRange(bodyFats);
    const sleepRange = getRange(sleeps);

    // 归一化函数（将值映射到10-90，留出上下边距）
    const normalize = (value: number | undefined, range: { min: number; max: number; range: number }) => {
      if (value === undefined) return null;
      const normalized = ((value - range.min) / range.range) * 80 + 10;
      return normalized;
    };

    // 生成归一化数据点
    const normalizedDays = days.map(d => ({
      ...d,
      weightNorm: normalize(d.weight, weightRange),
      bodyFatNorm: normalize(d.bodyFat, bodyFatRange),
      sleepNorm: normalize(d.sleep, sleepRange),
    }));

    const hasWeightData = weights.length >= 2;
    const hasBodyFatData = bodyFats.length >= 2;
    const hasSleepData = sleeps.length >= 2;
    const hasAnyData = hasWeightData || hasBodyFatData || hasSleepData;

    // 计算变化
    const getChange = (values: number[]) => {
      if (values.length < 2) return { change: 0, trend: 'none' as const };
      const first = values[0];
      const last = values[values.length - 1];
      const change = last - first;
      let trend: 'up' | 'down' | 'stable' | 'none' = 'none';
      if (Math.abs(change) < 0.1) trend = 'stable';
      else if (change > 0) trend = 'up';
      else trend = 'down';
      return { change, trend };
    };

    return {
      days: normalizedDays,
      hasWeightData,
      hasBodyFatData,
      hasSleepData,
      hasAnyData,
      weightStats: {
        ...getChange(weights),
        latest: weights[weights.length - 1],
        count: weights.length,
      },
      bodyFatStats: {
        ...getChange(bodyFats),
        latest: bodyFats[bodyFats.length - 1],
        count: bodyFats.length,
      },
      sleepStats: {
        ...getChange(sleeps),
        latest: sleeps[sleeps.length - 1],
        count: sleeps.length,
      },
    };
  }, [state.checkins, today]);

  // ============ 生成 SVG 路径 ============
  const generatePath = (
    days: typeof trendData.days,
    key: 'weightNorm' | 'bodyFatNorm' | 'sleepNorm'
  ): string => {
    const points: { x: number; y: number }[] = [];
    const padding = 10; // 左右留白
    const width = 100 - padding * 2;

    days.forEach((day, index) => {
      const value = (day as any)[key];
      if (value !== null) {
        const x = padding + (index / (days.length - 1)) * width;
        const y = 100 - value;
        points.push({ x, y });
      }
    });

    if (points.length < 2) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  };

  // 计算数据点的 x 坐标
  const getPointX = (index: number): number => {
    const padding = 10;
    const width = 100 - padding * 2;
    return padding + (index / 6) * width;
  };

  // ✅ 改动点 3：昨日提醒用 yesterdayPlan 判断训练日
  const getYesterdayReminders = () => {
    const reminders: { id: string; text: string }[] = [];

    const yesterdayWeekday = getWeekday(yesterday);
    const wasTrainingDay = yesterdayPlan?.trainingDays.includes(yesterdayWeekday) || false;

    if (!yesterdayCheckin) {
      if (wasTrainingDay) {
        reminders.push({ id: 'training', text: '昨日训练未完成' });
      }
      reminders.push({ id: 'diet', text: '昨日饮食未记录' });
      reminders.push({ id: 'sleep', text: '昨日睡眠未记录' });
      reminders.push({ id: 'water', text: '昨日饮水未达标' });
    } else {
      if (wasTrainingDay) {
        const trainingDone = yesterdayCheckin.checklistItems.some(
          item => item.id.startsWith('training-') && item.status === 'completed'
        );
        if (!trainingDone) {
          reminders.push({ id: 'training', text: '昨日训练未完成' });
        }
      }

      const mealDone = yesterdayCheckin.checklistItems.some(
        item => item.id.startsWith('meal-') && item.status === 'completed'
      );
      if (!mealDone) {
        reminders.push({ id: 'diet', text: '昨日饮食未完成' });
      }

      if (yesterdayCheckin.sleepHours === undefined) {
        reminders.push({ id: 'sleep', text: '昨日睡眠时长未记录' });
      } else if (yesterdayCheckin.sleepHours < 7.5) {
        reminders.push({ id: 'sleep', text: '昨日睡眠时长未达标' });
      }

      if (yesterdayCheckin.waterMl < yesterdayCheckin.waterTarget) {
        reminders.push({ id: 'water', text: '昨日饮水量未达标' });
      }
    }

    return reminders.filter(r => !dismissedReminders.has(r.id));
  };

  const getSystemReminders = () => {
    const reminders: { id: string; text: string }[] = [];

    // 计划切换成功提醒（切换当天显示）
    if (state.lastPlanSwitchDate === today && currentPlan) {
      reminders.push({
        id: 'plan-switched',
        text: `已切换到新计划「${currentPlan.name}」`,
      });
    }

    // 待生效计划提醒
    if (pendingPlan && state.pendingPlanDate) {
      reminders.push({
        id: 'pending-plan',
        text: `新计划「${pendingPlan.name}」将于 ${state.pendingPlanDate} 生效`,
      });
    }

    // 采购提醒
    if (groceryStats.completionRate < 100 && groceryStats.completionRate > 0) {
      reminders.push({
        id: 'grocery-incomplete',
        text: `本周采购完成 ${groceryStats.completionRate}%，还需继续采购`,
      });
    }

    return reminders.filter(r => !dismissedReminders.has(r.id));
  };

  const dismissReminder = (id: string) => {
    saveDismissedReminder(id);
    setDismissedReminders(prev => new Set([...prev, id]));
  };

  const yesterdayReminders = getYesterdayReminders();
  const systemReminders = getSystemReminders();

  const calculateTodayProgress = () => {
    if (!todayCheckin) return 0;

    const fixedItems = [
      { done: todayCheckin.weight !== undefined },
      { done: todayCheckin.bodyFat !== undefined },
      { done: todayCheckin.sleepHours !== undefined },
      { done: todayCheckin.waterMl >= todayCheckin.waterTarget },
    ];

    let autoItemsCount = 0;
    let autoItemsDone = 0;

    if (currentPlan) {
      const dayTraining = currentPlan.weeklyTraining[weekday];
      if (isTrainingDay && dayTraining) {
        if (dayTraining.primary.length > 0) {
          autoItemsCount++;
          if (todayCheckin.checklistItems.find(i => i.id === 'training-primary')?.status === 'completed') {
            autoItemsDone++;
          }
        }
        if (dayTraining.secondary.length > 0) {
          autoItemsCount++;
          if (todayCheckin.checklistItems.find(i => i.id === 'training-secondary')?.status === 'completed') {
            autoItemsDone++;
          }
        }
        if (dayTraining.cardio.length > 0) {
          autoItemsCount++;
          if (todayCheckin.checklistItems.find(i => i.id === 'training-cardio')?.status === 'completed') {
            autoItemsDone++;
          }
        }
      }

      const dayDiet = isTrainingDay ? currentPlan.trainingDayDiet : currentPlan.restDayDiet;
      MEAL_ORDER.forEach(mealType => {
        if ((dayDiet.meals as any)[mealType]?.length > 0) {
          autoItemsCount++;
          if (todayCheckin.checklistItems.find(i => i.id === `meal-${mealType}`)?.status === 'completed') {
            autoItemsDone++;
          }
        }
      });
    }

    const fixedDone = fixedItems.filter(i => i.done).length;
    const total = fixedItems.length + autoItemsCount;
    const done = fixedDone + autoItemsDone;

    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  const todayProgress = calculateTodayProgress();

  const waterMl = todayCheckin?.waterMl || 0;
  const waterTarget = todayCheckin?.waterTarget || 2500;
  const waterProgress = Math.min((waterMl / waterTarget) * 100, 100);

  const getLatestBodyData = () => {
    const dates = Object.keys(state.checkins).sort().reverse();
    for (const date of dates) {
      const checkin = state.checkins[date];
      if (checkin.weight !== undefined || checkin.bodyFat !== undefined) {
        return {
          weight: checkin.weight,
          bodyFat: checkin.bodyFat,
          date,
        };
      }
    }
    return { weight: undefined, bodyFat: undefined, date: undefined };
  };

  const latestBody = getLatestBodyData();

  const getPlanProgress = () => {
    if (!currentPlan) return 0;
    return 25;
  };

  const navigateToCheckin = (section?: string) => {
    if (section) {
      navigate(`/checkin?section=${section}`);
    } else {
      navigate('/checkin');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>总览</h1>
      </div>

      <div className={styles.content}>
        {/* 顶部提醒区 */}
        {(yesterdayReminders.length > 0 || systemReminders.length > 0) && (
          <div className={styles.remindersSection}>
            {yesterdayReminders.map(reminder => (
              <div key={reminder.id} className={styles.reminderCard}>
                <span className={styles.reminderDot}></span>
                <span className={styles.reminderText}>{reminder.text}</span>
                <button
                  className={styles.reminderDismiss}
                  onClick={() => dismissReminder(reminder.id)}
                >
                  ✕
                </button>
              </div>
            ))}
            {systemReminders.map(reminder => (
              <div key={reminder.id} className={`${styles.reminderCard} ${styles.reminderSystem}`}>
                <span className={styles.reminderIcon}>📢</span>
                <span className={styles.reminderText}>{reminder.text}</span>
                <button
                  className={styles.reminderDismiss}
                  onClick={() => dismissReminder(reminder.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 今日日期信息卡 */}
        <div
          className={styles.dateCard}
          onClick={() => navigate('/plan?tab=today')}
        >
          <div className={styles.dateMain}>
            <span className={styles.dateText}>{formatDisplayDate(today)}</span>
            <span className={styles.weekdayText}>{getWeekdayLabel(weekday)}</span>
          </div>
          <div className={styles.dayTypeBadge}>
            {isTrainingDay ? '🏋️ 训练日' : '😴 放松日'}
          </div>
        </div>

        {/* 当前启用计划卡 */}
        <div
          className={styles.card}
          onClick={() => currentPlan && navigate(`/plan/${currentPlan.id}`)}
        >
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>📋 当前计划</span>
          </div>
          {currentPlan ? (
            <div className={styles.planInfo}>
              <div className={styles.planName}>{currentPlan.name}</div>
              <div className={styles.planProgressBar}>
                <div
                  className={styles.planProgressFill}
                  style={{ width: `${getPlanProgress()}%` }}
                />
              </div>
              <div className={styles.planProgressText}>
                进度 {getPlanProgress()}% · 共 {currentPlan.totalWeeks} 周
              </div>
            </div>
          ) : (
            <div className={styles.emptyHint}>暂无启用的计划</div>
          )}
        </div>

        {/* 当前身体状态摘要卡 */}
        <div
          className={styles.card}
          onClick={() => setShowBodyDetail(!showBodyDetail)}
        >
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>📊 身体状态</span>
            <span className={styles.expandIcon}>{showBodyDetail ? '▼' : '▶'}</span>
          </div>
          <div className={styles.bodyStats}>
            <div className={styles.bodyStat}>
              <span className={styles.bodyStatValue}>
                {latestBody.weight !== undefined ? `${latestBody.weight}` : '--'}
              </span>
              <span className={styles.bodyStatLabel}>体重 (kg)</span>
            </div>
            <div className={styles.bodyStatDivider}></div>
            <div className={styles.bodyStat}>
              <span className={styles.bodyStatValue}>
                {latestBody.bodyFat !== undefined ? `${latestBody.bodyFat}` : '--'}
              </span>
              <span className={styles.bodyStatLabel}>体脂率 (%)</span>
            </div>
          </div>

          {showBodyDetail && currentPlan && (
            <div className={styles.bodyDetail}>
              <div className={styles.bodyDetailRow}>
                <span>目标体重</span>
                <span>{currentPlan.targetWeight ?? '--'} kg</span>
              </div>
              <div className={styles.bodyDetailRow}>
                <span>目标体脂率</span>
                <span>{currentPlan.targetBodyFat ?? '--'} %</span>
              </div>
              {latestBody.weight && currentPlan.targetWeight && (
                <div className={styles.bodyDetailRow}>
                  <span>体重差值</span>
                  <span className={latestBody.weight > currentPlan.targetWeight ? styles.negative : styles.positive}>
                    {(latestBody.weight - currentPlan.targetWeight).toFixed(1)} kg
                  </span>
                </div>
              )}
              {latestBody.bodyFat && currentPlan.targetBodyFat && (
                <div className={styles.bodyDetailRow}>
                  <span>体脂率差值</span>
                  <span className={latestBody.bodyFat > currentPlan.targetBodyFat ? styles.negative : styles.positive}>
                    {(latestBody.bodyFat - currentPlan.targetBodyFat).toFixed(1)} %
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 今日打卡总进度卡 */}
        <div
          className={styles.card}
          onClick={() => navigateToCheckin('progress')}
        >
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>✅ 今日打卡</span>
            <span className={styles.progressValue}>{todayProgress}%</span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${todayProgress}%` }}
            />
          </div>
        </div>

        {/* 今日饮水进度条卡 */}
        <div
          className={styles.card}
          onClick={() => navigateToCheckin('water')}
        >
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>💧 今日饮水</span>
            <span className={styles.waterStats}>{waterMl} / {waterTarget} ml</span>
          </div>
          <div className={styles.waterProgressBar}>
            <div
              className={styles.waterProgressFill}
              style={{ width: `${waterProgress}%` }}
            />
          </div>
          <div className={styles.waterRemaining}>
            {waterMl >= waterTarget
              ? '🎉 已达标！'
              : `还需 ${waterTarget - waterMl} ml`
            }
          </div>
        </div>

        {/* 采购/费用概览卡 */}
        <div
          className={styles.card}
          onClick={() => navigate('/grocery')}
        >
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>🛒 采购概览</span>
          </div>
          {currentPlan ? (
            <>
              <div className={styles.groceryStats}>
                <div className={styles.groceryStat}>
                  <span className={styles.groceryStatValue}>{groceryStats.completionRate}%</span>
                  <span className={styles.groceryStatLabel}>本周完成率</span>
                </div>
                <div className={styles.groceryStat}>
                  <span className={styles.groceryStatValue}>¥{groceryStats.weekCost.toFixed(0)}</span>
                  <span className={styles.groceryStatLabel}>本周费用</span>
                </div>
                <div className={styles.groceryStat}>
                  <span className={styles.groceryStatValue}>¥{groceryStats.monthCost.toFixed(0)}</span>
                  <span className={styles.groceryStatLabel}>本月费用</span>
                </div>
              </div>
              {groceryStats.completionRate === 0 && (
                <div className={styles.emptyHint}>点击开始记录采购</div>
              )}
            </>
          ) : (
            <div className={styles.emptyHint}>暂无启用的计划</div>
          )}
        </div>

        {/* 趋势摘要卡 - 三线折线图 */}
        <div
          className={styles.card}
          onClick={() => navigate('/trend')}
        >
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>📈 本周趋势</span>
          </div>

          {trendData.hasAnyData ? (
            <div className={styles.trendContent}>
              <div className={styles.chartWrapper}>
                <svg
                  className={styles.chartSvg}
                  viewBox="0 0 100 50"
                >
                  <line x1="10" y1="12.5" x2="90" y2="12.5" className={styles.gridLine} />
                  <line x1="10" y1="25" x2="90" y2="25" className={styles.gridLine} />
                  <line x1="10" y1="37.5" x2="90" y2="37.5" className={styles.gridLine} />

                  {trendData.hasWeightData && (
                    <polyline
                      points={trendData.days
                        .map((day: any, index) => {
                          if (day.weightNorm === null) return null;
                          const x = getPointX(index);
                          const y = 50 - (day.weightNorm / 100) * 50;
                          return `${x},${y}`;
                        })
                        .filter(Boolean)
                        .join(' ')}
                      className={styles.lineWeight}
                      fill="none"
                    />
                  )}

                  {trendData.hasBodyFatData && (
                    <polyline
                      points={trendData.days
                        .map((day: any, index) => {
                          if (day.bodyFatNorm === null) return null;
                          const x = getPointX(index);
                          const y = 50 - (day.bodyFatNorm / 100) * 50;
                          return `${x},${y}`;
                        })
                        .filter(Boolean)
                        .join(' ')}
                      className={styles.lineBodyFat}
                      fill="none"
                    />
                  )}

                  {trendData.hasSleepData && (
                    <polyline
                      points={trendData.days
                        .map((day: any, index) => {
                          if (day.sleepNorm === null) return null;
                          const x = getPointX(index);
                          const y = 50 - (day.sleepNorm / 100) * 50;
                          return `${x},${y}`;
                        })
                        .filter(Boolean)
                        .join(' ')}
                      className={styles.lineSleep}
                      fill="none"
                    />
                  )}

                  {trendData.days.map((day: any, index) => {
                    const x = getPointX(index);
                    return (
                      <g key={day.date}>
                        {day.weightNorm !== null && (
                          <circle
                            cx={x}
                            cy={50 - (day.weightNorm / 100) * 50}
                            r="1.0"
                            className={styles.dotWeight}
                          />
                        )}
                        {day.bodyFatNorm !== null && (
                          <circle
                            cx={x}
                            cy={50 - (day.bodyFatNorm / 100) * 50}
                            r="1.0"
                            className={styles.dotBodyFat}
                          />
                        )}
                        {day.sleepNorm !== null && (
                          <circle
                            cx={x}
                            cy={50 - (day.sleepNorm / 100) * 50}
                            r="1.0"
                            className={styles.dotSleep}
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>

                <div className={styles.chartXAxis}>
                  {trendData.days.map(day => (
                    <span key={day.date} className={styles.chartXLabel}>{day.dayLabel}</span>
                  ))}
                </div>
              </div>

              <div className={styles.chartLegend}>
                <div className={styles.legendItem}>
                  <span className={`${styles.legendDot} ${styles.legendWeight}`}></span>
                  <span className={styles.legendLabel}>体重</span>
                  {trendData.weightStats.latest !== undefined && (
                    <span className={styles.legendValue}>
                      {trendData.weightStats.latest.toFixed(1)}kg
                      {trendData.weightStats.trend !== 'none' && (
                        <span className={trendData.weightStats.change > 0 ? styles.trendUp : styles.trendDown}>
                          {trendData.weightStats.change > 0 ? '↑' : '↓'}
                          {Math.abs(trendData.weightStats.change).toFixed(1)}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className={styles.legendItem}>
                  <span className={`${styles.legendDot} ${styles.legendBodyFat}`}></span>
                  <span className={styles.legendLabel}>体脂</span>
                  {trendData.bodyFatStats.latest !== undefined && (
                    <span className={styles.legendValue}>
                      {trendData.bodyFatStats.latest.toFixed(1)}%
                      {trendData.bodyFatStats.trend !== 'none' && (
                        <span className={trendData.bodyFatStats.change > 0 ? styles.trendUp : styles.trendDown}>
                          {trendData.bodyFatStats.change > 0 ? '↑' : '↓'}
                          {Math.abs(trendData.bodyFatStats.change).toFixed(1)}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className={styles.legendItem}>
                  <span className={`${styles.legendDot} ${styles.legendSleep}`}></span>
                  <span className={styles.legendLabel}>睡眠</span>
                  {trendData.sleepStats.latest !== undefined && (
                    <span className={styles.legendValue}>
                      {trendData.sleepStats.latest.toFixed(1)}h
                      {trendData.sleepStats.trend !== 'none' && (
                        <span className={trendData.sleepStats.change > 0 ? styles.trendUpGood : styles.trendDownBad}>
                          {trendData.sleepStats.change > 0 ? '↑' : '↓'}
                          {Math.abs(trendData.sleepStats.change).toFixed(1)}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.trendEmpty}>
              <span className={styles.trendEmptyIcon}>📊</span>
              <span className={styles.trendEmptyText}>记录更多数据以查看趋势</span>
              <span className={styles.trendEmptyHint}>
                体重 {trendData.weightStats.count}/2 ·
                体脂 {trendData.bodyFatStats.count}/2 ·
                睡眠 {trendData.sleepStats.count}/2
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
