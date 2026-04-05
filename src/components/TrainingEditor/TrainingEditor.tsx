import React, { useState } from 'react';
import { DayTrainingPlan, StrengthExercise, CardioExercise, Weekday } from '../../types';
import { generateId } from '../../utils/id';
import { getWeekdayLabel } from '../../utils/date';
import styles from './TrainingEditor.module.css';

interface TrainingEditorProps {
  trainingDays: Weekday[];
  weeklyTraining: Record<number, DayTrainingPlan>;
  onChange: (weeklyTraining: Record<number, DayTrainingPlan>) => void;
}

// 工具函数：规范化数字输入
const normalizeNumber = (value: string, isInteger: boolean = true): number => {
  if (!value || value === '') return 0;
  const num = isInteger ? parseInt(value, 10) : parseFloat(value);
  return isNaN(num) ? 0 : num;
};

export default function TrainingEditor({
  trainingDays,
  weeklyTraining,
  onChange,
}: TrainingEditorProps) {
  const [currentDay, setCurrentDay] = useState<Weekday | null>(
    trainingDays.length > 0 ? trainingDays[0] : null
  );

  // 训练日变化时，更新当前选中的天
  React.useEffect(() => {
    if (trainingDays.length > 0 && (currentDay === null || !trainingDays.includes(currentDay))) {
      setCurrentDay(trainingDays[0]);
    } else if (trainingDays.length === 0) {
      setCurrentDay(null);
    }
  }, [trainingDays, currentDay]);

  if (trainingDays.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>⚠️</div>
        <div className={styles.emptyText}>请先设置训练日分配</div>
      </div>
    );
  }

  if (currentDay === null) return null;

  const getTrainingPlan = (day: Weekday): DayTrainingPlan => {
    return weeklyTraining[day] || { primary: [], secondary: [], cardio: [] };
  };

  const updateTrainingPlan = (day: Weekday, plan: DayTrainingPlan) => {
    const updated = { ...weeklyTraining };
    updated[day] = plan;
    onChange(updated);
  };

  const addStrengthExercise = (day: Weekday, type: 'primary' | 'secondary') => {
    const plan = getTrainingPlan(day);
    const newExercise: StrengthExercise = {
      id: generateId(),
      name: '',
      sets: 3,
      reps: 10,
      restSeconds: 60,
      isSuperSet: false,
    };
    updateTrainingPlan(day, {
      ...plan,
      [type]: [...plan[type], newExercise],
    });
  };

  const updateStrengthExercise = (
    day: Weekday,
    type: 'primary' | 'secondary',
    id: string,
    updates: Partial<StrengthExercise>
  ) => {
    const plan = getTrainingPlan(day);
    updateTrainingPlan(day, {
      ...plan,
      [type]: plan[type].map(ex => (ex.id === id ? { ...ex, ...updates } : ex)),
    });
  };

  const removeStrengthExercise = (day: Weekday, type: 'primary' | 'secondary', id: string) => {
    const plan = getTrainingPlan(day);
    updateTrainingPlan(day, {
      ...plan,
      [type]: plan[type].filter(ex => ex.id !== id),
    });
  };

  const addCardioExercise = (day: Weekday) => {
    const plan = getTrainingPlan(day);
    const newExercise: CardioExercise = {
      id: generateId(),
      name: '',
      durationMinutes: 30,
    };
    updateTrainingPlan(day, {
      ...plan,
      cardio: [...plan.cardio, newExercise],
    });
  };

  const updateCardioExercise = (day: Weekday, id: string, updates: Partial<CardioExercise>) => {
    const plan = getTrainingPlan(day);
    updateTrainingPlan(day, {
      ...plan,
      cardio: plan.cardio.map(ex => (ex.id === id ? { ...ex, ...updates } : ex)),
    });
  };

  const removeCardioExercise = (day: Weekday, id: string) => {
    const plan = getTrainingPlan(day);
    updateTrainingPlan(day, {
      ...plan,
      cardio: plan.cardio.filter(ex => ex.id !== id),
    });
  };

  const plan = getTrainingPlan(currentDay);

  return (
    <div className={styles.container}>
      {/* 周几选择器 */}
      <div className={styles.dayTabs}>
        {trainingDays.map(day => (
          <button
            key={day}
            className={`${styles.dayTab} ${currentDay === day ? styles.dayTabActive : ''}`}
            onClick={() => setCurrentDay(day)}
          >
            {getWeekdayLabel(day)}
          </button>
        ))}
      </div>

      {/* 当天训练计划卡片 */}
      <div className={styles.dayCard}>
        <h3 className={styles.dayTitle}>{getWeekdayLabel(currentDay)} 训练计划</h3>

        {/* 主要训练 */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>主要训练</span>
            <button
              className={styles.addButton}
              onClick={() => addStrengthExercise(currentDay, 'primary')}
            >
              + 添加动作
            </button>
          </div>
          {plan.primary.length === 0 ? (
            <div className={styles.emptyHint}>点击"添加动作"开始</div>
          ) : (
            plan.primary.map(ex => (
              <div key={ex.id} className={styles.exerciseRow}>
                <input
                  className={styles.exerciseInput}
                  type="text"
                  placeholder="动作名称"
                  value={ex.name}
                  onChange={e => updateStrengthExercise(currentDay, 'primary', ex.id, { name: e.target.value })}
                />
                <input
                  className={styles.smallInput}
                  type="number"
                  min="1"
                  placeholder="组"
                  value={ex.sets === 0 ? '' : ex.sets}
                  onChange={e => updateStrengthExercise(currentDay, 'primary', ex.id, { 
                    sets: parseInt(e.target.value) || 0 
                  })}
                  onBlur={e => {
                    const normalized = normalizeNumber(e.target.value, true);
                    if (normalized !== ex.sets) {
                      updateStrengthExercise(currentDay, 'primary', ex.id, { sets: normalized });
                    }
                  }}
                />
                <input
                  className={styles.smallInput}
                  type="number"
                  min="1"
                  placeholder="次"
                  value={ex.reps === 0 ? '' : ex.reps}
                  onChange={e => updateStrengthExercise(currentDay, 'primary', ex.id, { 
                    reps: parseInt(e.target.value) || 0 
                  })}
                  onBlur={e => {
                    const normalized = normalizeNumber(e.target.value, true);
                    if (normalized !== ex.reps) {
                      updateStrengthExercise(currentDay, 'primary', ex.id, { reps: normalized });
                    }
                  }}
                />
                <input
                  className={styles.smallInput}
                  type="number"
                  min="0"
                  placeholder="休息(秒)"
                  value={ex.restSeconds === 0 ? '' : ex.restSeconds}
                  onChange={e => updateStrengthExercise(currentDay, 'primary', ex.id, { 
                    restSeconds: parseInt(e.target.value) || 0 
                  })}
                  onBlur={e => {
                    const normalized = normalizeNumber(e.target.value, true);
                    if (normalized !== ex.restSeconds) {
                      updateStrengthExercise(currentDay, 'primary', ex.id, { restSeconds: normalized });
                    }
                  }}
                />
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={ex.isSuperSet}
                    onChange={e => updateStrengthExercise(currentDay, 'primary', ex.id, { isSuperSet: e.target.checked })}
                  />
                  <span>超级组</span>
                </label>
                <button
                  className={styles.removeButton}
                  onClick={() => removeStrengthExercise(currentDay, 'primary', ex.id)}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* 辅助训练 */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>辅助训练</span>
            <button
              className={styles.addButton}
              onClick={() => addStrengthExercise(currentDay, 'secondary')}
            >
              + 添加动作
            </button>
          </div>
          {plan.secondary.length === 0 ? (
            <div className={styles.emptyHint}>点击"添加动作"开始</div>
          ) : (
            plan.secondary.map(ex => (
              <div key={ex.id} className={styles.exerciseRow}>
                <input
                  className={styles.exerciseInput}
                  type="text"
                  placeholder="动作名称"
                  value={ex.name}
                  onChange={e => updateStrengthExercise(currentDay, 'secondary', ex.id, { name: e.target.value })}
                />
                <input
                  className={styles.smallInput}
                  type="number"
                  min="1"
                  placeholder="组"
                  value={ex.sets === 0 ? '' : ex.sets}
                  onChange={e => updateStrengthExercise(currentDay, 'secondary', ex.id, { 
                    sets: parseInt(e.target.value) || 0 
                  })}
                  onBlur={e => {
                    const normalized = normalizeNumber(e.target.value, true);
                    if (normalized !== ex.sets) {
                      updateStrengthExercise(currentDay, 'secondary', ex.id, { sets: normalized });
                    }
                  }}
                />
                <input
                  className={styles.smallInput}
                  type="number"
                  min="1"
                  placeholder="次"
                  value={ex.reps === 0 ? '' : ex.reps}
                  onChange={e => updateStrengthExercise(currentDay, 'secondary', ex.id, { 
                    reps: parseInt(e.target.value) || 0 
                  })}
                  onBlur={e => {
                    const normalized = normalizeNumber(e.target.value, true);
                    if (normalized !== ex.reps) {
                      updateStrengthExercise(currentDay, 'secondary', ex.id, { reps: normalized });
                    }
                  }}
                />
                <input
                  className={styles.smallInput}
                  type="number"
                  min="0"
                  placeholder="休息(秒)"
                  value={ex.restSeconds === 0 ? '' : ex.restSeconds}
                  onChange={e => updateStrengthExercise(currentDay, 'secondary', ex.id, { 
                    restSeconds: parseInt(e.target.value) || 0 
                  })}
                  onBlur={e => {
                    const normalized = normalizeNumber(e.target.value, true);
                    if (normalized !== ex.restSeconds) {
                      updateStrengthExercise(currentDay, 'secondary', ex.id, { restSeconds: normalized });
                    }
                  }}
                />
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={ex.isSuperSet}
                    onChange={e => updateStrengthExercise(currentDay, 'secondary', ex.id, { isSuperSet: e.target.checked })}
                  />
                  <span>超级组</span>
                </label>
                <button
                  className={styles.removeButton}
                  onClick={() => removeStrengthExercise(currentDay, 'secondary', ex.id)}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* 有氧训练 */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>有氧训练</span>
            <button
              className={styles.addButton}
              onClick={() => addCardioExercise(currentDay)}
            >
              + 添加项目
            </button>
          </div>
          {plan.cardio.length === 0 ? (
            <div className={styles.emptyHint}>点击"添加项目"开始</div>
          ) : (
            plan.cardio.map(ex => (
              <div key={ex.id} className={styles.exerciseRow}>
                <input
                  className={styles.exerciseInput}
                  type="text"
                  placeholder="项目名称"
                  value={ex.name}
                  onChange={e => updateCardioExercise(currentDay, ex.id, { name: e.target.value })}
                />
                <input
                  className={styles.smallInput}
                  type="number"
                  min="1"
                  placeholder="时长(分钟)"
                  value={ex.durationMinutes === 0 ? '' : ex.durationMinutes}
                  onChange={e => updateCardioExercise(currentDay, ex.id, { 
                    durationMinutes: parseInt(e.target.value) || 0 
                  })}
                  onBlur={e => {
                    const normalized = normalizeNumber(e.target.value, true);
                    if (normalized !== ex.durationMinutes) {
                      updateCardioExercise(currentDay, ex.id, { durationMinutes: normalized });
                    }
                  }}
                />
                <button
                  className={styles.removeButton}
                  onClick={() => removeCardioExercise(currentDay, ex.id)}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}