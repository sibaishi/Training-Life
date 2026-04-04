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
  const diff = day === 0 ? -6 : 1 - day; // 周日算上周，调整到周一
  
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

  // 检查是否需要重新生成采购清单
  const needsRegeneration = useMemo(() => {
    if (!currentPlan) return false;

    const existing = state.groceries.find(g => g.planId === currentPlan.id);
    
    if (!existing) return true; // 没有采购记录，需要生成

    // 检查日期范围是否匹配（是否是本周的清单）
    if (existing.startDate !== weekRange.startDate || existing.endDate !== weekRange.endDate) {
      return true;
    }

    // 检查计划是否更新过（对比生成时间和计划更新时间）
    if (existing.generatedAt && currentPlan.updatedAt > existing.generatedAt) {
      return true;
    }

    return false;
  }, [currentPlan, state.groceries, weekRange]);

  // 计算本周采购需求
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

    // 加10%损耗并向上取整
    const items: CalculatedGroceryItem[] = [];
    foodMap.forEach((value, key) => {
      const foodName = key.split('_')[0];
      const withLoss = value.amount * 1.1;
      const rounded = Math.ceil(withLoss);

      // 从已有记录中获取采购量和费用（如果需要重新生成，则不保留旧数据）
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

    // 按需求量从大到小排序
    items.sort((a, b) => b.requiredAmount - a.requiredAmount);

    return items;
  }, [currentPlan, state.groceries, needsRegeneration]);

  // 如果需要重新生成，自动创建新的采购记录
  React.useEffect(() => {
    if (!currentPlan || !needsRegeneration || groceryItems.length === 0) return;

    const weekIndex = getPlanWeekIndex(currentPlan.createdAt, today);

    setState(prev => {
      // 移除旧的采购记录（同一个计划的）
      const filteredGroceries = prev.groceries.filter(g => g.planId !== currentPlan.id);

      // 创建新的采购记录
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

  // 更新采购记录
  const updateGroceryItem = (foodName: string, field: 'purchased' | 'cost', value: number) => {
    if (!currentPlan) return;

    setState(prev => {
      const existingIndex = prev.groceries.findIndex(g => g.planId === currentPlan.id);
      if (existingIndex < 0) return prev; // 没有采购记录，不应该发生

      let grocery = { ...prev.groceries[existingIndex] };
      const itemIndex = grocery.items.findIndex(i => i.foodName === foodName);
      if (itemIndex < 0) return prev; // 食材不存在

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

  // 计算统计数据
  const completedCount = groceryItems.filter(i => i.purchasedAmount >= i.requiredAmount).length;
  const totalCount = groceryItems.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const weekCost = groceryItems.reduce((sum, i) => sum + i.cost, 0);

  // 本月费用（当前月所有采购记录）
  const currentMonth = today.substring(0, 7); // "2024-01"
  const monthCost = state.groceries
    .filter(g => g.startDate.startsWith(currentMonth))
    .reduce((sum, g) => sum + g.items.reduce((s, i) => s + i.cost, 0), 0);

  if (!currentPlan) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>采购</h1>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🛒</div>
          <div className={styles.emptyText}>暂无启用的计划</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>采购</h1>
      </div>

      <div className={styles.content}>
        {/* 顶部信息 */}
        <div className={styles.infoCard}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>当前计划</span>
            <span className={styles.infoValue}>{currentPlan.name}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>本周</span>
            <span className={styles.infoValue}>
              {weekRange.startDate} ~ {weekRange.endDate}
            </span>
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

        {/* 底部摘要 */}
        {groceryItems.length > 0 && (
          <div className={styles.summary}>
            <div className={styles.summaryRow}>
              <span>本周采购完成率</span>
              <span className={styles.summaryValue}>{completionRate}%</span>
            </div>
            <div className={styles.summaryRow}>
              <span>本周费用</span>
              <span className={styles.summaryValue}>¥{weekCost.toFixed(1)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>本月费用</span>
              <span className={styles.summaryValue}>¥{monthCost.toFixed(1)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
