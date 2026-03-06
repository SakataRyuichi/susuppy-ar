import { createMarkerContent, preloadVideoElement } from "../ar/content";
import type {
  ARControllerConfig,
  ARControllerRuntime,
  RenderCallbackReference,
} from "./useARController.types";

const MARKER_SMOOTH_COUNT = 8;
const MARKER_SMOOTH_TOLERANCE = 0.005;
const MARKER_SMOOTH_THRESHOLD = 3;

/**
 * AR実行初期化パラメータ。
 *
 * @public
 */
export type InitializeARControllerParameter = {
  config: ARControllerConfig;
  /** video と canvas を配置する wrapper div。overflow:hidden でカメラ映像をクリップする。 */
  wrapper: HTMLDivElement;
  runtime: ARControllerRuntime;
  renderCallbackReference: RenderCallbackReference;
  synchronizeLayout: () => void;
  onReady: () => void;
  onError: (error: Error) => void;
};

/**
 * AR.js + Three.js を初期化する。
 *
 * ブログ記事の実装知見に従い、AR.js が body に追加した video を wrapper div に移動する。
 * スマートフォンの Safari では body への overflow:hidden が効かないため、
 * wrapper.overflow:hidden でカメラ映像の clipping を行う。
 *
 * @see https://blog.kimizuka.org/entry/2023/02/22/145050
 * @param parameter - 初期化に必要な依存。
 */
export async function initializeARController(
  parameter: InitializeARControllerParameter,
): Promise<void> {
  const {
    config,
    wrapper,
    runtime,
    renderCallbackReference,
    synchronizeLayout,
    onReady,
    onError,
  } = parameter;

  // AR 初期化チェーンと並行して動画メタデータを取得する。
  // arToolkitContext.init コールバック内（数秒後）で createMarkerContent が呼ばれるまでに
  // videoWidth/videoHeight が確定し、マーカー認識直後から正しいアスペクト比で表示できる。
  const preloadedVideo = config.videoUrl ? preloadVideoElement(config.videoUrl) : null;

  try {
    const { THREEx } = await import("@ar-js-org/ar.js-threejs");
    const ThreeModule = await import("three");
    const ThreeLib = (() => {
      if ("default" in ThreeModule) {
        return (ThreeModule as { default: typeof import("three") }).default;
      }
      return ThreeModule;
    })();

    THREEx.ArToolkitContext.baseURL = "";

    // canvas を wrapper に配置し、video（z-index:-2）の上（z-index:1）に重ねる
    const renderer = new ThreeLib.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    runtime.renderer = renderer;
    renderer.setClearColor(new ThreeLib.Color("lightgrey"), 0);
    // Retina/高 DPI 端末でネイティブ解像度でレンダリングする（最大 2x でパフォーマンスを確保）
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // ウィンドウサイズに合わせることで wrapper の高さが決まり overflow:hidden が正しく動作する
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0px";
    renderer.domElement.style.left = "0px";
    renderer.domElement.style.zIndex = "1";
    wrapper.appendChild(renderer.domElement);

    const scene = new ThreeLib.Scene();
    const camera = new ThreeLib.PerspectiveCamera();
    runtime.scene = scene;
    runtime.camera = camera;
    scene.add(camera);

    // 1280×720 (HD) でカメラストリームを要求する。
    // 640×480 より高解像度でマーカー検出精度とカメラ映像品質の両方が向上する。
    // iOS はカメラストリームを常に landscape で返すため向き補正は不要。
    runtime.arToolkitSource = new THREEx.ArToolkitSource({
      sourceType: config.source.sourceType,
      sourceWidth: 1280,
      sourceHeight: 720,
    });

    runtime.arToolkitSource.init(
      () => {
        if (
          runtime.cancelled ||
          !runtime.arToolkitSource ||
          !runtime.scene ||
          !runtime.camera ||
          !runtime.renderer
        ) {
          return;
        }

        // AR.js が body に追加した video を wrapper に移動する
        // wrapper.overflow:hidden によってはみ出した映像がクリップされる
        // AR.js は video に position:absolute, top:0, left:0, z-index:-2 を設定済み
        // z-index:-2 のままにして canvas（z-index:1）が前面になる構造を維持する
        const sourceVideoElement = runtime.arToolkitSource.domElement;
        runtime.sourceVideoElement = sourceVideoElement;
        wrapper.appendChild(sourceVideoElement);

        // onResizeElement の計算タイミングに依存せず確実にカメラ映像を全画面にする
        // object-fit:cover で映像のアスペクト比を維持したままラッパーを埋める
        sourceVideoElement.style.width = "100%";
        sourceVideoElement.style.height = "100%";
        sourceVideoElement.style.objectFit = "cover";
        sourceVideoElement.style.margin = "0";

        // canplay で ArToolkitContext を初期化する
        sourceVideoElement.addEventListener(
          "canplay",
          () => {
            if (
              runtime.cancelled ||
              !runtime.arToolkitSource ||
              !runtime.scene ||
              !runtime.camera
            ) {
              return;
            }

            runtime.arToolkitContext = new THREEx.ArToolkitContext({
              cameraParametersUrl: config.context.cameraParametersUrl,
              detectionMode: config.context.detectionMode,
            });

            runtime.arToolkitContext.init(() => {
              if (
                runtime.cancelled ||
                !runtime.arToolkitContext ||
                !runtime.arToolkitSource ||
                !runtime.scene ||
                !runtime.camera ||
                !runtime.renderer
              ) {
                return;
              }

              camera.projectionMatrix.copy(
                runtime.arToolkitContext.getProjectionMatrix(),
              );

              const orientation = getSourceOrientation(
                runtime.arToolkitSource.domElement,
              );
              runtime.arToolkitContext.arController.orientation = orientation;
              runtime.arToolkitContext.arController.options.orientation =
                orientation;

              // arToolkitContext 初期化後に arController.canvas のサイズも同期する
              synchronizeLayout();

              new THREEx.ArMarkerControls(runtime.arToolkitContext, camera, {
                type: config.marker.type,
                patternUrl: config.marker.patternUrl,
                changeMatrixMode: "cameraTransformMatrix",
                smooth: true,
                smoothCount: MARKER_SMOOTH_COUNT,
                smoothTolerance: MARKER_SMOOTH_TOLERANCE,
                smoothThreshold: MARKER_SMOOTH_THRESHOLD,
              });

              scene.visible = false;

              const markerContent = createMarkerContent(
                scene,
                preloadedVideo,
                config.cubeTextureUrl,
                config.contentDisplayType,
                config.contentAlignment,
                ThreeLib as Parameters<typeof createMarkerContent>[5],
              );
              runtime.contentVideoElement = markerContent.videoElement;
              runtime.contentMesh = markerContent.mesh;
              runtime.contentAnimationTarget = markerContent.animationTarget;

              // マーカー最終検出時刻（0 = 一度も検出されていない）
              let lastMarkerVisibleAt = 0;

              renderCallbackReference.current = (delta) => {
                if (
                  !runtime.arToolkitContext ||
                  !runtime.arToolkitSource?.ready ||
                  !runtime.scene ||
                  !runtime.camera ||
                  !runtime.renderer
                ) {
                  return;
                }

                runtime.arToolkitContext.update(
                  runtime.arToolkitSource.domElement,
                );

                const now = performance.now();
                const markerVisible = camera.visible;

                if (markerVisible) {
                  lastMarkerVisibleAt = now;
                  scene.visible = true;
                  setMeshOpacity(runtime.contentMesh, 1);
                } else if (lastMarkerVisibleAt === 0) {
                  // 一度も検出されていない → 非表示のまま
                  scene.visible = false;
                } else {
                  const elapsed = now - lastMarkerVisibleAt;
                  if (elapsed < MARKER_GRACE_MS) {
                    // グレース期間: 最後の姿勢のままフル表示
                    scene.visible = true;
                  } else if (elapsed < MARKER_GRACE_MS + MARKER_FADE_MS) {
                    // フェードアウト中
                    scene.visible = true;
                    const t = (elapsed - MARKER_GRACE_MS) / MARKER_FADE_MS;
                    setMeshOpacity(runtime.contentMesh, 1 - t);
                  } else {
                    // フェード完了 → 非表示にして次回検出のため opacity をリセット
                    scene.visible = false;
                    setMeshOpacity(runtime.contentMesh, 1);
                  }
                }

                // 動画再生はシーンの表示状態に合わせて制御する
                if (runtime.contentVideoElement) {
                  if (scene.visible) {
                    if (runtime.contentVideoElement.paused) {
                      runtime.contentVideoElement.play().catch(() => {});
                    }
                  } else {
                    runtime.contentVideoElement.pause();
                  }
                }

                if (
                  runtime.contentAnimationTarget &&
                  config.contentDisplayType === "cube"
                ) {
                  runtime.contentAnimationTarget.rotation.y += delta * 0.5;
                }

                renderer.render(scene, camera);
              };

              if (!runtime.cancelled) {
                onReady();
              }
            });
          },
          { once: true },
        );

        // loadedmetadata が間に合わない場合のフォールバック（400ms はブログ実装に準拠）
        window.setTimeout(() => {
          synchronizeLayout();
        }, 400);
      },
      () => {
        if (!runtime.cancelled) {
          onError(new Error("Failed to initialize camera"));
        }
      },
    );
  } catch (initializationError) {
    if (!runtime.cancelled) {
      if (initializationError instanceof Error) {
        onError(initializationError);
      } else {
        onError(new Error(String(initializationError)));
      }
    }
  }
}

/**
 * マーカーロスト後にコンテンツを表示し続けるグレース期間（ミリ秒）。
 * この時間が経過するとフェードアウトを開始する。
 */
const MARKER_GRACE_MS = 2000;

/**
 * グレース期間終了後のフェードアウト所要時間（ミリ秒）。
 */
const MARKER_FADE_MS = 500;

/**
 * メッシュの全マテリアルに一括で opacity を設定する。
 * マーカーロスト時のフェードアウト演出に使用する。
 *
 * @param mesh - 対象メッシュ。`null` の場合は何もしない。
 * @param opacity - 設定する不透明度（0〜1）。
 */
function setMeshOpacity(
  mesh: import("three").Mesh<
    import("three").BufferGeometry,
    import("three").Material | import("three").Material[]
  > | null,
  opacity: number,
): void {
  if (!mesh) {
    return;
  }
  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];
  for (const material of materials) {
    material.opacity = opacity;
  }
}

/**
 * 入力ソースの実寸から向きを判定して返す。
 *
 * @param videoElement - AR.js の入力動画要素。
 * @returns `"landscape"` または `"portrait"`。
 */
function getSourceOrientation(
  videoElement: HTMLVideoElement,
): "landscape" | "portrait" {
  if (videoElement.videoWidth > videoElement.videoHeight) {
    return "landscape";
  }
  return "portrait";
}
