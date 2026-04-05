import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppState } from '../../contexts/AppContext';
import {
  getTodayString,
  getWeekday,
  getWeekdayLabel,
  formatDisplayDate,
  addDays
} from '../../utils/date';
import { generateId } from '../../utils/id';
import {
  Weekday,
  MealType,
  DailyCheckin,
  MEAL_ORDER,
  MEAL_LABELS,
  CustomChecklistItem,
} from '../../types';
import styles from './Checkin.module.css';

// 工具函数：规范化数字输入
const normalizeNumber = (value: string, isInteger: boolean = true): number => {
  if (!value || value === '') return 0;
  const num = isInteger ? parseInt(value, 10) : parseFloat(value);
  return isNaN(num) ? 0 : num;
};

export default function CheckinMain() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, setState, getPlanForDate } = useAppState();

  const [selectedDate, setSelectedDate] = useState(() => {
    const dateParam = searchParams.get('date');
    return dateParam || getTodayString();
  });
  const [showWaterInput, setShowWaterInput] = useState(false);
  const [waterAmount, setWaterAmount] = useState('');
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemTime, setNewItemTime] = useState('');
  const [newItemDays, setNewItemDays] = useState<Weekday[]>([]);

  const progressRef = useRef<HTMLDivElement>(null);
  const waterRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const checklistRef = useRef<HTMLDivElement>(null);

  const today = getTodayString();
  const weekday = getWeekday(selectedDate);
  const isToday = selectedDate === today;

  const selectedPlan = getPlanForDate(selectedDate);
  const isTrainingDay = selectedPlan?.trainingDays.includes(weekday) || false;
  const isWorkday = selectedPlan?.workdays.includes(weekday) || false;

  const isEditable = selectedDate <= today;
  const isFutureDate = selectedDate > today;

  useEffect(() => {
    const section = searchParams.get('section');
    if (section) {
      const scrollToSection = () => {
        let targetRef: React.RefObject<HTMLDivElement> | null = null;

        switch (section) {
          case 'progress':
            targetRef = progressRef;
            break;
          case 'water':
            targetRef = waterRef;
            break;
          case 'body':
            targetRef = bodyRef;
            break;
          case 'checklist':
            targetRef = checklistRef;
            break;
        }

        if (targetRef?.current) {
          targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };

      setTimeout(scrollToSection, 100);
    }
  }, [searchParams]);

  const getDayCheckin = (): DailyCheckin => {
    return state.checkins[selectedDate] || {
      date: selectedDate,
      weight: undefined,
      bodyFat: undefined,
      sleepHours: undefined,
      waterMl: 0,
      waterTarget: 2500,
      trainingRecords: { primary: [], secondary: [], cardio: [] },
      mealStatus: {},
      checklistItems: [],
      isCheatDay: false,
    };
  };

  const dayCheckin = getDayCheckin();

  const updateDayCheckin = (updates: Partial<DailyCheckin>) => {
    if (!isEditable) return;

    const newDailyPlanMap = { ...state.dailyPlanMap };
    if (!newDailyPlanMap[selectedDate] && selectedPlan) {
      newDailyPlanMap[selectedDate] = selectedPlan.id;
    }

    setState(prev => ({
      ...prev,
      dailyPlanMap: newDailyPlanMap,
      checkins: {
        ...prev.checkins,
        [selectedDate]: {
          ...getDayCheckin(),
          ...updates,
        },
      },
    }));
  };

  const handlePrevDay = () => {
    const newDate = addDays(selectedDate, -1);
    setSelectedDate(newDate);
    navigate(`/checkin?date=${newDate}`, { replace: true });
  };

  const handleNextDay = () => {
    const newDate = addDays(selectedDate, 1);
    setSelectedDate(newDate);
    navigate(`/checkin?date=${newDate}`, { replace: true });
  };

  const handleBackToToday = () => {
    setSelectedDate(today);
    navigate('/checkin', { replace: true });
  };

  const handleAddWater = () => {
    if (!isEditable) return;
    const amount = parseInt(waterAmount) || 0;
    if (amount > 0) {
      updateDayCheckin({
        waterMl: dayCheckin.waterMl + amount,
      });
      setWaterAmount('');
      setShowWaterInput(false);
    }
  };

  const handleQuickAddWater = (amount: number) => {
    if (!isEditable) return;
    updateDayCheckin({
      waterMl: dayCheckin.waterMl + amount,
    });
  };

  const updateFixedItem = (field: 'weight' | 'bodyFat' | 'sleepHours', value: number | undefined) => {
    if (!isEditable) return;

    if (value !== undefined) {
      if (field === 'sleepHours') {
        value = Math.max(0, Math.min(24, value));
      } else if (field === 'weight') {
        value = Math.max(0, Math.min(500, value));
      } else if (field === 'bodyFat') {
        value = Math.max(0, Math.min(100, value));
      }
    }

    updateDayCheckin({ [field]: value });
  };

  const getSleepProgressColor = (hours: number): string => {
    if (hours < 4) return '#ef4444';
    if (hours < 5) return '#f97316';
    if (hours < 6) return '#f59e0b';
    if (hours < 7) return '#eab308';
    if (hours < 7.5) return '#84cc16';
    return '#22c55e';
  };

  /* ==================== 默认展示值逻辑 ==================== */
  const getLatestRecordedValue = (field: 'weight' | 'bodyFat') => {
    const dates = Object.keys(state.checkins).sort().reverse();
    for (const date of dates) {
      const checkin = state.checkins[date];
      if (checkin[field] !== undefined) {
        return checkin[field] as number;
      }
    }
    return undefined;
  };

  const displayDefaults = useMemo(() => {
    const actualWeight = dayCheckin.weight;
    const actualBodyFat = dayCheckin.bodyFat;
    const actualSleep = dayCheckin.sleepHours;

    const fallbackWeight = getLatestRecordedValue('weight') ?? state.profile.baselineWeight;
    const fallbackBodyFat = getLatestRecordedValue('bodyFat') ?? state.profile.baselineBodyFat;
    const fallbackSleep = 0;

    return {
      weightDisplay: actualWeight ?? fallbackWeight,
      weightIsDefault: actualWeight === undefined && fallbackWeight !== undefined,

      bodyFatDisplay: actualBodyFat ?? fallbackBodyFat,
      bodyFatIsDefault: actualBodyFat === undefined && fallbackBodyFat !== undefined,

      sleepDisplay: actualSleep ?? fallbackSleep,
      sleepIsDefault: actualSleep === undefined,
    };
  }, [dayCheckin.weight, dayCheckin.bodyFat, dayCheckin.sleepHours, state.checkins, state.profile.baselineWeight, state.profile.baselineBodyFat]);

  const generateAutoItems = () => {
    const items: { id: string; name: string; type: 'training' | 'meal'; time?: string; }[] = [];

    if (!selectedPlan) return items;

    const schedule = isWorkday ? selectedPlan.schedule.workday : selectedPlan.schedule.weekend;
    const getScheduleTime = (key: string) => {
      const item = schedule.find(s => s.key === key);
      return item?.time || '';
    };

    if (isTrainingDay) {
      const dayTraining = selectedPlan.weeklyTraining[weekday];
      if (dayTraining) {
        if (dayTraining.primary.length > 0) {
          items.push({
            id: 'training-primary',
            name: '主要训练',
            type: 'training',
            time: getScheduleTime('training'),
          });
        }
        if (dayTraining.secondary.length > 0) {
          items.push({
            id: 'training-secondary',
            name: '辅助训练',
            type: 'training',
            time: getScheduleTime('training'),
          });
        }
        if (dayTraining.cardio.length > 0) {
          items.push({
            id: 'training-cardio',
            name: '有氧训练',
            type: 'training',
            time: getScheduleTime('training'),
          });
        }
      }
    }

    const dayDiet = isTrainingDay ? selectedPlan.trainingDayDiet : selectedPlan.restDayDiet;
    const mealTimeMap: Record<MealType, string> = {
      breakfast: getScheduleTime('breakfast'),
      postWorkout: getScheduleTime('training'),
      lunch: getScheduleTime('lunch'),
      snack: getScheduleTime('snack'),
      dinner: getScheduleTime('dinner'),
      beforeBed: getScheduleTime('sleep'),
    };

    MEAL_ORDER.forEach(mealType => {
      const foods = dayDiet.meals[mealType];
      if (foods && foods.length > 0) {
        items.push({
          id: `meal-${mealType}`,
          name: MEAL_LABELS[mealType],
          type: 'meal',
          time: mealTimeMap[mealType],
        });
      }
    });

    return items;
  };

  const getTodayCustomItems = (): CustomChecklistItem[] => {
    return state.customChecklist.filter(item => item.activeDays.includes(weekday));
  };

  const autoItems = generateAutoItems();
  const customItems = getTodayCustomItems();

  const allItems = [
    ...autoItems.map(item => ({ ...item, isCustom: false })),
    ...customItems.map(item => ({ id: item.id, name: item.name, time: item.time, isCustom: true })),
  ].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return -1;
    if (!b.time) return 1;
    return a.time.localeCompare(b.time);
  });

  const getItemStatus = (itemId: string): 'completed' | 'pending' => {
    const record = dayCheckin.checklistItems.find(r => r.id === itemId);
    return record?.status || 'pending';
  };

  const toggleItemStatus = (itemId: string, itemName: string, isCustom: boolean) => {
    if (!isEditable) return;

    const currentStatus = getItemStatus(itemId);
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';

    const existingIndex = dayCheckin.checklistItems.findIndex(r => r.id === itemId);
    const newItems = [...dayCheckin.checklistItems];

    if (existingIndex >= 0) {
      newItems[existingIndex] = { ...newItems[existingIndex], status: newStatus };
    } else {
      newItems.push({ id: itemId, name: itemName, isCustom, status: newStatus });
    }

    updateDayCheckin({ checklistItems: newItems });
  };

  const calculateProgress = () => {
    const fixedItems = [
      { done: dayCheckin.weight !== undefined },
      { done: dayCheckin.bodyFat !== undefined },
      { done: dayCheckin.sleepHours !== undefined },
      { done: dayCheckin.waterMl >= dayCheckin.waterTarget },
    ];

    const autoItemsStatus = autoItems.map(item => ({
      done: getItemStatus(item.id) === 'completed',
    }));

    const allProgressItems = [...fixedItems, ...autoItemsStatus];
    const completed = allProgressItems.filter(item => item.done).length;
    const total = allProgressItems.length;

    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const progress = calculateProgress();
  const waterProgress = Math.min((dayCheckin.waterMl / dayCheckin.waterTarget) * 100, 100);

  const handleAddCustomItem = () => {
    if (!newItemName.trim()) {
      alert('请输入事项名称');
      return;
    }
    if (newItemDays.length === 0) {
      alert('请选择至少一天');
      return;
    }

    const newItem: CustomChecklistItem = {
      id: generateId(),
      name: newItemName.trim(),
      activeDays: newItemDays,
      time: newItemTime,
    };

    setState(prev => ({
      ...prev,
      customChecklist: [...prev.customChecklist, newItem],
    }));

    setNewItemName('');
    setNewItemTime('');
    setNewItemDays([]);
    setShowCustomItemModal(false);
  };

  const toggleNewItemDay = (day: Weekday) => {
    setNewItemDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

  const currentPlan = state.plans.find(p => p.id === state.currentPlanId);
  const showPlanName = selectedPlan?.name || '未知计划';
  const isHistoricalPlan = selectedPlan && currentPlan && selectedPlan.id !== currentPlan.id;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.dateNav}>
          <button className={styles.dateNavBtn} onClick={handlePrevDay}>‹</button>
          <div
            className={styles.dateCenter}
            onClick={() => navigate('/checkin/calendar')}
          >
            <div className={styles.dateMain}>{formatDisplayDate(selectedDate)}</div>
            <div className={styles.dateSub}>
              <span>{getWeekdayLabel(weekday)}</span>
              {isToday && <span className={styles.todayBadge}>今天</span>}
            </div>
          </div>
          <button className={styles.dateNavBtn} onClick={handleNextDay}>›</button>
        </div>

        <div className={styles.planInfo}>
          <span className={styles.planName}>{showPlanName}</span>
          {isHistoricalPlan && (
            <span className={styles.historicalBadge}>历史计划</span>
          )}
        </div>

        <div className={styles.dayTypes}>
          <span className={styles.dayTypeBadge}>
            {isTrainingDay ? '🏋️ 训练日' : '😴 放松日'}
          </span>
          <span className={styles.dayTypeBadge}>
            {isWorkday ? '💼 工作日' : '🏠 休息日'}
          </span>
        </div>

        {!isToday && (
          <button className={styles.backToTodayBtn} onClick={handleBackToToday}>
            回到今天
          </button>
        )}

        {isFutureDate && (
          <div className={styles.futureHint}>
            📅 这是未来的日期，暂时无法打卡
          </div>
        )}
      </div>

      <div className={styles.content}>
        {/* 今日总进度卡 */}
        <div ref={progressRef} className={styles.progressCard}>
          <div className={styles.progressHeader}>
            <span className={styles.progressLabel}>
              {isToday ? '今日完成率' : `${formatDisplayDate(selectedDate)} 完成率`}
            </span>
            <span className={styles.progressValue}>{progress}%</span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 饮水进度卡 */}
        <div ref={waterRef} className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>💧 饮水量</span>
            <span className={styles.waterStats}>
              {dayCheckin.waterMl} / {dayCheckin.waterTarget} ml
            </span>
          </div>
          <div className={styles.waterProgressBar}>
            <div
              className={styles.waterProgressFill}
              style={{ width: `${waterProgress}%` }}
            />
          </div>
          {isEditable && (
            <>
              <div className={styles.waterActions}>
                <button className={styles.waterQuickBtn} onClick={() => handleQuickAddWater(200)}>
                  +200ml
                </button>
                <button className={styles.waterQuickBtn} onClick={() => handleQuickAddWater(300)}>
                  +300ml
                </button>
                <button className={styles.waterQuickBtn} onClick={() => handleQuickAddWater(500)}>
                  +500ml
                </button>
                <button className={styles.waterCustomBtn} onClick={() => setShowWaterInput(!showWaterInput)}>
                  自定义
                </button>
              </div>
              {showWaterInput && (
                <div className={styles.waterInputRow}>
                  <input
                    type="number"
                    className={styles.waterInput}
                    value={waterAmount}
                    onChange={(e) => setWaterAmount(e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value) {
                        const normalized = normalizeNumber(e.target.value, true);
                        setWaterAmount(normalized > 0 ? normalized.toString() : '');
                      }
                    }}
                    placeholder="输入毫升数"
                  />
                  <button className={styles.waterAddBtn} onClick={handleAddWater}>
                    添加
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* 身体数据卡 */}
        <div ref={bodyRef} className={styles.card}>
          <div className={styles.cardTitle}>📊 身体数据</div>

          <div className={styles.fixedItemsGrid}>
            <div className={styles.fixedItem}>
              <span className={styles.fixedItemLabel}>体重 (kg)</span>
              <input
                type="number"
                step="0.1"
                min="0"
                max="500"
                className={`${styles.fixedItemInput} ${displayDefaults.weightIsDefault ? styles.defaultValue : ''}`}
                value={dayCheckin.weight ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    updateFixedItem('weight', undefined);
                  } else {
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                      updateFixedItem('weight', num);
                    }
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value && dayCheckin.weight !== undefined) {
                    const normalized = normalizeNumber(e.target.value, false);
                    if (normalized >= 0 && normalized <= 500) {
                      updateFixedItem('weight', normalized);
                    }
                  }
                }}
                placeholder={displayDefaults.weightDisplay !== undefined ? `${displayDefaults.weightDisplay}` : '--'}
                disabled={!isEditable}
              />
            </div>

            <div className={styles.fixedItem}>
              <span className={styles.fixedItemLabel}>体脂率 (%)</span>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                className={`${styles.fixedItemInput} ${displayDefaults.bodyFatIsDefault ? styles.defaultValue : ''}`}
                value={dayCheckin.bodyFat ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    updateFixedItem('bodyFat', undefined);
                  } else {
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                      updateFixedItem('bodyFat', num);
                    }
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value && dayCheckin.bodyFat !== undefined) {
                    const normalized = normalizeNumber(e.target.value, false);
                    if (normalized >= 0 && normalized <= 100) {
                      updateFixedItem('bodyFat', normalized);
                    }
                  }
                }}
                placeholder={displayDefaults.bodyFatDisplay !== undefined ? `${displayDefaults.bodyFatDisplay}` : '--'}
                disabled={!isEditable}
              />
            </div>
          </div>

          <div className={styles.sleepItem}>
            <span className={styles.fixedItemLabel}>😴 睡眠时长 (小时)</span>

            {/* 进度条在上 */}
            <div className={styles.sleepProgressBar}>
              <div
                className={styles.sleepProgressFill}
                style={{
                  width: `${Math.min((displayDefaults.sleepDisplay / 7.5) * 100, 100)}%`,
                  background: getSleepProgressColor(displayDefaults.sleepDisplay),
                }}
              />
            </div>

            {/* 输入框左下，目标右下 */}
            <div className={styles.sleepMetaRow}>
              <input
                type="number"
                step="0.5"
                min="0"
                max="24"
                className={`${styles.sleepInput} ${displayDefaults.sleepIsDefault ? styles.defaultValue : ''}`}
                value={dayCheckin.sleepHours ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    updateFixedItem('sleepHours', undefined);
                  } else {
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                      updateFixedItem('sleepHours', num);
                    }
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value && dayCheckin.sleepHours !== undefined) {
                    const normalized = normalizeNumber(e.target.value, false);
                    if (normalized >= 0 && normalized <= 24) {
                      updateFixedItem('sleepHours', normalized);
                    }
                  }
                }}
                placeholder={displayDefaults.sleepDisplay > 0 ? `${displayDefaults.sleepDisplay}` : '0'}
                disabled={!isEditable}
              />
              <span className={styles.sleepTarget}>目标：7.5 小时</span>
            </div>
          </div>
        </div>

        {/* 执行清单 */}
        <div ref={checklistRef} className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>📝 执行清单</span>
            <button
              className={styles.addCustomBtn}
              onClick={() => setShowCustomItemModal(true)}
            >
              + 自定义
            </button>
          </div>

          {allItems.length === 0 ? (
            <div className={styles.emptyHint}>
              {selectedPlan ? '今天没有待办事项' : '没有对应的计划'}
            </div>
          ) : (
            <div className={styles.checklistItems}>
              {allItems.map(item => {
                const status = getItemStatus(item.id);
                const isCompleted = status === 'completed';
                return (
                  <div
                    key={item.id}
                    className={`${styles.checklistItem} ${isCompleted ? styles.checklistItemDone : ''} ${!isEditable ? styles.checklistItemDisabled : ''}`}
                    onClick={() => toggleItemStatus(item.id, item.name, item.isCustom)}
                    style={{ cursor: isEditable ? 'pointer' : 'default' }}
                  >
                    <div className={styles.checklistCheck}>
                      {isCompleted ? '✓' : '○'}
                    </div>
                    <div className={styles.checklistContent}>
                      <span className={styles.checklistName}>{item.name}</span>
                      {item.time && (
                        <span className={styles.checklistTime}>{item.time}</span>
                      )}
                    </div>
                    {item.isCustom && (
                      <span className={styles.customBadge}>自定义</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 自定义项弹窗 */}
      {showCustomItemModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCustomItemModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>添加自定义事项</span>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setShowCustomItemModal(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>事项名称</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="例如：吃维生素"
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>提醒时间（可选）</label>
                <input
                  type="time"
                  className={styles.formInput}
                  value={newItemTime}
                  onChange={(e) => setNewItemTime(e.target.value)}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>重复日期</label>
                <div className={styles.daySelector}>
                  {WEEKDAYS.map(day => (
                    <button
                      key={day}
                      className={`${styles.dayBtn} ${newItemDays.includes(day) ? styles.dayBtnActive : ''}`}
                      onClick={() => toggleNewItemDay(day)}
                    >
                      {getWeekdayLabel(day).slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setShowCustomItemModal(false)}
              >
                取消
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleAddCustomItem}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}