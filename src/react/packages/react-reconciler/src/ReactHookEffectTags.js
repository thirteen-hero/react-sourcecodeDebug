/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export type HookFlags = number;

export const NoFlags = /*   */ 0b0000;

// Represents whether effect should fire.
export const HasEffect = /* */ 0b0001; // effect通用类型

// Represents the phase in which the effect (not the clean-up) fires.
export const Insertion = /*  */ 0b0010; // 对应useInsertionEffect
export const Layout = /*    */ 0b0100; // 对应useLayoutEffect
export const Passive = /*   */ 0b1000; // 对应useEffect
