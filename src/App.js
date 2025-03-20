import React, { useState, useEffect, useInsertionEffect, useLayoutEffect } from 'react';
import './App.css';

const App = () => {
  const [num, setNum] = useState(0);
  const [number, setNumber] = useState(0);

  useEffect(() => {
    handleClick();
    console.log('useEffect', 222);
    return () => {
      console.log('useEffect', 111);
    }
  }, []);

  useInsertionEffect(() => {
    handleClick();
    console.log('useInsertionEffect', 222);
    return () => {
      console.log('useInsertionEffect', 111);
    }
  }, []);

  useLayoutEffect(() => {
    handleClick();
    console.log('useLayoutEffect', 222);
    return () => {
      console.log('useLayoutEffect', 111);
    }
  }, []);

  const handleClick = () => {
    setNum(num => num+1);
    setNumber(number => number+1);
  }

  return (
    <>
      <div onClick = {handleClick}>
        <p>{`num: ${num}`}</p>
        <p>{`number: ${number}`}</p>
      </div>
    </>
  )
}

export default App;
