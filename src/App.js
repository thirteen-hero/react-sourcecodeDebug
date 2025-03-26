import React, { useState, useEffect, useInsertionEffect, useLayoutEffect } from 'react';
import './App.css';

const InApp = () => {
  useEffect(() => {
    console.log('InApp useEffect', 'create');
    return () => {
      console.log('InApp useEffect', 'destroy');
    }
  }, []);

  useInsertionEffect(() => {
    console.log('InApp useInsertionEffect', 'create');
    return () => {
      console.log('InApp useInsertionEffect', 'destroy');
    }
  }, []);

  useLayoutEffect(() => {
    console.log('InApp useLayoutEffect', 'create');
    return () => {
      console.log('InApp useLayoutEffect', 'destroy');
    }
  }, []);

  return <div>inApp</div>
}

const App = () => {
  const [num, setNum] = useState(0);
  const [number, setNumber] = useState(0);

  useEffect(() => {
    console.log('App useEffect', 'create');
    return () => {
      console.log('App useEffect', 'destroy');
    }
  }, []);

  useInsertionEffect(() => {
    console.log('App useInsertionEffect', 'create');
    return () => {
      console.log('App useInsertionEffect', 'destroy');
    }
  }, []);

  useLayoutEffect(() => {
    console.log('App useLayoutEffect', 'create');
    return () => {
      console.log('App useLayoutEffect', 'destroy');
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
        <InApp />
      </div>
    </>
  )
}

export default App;
