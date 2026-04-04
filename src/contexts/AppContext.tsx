import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

import { AppState } from '../types';
import { loadState, saveState, getDefaultState } from '../utils/storage';
import { getTodayString } from '../utils/date';

interface AppContextValue {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  save: () => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  /** 获取指定日期使用的计划 */
  getPlanForDate: (date: string) => ReturnType<typeof usePlanForDate>;
}

const AppContext = createContext<AppContextValue | null>(null);

/** 根据日期获取对应的计划 */
function usePlanForDate(state: AppState, date: string) {
  // 1. 先查 dailyPlanMap 中是否有记录
  const mappedPlanId = state.dailyPlanMap[date];
  if (mappedPlanId) {
    const plan = state.plans.find(p => p.id === mappedPlanId);
    if (plan) return plan;
  }

  // 2. 如果没有记录，判断是过去还是未来
  const today = getTodayString();
  
  if (date < today) {
    // 过去的日期：向前查找最近的记录
    const dates = Object.keys(state.dailyPlanMap).sort().reverse();
    for (const d of dates) {
      if (d <= date) {
        const plan = state.plans.find(p => p.id === state.dailyPlanMap[d]);
        if (plan) return plan;
      }
    }
    // 如果还是找不到，返回当前计划（兜底）
    return state.plans.find(p => p.id === state.currentPlanId) || null;
  } else {
    // 今天或未来：检查是否有待生效计划
    if (state.pendingPlanId && state.pendingPlanDate && date >= state.pendingPlanDate) {
      const pendingPlan = state.plans.find(p => p.id === state.pendingPlanId);
      if (pendingPlan) return pendingPlan;
    }
    // 否则返回当前计划
    return state.plans.find(p => p.id === state.currentPlanId) || null;
  }
}

/** 确保今天的 dailyPlanMap 有记录 */
function ensureTodayPlanMapping(state: AppState): AppState {
  const today = getTodayString();
  
  // 如果今天已经有记录，不需要更新
  if (state.dailyPlanMap[today]) {
    return state;
  }

  // 如果没有当前计划，不更新
  if (!state.currentPlanId) {
    return state;
  }

  // 添加今天的映射
  return {
    ...state,
    dailyPlanMap: {
      ...state.dailyPlanMap,
      [today]: state.currentPlanId,
    },
  };
}

/** 检查并执行待生效计划切换 */
function checkAndSwitchPlan(state: AppState): AppState {
  const today = getTodayString();

  // 如果没有待生效计划，只确保今天有映射
  if (!state.pendingPlanId || !state.pendingPlanDate) {
    return ensureTodayPlanMapping(state);
  }

  // 如果还没到生效日期，只确保今天有映射
  if (today < state.pendingPlanDate) {
    return ensureTodayPlanMapping(state);
  }

  // 执行计划切换
  const currentPlan = state.plans.find(p => p.id === state.currentPlanId);
  const pendingPlan = state.plans.find(p => p.id === state.pendingPlanId);

  if (!pendingPlan) {
    // 待生效计划不存在（可能被删除了），清空待生效状态
    return ensureTodayPlanMapping({
      ...state,
      pendingPlanId: null,
      pendingPlanDate: null,
    });
  }

  // 获取最新的身体数据作为新基线
  const getLatestBodyData = () => {
    const dates = Object.keys(state.checkins).sort().reverse();
    for (const date of dates) {
      const checkin = state.checkins[date];
      if (checkin.weight !== undefined || checkin.bodyFat !== undefined) {
        return {
          weight: checkin.weight,
          bodyFat: checkin.bodyFat,
        };
      }
    }
    return { weight: undefined, bodyFat: undefined };
  };

  const latestBody = getLatestBodyData();
  const hasNewBody = latestBody.weight !== undefined || latestBody.bodyFat !== undefined;

  // 记录基线历史
  const newHistoryEntry = {
    date: new Date().toISOString(),
    fromPlan: currentPlan?.name || '无',
    toPlan: pendingPlan.name,
    previousWeight: state.profile.baselineWeight,
    previousBodyFat: state.profile.baselineBodyFat,
    isManualUpdate: false,
  };

  // 清除新计划的采购清单（需要重新生成）
  const filteredGroceries = state.groceries.filter(g => g.planId !== state.pendingPlanId);

  // 返回更新后的状态
  return {
    ...state,
    // 切换当前计划
    currentPlanId: state.pendingPlanId,

    // 清空待生效状态
    pendingPlanId: null,
    pendingPlanDate: null,

    // 记录切换时间
    lastPlanSwitchDate: today,

    // 更新今天的计划映射（关键！）
    dailyPlanMap: {
      ...state.dailyPlanMap,
      [today]: state.pendingPlanId,
    },

    // 更新基线数据
    profile: {
      ...state.profile,
      baselineSetManually: true,
      baselineWeight: latestBody.weight ?? state.profile.baselineWeight,
      baselineBodyFat: latestBody.bodyFat ?? state.profile.baselineBodyFat,
      baselineUpdatedAt: hasNewBody ? new Date().toISOString() : state.profile.baselineUpdatedAt,
    },

    // 添加历史记录
    baselineHistory: [newHistoryEntry, ...state.baselineHistory],

    // 清除旧计划的采购清单
    groceries: filteredGroceries,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const loaded = loadState() || getDefaultState();
    // 启动时检查是否需要切换计划
    return checkAndSwitchPlan(loaded);
  });

  const [isEditing, setIsEditing] = useState(false);

  const save = useCallback(() => {
    saveState(state);
  }, [state]);

  // 获取指定日期的计划
  const getPlanForDate = useCallback((date: string) => {
    return usePlanForDate(state, date);
  }, [state]);

  // Auto-save on state change
  useEffect(() => {
    saveState(state);
  }, [state]);

  // 每次日期变化时检查是否需要切换计划（处理用户跨天使用的情况）
  useEffect(() => {
    const checkPlanSwitch = () => {
      setState(prev => {
        const updated = checkAndSwitchPlan(prev);
        // 只有真正发生变化时才更新
        if (
          updated.currentPlanId !== prev.currentPlanId ||
          updated.dailyPlanMap !== prev.dailyPlanMap
        ) {
          return updated;
        }
        return prev;
      });
    };

    // 每分钟检查一次（处理跨午夜的情况）
    const interval = setInterval(checkPlanSwitch, 60 * 1000);

    // 页面可见性变化时也检查（用户从后台切回来）
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkPlanSwitch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <AppContext.Provider value={{ state, setState, save, isEditing, setIsEditing, getPlanForDate }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}
