import React, { useInsertionEffect, useLayoutEffect, useEffect, useState} from 'react';

const GrandSon = ({ num }) => {
  useEffect(() => {
    console.log('grandSon useEffect', 'create', 'EffectAndStateTest');
    return () => {
      console.log('grandSon useEffect', 'destroy', 'EffectAndStateTest');
    }
  }, [num]);

  useInsertionEffect(() => {
    console.log('grandSon useInsertionEffect', 'create', 'EffectAndStateTest');
    return () => {
      console.log('grandSon useInsertionEffect', 'destroy', 'EffectAndStateTest');
    }
  }, [num]);

  useLayoutEffect(() => {
    console.log('grandSon useLayoutEffect', 'create', 'EffectAndStateTest');
    return () => {
      console.log('grandSon useLayoutEffect', 'destroy', 'EffectAndStateTest');
    }
  }, [num]);

  return (<div>grandSon</div>)
}

const Son = ({ num }) => {
  useEffect(() => {
    console.log('Son useEffect', 'create', 'EffectAndStateTest');
    return () => {
      console.log('Son useEffect', 'destroy', 'EffectAndStateTest');
    }
  }, [num]);

  useInsertionEffect(() => {
    console.log('Son useInsertionEffect', 'create', 'EffectAndStateTest');
    return () => {
      console.log('Son useInsertionEffect', 'destroy', 'EffectAndStateTest');
    }
  }, [num]);

  useLayoutEffect(() => {
    console.log('Son useLayoutEffect', 'create', 'EffectAndStateTest');
    return () => {
      console.log('Son useLayoutEffect', 'destroy', 'EffectAndStateTest');
    }
  }, [num]);

  return (
    <div>
      in
      <GrandSon num={num} />
    </div>
  )
}

const EffectAndStateTest = () => {
  const [num, setNum] = useState(0);
  const [number, setNumber] = useState(0);

  useEffect(() => {
    console.log('EffectAndStateTest useEffect', 'create', 'EffectAndStateTest');
    return () => {
      console.log('EffectAndStateTest useEffect', 'destroy', 'EffectAndStateTest');
    }
  }, [num]);

  useInsertionEffect(() => {
    console.log('EffectAndStateTest useInsertionEffect', 'create', 'EffectAndStateTest');
    return () => {
      console.log('EffectAndStateTest useInsertionEffect', 'destroy', 'EffectAndStateTest');
    }
  }, [num]);

  useLayoutEffect(() => {
    console.log('EffectAndStateTest useLayoutEffect', 'create', 'EffectAndStateTest');
    return () => {
      console.log('EffectAndStateTest useLayoutEffect', 'destroy', 'EffectAndStateTest');
    }
  }, [num]);

  const handleClick = () => {
    setNum(num => num+1);
    setNum(num => num+2);
    setNumber(number => number+1);
  }
  return (
    <div onClick = {handleClick}>
      <p>{`num: ${num}`}</p>
      <p>{`number: ${number}`}</p>
      {num % 2 === 0 ? <Son num={num} /> : null}
    </div>
  )
}

export default EffectAndStateTest;