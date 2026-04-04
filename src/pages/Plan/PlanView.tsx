import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../contexts/AppContext';
import { getTodayString, getWeekdayLabel, addDays } from '../../utils/date';
import { generateId } from '../../utils/id';
import {
  Plan,
  Weekday,
  MEAL_ORDER,
  MEAL_LABELS,
} from '../../types';
import styles from './PlanView.module.css';

const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export default function PlanView() {
  const navigate = useNavigate();
  const { planId } = useParams();
  const { state, setState } = useAppState();
  const [showMenu, setShowMenu] = useState(false);
  
  const [selectedTrainingDay, setSelectedTrainingDay] = useState<Weekday | null>(null);
  const [selectedDietType, setSelectedDietType] = useState<'training' | 'rest'>('training');

  const plan = state.plans.find(p => p.id === planId);
  const isCurrentPlan = state.currentPlanId === planId;
  const isPendingPlan = state.pendingPlanId === planId;

  React.useEffect(() => {
    if (plan && plan.trainingDays.length > 0 && selectedTrainingDay === null) {
      setSelectedTrainingDay(plan.trainingDays[0]);
    }
  }, [plan, selectedTrainingDay]);

  if (!plan) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>❌</div>
          <div className={styles.emptyText}>计划不存在</div>
          <button className={styles.backButton} onClick={() => navigate('/plan?tab=all')}>
            返回计划列表
          </button>
        </div>
      </div>
    );
  }

  const handleSetAsCurrent = () => {
    if (isCurrentPlan) {
      alert('当前计划已经在使用中');
      return;
    }

    // 检查是否已经有待生效计划
    if (isPendingPlan) {
      alert('此计划已设为待生效');
      return;
    }

    // 检查是否已有其他待生效计划
    if (state.pendingPlanId && state.pendingPlanId !== plan.id) {
      const existingPending = state.plans.find(p => p.id === state.pendingPlanId);
      const confirmReplace = window.confirm(
        `已有待生效计划「${existingPending?.name || '未知'}」，是否替换为「${plan.name}」？`
      );
      if (!confirmReplace) return;
    }

    // 检查一个月内是否已切换过
    if (state.lastPlanSwitchDate) {
      const lastSwitch = new Date(state.lastPlanSwitchDate);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - lastSwitch.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 30) {
        alert(`一个月内只能切换一次计划，距离下次可切换还有 ${30 - diffDays} 天`);
        return;
      }
    }

    const tomorrow = addDays(getTodayString(), 1);
    setState(prev => ({
      ...prev,
      pendingPlanId: plan.id,
      pendingPlanDate: tomorrow,
    }));
    setShowMenu(false);
    alert(`计划「${plan.name}」将于明天（${tomorrow}）生效`);
  };

const handleCopyPlan = () => {
  const now = new Date().toISOString();
  const newPlan: Plan = {
    ...JSON.parse(JSON.stringify(plan)),
    id: generateId(),
    name: `${plan.name} - 副本`,
    createdAt: now,
    updatedAt: now,
  };

    setState(prev => ({
      ...prev,
      plans: [...prev.plans, newPlan],
    }));
    setShowMenu(false);
    alert('复制成功');
  };

  const handleDeletePlan = () => {
    if (isCurrentPlan) {
      alert('当前使用中的计划不能删除');
      return;
    }

    const confirmed = window.confirm(`确定要删除计划「${plan.name}」吗？此操作不可恢复。`);
    if (!confirmed) return;

    setState(prev => {
      const newPlans = prev.plans.filter(p => p.id !== plan.id);
      
      const newState = { ...prev, plans: newPlans };
      if (prev.pendingPlanId === plan.id) {
        newState.pendingPlanId = null;
        newState.pendingPlanDate = null;
      }

      if (newPlans.length === 0) {
        const now = new Date().toISOString();
        const emptyPlan: Plan = {
          id: generateId(),
          name: '新建计划',
          totalWeeks: 8,
          createdAt: now,
          updatedAt: now,
          trainingDays: [],
          workdays: [1, 2, 3, 4, 5],
          weeklyTraining: {},
          trainingDayDiet: { meals: {} as any },
          restDayDiet: { meals: {} as any },
          schedule: { workday: [], weekend: [] },
        };
        newState.plans = [emptyPlan];
      }

      return newState;
    });

    navigate('/plan?tab=all');
  };

  const handleEdit = () => {
    navigate(`/plan/${planId}/edit`);
  };

  const hasTrainingContent = (day: Weekday): boolean => {
    const dayPlan = plan.weeklyTraining[day];
    if (!dayPlan) return false;
    return dayPlan.primary.length > 0 || dayPlan.secondary.length > 0 || dayPlan.cardio.length > 0;
  };

  const hasAnyTrainingContent = plan.trainingDays.some(day => hasTrainingContent(day));

  const hasDietContent = (diet: typeof plan.trainingDayDiet): boolean => {
    return MEAL_ORDER.some(meal => (diet.meals[meal]?.length || 0) > 0);
  };

  const hasScheduleContent = (items: typeof plan.schedule.workday): boolean => {
    return items.some(item => item.time);
  };

  const currentDayTraining = selectedTrainingDay !== null ? plan.weeklyTraining[selectedTrainingDay] : null;
  const currentDiet = selectedDietType === 'training' ? plan.trainingDayDiet : plan.restDayDiet;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/plan?tab=all')}>
          ← 返回
        </button>
        <div className={styles.headerRight}>
          {isCurrentPlan && <span className={styles.currentBadge}>当前计划</span>}
          {isPendingPlan && <span className={styles.pendingBadge}>待生效</span>}
          <button className={styles.menuBtn} onClick={() => setShowMenu(!showMenu)}>
            ⋮
          </button>
        </div>
      </div>

      {showMenu && (
        <div className={styles.menuOverlay} onClick={() => setShowMenu(false)}>
          <div className={styles.menu} onClick={e => e.stopPropagation()}>
            <button className={styles.menuItem} onClick={handleSetAsCurrent}>
              设为当前计划
            </button>
            <button className={styles.menuItem} onClick={handleCopyPlan}>
              复制计划
            </button>
            <button className={styles.menuItem} onClick={handleEdit}>
              进入编辑
            </button>
            <button 
              className={`${styles.menuItem} ${styles.menuItemDanger}`} 
              onClick={handleDeletePlan}
              disabled={isCurrentPlan}
            >
              删除计划
            </button>
          </div>
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.card}>
          <h1 className={styles.planName}>{plan.name}</h1>
          <div className={styles.planMeta}>计划周期：{plan.totalWeeks} 周</div>
        </div>

        {(plan.targetWeight || plan.targetBodyFat) && (
          <>
            <h2 className={styles.sectionTitle}>目标指标</h2>
            <div className={styles.card}>
              {plan.targetWeight && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>目标体重</span>
                  <span className={styles.infoValue}>{plan.targetWeight} kg</span>
                </div>
              )}
              {plan.targetBodyFat && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>目标体脂率</span>
                  <span className={styles.infoValue}>{plan.targetBodyFat}%</span>
                </div>
              )}
            </div>
          </>
        )}

        <h2 className={styles.sectionTitle}>训练日分类</h2>
        <div className={styles.card}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>训练日</span>
            <span className={styles.infoValue}>
              {plan.trainingDays.length > 0 
                ? plan.trainingDays.map(d => getWeekdayLabel(d)).join('、')
                : '未设置'}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>放松日</span>
            <span className={styles.infoValue}>
              {plan.trainingDays.length < 7
                ? WEEKDAYS.filter(d => !plan.trainingDays.includes(d)).map(d => getWeekdayLabel(d)).join('、')
                : '无'}
            </span>
          </div>
        </div>

        <h2 className={styles.sectionTitle}>训练计划</h2>
        {plan.trainingDays.length === 0 ? (
          <div className={styles.emptyCard}>未设置训练日</div>
        ) : !hasAnyTrainingContent ? (
          <div className={styles.emptyCard}>未设置训练计划</div>
        ) : (
          <>
            <div className={styles.dayTabs}>
              {plan.trainingDays.map(day => (
                <button
                  key={day}
                  className={`${styles.dayTab} ${selectedTrainingDay === day ? styles.dayTabActive : ''}`}
                  onClick={() => setSelectedTrainingDay(day)}
                >
                  {getWeekdayLabel(day)}
                </button>
              ))}
            </div>

            {selectedTrainingDay !== null && (
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>{getWeekdayLabel(selectedTrainingDay)} 训练</h3>
                
                {!hasTrainingContent(selectedTrainingDay) ? (
                  <div className={styles.emptyHint}>该天暂无训练安排</div>
                ) : (
                  <>
                    {currentDayTraining?.primary && currentDayTraining.primary.length > 0 && (
                      <div className={styles.trainingSection}>
                        <div className={styles.trainingSectionTitle}>主要训练</div>
                        {currentDayTraining.primary.map(ex => (
                          <div key={ex.id} className={styles.exerciseItem}>
                            <span className={styles.exerciseName}>{ex.name}</span>
                            <span className={styles.exerciseDetail}>
                              {ex.sets}组 × {ex.reps}次 · 休息{ex.restSeconds}秒
                              {ex.isSuperSet && ' · 超级组'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {currentDayTraining?.secondary && currentDayTraining.secondary.length > 0 && (
                      <div className={styles.trainingSection}>
                        <div className={styles.trainingSectionTitle}>辅助训练</div>
                        {currentDayTraining.secondary.map(ex => (
                          <div key={ex.id} className={styles.exerciseItem}>
                            <span className={styles.exerciseName}>{ex.name}</span>
                            <span className={styles.exerciseDetail}>
                              {ex.sets}组 × {ex.reps}次 · 休息{ex.restSeconds}秒
                              {ex.isSuperSet && ' · 超级组'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {currentDayTraining?.cardio && currentDayTraining.cardio.length > 0 && (
                      <div className={styles.trainingSection}>
                        <div className={styles.trainingSectionTitle}>有氧训练</div>
                        {currentDayTraining.cardio.map(ex => (
                          <div key={ex.id} className={styles.exerciseItem}>
                            <span className={styles.exerciseName}>{ex.name}</span>
                            <span className={styles.exerciseDetail}>{ex.durationMinutes}分钟</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

        <h2 className={styles.sectionTitle}>饮食计划</h2>
        {!hasDietContent(plan.trainingDayDiet) && !hasDietContent(plan.restDayDiet) ? (
          <div className={styles.emptyCard}>未设置饮食计划</div>
        ) : (
          <>
            <div className={styles.dayTabs}>
              <button
                className={`${styles.dayTab} ${selectedDietType === 'training' ? styles.dayTabActive : ''}`}
                onClick={() => setSelectedDietType('training')}
              >
                训练日饮食
              </button>
              <button
                className={`${styles.dayTab} ${selectedDietType === 'rest' ? styles.dayTabActive : ''}`}
                onClick={() => setSelectedDietType('rest')}
              >
                放松日饮食
              </button>
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>
                {selectedDietType === 'training' ? '训练日饮食' : '放松日饮食'}
              </h3>
              
              {!hasDietContent(currentDiet) ? (
                <div className={styles.emptyHint}>暂无饮食安排</div>
              ) : (
                MEAL_ORDER.map(mealType => {
                  const foods = currentDiet.meals[mealType];
                  if (!foods || foods.length === 0) return null;
                  return (
                    <div key={mealType} className={styles.mealSection}>
                      <div className={styles.mealTitle}>{MEAL_LABELS[mealType]}</div>
                      {foods.map(food => (
                        <div key={food.id} className={styles.foodItem}>
                          {food.name} · {food.quantity}{food.displayUnit}
                        </div>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        <h2 className={styles.sectionTitle}>工作日分类</h2>
        <div className={styles.card}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>工作日</span>
            <span className={styles.infoValue}>
              {plan.workdays.length > 0 
                ? plan.workdays.map(d => getWeekdayLabel(d)).join('、')
                : '未设置'}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>休息日</span>
            <span className={styles.infoValue}>
              {plan.workdays.length < 7
                ? WEEKDAYS.filter(d => !plan.workdays.includes(d)).map(d => getWeekdayLabel(d)).join('、')
                : '无'}
            </span>
          </div>
        </div>

        <h2 className={styles.sectionTitle}>作息计划</h2>
        
        {!hasScheduleContent(plan.schedule.workday) && !hasScheduleContent(plan.schedule.weekend) ? (
          <div className={styles.emptyCard}>未设置作息计划</div>
        ) : (
          <>
            {hasScheduleContent(plan.schedule.workday) && (
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>工作日作息</h3>
                {plan.schedule.workday.filter(item => item.time).map(item => (
                  <div key={item.key} className={styles.scheduleItem}>
                    <span className={styles.scheduleLabel}>{item.label}</span>
                    <span className={styles.scheduleTime}>{item.time}</span>
                  </div>
                ))}
              </div>
            )}

            {hasScheduleContent(plan.schedule.weekend) && (
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>休息日作息</h3>
                {plan.schedule.weekend.filter(item => item.time).map(item => (
                  <div key={item.key} className={styles.scheduleItem}>
                    <span className={styles.scheduleLabel}>{item.label}</span>
                    <span className={styles.scheduleTime}>{item.time}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
