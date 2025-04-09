import React from 'react';

import { BrowserRouter, Routes, Route } from 'react-router-dom';

import EffectAndStateTest from './pages/EffectAndStateTest';
import MemoAndCallbackTest from './pages/MemoAndCallbackTest';
import RefTest from './pages/RefTest';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route key="effectAndStateTest" path="/effectAndStateTest" element={<EffectAndStateTest />} />
        <Route key="memoAndCallbackTest" path="/memoAndCallbackTest" element={<MemoAndCallbackTest />} />
        <Route key="refTest" path="/refTest" element={<RefTest />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;
