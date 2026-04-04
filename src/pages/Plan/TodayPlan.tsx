import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../contexts/AppContext';
import { getTodayString, getWeekday, getWeekdayLabel, formatDisplayDate } from '../../utils/date';
import { Weekday, MEAL_ORDER, MEAL_LABELS } from '../../types';
import styles from './TodayPlan.module.css';

type PlanTab = 'training' | 'diet';

export default function TodayPlan() {
  const navigate = useNavigate();
  const { state } = useAppState();
  const [activeTab, setActiveTab] = useState<PlanTab>('training');

  const today = getTodayString();
  const weekday = getWeekday(today);

  const currentPlan = state.plans.find(p => p.id === state.currentPlanId);

  if (!currentPlan) {
    return (
      <div className={styles.page}>
        {/* ✨ 移除了头部标题 */}
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <div className={styles.emptyText}>还没有启用的计划</div>
          <button
            className={styles.actionButton}
            onClick={() => navigate('/plan')}
          >
            去设置计划
          </button>
        </div>
      </div>
    );
  }

  const isTrainingDay = currentPlan.trainingDays.includes(weekday);
  const isWorkday = currentPlan.workdays.includes(weekday);
  const todayTraining = currentPlan.weeklyTraining[weekday];
  const todayDiet = isTrainingDay ? currentPlan.trainingDayDiet : currentPlan.restDayDiet;
  const todaySchedule = isWorkday ? currentPlan.schedule.workday : currentPlan.schedule.weekend;

  const hasTrainingContent = todayTraining && (
    todayTraining.primary.length > 0 ||
    todayTraining.secondary.length > 0 ||
    todayTraining.cardio.length > 0
  );

  const hasDietContent = MEAL_ORDER.some(
    meal => todayDiet.meals[meal]?.length > 0
  );

  const hasScheduleContent = todaySchedule.some(item => item.time);

  return (
    <div className={styles.page}>
      {/* ✨ 移除了头部导航栏 */}

      <div className={styles.content}>
        {/* 日期信息卡 - 动态渐变 */}
        <div className={styles.dateCard}>
          <div className={styles.dateMain}>{formatDisplayDate(today)}</div>
          <div className={styles.dateSub}>
            <span className={styles.weekday}>{getWeekdayLabel(weekday)}</span>
            <span className={styles.dayTypeBadge}>
              {isTrainingDay ? '🏋️ 训练日' : '😴 放松日'}
            </span>
            <span className={styles.dayTypeBadge}>
              {isWorkday ? '💼 工作日' : '🏠 休息日'}
            </span>
          </div>
        </div>

        {/* 训练/饮食切换卡 */}
        <div className={styles.card}>
          <div className={styles.tabBar}>
            <button
              className={`${styles.tab} ${activeTab === 'training' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('training')}
            >
              训练计划
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'diet' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('diet')}
            >
              饮食计划
            </button>
          </div>

          {activeTab === 'training' && (
            <div className={styles.tabContent}>
              {!isTrainingDay ? (
                <div className={styles.restDayHint}>
                  <div className={styles.restDayIcon}>😴</div>
                  <div className={styles.restDayText}>今天是放松日，好好休息吧！</div>
                </div>
              ) : !hasTrainingContent ? (
                <div className={styles.emptyHint}>今天没有训练安排</div>
              ) : (
                <>
                  {todayTraining.primary.length > 0 && (
                    <div className={styles.trainingSection}>
                      <div className={styles.sectionTitle}>主要训练</div>
                      {todayTraining.primary.map(ex => (
                        <div key={ex.id} className={styles.exerciseItem}>
                          <div className={styles.exerciseName}>{ex.name}</div>
                          <div className={styles.exerciseDetail}>
                            {ex.sets}组 × {ex.reps}次 · 休息{ex.restSeconds}秒
                            {ex.isSuperSet && <span className={styles.superSetBadge}>超级组</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {todayTraining.secondary.length > 0 && (
                    <div className={styles.trainingSection}>
                      <div className={styles.sectionTitle}>辅助训练</div>
                      {todayTraining.secondary.map(ex => (
                        <div key={ex.id} className={styles.exerciseItem}>
                          <div className={styles.exerciseName}>{ex.name}</div>
                          <div className={styles.exerciseDetail}>
                            {ex.sets}组 × {ex.reps}次 · 休息{ex.restSeconds}秒
                            {ex.isSuperSet && <span className={styles.superSetBadge}>超级组</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {todayTraining.cardio.length > 0 && (
                    <div className={styles.trainingSection}>
                      <div className={styles.sectionTitle}>有氧训练</div>
                      {todayTraining.cardio.map(ex => (
                        <div key={ex.id} className={styles.exerciseItem}>
                          <div className={styles.exerciseName}>{ex.name}</div>
                          <div className={styles.exerciseDetail}>{ex.durationMinutes}分钟</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'diet' && (
            <div className={styles.tabContent}>
              {!hasDietContent ? (
                <div className={styles.emptyHint}>今天没有饮食安排</div>
              ) : (
                MEAL_ORDER.map(mealType => {
                  const foods = todayDiet.meals[mealType];
                  if (!foods || foods.length === 0) return null;
                  return (
                    <div key={mealType} className={styles.mealSection}>
                      <div className={styles.mealTitle}>{MEAL_LABELS[mealType]}</div>
                      {foods.map(food => (
                        <div key={food.id} className={styles.foodItem}>
                          <span className={styles.foodName}>{food.name}</span>
                          <span className={styles.foodQuantity}>
                            {food.quantity}{food.displayUnit}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* 作息计划卡 */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>作息计划</span>
            <span className={styles.cardBadge}>{isWorkday ? '工作日' : '休息日'}</span>
          </div>
          
          {!hasScheduleContent ? (
            <div className={styles.emptyHint}>今天没有作息安排</div>
          ) : (
            <div className={styles.scheduleList}>
              {todaySchedule.filter(item => item.time).map(item => (
                <div key={item.key} className={styles.scheduleItem}>
                  <span className={styles.scheduleTime}>{item.time}</span>
                  <span className={styles.scheduleLabel}>{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
