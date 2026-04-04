import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppState } from '../../contexts/AppContext';
import styles from './Layout.module.css';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  activeIcon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: '总览', icon: '○', activeIcon: '●' },
  { path: '/plan', label: '计划', icon: '□', activeIcon: '■' },
  { path: '/checkin', label: '打卡', icon: '☐', activeIcon: '☑' },
  { path: '/grocery', label: '采购', icon: '◇', activeIcon: '◆' },
  { path: '/settings', label: '我的', icon: '△', activeIcon: '▲' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isEditing } = useAppState();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (path: string) => {
    if (isEditing) {
      alert('请先退出编辑模式');
      return;
    }
    navigate(path);
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {children}
      </div>
      
      {/* 编辑模式下隐藏导航栏 */}
      {!isEditing && (
        <nav className={styles.bottomNav}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              className={`${styles.navItem} ${isActive(item.path) ? styles.active : ''}`}
              onClick={() => handleNavClick(item.path)}
            >
              <span className={styles.navIcon}>
                {isActive(item.path) ? item.activeIcon : item.icon}
              </span>
              <span className={styles.navLabel}>{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}