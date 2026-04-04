// ==================== 基础类型 ====================
/** 日期字符串格式：YYYY-MM-DD，例如 '2024-01-15' */
export type DateString = string;

/** ISO 8601 时间戳，例如 '2024-01-15T08:30:00.000Z' */
export type ISODateString = string;

export type TrainingDayType = 'training' | 'rest';
export type ScheduleDayType = 'workday' | 'weekend';
export type CompletionStatus = 'completed' | 'skipped' | 'pending';
export type MealStatus = 'completed' | 'skipped' | 'pending';
export type ThemeMode = 'light' | 'dark' | 'system';
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// ==================== 训练计划 ====================
export interface StrengthExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  restSeconds: number;
  isSuperSet: boolean;
}

export interface CardioExercise {
  id: string;
  name: string;
  durationMinutes: number;
}

export interface DayTrainingPlan {
  primary: StrengthExercise[];
  secondary: StrengthExercise[];
  cardio: CardioExercise[];
}

// ==================== 饮食计划 ====================
export type MealType = 'breakfast' | 'postWorkout' | 'lunch' | 'snack' | 'dinner' | 'beforeBed';

export const MEAL_ORDER: MealType[] = ['breakfast', 'postWorkout', 'lunch', 'snack', 'dinner', 'beforeBed'];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  postWorkout: '训练后',
  lunch: '午餐',
  snack: '加餐',
  dinner: '晚餐',
  beforeBed: '睡前',
};

export type UnitCategory = 'weight' | 'volume' | 'count';

export interface FoodItem {
  id: string;
  name: string;
  quantity: number;
  unitCategory: UnitCategory;
  displayUnit: string;
}

export interface DayDietPlan {
  meals: Record<MealType, FoodItem[]>;
}

// ==================== 作息计划 ====================
export interface ScheduleItem {
  key: string;
  label: string;
  time: string;
}

export const WORKDAY_SCHEDULE_KEYS = [
  { key: 'wakeUp', label: '起床时间' },
  { key: 'breakfast', label: '早饭时间' },
  { key: 'training', label: '训练时间' },
  { key: 'commuteAM', label: '上午通勤时间' },
  { key: 'workAM', label: '上午上班时间' },
  { key: 'lunch', label: '午休时间' },
  { key: 'workPM', label: '下午上班时间' },
  { key: 'snack', label: '加餐时间' },
  { key: 'commutePM', label: '下午通勤时间' },
  { key: 'dinner', label: '晚饭时间' },
  { key: 'sleep', label: '睡觉时间' },
] as const;

export const WEEKEND_SCHEDULE_KEYS = [
  { key: 'wakeUp', label: '起床时间' },
  { key: 'breakfast', label: '早饭时间' },
  { key: 'training', label: '训练时间' },
  { key: 'lunch', label: '午饭时间' },
  { key: 'snack', label: '加餐时间' },
  { key: 'dinner', label: '晚饭时间' },
  { key: 'sleep', label: '睡觉时间' },
] as const;

export interface SchedulePlan {
  workday: ScheduleItem[];
  weekend: ScheduleItem[];
}

// ==================== 完整计划 ====================
export interface Plan {
  id: string;
  name: string;
  totalWeeks: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  targetWeight?: number;
  targetBodyFat?: number;
  trainingDays: Weekday[];
  workdays: Weekday[];
  weeklyTraining: Record<number, DayTrainingPlan>;
  trainingDayDiet: DayDietPlan;
  restDayDiet: DayDietPlan;
  schedule: SchedulePlan;
}

// ==================== 通用记录类型 ====================
export interface SetRecord {
  reps: number;
  weight: number;
}

// ==================== 计划页执行记录 ====================
export interface PlanExerciseRecord {
  exerciseId: string;
  sets: SetRecord[];
  status: 'completed' | 'skipped' | 'pending';
}

export interface PlanCardioRecord {
  exerciseId: string;
  actualDuration: number;
  status: 'completed' | 'skipped' | 'pending';
}

export interface PlanMealRecord {
  status: 'completed' | 'skipped' | 'pending';
}

export interface DailyPlanRecord {
  date: DateString;
  training: {
    primary: Record<string, PlanExerciseRecord>;
    secondary: Record<string, PlanExerciseRecord>;
    cardio: Record<string, PlanCardioRecord>;
  };
  meals: Partial<Record<MealType, PlanMealRecord>>;
}

// ==================== 打卡记录 ====================
export interface ExerciseRecord {
  exerciseId: string;
  exerciseName: string;
  sets: SetRecord[];
  status: CompletionStatus;
}

export interface CardioRecord {
  exerciseId: string;
  exerciseName: string;
  actualDuration: number;
  status: CompletionStatus;
}

export interface DailyCheckin {
  date: DateString;
  weight?: number;
  bodyFat?: number;
  sleepHours?: number;
  waterMl: number;
  waterTarget: number;
  trainingRecords: {
    primary: ExerciseRecord[];
    secondary: ExerciseRecord[];
    cardio: CardioRecord[];
  };
  mealStatus: Partial<Record<MealType, MealStatus>>;
  checklistItems: ChecklistItemRecord[];
  isCheatDay: boolean;
}

export interface ChecklistItemRecord {
  id: string;
  name: string;
  isCustom: boolean;
  status: 'completed' | 'pending';
  time?: string;
}

// ==================== 自定义打卡项 ====================
export interface CustomChecklistItem {
  id: string;
  name: string;
  activeDays: Weekday[];
  time: string;
}

// ==================== 采购记录 ====================
export interface GroceryItem {
  foodName: string;
  requiredAmount: number;
  purchasedAmount: number;
  displayUnit: string;
  unitCategory: UnitCategory;
  cost: number;
  carryOver: number;
}

export interface WeeklyGrocery {
  planId: string;
  weekIndex: number;
  startDate: DateString;
  endDate: DateString;
  items: GroceryItem[];
  generatedAt?: ISODateString;
}

// ==================== 用户设置 ====================
export interface UserProfile {
  gender?: 'male' | 'female';
  height?: number;

  /** 性别是否已锁定（锁定后除非清除缓存，否则不可修改） */
  genderLocked?: boolean;

  /** 身高是否已锁定（锁定后除非清除缓存，否则不可修改） */
  heightLocked?: boolean;

  baselineWeight?: number;
  baselineBodyFat?: number;
  baselineUpdatedAt?: ISODateString;

  /** 基线是否已手动设置过
   * - undefined/false: 用户还没有手动设置过，可以在设置页设置
   * - true: 用户已手动设置过一次，之后只能通过计划切换自动更新
   */
  baselineSetManually?: boolean;
}

export interface BaselineHistory {
  date: ISODateString;
  fromPlan: string;
  toPlan: string;
  previousWeight?: number;
  previousBodyFat?: number;
  isManualUpdate?: boolean;
}

// ==================== 全局应用状态 ====================
export interface AppState {
  currentPlanId: string | null;
  pendingPlanId: string | null;
  pendingPlanDate: DateString | null;
  lastPlanSwitchDate: DateString | null;
  plans: Plan[];
  
  /** 每日计划映射：记录每一天使用的是哪个计划 
   * key: 日期（YYYY-MM-DD）
   * value: 计划ID
   */
  dailyPlanMap: Record<string, string>;
  
  /** 打卡记录
   * key: 日期（YYYY-MM-DD）
   */
  checkins: Record<string, DailyCheckin>;
  
  /** 计划执行记录
   * key: 日期（YYYY-MM-DD）
   */
  planRecords: Record<string, DailyPlanRecord>;
  
  customChecklist: CustomChecklistItem[];
  groceries: WeeklyGrocery[];
  profile: UserProfile;
  baselineHistory: BaselineHistory[];
  theme: ThemeMode;
}

// ==================== 工具函数 ====================
/** 验证是否为有效的星期几 */
export function isValidWeekday(day: number): day is Weekday {
  return Number.isInteger(day) && day >= 0 && day <= 6;
}
