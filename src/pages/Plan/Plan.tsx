import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PlanList from './PlanList';
import PlanView from './PlanView';
import PlanEditor from './PlanEditor';
import TodayPlan from './TodayPlan';

export default function Plan() {
  return (
    <Routes>
      <Route path="/" element={<PlanList />} />
      <Route path="/today" element={<TodayPlan />} />
      <Route path="/:planId" element={<PlanView />} />
      <Route path="/:planId/edit" element={<PlanEditor />} />
      <Route path="/new" element={<PlanEditor />} />
    </Routes>
  );
}