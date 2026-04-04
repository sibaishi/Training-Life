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
}

const AppContext = createContext<AppContextValue | null>(null);

// 检查并执行待生效计划切换
function checkAndSwitchPlan(state: AppState): AppState {
  const today = getTodayString();

  // 如果没有待生效计划，直接返回
  if (!state.pendingPlanId || !state.pendingPlanDate) {
    return state;
  }

  // 如果还没到生效日期，直接返回
  if (today < state.pendingPlanDate) {
    return state;
  }

  // 执行计划切换
  const currentPlan = state.plans.find(p => p.id === state.currentPlanId);
  const pendingPlan = state.plans.find(p => p.id === state.pendingPlanId);

  if (!pendingPlan) {
    // 待生效计划不存在（可能被删除了），清空待生效状态
    return {
      ...state,
      pendingPlanId: null,
      pendingPlanDate: null,
    };
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
    date: new Date().toISOString(),  // ← 改为完整时间戳
    fromPlan: currentPlan?.name || '无',
    toPlan: pendingPlan.name,
    previousWeight: state.profile.baselineWeight,
    previousBodyFat: state.profile.baselineBodyFat,
    isManualUpdate: false,  // ← 新增：标记为自动更新
  };

  // 清除旧计划的采购清单（关键！）
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

    // 更新基线数据（并标记已手动设置过）
    profile: {
      ...state.profile,
      baselineSetManually: true,  // ← 修正：改为新字段名
      baselineWeight: latestBody.weight ?? state.profile.baselineWeight,
      baselineBodyFat: latestBody.bodyFat ?? state.profile.baselineBodyFat,
      baselineUpdatedAt: hasNewBody ? new Date().toISOString() : state.profile.baselineUpdatedAt,  // ← 完整时间戳
    },

    // 添加历史记录
    baselineHistory: [newHistoryEntry, ...state.baselineHistory],

    // 清除旧计划的采购清单（新计划会在采购页重新生成）
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

  // Auto-save on state change
  useEffect(() => {
    saveState(state);
  }, [state]);

  // 每次日期变化时检查是否需要切换计划（处理用户跨天使用的情况）
  useEffect(() => {
    const checkPlanSwitch = () => {
      setState(prev => {
        const updated = checkAndSwitchPlan(prev);
        // 只有真正发生切换时才更新
        if (updated.currentPlanId !== prev.currentPlanId) {
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

  return <AppContext.Provider value={{ state, setState, save, isEditing, setIsEditing }}>{children}</AppContext.Provider>;
}

export function useAppState(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}
