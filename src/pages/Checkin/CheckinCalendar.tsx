import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../contexts/AppContext';
import { getTodayString, formatDate, getWeekday } from '../../utils/date';
import styles from './CheckinCalendar.module.css';

export default function CheckinCalendar() {
  const navigate = useNavigate();
  const { state, getPlanForDate } = useAppState();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });

  const handlePrevMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleDateClick = (dateStr: string) => {
    navigate(`/checkin?date=${dateStr}`);
  };

  // 生成日历数据
  const generateCalendarDays = () => {
    const { year, month } = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    // 上月填充
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const date = new Date(year, month - 1, day);
      days.push({
        date: formatDate(date),
        day,
        isCurrentMonth: false,
      });
    }

    // 本月
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        date: formatDate(date),
        day,
        isCurrentMonth: true,
      });
    }

    // 下月填充
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date: formatDate(date),
        day,
        isCurrentMonth: false,
      });
    }

    return days;
  };

  // 获取日期状态（使用当天对应的计划）
  const getDateStatus = (dateStr: string) => {
    const checkin = state.checkins[dateStr];
    const weekday = getWeekday(dateStr);
    
    // ========== 关键修改：根据日期获取对应的计划 ==========
    const datePlan = getPlanForDate(dateStr);
    const isTrainingDay = datePlan?.trainingDays.includes(weekday) || false;
    
    const markers: string[] = [];
    
    if (!checkin) {
      const today = getTodayString();
      if (dateStr < today) {
        markers.push('incomplete');
      }
      return { markers, hasCheckin: false };
    }

    const trainingDone = checkin.checklistItems.some(
      item => item.id.startsWith('training-') && item.status === 'completed'
    );
    const mealDone = checkin.checklistItems.some(
      item => item.id.startsWith('meal-') && item.status === 'completed'
    );
    const waterDone = checkin.waterMl >= checkin.waterTarget;

    if (isTrainingDay && !trainingDone) {
      markers.push('training');
    }
    if (!mealDone) {
      markers.push('meal');
    }
    if (!waterDone) {
      markers.push('water');
    }

    return { markers, hasCheckin: true };
  };

  const days = generateCalendarDays();
  const today = getTodayString();
  const WEEKDAY_HEADERS = ['日', '一', '二', '三', '四', '五', '六'];
  const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/checkin')}>
          ← 返回
        </button>
        <h1 className={styles.headerTitle}>打卡日历</h1>
        <div className={styles.headerPlaceholder}></div>
      </div>

      <div className={styles.content}>
        <div className={styles.monthSelector}>
          <button className={styles.monthNavBtn} onClick={handlePrevMonth}>
            ‹
          </button>
          <span className={styles.monthLabel}>
            {currentMonth.year}年{MONTH_NAMES[currentMonth.month]}
          </span>
          <button className={styles.monthNavBtn} onClick={handleNextMonth}>
            ›
          </button>
        </div>

        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotTraining}`}></span>
            <span>训练未完成</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotMeal}`}></span>
            <span>饮食未完成</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotWater}`}></span>
            <span>饮水未达标</span>
          </div>
        </div>

        <div className={styles.calendar}>
          <div className={styles.weekHeader}>
            {WEEKDAY_HEADERS.map(day => (
              <div key={day} className={styles.weekDay}>{day}</div>
            ))}
          </div>
          <div className={styles.daysGrid}>
            {days.map((day, index) => {
              const status = getDateStatus(day.date);
              const isToday = day.date === today;
              const isPast = day.date < today;
              
              return (
                <div
                  key={index}
                  className={`
                    ${styles.dayCell}
                    ${!day.isCurrentMonth ? styles.dayCellOther : ''}
                    ${isToday ? styles.dayCellToday : ''}
                    ${isPast && status.markers.length > 0 ? styles.dayCellIncomplete : ''}
                  `}
                  onClick={() => day.isCurrentMonth && handleDateClick(day.date)}
                >
                  <span className={styles.dayNumber}>{day.day}</span>
                  {day.isCurrentMonth && status.markers.length > 0 && (
                    <div className={styles.markers}>
                      {status.markers.includes('training') && (
                        <span className={`${styles.marker} ${styles.markerTraining}`}></span>
                      )}
                      {status.markers.includes('meal') && (
                        <span className={`${styles.marker} ${styles.markerMeal}`}></span>
                      )}
                      {status.markers.includes('water') && (
                        <span className={`${styles.marker} ${styles.markerWater}`}></span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
