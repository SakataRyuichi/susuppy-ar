import type * as THREE from "three";
import type {
  ARContentAlignment,
  ARContentDisplayType,
} from "../hooks/useARController.types";

/**
 * マーカー表示生成で必要な Three.js API の最小集合。
 * 依存対象を限定してテストしやすくするために型として切り出す。
 *
 * @public
 */
export type ThreeContentLib = {
  PlaneGeometry: new (w: number, h: number) => THREE.BufferGeometry;
  BoxGeometry: new (w: number, h: number, d: number) => THREE.BufferGeometry;
  Group: new () => THREE.Group;
  MeshBasicMaterial: new (params: object) => THREE.Material;
  MeshNormalMaterial: new (params: object) => THREE.Material;
  TextureLoader: new () => { load: (url: string) => THREE.Texture };
  VideoTexture: new (video: HTMLVideoElement) => THREE.Texture;
  Mesh: new (
    g: THREE.BufferGeometry,
    m: THREE.Material | THREE.Material[],
  ) => THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>;
  DoubleSide: number;
};

/**
 * マーカーコンテンツ生成結果。
 *
 * @public
 */
export type MarkerContentResult = {
  videoElement: HTMLVideoElement | null;
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>;
  animationTarget: THREE.Object3D | null;
};

const MARKER_SURFACE_OFFSET = 0.002;

/**
 * マーカーに重ねるコンテンツのスケール係数。
 * 1.0 = マーカーと同サイズ。1.5 で 50% 大きく表示する。
 */
const CONTENT_SCALE = 1.5;

/**
 * Three.js 動画テクスチャ用の動画要素を生成してメタデータのプリロードを開始する。
 *
 * AR 初期化チェーンの開始前に呼び出すことで、初期化中にメタデータを並行取得し
 * マーカー認識直後にアスペクト比が正しい状態で動画を表示できる。
 *
 * @param videoUrl - 読み込む動画 URL。
 * @returns メタデータロード中の動画要素。
 * @public
 */
export function preloadVideoElement(videoUrl: string): HTMLVideoElement {
  const videoElement = document.createElement("video");
  videoElement.src = videoUrl;
  videoElement.crossOrigin = "anonymous";
  videoElement.muted = true;
  videoElement.loop = true;
  videoElement.playsInline = true;
  videoElement.preload = "auto";
  // src 設定だけでは読み込みを開始しないブラウザがあるため明示的に呼ぶ
  videoElement.load();
  return videoElement;
}

/**
 * マーカー面に貼るコンテンツメッシュを作成する。
 *
 * `preloadedVideo` は AR 初期化前に {@link preloadVideoElement} で生成しておくことで
 * マーカー認識直後にアスペクト比が確定した状態で表示できる。
 *
 * @param parent - 生成メッシュを追加する親ノード。
 * @param preloadedVideo - プリロード済み動画要素。動画なしなら `null`。
 * @param cubeTextureUrl - キューブ面テクスチャURL。
 * @param contentDisplayType - 表示コンテンツ種類。
 * @param contentAlignment - 表示姿勢。
 * @param threeLib - 注入された Three.js コンストラクタ群。
 * @returns マーカーコンテンツ生成結果。
 * @public
 */
export function createMarkerContent(
  parent: THREE.Object3D,
  preloadedVideo: HTMLVideoElement | null,
  cubeTextureUrl: string | undefined,
  contentDisplayType: ARContentDisplayType,
  contentAlignment: ARContentAlignment,
  threeLib: ThreeContentLib,
): MarkerContentResult {
  const alignmentGroup = new threeLib.Group();
  parent.add(alignmentGroup);

  if (contentDisplayType === "cube") {
    const spinGroup = new threeLib.Group();
    const cubeMesh = createCubeMesh(threeLib, cubeTextureUrl);
    applyAlignmentToGroup(alignmentGroup, contentAlignment, CONTENT_SCALE / 2);
    spinGroup.add(cubeMesh);
    alignmentGroup.add(spinGroup);
    return {
      videoElement: null,
      mesh: cubeMesh,
      animationTarget: spinGroup,
    };
  }

  const planeGeometry = new threeLib.PlaneGeometry(1, 1);
  const material = createVideoPlaneMaterial(threeLib, preloadedVideo);
  const planeMesh = new threeLib.Mesh(planeGeometry, material);

  // 初期スケールは正方形で確保し、動画メタデータ取得後に正しいアスペクト比へ更新する
  planeMesh.scale.set(CONTENT_SCALE, CONTENT_SCALE, 1);
  applyAlignmentToGroup(alignmentGroup, contentAlignment, CONTENT_SCALE / 2);
  alignmentGroup.add(planeMesh);

  // 動画サイズが判明したらスケールとグループ位置を更新する
  watchVideoAspectAndApply(planeMesh, alignmentGroup, preloadedVideo, contentAlignment);

  return {
    videoElement: preloadedVideo,
    mesh: planeMesh,
    animationTarget: null,
  };
}

/**
 * 動画プレーン用マテリアルを構築する。
 * 動画がない場合は視認しやすい簡易マテリアルでフォールバックする。
 *
 * @param threeLib - 注入された Three.js コンストラクタ群。
 * @param videoElement - 動画ソース。
 * @returns マーカーコンテンツ用マテリアル。
 */
function createVideoPlaneMaterial(
  threeLib: ThreeContentLib,
  videoElement: HTMLVideoElement | null,
): THREE.Material {
  if (videoElement) {
    const texture = new threeLib.VideoTexture(videoElement);
    return new threeLib.MeshBasicMaterial({
      map: texture,
      side: threeLib.DoubleSide,
      transparent: true,
    });
  }

  return new threeLib.MeshNormalMaterial({
    transparent: true,
    opacity: 0.8,
    side: threeLib.DoubleSide,
  });
}

/**
 * 動画のアスペクト比をメッシュスケールとグループ位置に反映させる監視を開始する。
 *
 * `loadedmetadata` が遅延するモバイル環境向けに 100ms ポーリングをフォールバックとして設ける。
 * 5秒経過しても取得できない場合はポーリングを停止して正方形のまま表示する。
 *
 * @param mesh - スケールを更新するメッシュ。
 * @param alignmentGroup - 垂直配置時に position.y を更新するグループ。
 * @param videoElement - テクスチャに使う動画要素。
 * @param contentAlignment - 垂直配置かどうかの判定に使う。
 */
function watchVideoAspectAndApply(
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>,
  alignmentGroup: THREE.Object3D,
  videoElement: HTMLVideoElement | null,
  contentAlignment: ARContentAlignment,
): void {
  if (!videoElement) {
    return;
  }

  const applyAspect = (): boolean => {
    const { videoWidth, videoHeight } = videoElement;
    if (!videoWidth || !videoHeight) {
      return false;
    }
    const aspect = videoWidth / videoHeight;
    const scaleX = aspect >= 1 ? CONTENT_SCALE : CONTENT_SCALE * aspect;
    const scaleY = aspect >= 1 ? CONTENT_SCALE / aspect : CONTENT_SCALE;
    mesh.scale.set(scaleX, scaleY, 1);

    // 垂直配置ではメッシュ高さの半分だけ Y 方向に持ち上げてマーカー底面に接地させる
    if (contentAlignment === "vertical") {
      alignmentGroup.position.y = scaleY / 2;
    }
    return true;
  };

  if (applyAspect()) {
    return;
  }

  videoElement.addEventListener("loadedmetadata", () => applyAspect(), {
    once: true,
  });

  // loadedmetadata が発火しない場合のポーリングフォールバック（iOS 対策）
  const intervalId = window.setInterval(() => {
    if (applyAspect()) {
      clearInterval(intervalId);
    }
  }, 100);
  window.setTimeout(() => clearInterval(intervalId), 5000);
}

/**
 * 立方体メッシュを生成する。
 * 全面に同じテクスチャを貼り、視認しやすいデモオブジェクトにする。
 *
 * @param threeLib - 注入された Three.js コンストラクタ群。
 * @param cubeTextureUrl - キューブ面に貼る画像URL。
 * @returns 生成した立方体メッシュ。
 */
function createCubeMesh(
  threeLib: ThreeContentLib,
  cubeTextureUrl: string | undefined,
): THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]> {
  const cubeGeometry = new threeLib.BoxGeometry(1, 1, 1);
  const textureUrl = cubeTextureUrl ?? "/images/image.png";
  const cubeTexture = new threeLib.TextureLoader().load(textureUrl);
  const materialArray = createMaterialArray(threeLib, cubeTexture);
  return new threeLib.Mesh(cubeGeometry, materialArray);
}

/**
 * 立方体の6面マテリアル配列を生成する。
 *
 * @param threeLib - 注入された Three.js コンストラクタ群。
 * @param cubeTexture - 各面に適用するテクスチャ。
 * @returns 6要素のマテリアル配列。
 */
function createMaterialArray(
  threeLib: ThreeContentLib,
  cubeTexture: THREE.Texture,
): THREE.Material[] {
  return Array.from(
    { length: 6 },
    () =>
      new threeLib.MeshBasicMaterial({
        map: cubeTexture,
      }),
  );
}

/**
 * マーカーに対する表示姿勢をノードへ適用する。
 * AR.js 公式サンプルの座標系に合わせ、姿勢は X 回転と Y オフセットで定義する。
 *
 * @param node - 姿勢を適用するノード。
 * @param contentAlignment - 表示姿勢（水平/垂直）。
 * @param verticalOffset - 垂直時にマーカー面へ接地させるオフセット。
 */
function applyAlignmentToGroup(
  node: THREE.Object3D,
  contentAlignment: ARContentAlignment,
  verticalOffset: number,
): void {
  const pose = createAlignmentPose(contentAlignment, verticalOffset);
  node.rotation.set(pose.rotationX, pose.rotationY, pose.rotationZ);
  node.position.set(pose.positionX, pose.positionY, pose.positionZ);
}

/**
 * 表示姿勢ごとのローカル座標ポーズを返す。
 * ここでマーカー座標系に対する拘束条件を一元管理する。
 *
 * @param contentAlignment - 表示姿勢（水平/垂直）。
 * @param verticalOffset - 垂直時オフセット。
 * @returns 適用用のポーズ値。
 */
function createAlignmentPose(
  contentAlignment: ARContentAlignment,
  verticalOffset: number,
): {
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  positionX: number;
  positionY: number;
  positionZ: number;
} {
  if (contentAlignment === "horizontal") {
    return {
      rotationX: -Math.PI / 2,
      rotationY: 0,
      rotationZ: 0,
      positionX: 0,
      positionY: 0,
      positionZ: MARKER_SURFACE_OFFSET,
    };
  }

  return {
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    positionX: 0,
    positionY: verticalOffset,
    positionZ: 0,
  };
}


