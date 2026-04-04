import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppState } from '../../contexts/AppContext';
import styles from './Layout.module.css';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  isCenter?: boolean;
}

// SVG 图标组件
const IconHome = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const IconPlan = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="3" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
    <line x1="8" y1="8" x2="16" y2="8" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="8" y1="16" x2="12" y2="16" />
  </svg>
);

const IconCheckin = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
    <polyline points="8 12 11 15 16 9" />
  </svg>
);

const IconGrocery = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const IconProfile = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
    <path d="M20 21a8 8 0 1 0-16 0" />
  </svg>
);

// 导航顺序：计划、打卡、总览（中间）、采购、我的
const NAV_ITEMS: NavItem[] = [
  { 
    path: '/plan', 
    label: '计划', 
    icon: <IconPlan active={false} />, 
    activeIcon: <IconPlan active={true} /> 
  },
  { 
    path: '/checkin', 
    label: '打卡', 
    icon: <IconCheckin active={false} />, 
    activeIcon: <IconCheckin active={true} /> 
  },
  { 
    path: '/', 
    label: '总览', 
    icon: <IconHome active={false} />, 
    activeIcon: <IconHome active={true} />,
    isCenter: true,
  },
  { 
    path: '/grocery', 
    label: '采购', 
    icon: <IconGrocery active={false} />, 
    activeIcon: <IconGrocery active={true} /> 
  },
  { 
    path: '/settings', 
    label: '我的', 
    icon: <IconProfile active={false} />, 
    activeIcon: <IconProfile active={true} /> 
  },
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
      
      {!isEditing && (
        <nav className={styles.bottomNav}>
          <div className={styles.navInner}>
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  className={`
                    ${styles.navItem} 
                    ${active ? styles.active : ''} 
                    ${item.isCenter ? styles.centerItem : ''}
                  `}
                  onClick={() => handleNavClick(item.path)}
                >
                  <span className={styles.navIconWrap}>
                    {active ? item.activeIcon : item.icon}
                  </span>
                  <span className={styles.navLabel}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
