import React from 'react';

import { BrowserRouter, Routes, Route } from 'react-router-dom';

import EffectAndStateTest from './pages/EffectAndStateTest';
import MemoAndCallback from './pages/MemoAndCallback';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route key="effectAndStateTest" path="/effectAndStateTest" element={<EffectAndStateTest />} />
        <Route key="memoAndCallback" path="/memoAndCallback" element={<MemoAndCallback />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;
