import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'

console.error(`
  项目初始化:\n
  第一阶段:创建fiberRootNode和HostRootFiber并建立关联
`);
console.warn('项目入口文件,调用ReactDOM.createRoot(container, options),通过传入一个html节点,创建一个根节点');
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

