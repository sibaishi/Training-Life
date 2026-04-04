import React, { useState, useRef } from 'react';
import { useAppState } from '../../contexts/AppContext';
import { ThemeMode } from '../../types';
import { saveState, getDefaultState } from '../../utils/storage';
import styles from './Settings.module.css';

export default function Settings() {
  const { state, setState } = useAppState();
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCleanModal, setShowCleanModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profile = state.profile;

  // 更新个人信息
  const updateProfile = (field: string, value: any) => {
    setState(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        [field]: value,
      },
    }));
  };

  // 切换主题
  const handleThemeChange = (theme: ThemeMode) => {
    setState(prev => ({ ...prev, theme }));
  };

  // 导出数据
  const handleExport = (type: 'full' | 'plans' | 'records') => {
    let data: any;
    
    switch (type) {
      case 'full':
        data = state;
        break;
      case 'plans':
        data = { plans: state.plans, currentPlanId: state.currentPlanId };
        break;
      case 'records':
        data = { checkins: state.checkins, planRecords: state.planRecords, groceries: state.groceries };
        break;
    }

    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    const typeLabel = type === 'full' ? '完整备份' : type === 'plans' ? '计划' : '记录';
    const filename = `训练管理_${typeLabel}_${timestamp}.json`;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    setShowExportModal(false);
    alert('导出成功');
  };

  // 导入数据
  const handleImport = (type: 'full' | 'plans') => {
    const input = fileInputRef.current;
    if (!input) return;

    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          
          if (type === 'full') {
            const confirmed = window.confirm('完整导入会覆盖当前所有数据，确定继续吗？');
            if (!confirmed) return;
            setState(data);
          } else {
            const confirmed = window.confirm('导入计划会添加到现有计划中，确定继续吗？');
            if (!confirmed) return;
            if (data.plans) {
              setState(prev => ({
                ...prev,
                plans: [...prev.plans, ...data.plans],
              }));
            }
          }
          
          alert('导入成功');
        } catch {
          alert('导入失败：文件格式不正确');
        }
      };
      reader.readAsText(file);
      input.value = '';
    };

    input.click();
    setShowImportModal(false);
  };

  // 清理数据
  const handleClean = (type: 'all' | 'records' | 'checkins' | 'planRecords' | 'groceries') => {
    const messages: Record<string, string> = {
      all: '确定要清空全部数据吗？此操作不可恢复！',
      records: '确定要清空所有记录（保留计划）吗？',
      checkins: '确定要清空所有打卡记录吗？',
      planRecords: '确定要清空所有计划执行记录吗？',
      groceries: '确定要清空所有采购记录吗？',
    };

    if (!window.confirm(messages[type])) return;

    switch (type) {
      case 'all':
        setState(getDefaultState());
        break;
      case 'records':
        setState(prev => ({ ...prev, checkins: {}, planRecords: {}, groceries: [] }));
        break;
      case 'checkins':
        setState(prev => ({ ...prev, checkins: {} }));
        break;
      case 'planRecords':
        setState(prev => ({ ...prev, planRecords: {} }));
        break;
      case 'groceries':
        setState(prev => ({ ...prev, groceries: [] }));
        break;
    }

    setShowCleanModal(false);
    alert('清理完成');
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>我的</h1>
      </div>

      <div className={styles.content}>
        {/* 基础信息 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>基础信息</h2>
          <div className={styles.card}>
            <div className={styles.formRow}>
              <span className={styles.formLabel}>性别</span>
              <select
                className={styles.formSelect}
                value={profile.gender || ''}
                onChange={e => updateProfile('gender', e.target.value || undefined)}
              >
                <option value="">未设置</option>
                <option value="male">男</option>
                <option value="female">女</option>
              </select>
            </div>
            <div className={styles.formRow}>
              <span className={styles.formLabel}>身高 (cm)</span>
              <input
                type="number"
                className={styles.formInput}
                value={profile.height || ''}
                onChange={e => updateProfile('height', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="--"
              />
            </div>
            <div className={styles.formRow}>
              <span className={styles.formLabel}>体重基线 (kg)</span>
              <input
                type="number"
                step="0.1"
                className={styles.formInput}
                value={profile.baselineWeight || ''}
                onChange={e => updateProfile('baselineWeight', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="--"
              />
            </div>
            <div className={styles.formRow}>
              <span className={styles.formLabel}>体脂率基线 (%)</span>
              <input
                type="number"
                step="0.1"
                className={styles.formInput}
                value={profile.baselineBodyFat || ''}
                onChange={e => updateProfile('baselineBodyFat', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="--"
              />
            </div>
            {state.baselineHistory.length > 0 && (
              <button
                className={styles.historyBtn}
                onClick={() => setShowHistoryModal(true)}
              >
                查看基线历史
              </button>
            )}
          </div>
        </div>

        {/* 主题设置 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>主题设置</h2>
          <div className={styles.card}>
            <div className={styles.themeOptions}>
              {([
                { value: 'light', label: '☀️ 浅色' },
                { value: 'dark', label: '🌙 深色' },
                { value: 'system', label: '⚙️ 跟随系统' },
              ] as { value: ThemeMode; label: string }[]).map(option => (
                <button
                  key={option.value}
                  className={`${styles.themeBtn} ${state.theme === option.value ? styles.themeBtnActive : ''}`}
                  onClick={() => handleThemeChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 数据管理 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>数据管理</h2>
          <div className={styles.card}>
            <button className={styles.actionBtn} onClick={() => setShowExportModal(true)}>
              <span>📤 导出数据</span>
              <span className={styles.actionArrow}>›</span>
            </button>
            <button className={styles.actionBtn} onClick={() => setShowImportModal(true)}>
              <span>📥 导入数据</span>
              <span className={styles.actionArrow}>›</span>
            </button>
            <button 
              className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
              onClick={() => setShowCleanModal(true)}
            >
              <span>🗑️ 清理数据</span>
              <span className={styles.actionArrow}>›</span>
            </button>
          </div>
        </div>

        {/* 版本/关于 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>关于</h2>
          <div className={styles.card}>
            <div className={styles.aboutRow}>
              <span>版本</span>
              <span>v1.0.0</span>
            </div>
            <div className={styles.aboutRow}>
              <span>作者</span>
              <span>Sue × ChatGPT</span>
            </div>
            <div className={styles.aboutDesc}>
              这是一个为个人长期使用而设计的训练与生活管理系统，用于管理训练计划、饮食计划、作息安排、每日打卡与采购记录。系统强调清晰、稳定、可自定义，目标是让计划不仅能制定出来，也能被真正执行下去。
            </div>
          </div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} />

      {/* 导出弹窗 */}
      {showExportModal && (
        <div className={styles.modalOverlay} onClick={() => setShowExportModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>导出数据</span>
              <button className={styles.modalClose} onClick={() => setShowExportModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <button className={styles.modalOption} onClick={() => handleExport('full')}>
                <span>📦 完整备份</span>
                <span className={styles.modalOptionDesc}>包含所有计划和记录</span>
              </button>
              <button className={styles.modalOption} onClick={() => handleExport('plans')}>
                <span>📋 仅计划</span>
                <span className={styles.modalOptionDesc}>只导出计划数据</span>
              </button>
              <button className={styles.modalOption} onClick={() => handleExport('records')}>
                <span>📊 仅记录</span>
                <span className={styles.modalOptionDesc}>只导出打卡和采购记录</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导入弹窗 */}
      {showImportModal && (
        <div className={styles.modalOverlay} onClick={() => setShowImportModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>导入数据</span>
              <button className={styles.modalClose} onClick={() => setShowImportModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <button className={styles.modalOption} onClick={() => handleImport('full')}>
                <span>📦 完整导入</span>
                <span className={styles.modalOptionDesc}>覆盖当前所有数据</span>
              </button>
              <button className={styles.modalOption} onClick={() => handleImport('plans')}>
                <span>📋 只导入计划</span>
                <span className={styles.modalOptionDesc}>添加到现有计划中</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 清理弹窗 */}
      {showCleanModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCleanModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>清理数据</span>
              <button className={styles.modalClose} onClick={() => setShowCleanModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <button className={`${styles.modalOption} ${styles.modalOptionDanger}`} onClick={() => handleClean('all')}>
                <span>🗑️ 清空全部数据</span>
                <span className={styles.modalOptionDesc}>删除所有计划和记录</span>
              </button>
              <button className={styles.modalOption} onClick={() => handleClean('records')}>
                <span>📊 只清空记录</span>
                <span className={styles.modalOptionDesc}>保留计划，清空所有记录</span>
              </button>
              <button className={styles.modalOption} onClick={() => handleClean('checkins')}>
                <span>✅ 清空打卡记录</span>
                <span className={styles.modalOptionDesc}>只清空打卡数据</span>
              </button>
              <button className={styles.modalOption} onClick={() => handleClean('planRecords')}>
                <span>📋 清空计划执行记录</span>
                <span className={styles.modalOptionDesc}>只清空计划页的执行记录</span>
              </button>
              <button className={styles.modalOption} onClick={() => handleClean('groceries')}>
                <span>🛒 清空采购记录</span>
                <span className={styles.modalOptionDesc}>只清空采购数据</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 基线历史弹窗 */}
      {showHistoryModal && (
        <div className={styles.modalOverlay} onClick={() => setShowHistoryModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>基线历史</span>
              <button className={styles.modalClose} onClick={() => setShowHistoryModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              {state.baselineHistory.length === 0 ? (
                <div className={styles.emptyHint}>暂无历史记录</div>
              ) : (
                state.baselineHistory.map((h, i) => (
                  <div key={i} className={styles.historyItem}>
                    <div className={styles.historyDate}>{h.date}</div>
                    <div className={styles.historyDetail}>{h.fromPlan} → {h.toPlan}</div>
                    <div className={styles.historyValues}>
                      {h.previousWeight && <span>体重：{h.previousWeight}kg</span>}
                      {h.previousBodyFat && <span>体脂：{h.previousBodyFat}%</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}