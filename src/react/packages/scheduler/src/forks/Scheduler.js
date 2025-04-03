/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* eslint-disable no-var */

import {
  enableSchedulerDebugging,
  enableProfiling,
  enableIsInputPending,
  enableIsInputPendingContinuous,
  frameYieldMs,
  continuousYieldMs,
  maxYieldMs,
} from '../SchedulerFeatureFlags';

import { push, pop, peek } from '../SchedulerMinHeap';

// TODO: Use symbols?
import {
  ImmediatePriority,
  UserBlockingPriority,
  NormalPriority,
  LowPriority,
  IdlePriority,
} from '../SchedulerPriorities';
import {
  markTaskRun,
  markTaskYield,
  markTaskCompleted,
  markTaskCanceled,
  markTaskErrored,
  markSchedulerSuspended,
  markSchedulerUnsuspended,
  markTaskStart,
  stopLoggingProfilingEvents,
  startLoggingProfilingEvents,
} from '../SchedulerProfiling';

let getCurrentTime;
const hasPerformanceNow =
  typeof performance === 'object' && typeof performance.now === 'function';

if (hasPerformanceNow) {
  const localPerformance = performance;
  getCurrentTime = () => localPerformance.now();
} else {
  const localDate = Date;
  const initialTime = localDate.now();
  getCurrentTime = () => localDate.now() - initialTime;
}

// Max 31 bit integer. The max integer size in V8 for 32-bit systems.
// Math.pow(2, 30) - 1
// 0b111111111111111111111111111111
var maxSigned31BitInt = 1073741823;

// Times out immediately
var IMMEDIATE_PRIORITY_TIMEOUT = -1;
// Eventually times out
var USER_BLOCKING_PRIORITY_TIMEOUT = 250;
var NORMAL_PRIORITY_TIMEOUT = 5000;
var LOW_PRIORITY_TIMEOUT = 10000;
// Never times out
var IDLE_PRIORITY_TIMEOUT = maxSigned31BitInt;

// Tasks are stored on a min heap
var taskQueue = [];
var timerQueue = [];

// Incrementing id counter. Used to maintain insertion order.
var taskIdCounter = 1;

// Pausing the scheduler is useful for debugging.
var isSchedulerPaused = false;

var currentTask = null;
var currentPriorityLevel = NormalPriority;

// This is set while performing work, to prevent re-entrance.
var isPerformingWork = false;

var isHostCallbackScheduled = false;
var isHostTimeoutScheduled = false;

// Capture local references to native APIs, in case a polyfill overrides them.
const localSetTimeout = typeof setTimeout === 'function' ? setTimeout : null;
const localClearTimeout =
  typeof clearTimeout === 'function' ? clearTimeout : null;
const localSetImmediate =
  typeof setImmediate !== 'undefined' ? setImmediate : null; // IE and Node.js + jsdom

const isInputPending =
  typeof navigator !== 'undefined' &&
    navigator.scheduling !== undefined &&
    navigator.scheduling.isInputPending !== undefined
    ? navigator.scheduling.isInputPending.bind(navigator.scheduling)
    : null;

const continuousOptions = { includeContinuous: enableIsInputPendingContinuous };

function advanceTimers(currentTime) {
  console.log('循环检查timerQueue中是否有满足执行条件的任务,有则push到taskQueue中去');
  // Check for tasks that are no longer delayed and add them to the queue.
  let timer = peek(timerQueue);
  while (timer !== null) {
    if (timer.callback === null) {
      // Timer was cancelled.
      pop(timerQueue);
    } else if (timer.startTime <= currentTime) {
      // Timer fired. Transfer to the task queue.
      pop(timerQueue);
      timer.sortIndex = timer.expirationTime;
      push(taskQueue, timer);
      if (enableProfiling) {
        markTaskStart(timer, currentTime);
        timer.isQueued = true;
      }
    } else {
      // Remaining timers are pending.
      return;
    }
    timer = peek(timerQueue);
  }
}

function handleTimeout(currentTime) {
  isHostTimeoutScheduled = false;
  // 检查timerqueue中是否有过期任务有就加入taskqueue
  advanceTimers(currentTime);

  if (!isHostCallbackScheduled) {
    if (peek(taskQueue) !== null) {
      isHostCallbackScheduled = true;
      requestHostCallback(flushWork);
    } else {
      const firstTimer = peek(timerQueue);
      if (firstTimer !== null) {
        requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
      }
    }
  }
}
//
function flushWork(hasTimeRemaining, initialTime) {
  if (enableProfiling) {
    markSchedulerUnsuspended(initialTime);
  }

  // We'll need a host callback the next time work is scheduled.
  isHostCallbackScheduled = false;
  if (isHostTimeoutScheduled) {
    console.log('当前存在一个异步调度,取消这个异步调度');
    // We scheduled a timeout but it's no longer needed. Cancel it.
    isHostTimeoutScheduled = false;
    cancelHostTimeout();
  }

  isPerformingWork = true;
  const previousPriorityLevel = currentPriorityLevel;
  try {
    if (enableProfiling) {
      try {
        return workLoop(hasTimeRemaining, initialTime);
      } catch (error) {
        if (currentTask !== null) {
          const currentTime = getCurrentTime();
          markTaskErrored(currentTask, currentTime);
          currentTask.isQueued = false;
        }
        throw error;
      }
    } else {
      // No catch in prod code path.
      return workLoop(hasTimeRemaining, initialTime);
    }
  } finally {
    currentTask = null;
    currentPriorityLevel = previousPriorityLevel;
    isPerformingWork = false;
    if (enableProfiling) {
      const currentTime = getCurrentTime();
      markSchedulerSuspended(currentTime);
    }
  }
}
function workLoop(hasTimeRemaining, initialTime) { // 
  console.warn('在workLoop函数中循环执行taskQueue中的任务');
  console.log(`
    在scheduler调度中通过workLoop循环taskQueue执行调度任务。
    workLoop首先会检查timerQueue中有没有要过期的任务加入到taskQueue中。
    取出task中的调度任务,判断当前任务执行的时间是否超过一帧渲染的时间和用户是否与界面有交互来判断是否应该中断当前任务。
    如果不中断就会取出taskQueue中react注册的调度任务进行执行,执行完react的任务以后会根据react任务是否返回一个回调函数来判断当前任务是否被中断。
    如果任务在执行过程中被中断就会把react任务返回的回调函数作为当前调度的新任务。没有在执行中被中断的话就会执行完成以后从task队列中删除任务
    当task队列中的任务执行完以后,会通过settimeout调度执行timer队列中的任务。
  `)
  let currentTime = initialTime;
  //检查是否有过期任务需要添加到taskQueue中执行的
  advanceTimers(currentTime);
  currentTask = peek(taskQueue);
  while (
    currentTask !== null &&
    !(enableSchedulerDebugging && isSchedulerPaused)
  ) {
    if (
      currentTask.expirationTime > currentTime &&
      (!hasTimeRemaining || shouldYieldToHost())
      //执行中会根据当前任务执行的时间是否超过一帧渲染的时间和用户是否与界面有交互来判断是否应该中断当前任务
    ) {
      // This currentTask hasn't expired, and we've reached the deadline.
      // 用过期时间和当前时间比较，没过期就跳出
      console.log('当前任务不是同步任务且当前任务有超过一帧渲染时间,中断执行', currentTask);
      console.log('当前任务如果是同步任务,就不会走时间分片逻辑,直接将全部任务执行完毕');
      break;
    }
    const callback = currentTask.callback;
    if (typeof callback === 'function') {
      console.log('当前正在执行的任务', currentTask);
      currentTask.callback = null;
      currentPriorityLevel = currentTask.priorityLevel;
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
      if (enableProfiling) {
        markTaskRun(currentTask, currentTime);
      }
      const continuationCallback = callback(didUserCallbackTimeout);// 这里就是react中performConcurrentWorkOnRoot函数的返回值
      currentTime = getCurrentTime();
      if (typeof continuationCallback === 'function') {
        // 这里表示任务没完成被中断了，则将返回的函数作为新的回调在下一次循环执行
        console.log('当前任务在上次调度中被中断了,在本次调度中继续执行', currentTask);
        currentTask.callback = continuationCallback;
        if (enableProfiling) {
          markTaskYield(currentTask, currentTime);// 标志当前任务被中断
        }
      } else {
        if (enableProfiling) {
          markTaskCompleted(currentTask, currentTime);// 标志任务完成
          console.log('当前任务执行完毕,给当前任务加执行完毕标记');
          currentTask.isQueued = false;
        }
        if (currentTask === peek(taskQueue)) {
          pop(taskQueue);
          console.log('当前任务被执行完,从taskQueue中出队');
        }
      }
      advanceTimers(currentTime);
    } else {
      console.log('当前任务在上次调度中已执行完,从taskQueue中出队');
      pop(taskQueue);//执行完的task会被删除，没执行完的不会被删除
    }
    currentTask = peek(taskQueue);
    console.log('取出taskQueue中下一个任务,继续执行', currentTask);
  }
  // Return whether there's additional work
  if (currentTask !== null) {
    // 表示taskqueue没执行完，在performWorkUntilDeadline会继续发起调度
    console.log('本次调度结束但taskQueue中的任务没执行完,发起下一次调度');
    return true;
  } else {
    // taskqueue执行完了，则会通过settimeout的方式调度执行timerqueue
    const firstTimer = peek(timerQueue);
    if (firstTimer !== null) {
      console.log('taskQueue执行完了,但timerQueue还没执行完,发起异步调度执行timerQueue');
      requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
    }
    return false;
  }
}

function unstable_runWithPriority(priorityLevel, eventHandler) {
  switch (priorityLevel) {
    case ImmediatePriority:
    case UserBlockingPriority:
    case NormalPriority:
    case LowPriority:
    case IdlePriority:
      break;
    default:
      priorityLevel = NormalPriority;
  }

  var previousPriorityLevel = currentPriorityLevel;
  currentPriorityLevel = priorityLevel;

  try {
    return eventHandler();
  } finally {
    currentPriorityLevel = previousPriorityLevel;
  }
}

function unstable_next(eventHandler) {
  var priorityLevel;
  switch (currentPriorityLevel) {
    case ImmediatePriority:
    case UserBlockingPriority:
    case NormalPriority:
      // Shift down to normal priority
      priorityLevel = NormalPriority;
      break;
    default:
      // Anything lower than normal priority should remain at the current level.
      priorityLevel = currentPriorityLevel;
      break;
  }

  var previousPriorityLevel = currentPriorityLevel;
  currentPriorityLevel = priorityLevel;

  try {
    return eventHandler();
  } finally {
    currentPriorityLevel = previousPriorityLevel;
  }
}

function unstable_wrapCallback(callback) {
  var parentPriorityLevel = currentPriorityLevel;
  return function () {
    // This is a fork of runWithPriority, inlined for performance.
    var previousPriorityLevel = currentPriorityLevel;
    currentPriorityLevel = parentPriorityLevel;

    try {
      return callback.apply(this, arguments);
    } finally {
      currentPriorityLevel = previousPriorityLevel;
    }
  };
}
function unstable_scheduleCallback(priorityLevel, callback, options) { //这个函数是和react连接的桥梁 
  console.warn('开始scheduler逻辑');
  console.log(`scheduler接收参数: 
    priorityLevel: ${priorityLevel}, 
    options: ${options}\n`,
    'callback:', callback,
  );
  console.log(`scheduler主要是用于react进行注册调度任务(更新和mounted等),他会根据你注册的任务是否是延时任务来执行不同的调度方式。如果是延时任务主要是通过setTimeout来执行调度,需要立马执行的任务会先判断是否是node或ie环境如果是就使用setImmediate,如果不是就会判断支不支持MessageChannel如果支持就使用MessageChannel,如果不支持就使用setTimeout兜底调度执行`);
  var currentTime = getCurrentTime();
  var startTime;
  if (typeof options === 'object' && options !== null) {
    var delay = options.delay;
    if (typeof delay === 'number' && delay > 0) {
      startTime = currentTime + delay;
    } else {
      startTime = currentTime;
    }
  } else {
    startTime = currentTime;
  }
  var timeout;
  switch (priorityLevel) {
    case ImmediatePriority: // 1最高优先级
      timeout = IMMEDIATE_PRIORITY_TIMEOUT;
      break;
    case UserBlockingPriority: // 2 用户行为优先级
      timeout = USER_BLOCKING_PRIORITY_TIMEOUT;
      break;
    case IdlePriority:
      timeout = IDLE_PRIORITY_TIMEOUT;
      break;
    case LowPriority:
      timeout = LOW_PRIORITY_TIMEOUT;
      break;
    case NormalPriority: // 3 普通优先级，初次渲染这些
    default:
      timeout = NORMAL_PRIORITY_TIMEOUT;
      break;
  }
  var expirationTime = startTime + timeout; // 任务过期时间，根据优先级和当前时间以及开始时间算出

  var newTask = { // 以react的perform事件创建一个新任务task
    id: taskIdCounter++,
    callback, // callback = performConcurrentWorkOnRoot
    priorityLevel,
    startTime,
    expirationTime,
    sortIndex: -1,
  };
  console.warn(`根据当前任务的options和调度优先级计算任务的过期时间,创建一个新任务newTask:`, newTask);
  console.log(`任务的调度优先级:
    NoPriority = 0 // 无优先级
    ImmediatePriority = 1 // 同步任务优先级 最高优先级 点击、keydown、input这种单个事件
    UserBlockingPriority = 2 // 连续输入优先级 滚动、拖拽等连续事件
    NormalPriority = 3 // 默认优先级
    LowPriority = 4 // 低优先级
    IdlePriority = 5 // 空闲优先级
  `);
  console.log(`调度优先级对应的timeout:
    // Times out immediately
    IMMEDIATE_PRIORITY_TIMEOUT = -1;
    Eventually times out
    USER_BLOCKING_PRIORITY_TIMEOUT = 250;
    NORMAL_PRIORITY_TIMEOUT = 5000;
    LOW_PRIORITY_TIMEOUT = 10000;
    // Never times out
    IDLE_PRIORITY_TIMEOUT = maxSigned31BitInt;
  `)
  console.log(`newTask数据结构为:
    {
      id,
      callback, // callback = performConcurrentWorkOnRoot
      priorityLevel, // 调度优先级
      startTime, // 任务开始调度时间 options是一个可选项,其中的delay属性,表示这是一个延时任务,要多少毫秒后才执行 startTime = currentTime + delay
      expirationTime, // 任务的过期时间,值越小,说明越快过期,任务越紧急,越要优先执行 (根据任务的调度优先级获取任务的timeout,表示这个任务能够被拖延多久执行 expirationTime = startTime + timeout)
      sortIndex: -1, // 排序 值越小,排序越靠前
    }
  `);
  if (enableProfiling) {// 初始为false
    newTask.isQueued = false;
  }

  console.warn('将配置了delay的延时任务放入timerQueue,可执行任务放入taskQueue,并根据优先级计算开始时间(startTime)和过期时间(expirationTime)');
  console.log('在可执行任务队列中过期时间越早的优先级越高,在延时任务中开始时间越早的优先级越高');
  if (startTime > currentTime) {
    // This is a delayed task.
    // 延时任务
    newTask.sortIndex = startTime;
    push(timerQueue, newTask);
    console.log('当前任务是一个延时任务,加入延时队列,将任务的sortIndex更新为startTime,开始时间越早的任务优先级越高');
    if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
      console.log('可执行任务全部执行完了,并且当前任务是延时任务中最早的任务');
      // 如果过期任务全部执行完了，并且当前延时任务是最早的任务就会创建一个settimeout，在创建之前会去检查是否有之前的调度，有的话就暂停
      // All tasks are delayed, and this is the task with the earliest delay.
      if (isHostTimeoutScheduled) {
        // Cancel an existing timeout.
        cancelHostTimeout();
        console.log('当前有之前的调度,取消当前存在的调度');
      } else {
        isHostTimeoutScheduled = true;
      }
      // Schedule a timeout.
      // requestHostTimeout就是一个settimeout
      console.log('创建一个新的异步调度任务');
      requestHostTimeout(handleTimeout, startTime - currentTime);
    }
  } else {
    newTask.sortIndex = expirationTime;
    push(taskQueue, newTask);
    console.log('当前任务是一个可执行任务,加入taskQueue');
    if (enableProfiling) { // 初始值为false
      //判断是否有调度任务在调度，如果有就把当前任务加入进去
      console.log('当前有正在执行的调度,给当前任务加排队等待标记');
      markTaskStart(newTask, currentTime);
      newTask.isQueued = true;
    }
    // Schedule a host callback, if needed. If we're already performing work,
    // wait until the next time we yield.
    // 如果没有就会开启调度
    if (!isHostCallbackScheduled && !isPerformingWork) { //初始这两个都是false
      console.log('当前没有正在执行的调度,开启一个新的调度');
      isHostCallbackScheduled = true;
      requestHostCallback(flushWork);
    }
  }
  return newTask;
}

function unstable_pauseExecution() {
  isSchedulerPaused = true;
}

function unstable_continueExecution() {
  isSchedulerPaused = false;
  if (!isHostCallbackScheduled && !isPerformingWork) {
    isHostCallbackScheduled = true;
    requestHostCallback(flushWork);
  }
}

function unstable_getFirstCallbackNode() {
  return peek(taskQueue);
}

function unstable_cancelCallback(task) {
  if (enableProfiling) {
    if (task.isQueued) {
      const currentTime = getCurrentTime();
      markTaskCanceled(task, currentTime);
      task.isQueued = false;
    }
  }

  // Null out the callback to indicate the task has been canceled. (Can't
  // remove from the queue because you can't remove arbitrary nodes from an
  // array based heap, only the first one.)
  task.callback = null;
}

function unstable_getCurrentPriorityLevel() {
  return currentPriorityLevel;
}

let isMessageLoopRunning = false;
let scheduledHostCallback = null;
let taskTimeoutID = -1;

// Scheduler periodically yields in case there is other work on the main
// thread, like user events. By default, it yields multiple times per frame.
// It does not attempt to align with frame boundaries, since most tasks don't
// need to be frame aligned; for those that do, use requestAnimationFrame.
let frameInterval = frameYieldMs;
const continuousInputInterval = continuousYieldMs;
const maxInterval = maxYieldMs;
let startTime = -1;

let needsPaint = false;

function shouldYieldToHost() { // 判断当前任务执行时间是否超过一帧，或者有没有用户交互事件的发生
  const timeElapsed = getCurrentTime() - startTime;
  if (timeElapsed < frameInterval) {
    // The main thread has only been blocked for a really short amount of time;
    // smaller than a single frame. Don't yield yet.
    return false;
  }

  // The main thread has been blocked for a non-negligible amount of time. We
  // may want to yield control of the main thread, so the browser can perform
  // high priority tasks. The main ones are painting and user input. If there's
  // a pending paint or a pending input, then we should yield. But if there's
  // neither, then we can yield less often while remaining responsive. We'll
  // eventually yield regardless, since there could be a pending paint that
  // wasn't accompanied by a call to `requestPaint`, or other main thread tasks
  // like network events.
  if (enableIsInputPending) {
    if (needsPaint) {
      // There's a pending paint (signaled by `requestPaint`). Yield now.
      return true;
    }
    if (timeElapsed < continuousInputInterval) {
      // We haven't blocked the thread for that long. Only yield if there's a
      // pending discrete input (e.g. click). It's OK if there's pending
      // continuous input (e.g. mouseover).
      if (isInputPending !== null) {
        return isInputPending();
      }
    } else if (timeElapsed < maxInterval) {
      // Yield if there's either a pending discrete or continuous input.
      if (isInputPending !== null) {
        return isInputPending(continuousOptions);
      }
    } else {
      // We've blocked the thread for a long time. Even if there's no pending
      // input, there may be some other scheduled work that we don't know about,
      // like a network event. Yield now.
      return true;
    }
  }

  // `isInputPending` isn't available. Yield now.
  return true;
}

function requestPaint() {
  if (
    enableIsInputPending &&
    navigator !== undefined &&
    navigator.scheduling !== undefined &&
    navigator.scheduling.isInputPending !== undefined
  ) {
    needsPaint = true;
  }

  // Since we yield every frame regardless, `requestPaint` has no effect.
}

function forceFrameRate(fps) {
  if (fps < 0 || fps > 125) {
    // Using console['error'] to evade Babel and ESLint
    console['error'](
      'forceFrameRate takes a positive int between 0 and 125, ' +
      'forcing frame rates higher than 125 fps is not supported',
    );
    return;
  }
  if (fps > 0) {
    frameInterval = Math.floor(1000 / fps);
  } else {
    // reset the framerate
    frameInterval = frameYieldMs;
  }
}

const performWorkUntilDeadline = () => { // 调度时候执行的函数
  if (scheduledHostCallback !== null) { // scheduledHostCallback为flushWork
    const currentTime = getCurrentTime();
    // Keep track of the start time so we can measure how long the main thread
    // has been blocked.
    startTime = currentTime;
    const hasTimeRemaining = true;

    // If a scheduler task throws, exit the current browser task so the
    // error can be observed.
    //
    // Intentionally not using a try-catch, since that makes some debugging
    // techniques harder. Instead, if `scheduledHostCallback` errors, then
    // `hasMoreWork` will remain true, and we'll continue the work loop.
    let hasMoreWork = true;
    try {
      // scheduledHostCallback为我们requestHostCallback传入的函数 flushwork，实则执行 workLoop
      hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime);
    } finally {
      // 表示是否还有任务需要执行，taskqueue不为空
      if (hasMoreWork) {
        // If there's more work, schedule the next message event at the end
        // of the preceding one.
        // 被中断了重新发起调度
        console.log('本次调度中taskQueue中的任务还没执行完,发起了一次新的调度继续执行');
        schedulePerformWorkUntilDeadline();
      } else {
        // hasMoreWork为false表示taskqueue执行完了
        console.log('本次调度中,taskQueue中的任务都执行完了');
        isMessageLoopRunning = false;
        scheduledHostCallback = null;
      }
    }
  } else {
    isMessageLoopRunning = false;
  }
  // Yielding to the browser will give it a chance to paint, so we can
  // reset this.
  needsPaint = false;
};

let schedulePerformWorkUntilDeadline;
// schedulePerformWorkUntilDeadline这个函数针对不同的环境实现也不同，node端主要是setImmediate，普通的web使用MessageChannel，最次就是setTimeout
if (typeof localSetImmediate === 'function') {
  // Node.js and old IE.
  // There's a few reasons for why we prefer setImmediate.
  //
  // Unlike MessageChannel, it doesn't prevent a Node.js process from exiting.
  // (Even though this is a DOM fork of the Scheduler, you could get here
  // with a mix of Node.js 15+, which has a MessageChannel, and jsdom.)
  // https://github.com/facebook/react/issues/20756
  //
  // But also, it runs earlier which is the semantic we want.
  // If other browsers ever implement it, it's better to use it.
  // Although both of these would be inferior to native scheduling.
  //这里主要是针对node和老的ie不支持messageChanel的调用setImmediate
  schedulePerformWorkUntilDeadline = () => {
    console.log('node环境,在setImmediate中,触发本次调度开启');
    localSetImmediate(performWorkUntilDeadline);
  };
} else if (typeof MessageChannel !== 'undefined') {
  // DOM and Worker environments.
  // We prefer MessageChannel because of the 4ms setTimeout clamping.
  const channel = new MessageChannel();
  const port = channel.port2;
  channel.port1.onmessage = performWorkUntilDeadline;
  schedulePerformWorkUntilDeadline = () => {
    console.log('当前浏览器支持MessageChannel,发送一个postMessage,触发本次调度开启');
    port.postMessage(null);
  };
} else {
  // 如果messageChanel都不支持就使用settimeout
  // We should only fallback here in non-browser environments.
  schedulePerformWorkUntilDeadline = () => {
    console.log('在setTimeout中,触发本次调度开启');
    localSetTimeout(performWorkUntilDeadline, 0);
  };
}

function requestHostCallback(callback) {// 过期任务请求调度
  scheduledHostCallback = callback;
  //判断是否有messageChanel在运行
  if (!isMessageLoopRunning) { //初始为false
    isMessageLoopRunning = true;
    schedulePerformWorkUntilDeadline();
  }
}

function requestHostTimeout(callback, ms) {
  taskTimeoutID = localSetTimeout(() => {
    callback(getCurrentTime());
  }, ms);
}

function cancelHostTimeout() {
  localClearTimeout(taskTimeoutID);
  taskTimeoutID = -1;
}

const unstable_requestPaint = requestPaint;

export {
  ImmediatePriority as unstable_ImmediatePriority,
  UserBlockingPriority as unstable_UserBlockingPriority,
  NormalPriority as unstable_NormalPriority,
  IdlePriority as unstable_IdlePriority,
  LowPriority as unstable_LowPriority,
  unstable_runWithPriority,
  unstable_next,
  unstable_scheduleCallback,
  unstable_cancelCallback,
  unstable_wrapCallback,
  unstable_getCurrentPriorityLevel,
  shouldYieldToHost as unstable_shouldYield,
  unstable_requestPaint,
  unstable_continueExecution,
  unstable_pauseExecution,
  unstable_getFirstCallbackNode,
  getCurrentTime as unstable_now,
  forceFrameRate as unstable_forceFrameRate,
};

export const unstable_Profiling = enableProfiling
  ? {
    startLoggingProfilingEvents,
    stopLoggingProfilingEvents,
  }
  : null;
