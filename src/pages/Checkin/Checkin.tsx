import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import CheckinMain from './CheckinMain';
import CheckinCalendar from './CheckinCalendar';

export default function Checkin() {
  return (
    <Routes>
      <Route path="/" element={<CheckinMain />} />
      <Route path="/calendar" element={<CheckinCalendar />} />
    </Routes>
  );
}