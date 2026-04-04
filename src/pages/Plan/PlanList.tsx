import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppState } from '../../contexts/AppContext';
import { getTodayString, getWeekday, getWeekdayLabel, formatDisplayDate, addDays } from '../../utils/date';
import { 
  Weekday, 
  MealType,
  MEAL_ORDER, 
  MEAL_LABELS, 
  StrengthExercise,
  CardioExercise,
  DailyPlanRecord,
  PlanExerciseRecord,
  PlanCardioRecord,
} from '../../types';
import styles from './Plan.module.css';
import todayStyles from './TodayPlan.module.css';

type PlanTab = 'training' | 'diet';
type ActiveTab = 'today' | 'all';

export default function PlanList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, setState, getPlanForDate } = useAppState();
  
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const tabParam = searchParams.get('tab');
    return tabParam === 'all' ? 'all' : 'today';
  });
  const [planTab, setPlanTab] = useState<PlanTab>('training');
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());

  const today = getTodayString();
  const weekday = getWeekday(selectedDate);
  const isToday = selectedDate === today;

  const isTodayTab = activeTab === 'today';
  const isAllTab = activeTab === 'all';

  const selectedPlan = getPlanForDate(selectedDate);
  const currentPlan = state.plans.find(p => p.id === state.currentPlanId);
  const pendingPlan = state.plans.find(p => p.id === state.pendingPlanId);
  const otherPlans = state.plans.filter(
    p => p.id !== state.currentPlanId && p.id !== state.pendingPlanId
  );

  const getDayRecord = (): DailyPlanRecord => {
    return state.planRecords[selectedDate] || {
      date: selectedDate,
      training: { primary: {}, secondary: {}, cardio: {} },
      meals: {},
    };
  };

  const dayRecord = getDayRecord();

  const updateDayRecord = (updater: (record: DailyPlanRecord) => DailyPlanRecord) => {
    if (selectedDate > today) return;

    const newDailyPlanMap = { ...state.dailyPlanMap };
    if (!newDailyPlanMap[selectedDate] && selectedPlan) {
      newDailyPlanMap[selectedDate] = selectedPlan.id;
    }

    setState(prev => ({
      ...prev,
      dailyPlanMap: newDailyPlanMap,
      planRecords: {
        ...prev.planRecords,
        [selectedDate]: updater(getDayRecord()),
      },
    }));
  };

  const getExerciseRecord = (type: 'primary' | 'secondary', exerciseId: string): PlanExerciseRecord => {
    return dayRecord.training[type][exerciseId] || {
      exerciseId,
      sets: [],
      status: 'pending',
    };
  };

  const getCardioRecord = (exerciseId: string): PlanCardioRecord => {
    return dayRecord.training.cardio[exerciseId] || {
      exerciseId,
      actualDuration: 0,
      status: 'pending',
    };
  };

  const toggleExerciseExpand = (exerciseId: string) => {
    setExpandedExercises(prev => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
      }
      return newSet;
    });
  };

  const updateExerciseRecord = (
    type: 'primary' | 'secondary',
    exerciseId: string,
    updates: Partial<PlanExerciseRecord>
  ) => {
    updateDayRecord(record => ({
      ...record,
      training: {
        ...record.training,
        [type]: {
          ...record.training[type],
          [exerciseId]: {
            ...getExerciseRecord(type, exerciseId),
            ...updates,
          },
        },
      },
    }));
  };

  const addSet = (type: 'primary' | 'secondary', exerciseId: string, exercise: StrengthExercise) => {
    const record = getExerciseRecord(type, exerciseId);
    updateExerciseRecord(type, exerciseId, {
      sets: [...record.sets, { reps: exercise.reps, weight: 0 }],
    });
  };

  const updateSet = (
    type: 'primary' | 'secondary',
    exerciseId: string,
    setIndex: number,
    field: 'reps' | 'weight',
    value: number
  ) => {
    const record = getExerciseRecord(type, exerciseId);
    const newSets = [...record.sets];
    newSets[setIndex] = { ...newSets[setIndex], [field]: value };
    updateExerciseRecord(type, exerciseId, { sets: newSets });
  };

  const removeSet = (type: 'primary' | 'secondary', exerciseId: string, setIndex: number) => {
    const record = getExerciseRecord(type, exerciseId);
    const newSets = record.sets.filter((_, i) => i !== setIndex);
    updateExerciseRecord(type, exerciseId, { sets: newSets });
  };

  const toggleExerciseStatus = (
    type: 'primary' | 'secondary',
    exerciseId: string,
    currentStatus: 'completed' | 'skipped' | 'pending'
  ) => {
    const nextStatus = currentStatus === 'pending' ? 'completed' 
      : currentStatus === 'completed' ? 'skipped' 
      : 'pending';
    updateExerciseRecord(type, exerciseId, { status: nextStatus });
  };

  const updateCardioRecord = (exerciseId: string, updates: Partial<PlanCardioRecord>) => {
    updateDayRecord(record => ({
      ...record,
      training: {
        ...record.training,
        cardio: {
          ...record.training.cardio,
          [exerciseId]: {
            ...getCardioRecord(exerciseId),
            ...updates,
          },
        },
      },
    }));
  };

  const toggleCardioStatus = (exerciseId: string, currentStatus: 'completed' | 'skipped' | 'pending') => {
    const nextStatus = currentStatus === 'pending' ? 'completed' 
      : currentStatus === 'completed' ? 'skipped' 
      : 'pending';
    updateCardioRecord(exerciseId, { status: nextStatus });
  };

  const toggleMealStatus = (mealType: MealType) => {
    const currentStatus = dayRecord.meals[mealType]?.status || 'pending';
    const nextStatus = currentStatus === 'pending' ? 'completed' 
      : currentStatus === 'completed' ? 'skipped' 
      : 'pending';
    
    updateDayRecord(record => ({
      ...record,
      meals: {
        ...record.meals,
        [mealType]: { status: nextStatus },
      },
    }));
  };

  const getStatusDisplay = (status: 'completed' | 'skipped' | 'pending') => {
    switch (status) {
      case 'completed': return { text: '已完成', className: todayStyles.statusCompleted };
      case 'skipped': return { text: '已跳过', className: todayStyles.statusSkipped };
      default: return { text: '未完成', className: todayStyles.statusPending };
    }
  };

  const handlePlanClick = (planId: string) => {
    navigate(`/plan/${planId}`);
  };

  const handleNewPlan = () => {
    navigate('/plan/new');
  };

  const handlePrevDay = () => {
    const newDate = addDays(selectedDate, -1);
    setSelectedDate(newDate);
    setExpandedExercises(new Set());
  };

  const handleNextDay = () => {
    const newDate = addDays(selectedDate, 1);
    setSelectedDate(newDate);
    setExpandedExercises(new Set());
  };

  const handleBackToToday = () => {
    setSelectedDate(today);
    setExpandedExercises(new Set());
  };

  const isEditable = selectedDate <= today;

  const renderStrengthExercise = (
    exercise: StrengthExercise,
    type: 'primary' | 'secondary'
  ) => {
    const record = getExerciseRecord(type, exercise.id);
    const isExpanded = expandedExercises.has(exercise.id);
    const statusDisplay = getStatusDisplay(record.status);

    return (
      <div key={exercise.id} className={todayStyles.exerciseCard}>
        <div 
          className={todayStyles.exerciseHeader}
          onClick={() => toggleExerciseExpand(exercise.id)}
        >
          <div className={todayStyles.exerciseInfo}>
            <div className={todayStyles.exerciseName}>{exercise.name}</div>
            <div className={todayStyles.exerciseDetail}>
              {exercise.sets}组 × {exercise.reps}次 · 休息{exercise.restSeconds}秒
              {exercise.isSuperSet && <span className={todayStyles.superSetBadge}>超级组</span>}
            </div>
          </div>
          <div className={todayStyles.exerciseRight}>
            {isEditable ? (
              <span 
                className={`${todayStyles.statusBadge} ${statusDisplay.className}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExerciseStatus(type, exercise.id, record.status);
                }}
              >
                {statusDisplay.text}
              </span>
            ) : (
              <span className={`${todayStyles.statusBadge} ${todayStyles.statusPending}`}>
                未到
              </span>
            )}
            <span className={todayStyles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
          </div>
        </div>

        {isExpanded && (
          <div className={todayStyles.exerciseBody}>
            <div className={todayStyles.setsHeader}>
              <span>组数</span>
              <span>次数</span>
              <span>重量(kg)</span>
              <span></span>
            </div>
            {record.sets.map((set, index) => (
              <div key={index} className={todayStyles.setRow}>
                <span className={todayStyles.setNumber}>第{index + 1}组</span>
                <input
                  type="number"
                  className={todayStyles.setInput}
                  value={set.reps || ''}
                  onChange={(e) => updateSet(type, exercise.id, index, 'reps', parseInt(e.target.value) || 0)}
                  placeholder={`${exercise.reps}`}
                  disabled={!isEditable}
                />
                <input
                  type="number"
                  className={todayStyles.setInput}
                  value={set.weight || ''}
                  onChange={(e) => updateSet(type, exercise.id, index, 'weight', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  step="0.5"
                  disabled={!isEditable}
                />
                <button
                  className={todayStyles.removeSetBtn}
                  onClick={() => removeSet(type, exercise.id, index)}
                  disabled={!isEditable}
                >
                  ✕
                </button>
              </div>
            ))}
            {isEditable && (
              <button
                className={todayStyles.addSetBtn}
                onClick={() => addSet(type, exercise.id, exercise)}
              >
                + 添加一组
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCardioExercise = (exercise: CardioExercise) => {
    const record = getCardioRecord(exercise.id);
    const statusDisplay = getStatusDisplay(record.status);

    return (
      <div key={exercise.id} className={todayStyles.exerciseCard}>
        <div className={todayStyles.exerciseHeader}>
          <div className={todayStyles.exerciseInfo}>
            <div className={todayStyles.exerciseName}>{exercise.name}</div>
            <div className={todayStyles.exerciseDetail}>
              计划 {exercise.durationMinutes} 分钟
            </div>
          </div>
          <div className={todayStyles.exerciseRight}>
            <input
              type="number"
              className={todayStyles.cardioInput}
              value={record.actualDuration || ''}
              onChange={(e) => updateCardioRecord(exercise.id, { 
                actualDuration: parseInt(e.target.value) || 0 
              })}
              placeholder="实际"
              disabled={!isEditable}
            />
            <span className={todayStyles.cardioUnit}>分钟</span>
            {isEditable ? (
              <span 
                className={`${todayStyles.statusBadge} ${statusDisplay.className}`}
                onClick={() => toggleCardioStatus(exercise.id, record.status)}
              >
                {statusDisplay.text}
              </span>
            ) : (
              <span className={`${todayStyles.statusBadge} ${todayStyles.statusPending}`}>
                未到
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 当天计划标签内容
  if (isTodayTab) {
    const isTrainingDay = selectedPlan?.trainingDays.includes(weekday) || false;
    const isWorkday = selectedPlan?.workdays.includes(weekday) || false;
    const dayTraining = selectedPlan?.weeklyTraining[weekday];
    const dayDiet = selectedPlan 
      ? (isTrainingDay ? selectedPlan.trainingDayDiet : selectedPlan.restDayDiet)
      : null;
    const daySchedule = selectedPlan
      ? (isWorkday ? selectedPlan.schedule.workday : selectedPlan.schedule.weekend)
      : null;

    const hasTrainingContent = dayTraining && (
      dayTraining.primary.length > 0 ||
      dayTraining.secondary.length > 0 ||
      dayTraining.cardio.length > 0
    );

    const hasDietContent = dayDiet && MEAL_ORDER.some(
      meal => dayDiet.meals[meal]?.length > 0
    );

    const hasScheduleContent = daySchedule && daySchedule.some(item => item.time);

    const showPlanName = selectedPlan?.name || '未知计划';
    const isHistoricalPlan = selectedPlan && currentPlan && selectedPlan.id !== currentPlan.id;

    return (
      <div className={styles.page}>
        {/* ✨ 移除了标题，只保留标签栏 */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tab} ${isTodayTab ? styles.active : ''}`}
            onClick={() => setActiveTab('today')}
          >
            当天计划
          </button>
          <button
            className={`${styles.tab} ${isAllTab ? styles.active : ''}`}
            onClick={() => setActiveTab('all')}
          >
            完整计划
          </button>
        </div>

        {!selectedPlan ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <div className={styles.emptyText}>这一天没有对应的计划</div>
            <div className={styles.emptyText}>请先创建并启用一个计划</div>
          </div>
        ) : (
          <div className={todayStyles.content}>
            {/* 日期信息卡 */}
            <div className={todayStyles.dateCard}>
              <div className={todayStyles.dateNav}>
                <button className={todayStyles.dateNavBtn} onClick={handlePrevDay}>
                  ‹
                </button>
                <div className={todayStyles.dateCenter}>
                  <div className={todayStyles.dateMain}>{formatDisplayDate(selectedDate)}</div>
                  <div className={todayStyles.dateSub}>
                    <span className={todayStyles.weekday}>{getWeekdayLabel(weekday)}</span>
                    {isToday && <span className={todayStyles.todayBadge}>今天</span>}
                  </div>
                </div>
                <button className={todayStyles.dateNavBtn} onClick={handleNextDay}>
                  ›
                </button>
              </div>
              
              {/* 显示计划名称 */}
              <div className={todayStyles.planInfo}>
                <span className={todayStyles.planName}>{showPlanName}</span>
                {isHistoricalPlan && (
                  <span className={todayStyles.historicalBadge}>历史计划</span>
                )}
              </div>
              
              <div className={todayStyles.dayTypes}>
                <span className={todayStyles.dayTypeBadge}>
                  {isTrainingDay ? '🏋️ 训练日' : '😴 放松日'}
                </span>
                <span className={todayStyles.dayTypeBadge}>
                  {isWorkday ? '💼 工作日' : '🏠 休息日'}
                </span>
              </div>

              {!isToday && (
                <button className={todayStyles.backToTodayBtn} onClick={handleBackToToday}>
                  回到今天
                </button>
              )}

              {/* 未来日期提示 */}
              {selectedDate > today && (
                <div className={todayStyles.futureHint}>
                  📅 这是未来的日期，仅供预览
                </div>
              )}
            </div>

            {/* 训练/饮食切换卡 */}
            <div className={todayStyles.card}>
              <div className={todayStyles.tabBar}>
                <button
                  className={`${todayStyles.tab} ${planTab === 'training' ? todayStyles.tabActive : ''}`}
                  onClick={() => setPlanTab('training')}
                >
                  训练计划
                </button>
                <button
                  className={`${todayStyles.tab} ${planTab === 'diet' ? todayStyles.tabActive : ''}`}
                  onClick={() => setPlanTab('diet')}
                >
                  饮食计划
                </button>
              </div>

              {planTab === 'training' && (
                <div className={todayStyles.tabContent}>
                  {!isTrainingDay ? (
                    <div className={todayStyles.restDayHint}>
                      <div className={todayStyles.restDayIcon}>😴</div>
                      <div className={todayStyles.restDayText}>这天是放松日，好好休息吧！</div>
                    </div>
                  ) : !hasTrainingContent ? (
                    <div className={todayStyles.emptyHint}>这天没有训练安排</div>
                  ) : (
                    <>
                      {dayTraining!.primary.length > 0 && (
                        <div className={todayStyles.trainingSection}>
                          <div className={todayStyles.sectionTitle}>主要训练</div>
                          {dayTraining!.primary.map(ex => renderStrengthExercise(ex, 'primary'))}
                        </div>
                      )}

                      {dayTraining!.secondary.length > 0 && (
                        <div className={todayStyles.trainingSection}>
                          <div className={todayStyles.sectionTitle}>辅助训练</div>
                          {dayTraining!.secondary.map(ex => renderStrengthExercise(ex, 'secondary'))}
                        </div>
                      )}

                      {dayTraining!.cardio.length > 0 && (
                        <div className={todayStyles.trainingSection}>
                          <div className={todayStyles.sectionTitle}>有氧训练</div>
                          {dayTraining!.cardio.map(ex => renderCardioExercise(ex))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {planTab === 'diet' && (
                <div className={todayStyles.tabContent}>
                  {!hasDietContent ? (
                    <div className={todayStyles.emptyHint}>这天没有饮食安排</div>
                  ) : (
                    MEAL_ORDER.map(mealType => {
                      const foods = dayDiet!.meals[mealType];
                      if (!foods || foods.length === 0) return null;
                      
                      const mealRecord = dayRecord.meals[mealType];
                      const statusDisplay = getStatusDisplay(mealRecord?.status || 'pending');
                      
                      return (
                        <div key={mealType} className={todayStyles.mealCard}>
                          <div 
                            className={todayStyles.mealHeader}
                            onClick={() => isEditable && toggleMealStatus(mealType)}
                            style={{ cursor: isEditable ? 'pointer' : 'default' }}
                          >
                            <span className={todayStyles.mealTitle}>{MEAL_LABELS[mealType]}</span>
                            {isEditable ? (
                              <span className={`${todayStyles.statusBadge} ${statusDisplay.className}`}>
                                {statusDisplay.text}
                              </span>
                            ) : (
                              <span className={`${todayStyles.statusBadge} ${todayStyles.statusPending}`}>
                                未到
                              </span>
                            )}
                          </div>
                          <div className={todayStyles.mealBody}>
                            {foods.map(food => (
                              <div key={food.id} className={todayStyles.foodItem}>
                                <span className={todayStyles.foodName}>{food.name}</span>
                                <span className={todayStyles.foodQuantity}>
                                  {food.quantity}{food.displayUnit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* 作息计划卡 */}
            <div className={todayStyles.card}>
              <div className={todayStyles.cardHeader}>
                <span className={todayStyles.cardTitle}>作息计划</span>
                <span className={todayStyles.cardBadge}>{isWorkday ? '工作日' : '休息日'}</span>
              </div>
              
              {!hasScheduleContent ? (
                <div className={todayStyles.emptyHint}>这天没有作息安排</div>
              ) : (
                <div className={todayStyles.scheduleList}>
                  {daySchedule!.filter(item => item.time).map(item => (
                    <div key={item.key} className={todayStyles.scheduleItem}>
                      <span className={todayStyles.scheduleTime}>{item.time}</span>
                      <span className={todayStyles.scheduleLabel}>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 完整计划标签内容
  return (
    <div className={styles.page}>
      {/* ✨ 移除了标题，只保留新建按钮 */}
      <div className={styles.header}>
        <button className={styles.newButton} onClick={handleNewPlan}>
          + 新建计划
        </button>
      </div>

      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${isTodayTab ? styles.active : ''}`}
          onClick={() => setActiveTab('today')}
        >
          当天计划
        </button>
        <button
          className={`${styles.tab} ${isAllTab ? styles.active : ''}`}
          onClick={() => setActiveTab('all')}
        >
          完整计划
        </button>
      </div>

      {state.plans.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <div className={styles.emptyText}>还没有创建任何计划</div>
          <div className={styles.emptyText}>点击下方按钮创建你的第一个计划</div>
        </div>
      ) : (
        <div>
          {currentPlan && (
            <div
              className={`${styles.planCard} ${styles.current}`}
              onClick={() => handlePlanClick(currentPlan.id)}
            >
              <div className={styles.planName}>{currentPlan.name}</div>
              <div className={styles.planMeta}>
                当前计划 · {currentPlan.totalWeeks} 周
              </div>
            </div>
          )}

          {pendingPlan && (
            <div
              className={`${styles.planCard} ${styles.pending}`}
              onClick={() => handlePlanClick(pendingPlan.id)}
            >
              <div className={styles.planName}>{pendingPlan.name}</div>
              <div className={styles.planMeta}>
                待生效 · {state.pendingPlanDate} 起 · {pendingPlan.totalWeeks} 周
              </div>
            </div>
          )}

          {otherPlans.map(plan => (
            <div
              key={plan.id}
              className={styles.planCard}
              onClick={() => handlePlanClick(plan.id)}
            >
              <div className={styles.planName}>{plan.name}</div>
              <div className={styles.planMeta}>{plan.totalWeeks} 周</div>
            </div>
          ))}
        </div>
      )}

      <button className={styles.bottomButton} onClick={handleNewPlan}>
        + 新建计划
      </button>
    </div>
  );
}
