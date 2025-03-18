import React, { useState, useEffect } from 'react';
import './App.css';

const App = () => {
  const [num, setNum] = useState(0);
  const [number, setNumber] = useState(0);

  useEffect(() => {
    handleClick();
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
