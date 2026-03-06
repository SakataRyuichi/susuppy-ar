import type { MutableRefObject } from "react";
import type * as THREE from "three";
import type {
  ARContextConfig,
  ARMarkerConfig,
  ARSourceConfig,
} from "../ar/types";

/**
 * マーカー上コンテンツの表示種類。
 *
 * @public
 */
export type ARContentDisplayType = "video" | "cube";

/**
 * マーカーに対するコンテンツ姿勢。
 *
 * @public
 */
export type ARContentAlignment = "horizontal" | "vertical";

/**
 * `useARController` の実行設定。
 * AR入力・検出・描画に必要な依存をまとめて受け取り、フック外で設定責務を分離する。
 *
 * @public
 */
export type ARControllerConfig = {
  source: ARSourceConfig;
  context: ARContextConfig;
  marker: ARMarkerConfig;
  videoUrl?: string;
  cubeTextureUrl?: string;
  contentDisplayType: ARContentDisplayType;
  contentAlignment: ARContentAlignment;
};

/**
 * `useARController` の返却状態。
 * UI側はこの値だけを監視すれば初期化可否を判断できる。
 *
 * @public
 */
export type UseARControllerResult = {
  error: Error | null;
  isReady: boolean;
};

/**
 * AR実行時の可変状態。
 * フックの外へ分離した処理群が同じ状態を参照できるように束ねて扱う。
 *
 * @public
 */
export type ARControllerRuntime = {
  cancelled: boolean;
  renderer: THREE.WebGLRenderer | null;
  arToolkitSource: InstanceType<
    typeof import("@ar-js-org/ar.js-threejs").THREEx.ArToolkitSource
  > | null;
  arToolkitContext: InstanceType<
    typeof import("@ar-js-org/ar.js-threejs").THREEx.ArToolkitContext
  > | null;
  sourceVideoElement: HTMLVideoElement | null;
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  contentVideoElement: HTMLVideoElement | null;
  contentMesh: THREE.Mesh<
    THREE.BufferGeometry,
    THREE.Material | THREE.Material[]
  > | null;
  contentAnimationTarget: THREE.Object3D | null;
};

/**
 * アニメーションフレーム用コールバック参照。
 *
 * @public
 */
export type RenderCallbackReference = MutableRefObject<
  ((delta: number) => void) | null
>;
