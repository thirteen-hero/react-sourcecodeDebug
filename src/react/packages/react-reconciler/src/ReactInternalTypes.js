/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Source} from 'shared/ReactElementType';
import type {
  RefObject,
  ReactContext,
  MutableSourceSubscribeFn,
  MutableSourceGetSnapshotFn,
  MutableSourceVersion,
  MutableSource,
  StartTransitionOptions,
  Wakeable,
} from 'shared/ReactTypes';
import type {SuspenseInstance} from './ReactFiberHostConfig';
import type {WorkTag} from './ReactWorkTags';
import type {TypeOfMode} from './ReactTypeOfMode';
import type {Flags} from './ReactFiberFlags';
import type {Lane, Lanes, LaneMap} from './ReactFiberLane.old';
import type {RootTag} from './ReactRootTags';
import type {TimeoutHandle, NoTimeout} from './ReactFiberHostConfig';
import type {Cache} from './ReactFiberCacheComponent.old';
import type {Transition} from './ReactFiberTracingMarkerComponent.new';

// Unwind Circular: moved from ReactFiberHooks.old
export type HookType =
  | 'useState'
  | 'useReducer'
  | 'useContext'
  | 'useRef'
  | 'useEffect'
  | 'useInsertionEffect'
  | 'useLayoutEffect'
  | 'useCallback'
  | 'useMemo'
  | 'useImperativeHandle'
  | 'useDebugValue'
  | 'useDeferredValue'
  | 'useTransition'
  | 'useMutableSource'
  | 'useSyncExternalStore'
  | 'useId'
  | 'useCacheRefresh';

export type ContextDependency<T> = {
  context: ReactContext<T>,
  next: ContextDependency<mixed> | null,
  memoizedValue: T,
  ...
};

export type Dependencies = {
  lanes: Lanes,
  firstContext: ContextDependency<mixed> | null,
  ...
};

// A Fiber is work on a Component that needs to be done or was done. There can
// be more than one per component.
export type Fiber = {|
  // These first fields are conceptually members of an Instance. This used to
  // be split into a separate type and intersected with the other Fiber fields,
  // but until Flow fixes its intersection bugs, we've merged them into a
  // single type.

  // An Instance is shared between all versions of a component. We can easily
  // break this out into a separate object to avoid copying so much to the
  // alternate versions of the tree. We put this on a single object for now to
  // minimize the number of objects created during the initial render.

  // 作为静态数据结构，存储节点 dom 相关信息
  // Tag identifying the type of fiber.
  tag: WorkTag,  // 组件的类型，取决于 react 的元素类型
  // Unique identifier of this child.
  key: null | string, 
  // The value of element.type which is used to preserve the identity during
  // reconciliation of this child.
  elementType: any, // 元素类型
  // The resolved function/class/ associated with this fiber.
  type: any, // 定义与此fiber关联的功能或类。对于组件，它指向构造函数；对于DOM元素，它指定HTML tag
  // The local state associated with this fiber.
  stateNode: any, // 真实 dom 节点

  // Conceptual aliases
  // parent : Instance -> return The parent happens to be the same as the
  // return fiber since we've merged the fiber and instance.

  // Remaining fields belong to Fiber

  // fiber 链表树相关
  // The Fiber to return to after finishing processing this one.
  // This is effectively the parent, but there can be multiple parents (two)
  // so this is only the parent of the thing we're currently processing.
  // It is conceptually the same as the return address of a stack frame.
  return: Fiber | null, // 父 fiber
  child: Fiber | null, // 第一个子 fiber
  sibling: Fiber | null, // 下一个兄弟 fiber
  index: number, // 在父 fiber 下面的子 fiber 中的下标

  // The ref last used to attach this node.
  // I'll avoid adding an owner field for prod and model that as functions.
  ref:
    | null
    | (((handle: mixed) => void) & {_stringRef: ?string, ...})
    | RefObject,

  // 工作单元，用于计算 state 和 props 渲染
  // Input is the data coming into process this fiber. Arguments. Props.
  // 本次渲染需要使用的 props
  pendingProps: any, // This type will be more specific once we overload the tag. 
  // 上次渲染使用的 props
  memoizedProps: any, // The props used to create the output.
  // A queue of state updates and callbacks.
  updateQueue: mixed, // 用于状态更新、回调函数、DOM更新的队列
  // The state used to create the output
  memoizedState: any, // 上次渲染后的 state 状态
  // Dependencies (contexts, events) for this fiber, if it has any
  dependencies: Dependencies | null, // contexts、events 等依赖

  // Bitfield that describes properties about the fiber and its subtree. E.g.
  // the ConcurrentMode flag indicates whether the subtree should be async-by-
  // default. When a fiber is created, it inherits the mode of its
  // parent. Additional flags can be set at creation time, but after that the
  // value should remain unchanged throughout the fiber's lifetime, particularly
  // before its child fibers are created.
  mode: TypeOfMode,

  // 副作用相关
  // Effect
  flags: Flags, // 记录更新时当前 fiber 的副作用(删除、更新、替换等)状态
  subtreeFlags: Flags, // 当前子树的副作用状态
  deletions: Array<Fiber> | null, // 要删除的子 fiber
  // Singly linked list fast path to the next fiber with side-effects.
  nextEffect: Fiber | null, // 下一个有副作用的 fiber
  // The first and last fiber with side-effect within this subtree. This allows
  // us to reuse a slice of the linked list when we reuse the work done within
  // this fiber.
  firstEffect: Fiber | null, // 指向第一个有副作用的 fiber
  lastEffect: Fiber | null, // 指向最后一个有副作用的 fiber 

  // 优先级相关
  lanes: Lanes,
  childLanes: Lanes,

  // This is a pooled version of a Fiber. Every fiber that gets updated will
  // eventually have a pair. There are cases when we can clean up pairs to save
  // memory if we need to.
  alternate: Fiber | null, // 指向 workInProgress fiber 树中对应的节点

  // Time spent rendering this Fiber and its descendants for the current update.
  // This tells us how well the tree makes use of sCU for memoization.
  // It is reset to 0 each time we render and only updated when we don't bailout.
  // This field is only set when the enableProfilerTimer flag is enabled.
  actualDuration?: number,

  // If the Fiber is currently active in the "render" phase,
  // This marks the time at which the work began.
  // This field is only set when the enableProfilerTimer flag is enabled.
  actualStartTime?: number,

  // Duration of the most recent render time for this Fiber.
  // This value is not updated when we bailout for memoization purposes.
  // This field is only set when the enableProfilerTimer flag is enabled.
  selfBaseDuration?: number,

  // Sum of base times for all descendants of this Fiber.
  // This value bubbles up during the "complete" phase.
  // This field is only set when the enableProfilerTimer flag is enabled.
  treeBaseDuration?: number,

  // Conceptual aliases
  // workInProgress : Fiber ->  alternate The alternate used for reuse happens
  // to be the same as work in progress.
  // __DEV__ only

  _debugSource?: Source | null,
  _debugOwner?: Fiber | null,
  _debugIsCurrentlyTiming?: boolean,
  _debugNeedsRemount?: boolean,

  // Used to verify that the order of hooks does not change between renders.
  _debugHookTypes?: Array<HookType> | null,
|};

type BaseFiberRootProperties = {|
  // The type of root (legacy, batched, concurrent, etc.)
  tag: RootTag,

  // Any additional information from the host associated with this root.
  containerInfo: any,
  // Used only by persistent updates.
  pendingChildren: any,
  // The currently active root fiber. This is the mutable root of the tree.
  current: Fiber,

  pingCache: WeakMap<Wakeable, Set<mixed>> | Map<Wakeable, Set<mixed>> | null,

  // A finished work-in-progress HostRoot that's ready to be committed.
  finishedWork: Fiber | null,
  // Timeout handle returned by setTimeout. Used to cancel a pending timeout, if
  // it's superseded by a new one.
  timeoutHandle: TimeoutHandle | NoTimeout,
  // Top context object, used by renderSubtreeIntoContainer
  context: Object | null,
  pendingContext: Object | null,

  // Used by useMutableSource hook to avoid tearing during hydration.
  mutableSourceEagerHydrationData?: Array<
    MutableSource<any> | MutableSourceVersion,
  > | null,

  // Node returned by Scheduler.scheduleCallback. Represents the next rendering
  // task that the root will work on.
  callbackNode: *,
  callbackPriority: Lane,
  eventTimes: LaneMap<number>,
  expirationTimes: LaneMap<number>,

  pendingLanes: Lanes,
  suspendedLanes: Lanes,
  pingedLanes: Lanes,
  expiredLanes: Lanes,
  mutableReadLanes: Lanes,

  finishedLanes: Lanes,

  entangledLanes: Lanes,
  entanglements: LaneMap<Lanes>,

  pooledCache: Cache | null,
  pooledCacheLanes: Lanes,

  // TODO: In Fizz, id generation is specific to each server config. Maybe we
  // should do this in Fiber, too? Deferring this decision for now because
  // there's no other place to store the prefix except for an internal field on
  // the public createRoot object, which the fiber tree does not currently have
  // a reference to.
  identifierPrefix: string,

  onRecoverableError: (error: mixed) => void,
|};

// The following attributes are only used by DevTools and are only present in DEV builds.
// They enable DevTools Profiler UI to show which Fiber(s) scheduled a given commit.
type UpdaterTrackingOnlyFiberRootProperties = {|
  memoizedUpdaters: Set<Fiber>,
  pendingUpdatersLaneMap: LaneMap<Set<Fiber>>,
|};

export type SuspenseHydrationCallbacks = {
  onHydrated?: (suspenseInstance: SuspenseInstance) => void,
  onDeleted?: (suspenseInstance: SuspenseInstance) => void,
  ...
};

// The follow fields are only used by enableSuspenseCallback for hydration.
type SuspenseCallbackOnlyFiberRootProperties = {|
  hydrationCallbacks: null | SuspenseHydrationCallbacks,
|};

export type TransitionTracingCallbacks = {
  onTransitionStart?: (transitionName: string, startTime: number) => void,
  onTransitionProgress?: (
    transitionName: string,
    startTime: number,
    currentTime: number,
    pending: Array<{name: null | string}>,
  ) => void,
  onTransitionIncomplete?: (
    transitionName: string,
    startTime: number,
    deletions: Array<{
      type: string,
      name?: string,
      newName?: string,
      endTime: number,
    }>,
  ) => void,
  onTransitionComplete?: (
    transitionName: string,
    startTime: number,
    endTime: number,
  ) => void,
  onMarkerProgress?: (
    transitionName: string,
    marker: string,
    startTime: number,
    currentTime: number,
    pending: Array<{name: null | string}>,
  ) => void,
  onMarkerIncomplete?: (
    transitionName: string,
    marker: string,
    startTime: number,
    deletions: Array<{
      type: string,
      name?: string,
      newName?: string,
      endTime: number,
    }>,
  ) => void,
  onMarkerComplete?: (
    transitionName: string,
    marker: string,
    startTime: number,
    endTime: number,
  ) => void,
};

// The following fields are only used in transition tracing in Profile builds
type TransitionTracingOnlyFiberRootProperties = {|
  transitionCallbacks: null | TransitionTracingCallbacks,
  transitionLanes: Array<Array<Transition> | null>,
|};

// Exported FiberRoot type includes all properties,
// To avoid requiring potentially error-prone :any casts throughout the project.
// The types are defined separately within this file to ensure they stay in sync.
export type FiberRoot = {
  ...BaseFiberRootProperties,
  ...SuspenseCallbackOnlyFiberRootProperties,
  ...UpdaterTrackingOnlyFiberRootProperties,
  ...TransitionTracingOnlyFiberRootProperties,
  ...
};

type BasicStateAction<S> = (S => S) | S;
type Dispatch<A> = A => void;

export type Dispatcher = {|
  getCacheSignal?: () => AbortSignal,
  getCacheForType?: <T>(resourceType: () => T) => T,
  readContext<T>(context: ReactContext<T>): T,
  useState<S>(initialState: (() => S) | S): [S, Dispatch<BasicStateAction<S>>],
  useReducer<S, I, A>(
    reducer: (S, A) => S,
    initialArg: I,
    init?: (I) => S,
  ): [S, Dispatch<A>],
  useContext<T>(context: ReactContext<T>): T,
  useRef<T>(initialValue: T): {|current: T|},
  useEffect(
    create: () => (() => void) | void,
    deps: Array<mixed> | void | null,
  ): void,
  useInsertionEffect(
    create: () => (() => void) | void,
    deps: Array<mixed> | void | null,
  ): void,
  useLayoutEffect(
    create: () => (() => void) | void,
    deps: Array<mixed> | void | null,
  ): void,
  useCallback<T>(callback: T, deps: Array<mixed> | void | null): T,
  useMemo<T>(nextCreate: () => T, deps: Array<mixed> | void | null): T,
  useImperativeHandle<T>(
    ref: {|current: T | null|} | ((inst: T | null) => mixed) | null | void,
    create: () => T,
    deps: Array<mixed> | void | null,
  ): void,
  useDebugValue<T>(value: T, formatterFn: ?(value: T) => mixed): void,
  useDeferredValue<T>(value: T): T,
  useTransition(): [
    boolean,
    (callback: () => void, options?: StartTransitionOptions) => void,
  ],
  useMutableSource<Source, Snapshot>(
    source: MutableSource<Source>,
    getSnapshot: MutableSourceGetSnapshotFn<Source, Snapshot>,
    subscribe: MutableSourceSubscribeFn<Source, Snapshot>,
  ): Snapshot,
  useSyncExternalStore<T>(
    subscribe: (() => void) => () => void,
    getSnapshot: () => T,
    getServerSnapshot?: () => T,
  ): T,
  useId(): string,
  useCacheRefresh?: () => <T>(?() => T, ?T) => void,

  unstable_isNewReconciler?: boolean,
|};
