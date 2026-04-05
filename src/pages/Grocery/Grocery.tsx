import React, { useState, useMemo } from 'react';
import { useAppState } from '../../contexts/AppContext';
import { getTodayString } from '../../utils/date';
import styles from './Grocery.module.css';

interface CalculatedGroceryItem {
  foodName: string;
  requiredAmount: number;
  purchasedAmount: number;
  displayUnit: string;
  cost: number;
}

/**
 * 计算当前周的起止日期（周一到周日）
 */
function getWeekRange(dateStr: string): { startDate: string; endDate: string } {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    startDate: monday.toISOString().split('T')[0],
    endDate: sunday.toISOString().split('T')[0],
  };
}

/**
 * 计算当前是计划的第几周
 */
function getPlanWeekIndex(planCreatedAt: string, currentDate: string): number {
  const created = new Date(planCreatedAt);
  const current = new Date(currentDate);
  const diffTime = current.getTime() - created.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7);
}

export default function Grocery() {
  const { state, setState } = useAppState();
  const [editingField, setEditingField] = useState<{ name: string; field: 'purchased' | 'cost' } | null>(null);
  const [inputValue, setInputValue] = useState('');

  const currentPlan = state.plans.find(p => p.id === state.currentPlanId);
  const today = getTodayString();
  const weekRange = getWeekRange(today);

  const needsRegeneration = useMemo(() => {
    if (!currentPlan) return false;

    const existing = state.groceries.find(g => g.planId === currentPlan.id);

    if (!existing) return true;

    if (existing.startDate !== weekRange.startDate || existing.endDate !== weekRange.endDate) {
      return true;
    }

    if (existing.generatedAt && currentPlan.updatedAt > existing.generatedAt) {
      return true;
    }

    return false;
  }, [currentPlan, state.groceries, weekRange]);

  const groceryItems = useMemo((): CalculatedGroceryItem[] => {
    if (!currentPlan) return [];

    const foodMap = new Map<string, { amount: number; unit: string }>();

    const addFoods = (diet: typeof currentPlan.trainingDayDiet, daysCount: number) => {
      Object.values(diet.meals).forEach(foods => {
        if (!foods) return;
        foods.forEach(food => {
          if (!food.name.trim()) return;
          const key = `${food.name}_${food.displayUnit}`;
          const existing = foodMap.get(key) || { amount: 0, unit: food.displayUnit };
          existing.amount += food.quantity * daysCount;
          foodMap.set(key, existing);
        });
      });
    };

    const trainingDaysCount = currentPlan.trainingDays.length;
    const restDaysCount = 7 - trainingDaysCount;

    addFoods(currentPlan.trainingDayDiet, trainingDaysCount);
    addFoods(currentPlan.restDayDiet, restDaysCount);

    const items: CalculatedGroceryItem[] = [];
    foodMap.forEach((value, key) => {
      const foodName = key.split('_')[0];
      const withLoss = value.amount * 1.1;
      const rounded = Math.ceil(withLoss);

      const existing = state.groceries.find(g => g.planId === currentPlan.id);
      const existingItem = existing?.items.find(i => i.foodName === foodName);

      items.push({
        foodName,
        requiredAmount: rounded,
        purchasedAmount: needsRegeneration ? 0 : (existingItem?.purchasedAmount || 0),
        displayUnit: value.unit,
        cost: needsRegeneration ? 0 : (existingItem?.cost || 0),
      });
    });

    items.sort((a, b) => b.requiredAmount - a.requiredAmount);

    return items;
  }, [currentPlan, state.groceries, needsRegeneration]);

  React.useEffect(() => {
    if (!currentPlan || !needsRegeneration || groceryItems.length === 0) return;

    const weekIndex = getPlanWeekIndex(currentPlan.createdAt, today);

    setState(prev => {
      const filteredGroceries = prev.groceries.filter(g => g.planId !== currentPlan.id);

      const newGrocery = {
        planId: currentPlan.id,
        weekIndex,
        startDate: weekRange.startDate,
        endDate: weekRange.endDate,
        generatedAt: new Date().toISOString(),
        items: groceryItems.map(item => ({
          foodName: item.foodName,
          requiredAmount: item.requiredAmount,
          purchasedAmount: 0,
          displayUnit: item.displayUnit,
          unitCategory: 'weight' as const,
          cost: 0,
          carryOver: 0,
        })),
      };

      return {
        ...prev,
        groceries: [...filteredGroceries, newGrocery],
      };
    });
  }, [currentPlan, needsRegeneration, groceryItems, weekRange, today, setState]);

  const updateGroceryItem = (foodName: string, field: 'purchased' | 'cost', value: number) => {
    if (!currentPlan) return;

    setState(prev => {
      const existingIndex = prev.groceries.findIndex(g => g.planId === currentPlan.id);
      if (existingIndex < 0) return prev;

      const grocery = { ...prev.groceries[existingIndex] };
      const itemIndex = grocery.items.findIndex(i => i.foodName === foodName);
      if (itemIndex < 0) return prev;

      const updatedItem = {
        ...grocery.items[itemIndex],
        [field === 'purchased' ? 'purchasedAmount' : 'cost']: value,
      };

      grocery.items = [...grocery.items];
      grocery.items[itemIndex] = updatedItem;

      const newGroceries = [...prev.groceries];
      newGroceries[existingIndex] = grocery;

      return { ...prev, groceries: newGroceries };
    });
  };

  const handleStartEdit = (foodName: string, field: 'purchased' | 'cost', currentValue: number) => {
    setEditingField({ name: foodName, field });
    setInputValue(currentValue > 0 ? currentValue.toString() : '');
  };

  const handleConfirmEdit = () => {
    if (!editingField) return;
    const value = parseFloat(inputValue) || 0;
    updateGroceryItem(editingField.name, editingField.field, value);
    setEditingField(null);
    setInputValue('');
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setInputValue('');
  };

  const completedCount = groceryItems.filter(i => i.purchasedAmount >= i.requiredAmount).length;
  const totalCount = groceryItems.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const weekCost = groceryItems.reduce((sum, i) => sum + i.cost, 0);

  const currentMonth = today.substring(0, 7);
  const monthCost = state.groceries
    .filter(g => g.startDate.startsWith(currentMonth))
    .reduce((sum, g) => sum + g.items.reduce((s, i) => s + i.cost, 0), 0);

  if (!currentPlan) {
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🛒</div>
            <div className={styles.emptyText}>暂无启用的计划</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {/* 顶部信息卡 */}
        <div className={styles.infoCard}>
          <div className={styles.infoCardInner}>
            <div className={styles.infoTop}>
              <span className={styles.infoTag}>本周采购</span>
              <span className={styles.infoRate}>{completionRate}%</span>
            </div>

            <div className={styles.infoMain}>
              <div className={styles.infoPlanName}>{currentPlan.name}</div>
              <div className={styles.infoDateRange}>
                {weekRange.startDate} ~ {weekRange.endDate}
              </div>
            </div>

            <div className={styles.infoStats}>
              <div className={styles.infoStat}>
                <span className={styles.infoStatValue}>{completedCount}/{totalCount}</span>
                <span className={styles.infoStatLabel}>已完成</span>
              </div>
              <div className={styles.infoStat}>
                <span className={styles.infoStatValue}>¥{weekCost.toFixed(1)}</span>
                <span className={styles.infoStatLabel}>本周费用</span>
              </div>
              <div className={styles.infoStat}>
                <span className={styles.infoStatValue}>¥{monthCost.toFixed(1)}</span>
                <span className={styles.infoStatLabel}>本月费用</span>
              </div>
            </div>
          </div>
        </div>

        {/* 采购清单 */}
        {groceryItems.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <div className={styles.emptyText}>饮食计划中暂无食材</div>
          </div>
        ) : (
          <div className={styles.itemList}>
            {groceryItems.map(item => {
              const progress = item.requiredAmount > 0
                ? Math.min((item.purchasedAmount / item.requiredAmount) * 100, 100)
                : 0;
              const isDone = item.purchasedAmount >= item.requiredAmount;
              const isEditingPurchased = editingField?.name === item.foodName && editingField?.field === 'purchased';
              const isEditingCost = editingField?.name === item.foodName && editingField?.field === 'cost';

              return (
                <div key={item.foodName} className={`${styles.itemCard} ${isDone ? styles.itemCardDone : ''}`}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemName}>{item.foodName}</span>
                    {isEditingCost ? (
                      <div className={styles.editRow}>
                        <input
                          type="number"
                          className={styles.editInput}
                          value={inputValue}
                          onChange={e => setInputValue(e.target.value)}
                          placeholder="0"
                          autoFocus
                        />
                        <span className={styles.editUnit}>元</span>
                        <button className={styles.editConfirm} onClick={handleConfirmEdit}>✓</button>
                        <button className={styles.editCancel} onClick={handleCancelEdit}>✕</button>
                      </div>
                    ) : (
                      <span
                        className={styles.itemCost}
                        onClick={() => handleStartEdit(item.foodName, 'cost', item.cost)}
                      >
                        ¥{item.cost.toFixed(1)}
                      </span>
                    )}
                  </div>

                  <div className={styles.itemProgressBar}>
                    <div
                      className={`${styles.itemProgressFill} ${isDone ? styles.itemProgressDone : ''}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className={styles.itemFooter}>
                    {isEditingPurchased ? (
                      <div className={styles.editRow}>
                        <span className={styles.editLabel}>已购：</span>
                        <input
                          type="number"
                          className={styles.editInput}
                          value={inputValue}
                          onChange={e => setInputValue(e.target.value)}
                          placeholder="0"
                          autoFocus
                        />
                        <span className={styles.editUnit}>{item.displayUnit}</span>
                        <button className={styles.editConfirm} onClick={handleConfirmEdit}>✓</button>
                        <button className={styles.editCancel} onClick={handleCancelEdit}>✕</button>
                      </div>
                    ) : (
                      <span
                        className={styles.itemPurchased}
                        onClick={() => handleStartEdit(item.foodName, 'purchased', item.purchasedAmount)}
                      >
                        已购：{item.purchasedAmount} {item.displayUnit}
                      </span>
                    )}
                    <span className={styles.itemRequired}>
                      需求：{item.requiredAmount} {item.displayUnit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
