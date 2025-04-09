import React, { useState, useMemo, useCallback, memo } from 'react';

const Son = memo(({ number, doubleNumber, getTripleNumber, secondNumber }) => {
  return (
    <div>
      <p>son</p>
      <p>{number}</p>
      <p>{doubleNumber}</p>
      <p>{getTripleNumber()}</p>
      {secondNumber ? <p>{secondNumber}</p> : null}
    </div>
  )
// });
}, (prev, curr) => prev.secondNumber === curr.secondNumber);

const MemoAndCallbackTest = () => {
  const [num, setNum] = useState(0);
  const [number, setNumber] = useState(1);

  const doubleNumber = useMemo(() => {
    return number * 2;
  }, [number]);

  const getTripleNumber = useCallback(() => {
    return number * 3;
  }, [number]);

  const handleClick = () => {
    setNum(num => num + 1);
  }
  return (
    <div onClick={handleClick}>
      <p>MemoAndCallbackTest</p>
      <p>{num}</p>
      <Son  
        number={number} 
        doubleNumber={doubleNumber} 
        getTripleNumber={getTripleNumber} 
        {...(num === 1 ? {secondNumber: number} : {})}
      />
    </div>
  )
}

export default MemoAndCallbackTest;