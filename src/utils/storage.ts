import { AppState, Plan, Weekday, WeeklyGrocery } from '../types';
import { getTodayString } from './date';

const STORAGE_KEY = 'training-life-app';

/**
 * 兼容旧数据：补齐 profile 锁定字段，并推断锁定状态
 * - 只要 gender/height 已经有值，就默认锁死（除非清缓存）
 * - baseline 只要出现过值/历史/更新日期/切换日期，就默认锁死
 */
export function normalizeState(state: AppState): AppState {
  const profile = state.profile ?? {};
  const baselineHistory = Array.isArray(state.baselineHistory) ? state.baselineHistory : [];

  const genderLocked = profile.genderLocked ?? profile.gender !== undefined;
  const heightLocked = profile.heightLocked ?? profile.height !== undefined;

  // 推断基线是否已手动设置过
  const inferredBaselineSetManually =
    profile.baselineSetManually === true ||
    profile.baselineUpdatedAt !== undefined ||
    profile.baselineWeight !== undefined ||
    profile.baselineBodyFat !== undefined ||
    baselineHistory.length > 0 ||
    state.lastPlanSwitchDate !== null;

  // 迁移采购清单数据（补齐新增字段）
  const normalizedGroceries: WeeklyGrocery[] = (state.groceries ?? []).map((g) => ({
    ...g,
    startDate: g.startDate ?? '',
    endDate: g.endDate ?? '',
    generatedAt: g.generatedAt ?? undefined,
  }));

  // 迁移计划数据（确保日期格式正确）
  const normalizedPlans: Plan[] = (state.plans ?? []).map((p) => ({
    ...p,
    createdAt: p.createdAt?.includes('T') ? p.createdAt : new Date(p.createdAt || Date.now()).toISOString(),
    updatedAt: p.updatedAt?.includes('T') ? p.updatedAt : new Date(p.updatedAt || Date.now()).toISOString(),
  }));

  // 初始化 dailyPlanMap（如果不存在）
  const dailyPlanMap = state.dailyPlanMap ?? {};

  // 如果 dailyPlanMap 为空且有当前计划，初始化今天的映射
  if (Object.keys(dailyPlanMap).length === 0 && state.currentPlanId) {
    const today = getTodayString();
    dailyPlanMap[today] = state.currentPlanId;
  }

  return {
    ...state,
    plans: normalizedPlans,
    groceries: normalizedGroceries,
    dailyPlanMap,
    baselineHistory,
    checkins: state.checkins ?? {},
    planRecords: state.planRecords ?? {},
    customChecklist: state.customChecklist ?? [],
    profile: {
      ...profile,
      genderLocked,
      heightLocked,
      baselineSetManually: profile.baselineSetManually ?? inferredBaselineSetManually,
    },
  };
}

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    return normalizeState(parsed);
  } catch (e) {
    console.error('Failed to load state:', e);
    return null;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

function createDefaultPlan(): Plan {
  const planId = 'default-plan-001';
  const now = new Date().toISOString();
  
  return {
    id: planId,
    name: '示例训练计划',
    totalWeeks: 8,
    createdAt: now,
    updatedAt: now,
    targetWeight: 70,
    targetBodyFat: 15,
    trainingDays: [1, 3, 5] as Weekday[],
    workdays: [1, 2, 3, 4, 5] as Weekday[],
    weeklyTraining: {
      1: {
        primary: [
          { id: 'ex1', name: '杠铃卧推', sets: 4, reps: 8, restSeconds: 90, isSuperSet: false },
          { id: 'ex2', name: '上斜哑铃卧推', sets: 3, reps: 10, restSeconds: 60, isSuperSet: false },
          { id: 'ex3', name: '龙门架夹胸', sets: 3, reps: 12, restSeconds: 60, isSuperSet: false },
        ],
        secondary: [
          { id: 'ex4', name: '绳索下压', sets: 3, reps: 12, restSeconds: 45, isSuperSet: false },
          { id: 'ex5', name: '仰卧臂屈伸', sets: 3, reps: 10, restSeconds: 45, isSuperSet: false },
        ],
        cardio: [{ id: 'c1', name: '跑步机', durationMinutes: 20 }],
      },
      3: {
        primary: [
          { id: 'ex6', name: '引体向上', sets: 4, reps: 8, restSeconds: 90, isSuperSet: false },
          { id: 'ex7', name: '杠铃划船', sets: 4, reps: 8, restSeconds: 90, isSuperSet: false },
          { id: 'ex8', name: '坐姿下拉', sets: 3, reps: 10, restSeconds: 60, isSuperSet: false },
        ],
        secondary: [
          { id: 'ex9', name: '哑铃弯举', sets: 3, reps: 12, restSeconds: 45, isSuperSet: false },
          { id: 'ex10', name: '锤式弯举', sets: 3, reps: 12, restSeconds: 45, isSuperSet: false },
        ],
        cardio: [],
      },
      5: {
        primary: [
          { id: 'ex11', name: '杠铃深蹲', sets: 4, reps: 8, restSeconds: 120, isSuperSet: false },
          { id: 'ex12', name: '腿举', sets: 3, reps: 10, restSeconds: 90, isSuperSet: false },
          { id: 'ex13', name: '哑铃推举', sets: 3, reps: 10, restSeconds: 60, isSuperSet: false },
        ],
        secondary: [
          { id: 'ex14', name: '侧平举', sets: 3, reps: 15, restSeconds: 45, isSuperSet: false },
          { id: 'ex15', name: '腿弯举', sets: 3, reps: 12, restSeconds: 60, isSuperSet: false },
        ],
        cardio: [{ id: 'c2', name: '椭圆机', durationMinutes: 15 }],
      },
    },
    trainingDayDiet: {
      meals: {
        breakfast: [
          { id: 'f1', name: '全麦面包', quantity: 100, unitCategory: 'weight', displayUnit: 'g' },
          { id: 'f2', name: '鸡蛋', quantity: 3, unitCategory: 'count', displayUnit: '个' },
          { id: 'f3', name: '牛奶', quantity: 250, unitCategory: 'volume', displayUnit: 'ml' },
        ],
        postWorkout: [
          { id: 'f4', name: '蛋白粉', quantity: 1, unitCategory: 'count', displayUnit: '勺' },
          { id: 'f5', name: '香蕉', quantity: 1, unitCategory: 'count', displayUnit: '根' },
        ],
        lunch: [
          { id: 'f6', name: '米饭', quantity: 200, unitCategory: 'weight', displayUnit: 'g' },
          { id: 'f7', name: '鸡胸肉', quantity: 150, unitCategory: 'weight', displayUnit: 'g' },
          { id: 'f8', name: '西兰花', quantity: 100, unitCategory: 'weight', displayUnit: 'g' },
        ],
        snack: [
          { id: 'f9', name: '坚果', quantity: 30, unitCategory: 'weight', displayUnit: 'g' },
          { id: 'f10', name: '酸奶', quantity: 200, unitCategory: 'volume', displayUnit: 'ml' },
        ],
        dinner: [
          { id: 'f11', name: '糙米', quantity: 150, unitCategory: 'weight', displayUnit: 'g' },
          { id: 'f12', name: '三文鱼', quantity: 150, unitCategory: 'weight', displayUnit: 'g' },
          { id: 'f13', name: '蔬菜沙拉', quantity: 150, unitCategory: 'weight', displayUnit: 'g' },
        ],
        beforeBed: [{ id: 'f14', name: '酪蛋白', quantity: 1, unitCategory: 'count', displayUnit: '勺' }],
      },
    },
    restDayDiet: {
      meals: {
        breakfast: [
          { id: 'rf1', name: '燕麦', quantity: 80, unitCategory: 'weight', displayUnit: 'g' },
          { id: 'rf2', name: '鸡蛋', quantity: 2, unitCategory: 'count', displayUnit: '个' },
          { id: 'rf3', name: '牛奶', quantity: 250, unitCategory: 'volume', displayUnit: 'ml' },
        ],
        postWorkout: [],
        lunch: [
          { id: 'rf4', name: '米饭', quantity: 150, unitCategory: 'weight', displayUnit: 'g' },
          { id: 'rf5', name: '牛肉', quantity: 120, unitCategory: 'weight', displayUnit: 'g' },
          { id: 'rf6', name: '蔬菜', quantity: 150, unitCategory: 'weight', displayUnit: 'g' },
        ],
        snack: [{ id: 'rf7', name: '水果', quantity: 200, unitCategory: 'weight', displayUnit: 'g' }],
        dinner: [
          { id: 'rf8', name: '杂粮饭', quantity: 120, unitCategory: 'weight', displayUnit: 'g' },
          { id: 'rf9', name: '鱼肉', quantity: 120, unitCategory: 'weight', displayUnit: 'g' },
          { id: 'rf10', name: '青菜', quantity: 150, unitCategory: 'weight', displayUnit: 'g' },
        ],
        beforeBed: [],
      },
    },
    schedule: {
      workday: [
        { key: 'wakeUp', label: '起床时间', time: '06:00' },
        { key: 'breakfast', label: '早饭时间', time: '06:30' },
        { key: 'training', label: '训练时间', time: '07:00' },
        { key: 'commuteAM', label: '上午通勤时间', time: '08:30' },
        { key: 'workAM', label: '上午上班时间', time: '09:00' },
        { key: 'lunch', label: '午休时间', time: '12:00' },
        { key: 'workPM', label: '下午上班时间', time: '13:30' },
        { key: 'snack', label: '加餐时间', time: '15:30' },
        { key: 'commutePM', label: '下午通勤时间', time: '18:00' },
        { key: 'dinner', label: '晚饭时间', time: '19:00' },
        { key: 'sleep', label: '睡觉时间', time: '22:30' },
      ],
      weekend: [
        { key: 'wakeUp', label: '起床时间', time: '08:00' },
        { key: 'breakfast', label: '早饭时间', time: '08:30' },
        { key: 'training', label: '训练时间', time: '10:00' },
        { key: 'lunch', label: '午饭时间', time: '12:30' },
        { key: 'snack', label: '加餐时间', time: '15:30' },
        { key: 'dinner', label: '晚饭时间', time: '18:30' },
        { key: 'sleep', label: '睡觉时间', time: '23:00' },
      ],
    },
  };
}

export function getDefaultState(): AppState {
  const defaultPlan = createDefaultPlan();
  const today = getTodayString();
  
  return {
    currentPlanId: defaultPlan.id,
    pendingPlanId: null,
    pendingPlanDate: null,
    lastPlanSwitchDate: null,
    plans: [defaultPlan],
    dailyPlanMap: {
      [today]: defaultPlan.id,  // 初始化今天的计划映射
    },
    checkins: {},
    planRecords: {},
    customChecklist: [],
    groceries: [],
    profile: {
      genderLocked: false,
      heightLocked: false,
      baselineSetManually: false,
    },
    baselineHistory: [],
    theme: 'system',
  };
}
