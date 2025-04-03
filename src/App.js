import React, { useState, useEffect, useInsertionEffect, useLayoutEffect } from 'react';
import './App.css';
const Inner = ({ num }) => {
  useEffect(() => {
    console.log('Inner useEffect', 'create', 1111);
    return () => {
      console.log('Inner useEffect', 'destroy', 1111);
    }
  }, [num]);

  useInsertionEffect(() => {
    console.log('Inner useInsertionEffect', 'create', 1111);
    return () => {
      console.log('Inner useInsertionEffect', 'destroy', 1111);
    }
  }, [num]);

  useLayoutEffect(() => {
    console.log('Inner useLayoutEffect', 'create', 1111);
    return () => {
      console.log('Inner useLayoutEffect', 'destroy', 1111);
    }
  }, [num]);

  console.log(num, 'num');

  return (<div>inner</div>)
}

const InApp = ({ num }) => {
  useEffect(() => {
    console.log('InApp useEffect', 'create', 1111);
    return () => {
      console.log('InApp useEffect', 'destroy', 1111);
    }
  }, [num]);

  useInsertionEffect(() => {
    console.log('InApp useInsertionEffect', 'create', 1111);
    return () => {
      console.log('InApp useInsertionEffect', 'destroy', 1111);
    }
  }, [num]);

  useLayoutEffect(() => {
    console.log('InApp useLayoutEffect', 'create', 1111);
    return () => {
      console.log('InApp useLayoutEffect', 'destroy', 1111);
    }
  }, [num]);

  return (
    <div>
      inApp
      <Inner num={num} />
    </div>
  )
}

const App = () => {
  const [num, setNum] = useState(0);
  const [number, setNumber] = useState(0);

  useEffect(() => {
    console.log('App useEffect', 'create', 1111);
    return () => {
      console.log('App useEffect', 'destroy', 1111);
    }
  }, [num]);

  useInsertionEffect(() => {
    console.log('App useInsertionEffect', 'create', 1111);
    return () => {
      console.log('App useInsertionEffect', 'destroy', 1111);
    }
  }, [num]);

  useLayoutEffect(() => {
    console.log('App useLayoutEffect', 'create', 1111);
    return () => {
      console.log('App useLayoutEffect', 'destroy', 1111);
    }
  }, [num]);

  const handleClick = () => {
    setNum(num => num+1);
    setNumber(number => number+1);
  }

  return (
    <>
      <div onClick = {handleClick}>
        <p>{`num: ${num}`}</p>
        <p>{`number: ${number}`}</p>
        {num === 0 ? <InApp num={num} /> : null}
      </div>
    </>
  )
}

export default App;
