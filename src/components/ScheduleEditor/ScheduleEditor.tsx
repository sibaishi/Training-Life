import React, { useState } from 'react';
import { SchedulePlan, ScheduleItem, WORKDAY_SCHEDULE_KEYS, WEEKEND_SCHEDULE_KEYS } from '../../types';
import styles from './ScheduleEditor.module.css';

interface ScheduleEditorProps {
  schedule: SchedulePlan;
  onChange: (schedule: SchedulePlan) => void;
}

type DayType = 'workday' | 'weekend';

export default function ScheduleEditor({
  schedule,
  onChange,
}: ScheduleEditorProps) {
  const [currentDayType, setCurrentDayType] = useState<DayType>('workday');

  const currentSchedule = currentDayType === 'workday' ? schedule.workday : schedule.weekend;
  const templateKeys = currentDayType === 'workday' ? WORKDAY_SCHEDULE_KEYS : WEEKEND_SCHEDULE_KEYS;

  const updateTime = (key: string, time: string) => {
    const updatedSchedule = currentSchedule.map(item =>
      item.key === key ? { ...item, time } : item
    );

    if (currentDayType === 'workday') {
      onChange({ ...schedule, workday: updatedSchedule });
    } else {
      onChange({ ...schedule, weekend: updatedSchedule });
    }
  };

  // 确保所有事项都存在
  const ensureAllItems = (): ScheduleItem[] => {
    return templateKeys.map(template => {
      const existing = currentSchedule.find(item => item.key === template.key);
      return existing || { key: template.key, label: template.label, time: '' };
    });
  };

  const items = ensureAllItems();

  return (
    <div className={styles.container}>
      {/* 日类型选择器 */}
      <div className={styles.dayTypeSelector}>
        <button
          className={`${styles.dayTypeButton} ${currentDayType === 'workday' ? styles.dayTypeButtonActive : ''}`}
          onClick={() => setCurrentDayType('workday')}
        >
          工作日作息
        </button>
        <button
          className={`${styles.dayTypeButton} ${currentDayType === 'weekend' ? styles.dayTypeButtonActive : ''}`}
          onClick={() => setCurrentDayType('weekend')}
        >
          休息日作息
        </button>
      </div>

      {/* 作息时间列表 */}
      <div className={styles.scheduleCard}>
        <div className={styles.scheduleList}>
          {items.map(item => (
            <div key={item.key} className={styles.scheduleRow}>
              <span className={styles.scheduleLabel}>{item.label}</span>
              <input
                className={styles.timeInput}
                type="time"
                value={item.time}
                onChange={e => updateTime(item.key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}