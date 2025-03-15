/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactNodeList} from 'shared/ReactTypes';
import type {
  FiberRoot,
  SuspenseHydrationCallbacks,
  TransitionTracingCallbacks,
} from './ReactInternalTypes';
import type {RootTag} from './ReactRootTags';
import type {Cache} from './ReactFiberCacheComponent.old';
import type {Transition} from './ReactFiberTracingMarkerComponent.old';

import {noTimeout, supportsHydration} from './ReactFiberHostConfig';
import {createHostRootFiber} from './ReactFiber.old';
import {
  NoLane,
  NoLanes,
  NoTimestamp,
  TotalLanes,
  createLaneMap,
} from './ReactFiberLane.old';
import {
  enableSuspenseCallback,
  enableCache,
  enableProfilerCommitHooks,
  enableProfilerTimer,
  enableUpdaterTracking,
  enableTransitionTracing,
} from 'shared/ReactFeatureFlags';
import {initializeUpdateQueue} from './ReactUpdateQueue.old';
import {LegacyRoot, ConcurrentRoot} from './ReactRootTags';
import {createCache, retainCache} from './ReactFiberCacheComponent.old';

export type RootState = {
  element: any,
  isDehydrated: boolean,
  cache: Cache,
  transitions: Array<Transition> | null,
};

function FiberRootNode(
  containerInfo,
  tag,
  hydrate,
  identifierPrefix,
  onRecoverableError,
) {
  this.tag = tag;
  this.containerInfo = containerInfo;
  this.pendingChildren = null;
  this.current = null;
  this.pingCache = null;
  this.finishedWork = null;
  this.timeoutHandle = noTimeout;
  this.context = null;
  this.pendingContext = null;
  this.callbackNode = null;
  this.callbackPriority = NoLane;
  this.eventTimes = createLaneMap(NoLanes);
  this.expirationTimes = createLaneMap(NoTimestamp);

  this.pendingLanes = NoLanes;
  this.suspendedLanes = NoLanes;
  this.pingedLanes = NoLanes;
  this.expiredLanes = NoLanes;
  this.mutableReadLanes = NoLanes;
  this.finishedLanes = NoLanes;

  this.entangledLanes = NoLanes;
  this.entanglements = createLaneMap(NoLanes);

  this.identifierPrefix = identifierPrefix;
  this.onRecoverableError = onRecoverableError;

  if (enableCache) {
    this.pooledCache = null;
    this.pooledCacheLanes = NoLanes;
  }

  if (supportsHydration) {
    this.mutableSourceEagerHydrationData = null;
  }

  if (enableSuspenseCallback) {
    this.hydrationCallbacks = null;
  }

  if (enableTransitionTracing) {
    this.transitionCallbacks = null;
    const transitionLanesMap = (this.transitionLanes = []);
    for (let i = 0; i < TotalLanes; i++) {
      transitionLanesMap.push(null);
    }
  }

  if (enableProfilerTimer && enableProfilerCommitHooks) {
    this.effectDuration = 0;
    this.passiveEffectDuration = 0;
  }

  if (enableUpdaterTracking) {
    this.memoizedUpdaters = new Set();
    const pendingUpdatersLaneMap = (this.pendingUpdatersLaneMap = []);
    for (let i = 0; i < TotalLanes; i++) {
      pendingUpdatersLaneMap.push(new Set());
    }
  }

  if (__DEV__) {
    switch (tag) {
      case ConcurrentRoot:
        this._debugRootType = hydrate ? 'hydrateRoot()' : 'createRoot()';
        break;
      case LegacyRoot:
        this._debugRootType = hydrate ? 'hydrate()' : 'render()';
        break;
    }
  }
}

export function createFiberRoot(
  containerInfo: any,
  tag: RootTag,
  hydrate: boolean,
  initialChildren: ReactNodeList,
  hydrationCallbacks: null | SuspenseHydrationCallbacks,
  isStrictMode: boolean,
  concurrentUpdatesByDefaultOverride: null | boolean,
  // TODO: We have several of these arguments that are conceptually part of the
  // host config, but because they are passed in at runtime, we have to thread
  // them through the root constructor. Perhaps we should put them all into a
  // single type, like a DynamicHostConfig that is defined by the renderer.
  identifierPrefix: string,
  onRecoverableError: null | ((error: mixed) => void),
  transitionCallbacks: null | TransitionTracingCallbacks,
): FiberRoot {
  console.log(
      `createFiberRoot参数(
      containerInfo: ${containerInfo}, 
      tag: ${tag}, 
      hydrate: ${hydrate}, 
      initialChildren: ${initialChildren}, 
      hydrationCallbacks: ${hydrationCallbacks}, 
      concurrentUpdatesByDefaultOverride: ${concurrentUpdatesByDefaultOverride}, 
      identifierPrefix: ${identifierPrefix}, 
      onRecoverableError: ${onRecoverableError}, 
      transitionCallbacks: ${transitionCallbacks})\n`, 
      'containerInfo:', containerInfo,
    );
  const root: FiberRoot = (new FiberRootNode(
    containerInfo,
    tag,
    hydrate,
    identifierPrefix,
    onRecoverableError,
  ): any);
  if (enableSuspenseCallback) {
    root.hydrationCallbacks = hydrationCallbacks;
  }

  if (enableTransitionTracing) {
    root.transitionCallbacks = transitionCallbacks;
  }
  console.log('创建好的fiberRootNode:\n', root);
  // Cyclic construction. This cheats the type system right now because
  // stateNode is any.
  console.warn('createFiberRoot内调用createHostRootFiber创建HostRootFiber');
  const uninitializedFiber = createHostRootFiber(
    tag,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
  );
  console.log('创建好的HostRootFiber:\n', uninitializedFiber);
  console.log('fiberNode数据结构见文件:src/react/packages/react-reconciler/src/ReactInternalTypes.js');
  root.current = uninitializedFiber;
  uninitializedFiber.stateNode = root;
  console.warn('fiberRootNode和HostRootFiber创建好关联,fiberRootNode.current=HostRootFiber,HostRootFiber.stateNode=fiberRootNode');
  console.log('FiberRootNode和HostRootFiber关联好的对应结构:\n', root, uninitializedFiber);
  console.log(`
    fiber中和dom节点相关的信息主要关注tag、key、type和stateNode。\n
    tag\n
    fiber中tag属性的ts类型为workType,用于标记不同的react组件类型。在react reconciler时,beginWork和completeWork等流程时,都会根据tag类型的不同,去执行不同的函数处理fiber节点。\n
    workType枚举见文件:src/react/packages/react-reconciler/src/ReactWorkTags.js\n
    key和type\n
    key和type两项用于react diff过程中确定fiber是否可以复用。\n
    key为用户定义的唯一值。type定义与此fiber关联的功能或类。对于组件,它指向函数或者类本身;对于DOM元素,它指定HTML tag。\n
    stateNode\n
    stateNode用于记录当前fiber所对应的真实dom节点或者当前虚拟组件的实例,这么做的原因第一是为了实现Ref,第二是为了实现真实dom的跟踪。\n
  `);

  if (enableCache) {
    const initialCache = createCache();
    retainCache(initialCache);

    // The pooledCache is a fresh cache instance that is used temporarily
    // for newly mounted boundaries during a render. In general, the
    // pooledCache is always cleared from the root at the end of a render:
    // it is either released when render commits, or moved to an Offscreen
    // component if rendering suspends. Because the lifetime of the pooled
    // cache is distinct from the main memoizedState.cache, it must be
    // retained separately.
    root.pooledCache = initialCache;
    retainCache(initialCache);
    const initialState: RootState = {
      element: initialChildren,
      isDehydrated: hydrate,
      cache: initialCache,
      transitions: null,
    };
    uninitializedFiber.memoizedState = initialState;
  } else {
    const initialState: RootState = {
      element: initialChildren,
      isDehydrated: hydrate,
      cache: (null: any), // not enabled yet
      transitions: null,
    };
    uninitializedFiber.memoizedState = initialState;
  }
  console.warn('创建完HostRootFiber后会先初始化它的memoizedState也就是状态');
  console.log('memoizedState数据结构:\n', uninitializedFiber.memoizedState);
  console.log(`react在运行时候会存在两棵Fiber树,一棵是当前页面展示的树,可以把它理解成current tree,另外一棵是当组件状态发生改变时,根据current tree形成的
  workInProgress tree,两棵树通过alternate属性相互指向,react-diff就是在这两棵树上进行的。`);
  initializeUpdateQueue(uninitializedFiber);
  return root;
}
