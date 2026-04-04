import React, { useEffect, useRef, useState } from 'react';
import { useAppState } from '../../contexts/AppContext';
import { ThemeMode } from '../../types';
import { getDefaultState, normalizeState } from '../../utils/storage';
import styles from './Settings.module.css';

function MaleAvatar() {
  return (
    <svg viewBox="0 0 120 120" className={styles.avatarSvg} aria-hidden="true">
      <g fill="none">
        {/* 头发/上轮廓 */}
        <path
          d="M34 43c0-15 12-27 26-27 13 0 25 10 27 24-6-5-13-7-21-7-9 0-18 3-26 10z"
          fill="currentColor"
          fillOpacity="0.26"
        />
        {/* 脸 */}
        <circle cx="60" cy="46" r="18" fill="currentColor" fillOpacity="0.9" />
        {/* 身体 */}
        <path
          d="M28 97c3-15 16-26 32-26s29 11 32 26"
          fill="currentColor"
          fillOpacity="0.7"
        />
      </g>
    </svg>
  );
}

function FemaleAvatar() {
  return (
    <svg viewBox="0 0 120 120" className={styles.avatarSvg} aria-hidden="true">
      <g fill="none">
        {/* 长发外轮廓 */}
        <path
          d="M27 48c0-21 15-34 33-34s33 13 33 34c0 10-3 19-7 28H34c-4-9-7-18-7-28z"
          fill="currentColor"
          fillOpacity="0.22"
        />
        {/* 脸 */}
        <circle cx="60" cy="44" r="16.5" fill="currentColor" fillOpacity="0.92" />
        {/* 身体 */}
        <path
          d="M30 98c4-14 15-24 30-24s26 10 30 24"
          fill="currentColor"
          fillOpacity="0.68"
        />
      </g>
    </svg>
  );
}

function EmptyAvatar() {
  return (
    <svg viewBox="0 0 120 120" className={styles.avatarSvg} aria-hidden="true">
      <g fill="none">
        <circle cx="60" cy="44" r="17" fill="currentColor" fillOpacity="0.18" />
        <path
          d="M31 97c4-14 15-24 29-24s25 10 29 24"
          fill="currentColor"
          fillOpacity="0.12"
        />
      </g>
    </svg>
  );
}

export default function Settings() {
  const { state, setState } = useAppState();

  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCleanModal, setShowCleanModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const profile = state.profile;

  const genderLocked = profile.genderLocked === true;
  const heightLocked = profile.heightLocked === true;
  const baselineLocked = profile.baselineSetManually === true;

  const [heightDraft, setHeightDraft] = useState(profile.height !== undefined ? String(profile.height) : '');
  const [baselineWeightDraft, setBaselineWeightDraft] = useState(
    profile.baselineWeight !== undefined ? String(profile.baselineWeight) : ''
  );
  const [baselineBodyFatDraft, setBaselineBodyFatDraft] = useState(
    profile.baselineBodyFat !== undefined ? String(profile.baselineBodyFat) : ''
  );

  useEffect(() => {
    setHeightDraft(profile.height !== undefined ? String(profile.height) : '');
  }, [profile.height]);

  useEffect(() => {
    setBaselineWeightDraft(profile.baselineWeight !== undefined ? String(profile.baselineWeight) : '');
    setBaselineBodyFatDraft(profile.baselineBodyFat !== undefined ? String(profile.baselineBodyFat) : '');
  }, [profile.baselineWeight, profile.baselineBodyFat]);

  const handleSetGenderOnce = (value: string) => {
    if (genderLocked) return;

    if (!value) {
      setState(prev => ({ ...prev, profile: { ...prev.profile, gender: undefined } }));
      return;
    }

    const label = value === 'male' ? '男' : '女';
    const ok = window.confirm(`确定将性别设置为「${label}」吗？\n设置后将永久锁定（除非清除缓存/清空数据）。`);
    if (!ok) return;

    setState(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        gender: value as 'male' | 'female',
        genderLocked: true,
      },
    }));
  };

  const handleHeightBlur = () => {
    if (heightLocked) return;

    const raw = heightDraft.trim();
    if (raw === '') return;

    const h = parseFloat(raw);
    if (Number.isNaN(h) || h <= 0 || h > 300) {
      alert('身高输入不合法，请检查（建议 1~300cm）。');
      return;
    }

    const ok = window.confirm(`确定将身高设置为「${h} cm」吗？\n设置后将永久锁定（除非清除缓存/清空数据）。`);
    if (!ok) return;

    setState(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        height: h,
        heightLocked: true,
      },
    }));
  };

  const handleSaveAndLockBaseline = () => {
    if (baselineLocked) return;

    const w = baselineWeightDraft.trim() === '' ? undefined : parseFloat(baselineWeightDraft);
    const bf = baselineBodyFatDraft.trim() === '' ? undefined : parseFloat(baselineBodyFatDraft);

    if (w === undefined && bf === undefined) {
      alert('请至少填写体重或体脂中的一项，然后再锁定。');
      return;
    }
    if (w !== undefined && (Number.isNaN(w) || w <= 0 || w > 500)) {
      alert('体重输入不合法，请检查。');
      return;
    }
    if (bf !== undefined && (Number.isNaN(bf) || bf < 0 || bf > 100)) {
      alert('体脂率输入不合法，请检查。');
      return;
    }

    const today = new Date().toISOString();

    setState(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        baselineWeight: w,
        baselineBodyFat: bf,
        baselineSetManually: true,
        baselineUpdatedAt: prev.profile.baselineUpdatedAt ?? today,
      },
    }));

    alert('基线已保存并锁定。之后只能在切换计划生效时自动更新。');
  };

  const handleThemeChange = (theme: ThemeMode) => {
    setState(prev => ({ ...prev, theme }));
  };

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
    const timestamp =
      now.getFullYear().toString() +
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

  const handleImport = (type: 'full' | 'plans') => {
    const input = fileInputRef.current;
    if (!input) return;

    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = event => {
        try {
          const data = JSON.parse(event.target?.result as string);

          if (type === 'full') {
            const confirmed = window.confirm('完整导入会覆盖当前所有数据，确定继续吗？');
            if (!confirmed) return;
            setState(normalizeState(data));
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
      <div className={styles.content}>
        <div className={styles.profileHero}>
          <div className={styles.avatarShell}>
            <div className={styles.avatar}>
              {profile.gender === 'male' ? (
                <MaleAvatar />
              ) : profile.gender === 'female' ? (
                <FemaleAvatar />
              ) : (
                <EmptyAvatar />
              )}
            </div>
          </div>
          <div className={styles.profileMeta}>
            <div className={styles.profileTitle}>个人资料</div>
            <div className={styles.profileSubtitle}>
              {profile.gender === 'male'
                ? '男性档案'
                : profile.gender === 'female'
                ? '女性档案'
                : '尚未设置性别'}
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>基础信息</h2>

          <div className={styles.card}>
            <div className={styles.formRow}>
              <span className={styles.formLabel}>性别</span>
              <select
                className={styles.formSelect}
                value={profile.gender || ''}
                disabled={genderLocked}
                onChange={e => handleSetGenderOnce(e.target.value)}
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
                value={heightLocked ? profile.height ?? '' : heightDraft}
                disabled={heightLocked}
                onChange={e => setHeightDraft(e.target.value)}
                onBlur={handleHeightBlur}
                placeholder="--"
              />
            </div>

            <div className={styles.formRow}>
              <span className={styles.formLabel}>体重基线 (kg)</span>
              <input
                type="number"
                step="0.1"
                className={styles.formInput}
                value={baselineLocked ? profile.baselineWeight ?? '' : baselineWeightDraft}
                disabled={baselineLocked}
                onChange={e => setBaselineWeightDraft(e.target.value)}
                placeholder="--"
              />
            </div>

            <div className={styles.formRow}>
              <span className={styles.formLabel}>体脂率基线 (%)</span>
              <input
                type="number"
                step="0.1"
                className={styles.formInput}
                value={baselineLocked ? profile.baselineBodyFat ?? '' : baselineBodyFatDraft}
                disabled={baselineLocked}
                onChange={e => setBaselineBodyFatDraft(e.target.value)}
                placeholder="--"
              />
            </div>

            {!baselineLocked ? (
              <button className={styles.historyBtn} onClick={handleSaveAndLockBaseline}>
                保存并锁定基线
              </button>
            ) : (
              <div className={styles.lockedHint}>
                基线已锁定，无法手动修改。请在「打卡」中填写最新体重/体脂；当你切换计划并生效时，系统会自动用最新打卡数据更新基线。
                {profile.baselineUpdatedAt ? `（最后更新时间：${profile.baselineUpdatedAt}）` : ''}
              </div>
            )}

            {state.baselineHistory.length > 0 && (
              <button className={styles.historyBtn} onClick={() => setShowHistoryModal(true)}>
                查看基线历史
              </button>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>主题设置</h2>

          <div className={styles.card}>
            <div className={styles.themeOptions}>
              {(
                [
                  { value: 'light', label: '☀️ 浅色' },
                  { value: 'dark', label: '🌙 深色' },
                  { value: 'system', label: '⚙️ 跟随系统' },
                ] as { value: ThemeMode; label: string }[]
              ).map(option => (
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

            <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={() => setShowCleanModal(true)}>
              <span>🧹 清理数据</span>
              <span className={styles.actionArrow}>›</span>
            </button>

            <input ref={fileInputRef} type="file" accept="application/json" style={{ display: 'none' }} />
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>关于</h2>

          <div className={styles.card}>
            <div className={styles.aboutRow}>
              <span>版本</span>
              <span>v2.0.0</span>
            </div>
            <div className={styles.aboutRow}>
              <span>作者</span>
              <span>Sue × ChatGPT × Claude</span>
            </div>
            <div className={styles.aboutDesc}>
              这是一个为个人长期使用而设计的训练与生活管理系统，用于管理训练计划、饮食计划、作息安排、每日打卡与采购记录。系统强调清晰、稳定、可自定义，目标是让计划不仅能制定出来，也能被真正执行下去。
            </div>
          </div>
        </div>

        {showExportModal && (
          <div className={styles.modalOverlay} onClick={() => setShowExportModal(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <span className={styles.modalTitle}>导出数据</span>
                <button className={styles.modalClose} onClick={() => setShowExportModal(false)}>
                  ✕
                </button>
              </div>

              <div className={styles.modalBody}>
                <button className={styles.modalOption} onClick={() => handleExport('full')}>
                  <span>完整备份</span>
                  <span className={styles.modalOptionDesc}>包含所有计划和记录</span>
                </button>

                <button className={styles.modalOption} onClick={() => handleExport('plans')}>
                  <span>仅计划</span>
                  <span className={styles.modalOptionDesc}>只导出计划数据</span>
                </button>

                <button className={styles.modalOption} onClick={() => handleExport('records')}>
                  <span>仅记录</span>
                  <span className={styles.modalOptionDesc}>只导出打卡和采购记录</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {showImportModal && (
          <div className={styles.modalOverlay} onClick={() => setShowImportModal(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <span className={styles.modalTitle}>导入数据</span>
                <button className={styles.modalClose} onClick={() => setShowImportModal(false)}>
                  ✕
                </button>
              </div>

              <div className={styles.modalBody}>
                <button className={styles.modalOption} onClick={() => handleImport('full')}>
                  <span>完整导入</span>
                  <span className={styles.modalOptionDesc}>覆盖当前所有数据</span>
                </button>

                <button className={styles.modalOption} onClick={() => handleImport('plans')}>
                  <span>只导入计划</span>
                  <span className={styles.modalOptionDesc}>添加到现有计划中</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {showCleanModal && (
          <div className={styles.modalOverlay} onClick={() => setShowCleanModal(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <span className={styles.modalTitle}>清理数据</span>
                <button className={styles.modalClose} onClick={() => setShowCleanModal(false)}>
                  ✕
                </button>
              </div>

              <div className={styles.modalBody}>
                <button className={`${styles.modalOption} ${styles.modalOptionDanger}`} onClick={() => handleClean('all')}>
                  <span>⚠️ 清空全部数据</span>
                  <span className={styles.modalOptionDesc}>删除所有计划和记录</span>
                </button>

                <button className={styles.modalOption} onClick={() => handleClean('records')}>
                  <span>只清空记录</span>
                  <span className={styles.modalOptionDesc}>保留计划，清空所有记录</span>
                </button>

                <button className={styles.modalOption} onClick={() => handleClean('checkins')}>
                  <span>✅ 清空打卡记录</span>
                  <span className={styles.modalOptionDesc}>只清空打卡数据</span>
                </button>

                <button className={styles.modalOption} onClick={() => handleClean('planRecords')}>
                  <span>清空计划执行记录</span>
                  <span className={styles.modalOptionDesc}>只清空计划页的执行记录</span>
                </button>

                <button className={styles.modalOption} onClick={() => handleClean('groceries')}>
                  <span>清空采购记录</span>
                  <span className={styles.modalOptionDesc}>只清空采购数据</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {showHistoryModal && (
          <div className={styles.modalOverlay} onClick={() => setShowHistoryModal(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <span className={styles.modalTitle}>基线历史</span>
                <button className={styles.modalClose} onClick={() => setShowHistoryModal(false)}>
                  ✕
                </button>
              </div>

              <div className={styles.modalBody}>
                {state.baselineHistory.length === 0 ? (
                  <div className={styles.emptyHint}>暂无历史记录</div>
                ) : (
                  state.baselineHistory.map((h, i) => (
                    <div key={i} className={styles.historyItem}>
                      <div className={styles.historyDate}>{h.date}</div>
                      <div className={styles.historyDetail}>
                        {h.fromPlan} → {h.toPlan}
                      </div>
                      <div className={styles.historyValues}>
                        {h.previousWeight !== undefined && <span>体重：{h.previousWeight}kg</span>}
                        {h.previousBodyFat !== undefined && <span>体脂：{h.previousBodyFat}%</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
