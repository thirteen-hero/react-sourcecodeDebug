import { useEffect, useState, React, useLayoutEffect, useContext, createContext, useCallback, useTransition } from 'react';
// import * as React from 'react';
import './App.css';

function AppTest () {
  const [state, setState] = useState('state1')
  const [state2, setState2] = useState('state2')
  useEffect(() => {
    console.log('我是没有依赖的useEffect')
    document.getElementById('but').addEventListener('click', navClick)
    return () => console.log('我是没有依赖的useEffect的清除函数')
  }, [])
  useLayoutEffect(() => {
    console.log('我是没有依赖的useLayoutEffect')
    return () => console.log('我是没有依赖的useLayoutEffect的清除函数')
  }, [])
  useEffect(() => {
    console.log('我是每次更新都要执行的useEffect')
    return () => console.log('我是每次更新都要执行的useEffect清除')
  })
  const click = () => {
    setState('change1')
    setState2('change2')
  }
  const navClick = () => {
    setState('change1')
    setState2('change2')
  }
  const time = () => {
    setTimeout(() => {
      setState('changeTime')
      setState2('changeTime2')
    }, 200)
  }
  return (
    <div>
      <span>state1:{state}</span>
      <span>state2:{state2}</span>
      <button onClick={click}>react事件</button>
      <button id='but'>原生事件</button>
      <button onClick={time}>延迟事件</button>
      <Component />
    </div>
  )
}

function Component () {
  const [state, setstate] = useState('child state')
  const [inp, setInp] = useState('input')
  const [isPending, startTransition] = useTransition()
  const callback = useCallback(() => {
    setTimeout(() => {
      alert(state)
    }, 3000)
  }, [state])
  const spanClick = (e) => {
    console.log('span click')
  }
  const divClick = () => {
    console.log('div click')
  }
  const changeInput = (e) => {
    const val = e.target.value
    setInp(val)
    startTransition(() => {
      setstate(Math.random())
    })
  }
  return (
    <div style={{border: 'solid 1px red'}} onClick={divClick}>
      <span onClick={spanClick}>{state}</span>
      <button onClick={() => setstate(Math.random())}>change state</button>
      <button onClick={callback}>alert</button>
      <span>isPending:{`${isPending}`}</span>
      <input value={inp} onChange={changeInput} />
    </div>
  )
}

export default AppTest;
