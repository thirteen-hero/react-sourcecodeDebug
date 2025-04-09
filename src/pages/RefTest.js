import React, { useRef, useState, forwardRef, useImperativeHandle, useEffect, Component, createRef, useCallback } from 'react';

// ref可以用来做数据缓存也可以用来获取dom,ref对象永远指向同一个地址,可以通过ref.current=xxx来给ref重新赋值
// 函数组件的ref存储在fiber节点上,只要组件不销毁,ref一直存在
// 类组件的ref维护在实例instance上面
// 变化不会触发组件重绘
// ref可以用来标记类组件和DOM元素,但不能用来标记函数组件,因为函数组件没有实例(此处说的用ref来标记类组件和DOM元素指的就是直接在类组件和元素标签上加ref={xxx},而函数组件不能这么做)
// forwardRef可以用来做数据转发,用forwardRef包裹的组件可以直接在标签上加ref={xxx},因此解决了函数组件不能标记ref的问题。forwardRef和useImperativeHandle的配合使用,子组件可以接收父组件的ref,父组件可以获取子组件内部的方法,从而可以达到父子组件通信的效果
// forwardRef还可以辅助跨层级获取组件信息。类组件虽然可以通过ref标记子组件,但是只能标记一层,若想获取下一层组件信息,也可以通过forwardRef来进行转发。最外层用ref来标记父组件,forwardRef包裹父组件可以获取到最外层的ref对象。若直接将ref={xxx}加在子组件标签上,若子组件是类组件,最外层组件就可以获得子组件的实例。若子组件是函数组件,若想获取这个子组件内部的方法,则需要给这个子组件外面再包一个forwardRef,和useImperativeHandle配合使用。若将最外层的ref对象作为props传给子组件(无论子组件是函数组件还是类组件),在子组件内部接收这个props,通过ref={xxx}的方式加在dom元素上,那么最外层组件就可以获取那个dom元素的实例。
// forwardRef可以在高阶组件中做数据转发

// ref用来做数据缓存
// 用useRef做倒计时的原因是只要组件不销毁ref一直存在并且会随着重新赋值不断更新,不像组件内部声明的变量一样每次执行函数组件变量都重新创建,也因此能在上一次的基础上减1来做倒计时
const TimeDownHoc = (Wrapped) => {
  class Wrapper extends Component {
    constructor(props) {
      super(props);
    }

    timerRef = createRef(); // hoc维护timerRef,用来做数据缓存
    currTimeRef = createRef(); // hoc通过forWardRef将控制倒计时时间的ref转发给子组件,子组件可以自定义倒计时时间 也是用来做数据缓存的

    // 通过props的方式将触发倒计时的方法暴露给子组件
    startTimeDown = (changeState) => {
      // 触发倒计时的同时触发子组件传来的回调,用来处理子组件内部和倒计时有关的状态,触发更新
      changeState(this.currTimeRef.current.time);
      this.update((currTime) => currTime - 1);
      if (this.timerRef.current) {
        clearInterval(this.timerRef.current);
      }
      // 通过setInterval做倒计时
      this.timerRef.current = setInterval(() => {
        this.update((currTime) => {
          if (currTime < 1) {
            clearInterval(this.timerRef.current);
            this.timerRef.current = null;
            changeState(currTime);
            return null;            
          }
          changeState(currTime);
          return currTime - 1;
        })
      }, this.currTimeRef.current.interval);
    }

    // 只用来更新倒计时
    update = (cb) => {
      const { time } = this.currTimeRef.current
      this.currTimeRef.current.time = cb(time);
    }

    render () {
      return <Wrapped startTimeDown={this.startTimeDown} ref={this.currTimeRef} />
    }
  }
  return Wrapper;
}

const First = (props, ref) => {
  const { startTimeDown } = props;
  const [text, setText] = useState('First开始倒计时啦');

  const changeState = useCallback((time) => {
    setText(`倒计时: ${time}`);
  }, [])

  const handleClick = () => {
    ref.current = {
      time: 10,
      interval: 1000,
    }
    startTimeDown(changeState);
  };
  return (
    <div onClick={handleClick}>
      <p>First</p>
      <p>{text}</p>
    </div>
  )
}
const ForwardFirst = forwardRef(First);
const HocForwardFirst = TimeDownHoc(ForwardFirst);

// 子组件是类组件的组件通信
// 父组件创建ref绑定子组件,子组件是类组件,所以父组件创建的ref绑定了子组件的实例,那么在父组件中也可以调用子组件实例上的方法
class Second extends Component{
  constructor(props) {
    super(props);
    this.state = {
      num: 0
    }
  }

  add = () => {
    const { num } = this.state;
    this.setState({
      ...this.state,
      num: num + 1,
    });
  }

  render() {
    const { num } = this.state;
    return (
      <div>
        <p>Second</p>
        <input value={num} readOnly />
      </div>
    )
  }
}

// 子组件是函数组件的组件通信
// 函数组件forwardRef+useImperativeHandle实现组件通信
// 函数组件没有实例所以不能直接使用ref标记,但可以通过forwardRef转发。父组件创建一个ref对象,通过给子组件外面包裹一个forwardRef,就可以直接在这个处理后的组件标签上标记ref了。将父组件创建的ref对象转发给子组件,子组件通过useImperativeHandle将子组件内部的方法暴露给父组件,父组件就可以通过ref.current.xxx去调用子组件内部的方法了
// 重点！！！！在这个组件中,Third这个组件外面包了forwardRef且内部使用了useImperativeHandle这个effect,里面的div子节点也使用ref标记了自己,但最终,外部组件的ref.current的值是Third通过useImperativeHandle生成的对象,而不是div这个dom元素的实例。这个结果是commitLayoutEffect阶段处理fiber tree的顺序导致的,先从根节点向子节点递归,将标记了代表ref的flags的HostComponent类型的节点的实例赋值给ref.current,执行结束后向上归并,归并到Third组件时,这个节点上有UpdateEffect标记,且在初始化useImperativeHandle这个hook时pushEffect标记的effect类型为layoutEffect,所以在这里执行useImperativeHandle副作用,执行的结果赋值给ref.current,并给下一轮的destroy函数赋值,此时已将div元素的实例值给覆盖了,所以最终的ref.current为useImperativeHandle生成的值。
const Third = (props, ref) => {
  const [num, setNum] = useState(0);
  useImperativeHandle(ref, () => {
    return {
      add: () => setNum(num => num + 1)
    }
  }, []);

  return (
    <div ref={ref}>
      <p>Third</p>
      <input value={num} readOnly />
    </div>
  )
}
const ForwardThird = forwardRef(Third);

// 通过forwardRef转发的方式来跨层级获取(子组件和孙组件都是类组件)
class Fourth extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { fourthInnerRef } = this.props;
    return (
      <div>
        <p>Fourth</p>
        <FourthInner ref={fourthInnerRef} />
      </div>
    )
  }
}

const ForwardFourth = forwardRef((props, ref) => <Fourth fourthInnerRef={ref} />)

class FourthInner extends Component {
  constructor(props) {
    super(props);
    this.state = {
      num: 0,
    }
  }

  add = () => {
    const { num } = this.state;
    this.setState({
      ...this.setState,
      num: num + 1,
    });
  }

  render() {
    const { num } = this.state;
    return (
      <div>
        <p>FourthInner</p>
        <input value={num} readOnly />
      </div>
    )
  }
}

// 通过forwardRef转发的方式来跨层级获取(子组件是类组件,孙组件是函数组件)
// 若通过ref标记的方式获取孙组件内部的方法,就需要给孙组件外面再包一层forwardRef,配合useImperativeHandle使用
class Fifth extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { fifthInnerRef } = this.props;
    return (
      <div>
        <p>Fifth</p>
        <ForwardFifthInner ref={fifthInnerRef} />
      </div>
    )
  }
}
const ForwardFifth = forwardRef((props, ref) => <Fifth fifthInnerRef={ref} />)

const FifthInner = (props, ref) => {
  const [num, setNum] = useState(0);

  useImperativeHandle(ref, () => {
    return {
      add: () => setNum(num => num + 1)
    }
  }, []);

  return (
    <div>
      <p>FifthInner</p>
      <input value={num} readOnly />
    </div>
  )
}
const ForwardFifthInner = forwardRef(FifthInner);

// 高阶组件通过forwardRef转发ref本质上就是跨层级获取ref
const HOC = (Wrapped) => {
  class Wrapper extends Component {
    constructor(props) {
      super(props);
    }

    render() {
      const { wrappedRef } = this.props;
      return <Wrapped myRef={wrappedRef} />;
    }
  }
  return forwardRef((props, ref) => <Wrapper wrappedRef={ref} />)
}

class Sixth extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { myRef } = this.props
    return (
      <div>
        <p ref={myRef}>Sixth</p>
      </div>
    )
  }
}
const HocSixth = HOC(Sixth);

// ref回调
const Seventh = (props, ref) => {
  const myRef = useRef();
  useImperativeHandle(ref, () => {
    return myRef.current;
  }, []);
  return (
    <div ref={myRef}>
      <p>Seventh</p>
    </div>
  )
}
const ForwardSeventh = forwardRef(Seventh);

const RefTest = () => {
  // const secondRef = useRef();
  // const thirdRef = useRef();
  // const fourthRef = useRef();
  // const fifthRef = useRef();
  // const hocSixRef = useRef();
  const seventhRef = useRef();

  const handleCilick = () => {
    // secondRef.current.add();
    // thirdRef.current.add();
    // fourthRef.current.add();
    // fifthRef.current.add();
    // hocSixRef.current.style.color = 'red';
    seventhRef.current.style.color = 'red';
  }

  return (
    <div onClick={handleCilick}>
      {/* <HocForwardFirst /> */}
      {/* <Second ref={secondRef} /> */}
      {/* <ForwardThird ref={thirdRef} /> */}
      {/* <ForwardFourth ref={fourthRef} /> */}
      {/* <ForwardFifth ref={fifthRef} />
      <HocSixth ref={hocSixRef} /> */}
      <ForwardSeventh ref={(node) => seventhRef.current = node} />
    </div>
  )
}

export default RefTest;