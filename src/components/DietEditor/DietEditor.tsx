import React, { useState } from 'react';
import { DayDietPlan, FoodItem, MealType, MEAL_ORDER, MEAL_LABELS } from '../../types';
import { generateId } from '../../utils/id';
import styles from './DietEditor.module.css';

interface DietEditorProps {
  trainingDayDiet: DayDietPlan;
  restDayDiet: DayDietPlan;
  onChange: (trainingDayDiet: DayDietPlan, restDayDiet: DayDietPlan) => void;
}

type DayType = 'training' | 'rest';

// 工具函数：规范化数字输入
const normalizeNumber = (value: string, isInteger: boolean = true): number => {
  if (!value || value === '') return 0;
  const num = isInteger ? parseInt(value, 10) : parseFloat(value);
  return isNaN(num) ? 0 : num;
};

export default function DietEditor({
  trainingDayDiet,
  restDayDiet,
  onChange,
}: DietEditorProps) {
  const [currentDayType, setCurrentDayType] = useState<DayType>('training');

  const currentDiet = currentDayType === 'training' ? trainingDayDiet : restDayDiet;

  const updateDiet = (updatedDiet: DayDietPlan) => {
    if (currentDayType === 'training') {
      onChange(updatedDiet, restDayDiet);
    } else {
      onChange(trainingDayDiet, updatedDiet);
    }
  };

  const addFoodItem = (mealType: MealType) => {
    const newFood: FoodItem = {
      id: generateId(),
      name: '',
      quantity: 0,
      unitCategory: 'weight',
      displayUnit: 'g',
    };
    const updatedMeals = {
      ...currentDiet.meals,
      [mealType]: [...(currentDiet.meals[mealType] || []), newFood],
    };
    updateDiet({ meals: updatedMeals });
  };

  const updateFoodItem = (mealType: MealType, foodId: string, updates: Partial<FoodItem>) => {
    const updatedMeals = {
      ...currentDiet.meals,
      [mealType]: currentDiet.meals[mealType].map(food =>
        food.id === foodId ? { ...food, ...updates } : food
      ),
    };
    updateDiet({ meals: updatedMeals });
  };

  const removeFoodItem = (mealType: MealType, foodId: string) => {
    const updatedMeals = {
      ...currentDiet.meals,
      [mealType]: currentDiet.meals[mealType].filter(food => food.id !== foodId),
    };
    updateDiet({ meals: updatedMeals });
  };

  const copyToOtherDay = () => {
    if (currentDayType === 'training') {
      const confirmed = window.confirm('将训练日饮食复制到放松日？');
      if (confirmed) {
        onChange(trainingDayDiet, JSON.parse(JSON.stringify(trainingDayDiet)));
      }
    } else {
      const confirmed = window.confirm('将放松日饮食复制到训练日？');
      if (confirmed) {
        onChange(JSON.parse(JSON.stringify(restDayDiet)), restDayDiet);
      }
    }
  };

  return (
    <div className={styles.container}>
      {/* 日类型选择器 */}
      <div className={styles.dayTypeSelector}>
        <button
          className={`${styles.dayTypeButton} ${currentDayType === 'training' ? styles.dayTypeButtonActive : ''}`}
          onClick={() => setCurrentDayType('training')}
        >
          训练日饮食
        </button>
        <button
          className={`${styles.dayTypeButton} ${currentDayType === 'rest' ? styles.dayTypeButtonActive : ''}`}
          onClick={() => setCurrentDayType('rest')}
        >
          放松日饮食
        </button>
      </div>

      {/* 复制按钮 */}
      <button className={styles.copyButton} onClick={copyToOtherDay}>
        复制到{currentDayType === 'training' ? '放松日' : '训练日'}
      </button>

      {/* 餐次列表 */}
      <div className={styles.mealList}>
        {MEAL_ORDER.map(mealType => {
          const foods = currentDiet.meals[mealType] || [];
          return (
            <div key={mealType} className={styles.mealCard}>
              <div className={styles.mealHeader}>
                <span className={styles.mealTitle}>{MEAL_LABELS[mealType]}</span>
                <button
                  className={styles.addButton}
                  onClick={() => addFoodItem(mealType)}
                >
                  + 添加食材
                </button>
              </div>

              {foods.length === 0 ? (
                <div className={styles.emptyHint}>点击"添加食材"开始</div>
              ) : (
                <div className={styles.foodList}>
                  {foods.map(food => (
                    <div key={food.id} className={styles.foodRow}>
                      <input
                        className={styles.foodNameInput}
                        type="text"
                        placeholder="食材名称"
                        value={food.name}
                        onChange={e => updateFoodItem(mealType, food.id, { name: e.target.value })}
                      />
                      <input
                        className={styles.quantityInput}
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="数量"
                        value={food.quantity === 0 ? '' : food.quantity}
                        onChange={e => updateFoodItem(mealType, food.id, { 
                          quantity: parseFloat(e.target.value) || 0 
                        })}
                        onBlur={e => {
                          const normalized = normalizeNumber(e.target.value, false);
                          if (normalized !== food.quantity) {
                            updateFoodItem(mealType, food.id, { quantity: normalized });
                          }
                        }}
                      />
                      <select
                        className={styles.unitSelect}
                        value={food.displayUnit}
                        onChange={e => {
                          const unit = e.target.value;
                          let category: 'weight' | 'volume' | 'count' = 'weight';
                          if (['ml', 'L'].includes(unit)) category = 'volume';
                          if (['个', '片', '根', '颗', '勺'].includes(unit)) category = 'count';
                          updateFoodItem(mealType, food.id, { displayUnit: unit, unitCategory: category });
                        }}
                      >
                        <option value="g">克</option>
                        <option value="kg">千克</option>
                        <option value="ml">毫升</option>
                        <option value="L">升</option>
                        <option value="个">个</option>
                        <option value="片">片</option>
                        <option value="根">根</option>
                        <option value="颗">颗</option>
                        <option value="勺">勺</option>
                      </select>
                      <button
                        className={styles.removeButton}
                        onClick={() => removeFoodItem(mealType, food.id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}