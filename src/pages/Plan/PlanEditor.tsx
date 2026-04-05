import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../contexts/AppContext';
import { generateId } from '../../utils/id';
import { getWeekdayLabel } from '../../utils/date';
import {
  Plan,
  Weekday,
  DayTrainingPlan,
  DayDietPlan,
  SchedulePlan,
  MEAL_ORDER,
  WORKDAY_SCHEDULE_KEYS,
  WEEKEND_SCHEDULE_KEYS,
} from '../../types';
import Modal from '../../components/Modal/Modal';
import FormField from '../../components/FormField/FormField';
import TrainingEditor from '../../components/TrainingEditor/TrainingEditor';
import DietEditor from '../../components/DietEditor/DietEditor';
import ScheduleEditor from '../../components/ScheduleEditor/ScheduleEditor';
import styles from './Plan.module.css';
import editorStyles from './PlanEditor.module.css';

const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

const sortWeekdays = (days: Weekday[]) => {
  return [...days].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
};

const getEmptyDiet = (): DayDietPlan => ({
  meals: Object.fromEntries(MEAL_ORDER.map(m => [m, []])) as any,
});

const getDefaultSchedule = (): SchedulePlan => ({
  workday: WORKDAY_SCHEDULE_KEYS.map(k => ({ key: k.key, label: k.label, time: '' })),
  weekend: WEEKEND_SCHEDULE_KEYS.map(k => ({ key: k.key, label: k.label, time: '' })),
});

export default function PlanEditor() {
  const navigate = useNavigate();
  const { planId } = useParams();
  const { state, setState, setIsEditing } = useAppState();

  const [showBasicInfoModal, setShowBasicInfoModal] = useState(!planId);
  const [planName, setPlanName] = useState('新建计划');
  const [totalWeeks, setTotalWeeks] = useState('');
  const [isInitialized, setIsInitialized] = useState(!!planId);

  const [targetWeight, setTargetWeight] = useState('');
  const [targetBodyFat, setTargetBodyFat] = useState('');

  const [trainingDays, setTrainingDays] = useState<Weekday[]>([]);
  const [workdays, setWorkdays] = useState<Weekday[]>([1, 2, 3, 4, 5]);

  const [weeklyTraining, setWeeklyTraining] = useState<Record<number, DayTrainingPlan>>({});

  const [trainingDayDiet, setTrainingDayDiet] = useState<DayDietPlan>(getEmptyDiet());
  const [restDayDiet, setRestDayDiet] = useState<DayDietPlan>(getEmptyDiet());

  const [schedule, setSchedule] = useState<SchedulePlan>(getDefaultSchedule());

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isNewPlan = !planId;

  useEffect(() => {
    if (planId) {
      const plan = state.plans.find(p => p.id === planId);
      if (plan) {
        setPlanName(plan.name);
        setTotalWeeks(plan.totalWeeks.toString());
        setTargetWeight(plan.targetWeight?.toString() || '');
        setTargetBodyFat(plan.targetBodyFat?.toString() || '');
        setTrainingDays(sortWeekdays(plan.trainingDays || []));
        setWorkdays(sortWeekdays(plan.workdays || [1, 2, 3, 4, 5]));
        setWeeklyTraining(plan.weeklyTraining || {});
        setTrainingDayDiet(plan.trainingDayDiet || getEmptyDiet());
        setRestDayDiet(plan.restDayDiet || getEmptyDiet());
        setSchedule(plan.schedule || getDefaultSchedule());
        setIsInitialized(true);
      }
    }
  }, [planId, state.plans]);

  useEffect(() => {
    setIsEditing(true);
    return () => {
      setIsEditing(false);
    };
  }, [setIsEditing]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleBasicInfoClose = () => {
    if (isNewPlan && !isInitialized) {
      setIsEditing(false);
      navigate('/plan?tab=all');
    } else {
      setShowBasicInfoModal(false);
    }
  };

  const handleBasicInfoSubmit = () => {
    if (!planName.trim() || !totalWeeks) {
      alert('请填写完整信息');
      return;
    }

    const weeks = parseInt(totalWeeks);
    if (weeks < 1 || weeks > 52) {
      alert('周期需要在 1-52 周之间');
      return;
    }

    setShowBasicInfoModal(false);
    setIsInitialized(true);
    setHasUnsavedChanges(true);
  };

  const toggleTrainingDay = (day: Weekday) => {
    setTrainingDays(prev => {
      const next = prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day];
      return sortWeekdays(next);
    });
    setHasUnsavedChanges(true);
  };

  const toggleWorkday = (day: Weekday) => {
    setWorkdays(prev => {
      const next = prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day];
      return sortWeekdays(next);
    });
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    if (!planName.trim() || !totalWeeks) {
      alert('请先完成基础信息设置');
      setShowBasicInfoModal(true);
      return;
    }

    const newPlanId = planId || generateId();
    const now = new Date().toISOString();

    const newPlan: Plan = {
      id: newPlanId,
      name: planName,
      totalWeeks: parseInt(totalWeeks),
      createdAt: planId
        ? (state.plans.find(p => p.id === planId)?.createdAt || now)
        : now,
      updatedAt: now,
      targetWeight: targetWeight ? parseFloat(targetWeight) : undefined,
      targetBodyFat: targetBodyFat ? parseFloat(targetBodyFat) : undefined,
      trainingDays: sortWeekdays(trainingDays),
      workdays: sortWeekdays(workdays),
      weeklyTraining,
      trainingDayDiet,
      restDayDiet,
      schedule,
    };

    setState(prev => {
      const existingIndex = prev.plans.findIndex(p => p.id === newPlan.id);
      if (existingIndex >= 0) {
        const updated = [...prev.plans];
        updated[existingIndex] = newPlan;
        return { ...prev, plans: updated };
      } else {
        return { ...prev, plans: [...prev.plans, newPlan] };
      }
    });

    setHasUnsavedChanges(false);
    alert('保存成功');

    setIsEditing(false);
    navigate(`/plan/${newPlanId}`);
  };

  const handleExit = () => {
    if (hasUnsavedChanges) {
      const confirmMessage = '有未保存的修改，是否退出？\n\n点击"确定"退出（不保存）\n点击"取消"留在编辑页';
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }
    setIsEditing(false);

    if (planId) {
      navigate(`/plan/${planId}`);
    } else {
      navigate('/plan?tab=all');
    }
  };

  return (
    <div className={editorStyles.page}>
      <div className={editorStyles.editorHeader}>
        <button className={editorStyles.backButton} onClick={handleExit}>
          ← 退出编辑
        </button>
        <button className={editorStyles.saveButton} onClick={handleSave}>
          保存计划
        </button>
      </div>

      <div className={editorStyles.editorContent}>
        <h2 className={editorStyles.sectionTitle}>基础信息</h2>
        <div className={editorStyles.card}>
          <div className={editorStyles.infoRow}>
            <span className={editorStyles.infoLabel}>计划名称</span>
            <span className={editorStyles.infoValue}>{planName}</span>
          </div>
          <div className={editorStyles.infoRow}>
            <span className={editorStyles.infoLabel}>计划周期</span>
            <span className={editorStyles.infoValue}>
              {totalWeeks ? `${totalWeeks} 周` : '未设置'}
            </span>
          </div>
          <button
            className={editorStyles.editButton}
            onClick={() => setShowBasicInfoModal(true)}
          >
            修改基础信息
          </button>
        </div>

        <h2 className={editorStyles.sectionTitle}>目标指标</h2>
        <div className={editorStyles.card}>
          <FormField label="目标体重（kg）">
            <input
              className={editorStyles.input}
              type="number"
              step="0.1"
              value={targetWeight}
              onChange={(e) => {
                setTargetWeight(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="例如：70.5"
            />
          </FormField>

          <FormField label="目标体脂率（%）">
            <input
              className={editorStyles.input}
              type="number"
              step="0.1"
              value={targetBodyFat}
              onChange={(e) => {
                setTargetBodyFat(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="例如：15.0"
            />
          </FormField>
        </div>

        <h2 className={editorStyles.sectionTitle}>训练日分配</h2>
        <div className={editorStyles.card}>
          <div className={editorStyles.helpText}>
            选择每周哪几天进行训练（可多选）
          </div>
          <div className={editorStyles.daySelector}>
            {WEEKDAYS.map(day => (
              <button
                key={day}
                className={`${editorStyles.dayButton} ${
                  trainingDays.includes(day) ? editorStyles.dayButtonActive : ''
                }`}
                onClick={() => toggleTrainingDay(day)}
              >
                {getWeekdayLabel(day)}
              </button>
            ))}
          </div>
          <div className={editorStyles.dayStatus}>
            训练日：{trainingDays.length > 0 ? trainingDays.map(d => getWeekdayLabel(d)).join('、') : '未设置'}
          </div>
          <div className={editorStyles.dayStatus}>
            放松日：{trainingDays.length < 7 ? WEEKDAYS.filter(d => !trainingDays.includes(d)).map(d => getWeekdayLabel(d)).join('、') : '无'}
          </div>
        </div>

        <h2 className={editorStyles.sectionTitle}>工作日分配</h2>
        <div className={editorStyles.card}>
          <div className={editorStyles.helpText}>
            选择每周哪几天是工作日（可多选）
          </div>
          <div className={editorStyles.daySelector}>
            {WEEKDAYS.map(day => (
              <button
                key={day}
                className={`${editorStyles.dayButton} ${
                  workdays.includes(day) ? editorStyles.dayButtonActive : ''
                }`}
                onClick={() => toggleWorkday(day)}
              >
                {getWeekdayLabel(day)}
              </button>
            ))}
          </div>
          <div className={editorStyles.dayStatus}>
            工作日：{workdays.length > 0 ? workdays.map(d => getWeekdayLabel(d)).join('、') : '未设置'}
          </div>
          <div className={editorStyles.dayStatus}>
            休息日：{workdays.length < 7 ? WEEKDAYS.filter(d => !workdays.includes(d)).map(d => getWeekdayLabel(d)).join('、') : '无'}
          </div>
        </div>

        <h2 className={editorStyles.sectionTitle}>训练计划</h2>
        <TrainingEditor
          trainingDays={trainingDays}
          weeklyTraining={weeklyTraining}
          onChange={(updated) => {
            setWeeklyTraining(updated);
            setHasUnsavedChanges(true);
          }}
        />

        <h2 className={editorStyles.sectionTitle}>饮食计划</h2>
        <DietEditor
          trainingDayDiet={trainingDayDiet}
          restDayDiet={restDayDiet}
          onChange={(training, rest) => {
            setTrainingDayDiet(training);
            setRestDayDiet(rest);
            setHasUnsavedChanges(true);
          }}
        />

        <h2 className={editorStyles.sectionTitle}>作息计划</h2>
        <ScheduleEditor
          schedule={schedule}
          onChange={(updated) => {
            setSchedule(updated);
            setHasUnsavedChanges(true);
          }}
        />
      </div>

      <Modal
        isOpen={showBasicInfoModal}
        onClose={handleBasicInfoClose}
        title="计划基础信息"
        footer={
          <>
            <button
              className={`${styles.footerButton} ${styles.cancel}`}
              onClick={handleBasicInfoClose}
            >
              取消
            </button>
            <button
              className={`${styles.footerButton} ${styles.confirm}`}
              onClick={handleBasicInfoSubmit}
            >
              确定
            </button>
          </>
        }
      >
        <FormField label="计划名称" required>
          <input
            className={styles.input}
            type="text"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            placeholder="例如：增肌计划第一期"
          />
        </FormField>

        <FormField label="计划周期" required helper="建议 8-12 周为一个周期">
          <input
            className={styles.input}
            type="number"
            min="1"
            max="52"
            value={totalWeeks}
            onChange={(e) => setTotalWeeks(e.target.value)}
            placeholder="输入周数（1-52）"
          />
        </FormField>
      </Modal>
    </div>
  );
}
