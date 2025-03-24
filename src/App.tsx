import "./App.css";

import { useEffect, useRef, useState } from "react";

// 전역 타입 정의
declare global {
  interface Window {
    spine: any;
    CanvasKitInit: () => Promise<any>;
    ckInstance: any; // 전역 CanvasKit 인스턴스 저장
  }
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raptorCanvasRef = useRef<HTMLCanvasElement>(null); // 랩터용 캔버스 ref 추가
  const [animations, setAnimations] = useState<string[]>([]);
  const [raptorAnimations, setRaptorAnimations] = useState<string[]>([]); // 랩터 애니메이션 목록
  const [currentAnimation, setCurrentAnimation] = useState<string>("");
  const [currentRaptorAnimation, setCurrentRaptorAnimation] =
    useState<string>(""); // 랩터 현재 애니메이션
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isRaptorLoaded, setIsRaptorLoaded] = useState<boolean>(false); // 랩터 로딩 상태
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // 스케일 조정을 위한 상태 추가
  const [spineScale, setSpineScale] = useState<number>(0.4);
  const [alienScale, setAlienScale] = useState<number>(0.3);

  // CanvasKit 및 렌더링 관련 객체들을 ref로 저장
  const ckRef = useRef<any>(null);
  const surfaceRef = useRef<any>(null);
  const raptorSurfaceRef = useRef<any>(null); // 랩터용 서피스
  const drawableRef = useRef<any>(null);
  const raptorDrawableRef = useRef<any>(null); // 랩터용 드로어블
  const rendererRef = useRef<any>(null);
  const raptorRendererRef = useRef<any>(null); // 랩터용 렌더러
  const animLoopRef = useRef<number | null>(null);
  const raptorAnimLoopRef = useRef<number | null>(null); // 랩터용 애니메이션 루프
  const lastTimeRef = useRef<number>(0);
  const raptorLastTimeRef = useRef<number>(0); // 랩터용 타임스탬프

  // 디버그 정보 추가 함수
  const addDebugInfo = (info: string) => {
    console.log(info);
    setDebugInfo((prev) => `${info}\n${prev}`.slice(0, 500));
  };

  // 애니메이션 변경 함수
  const changeAnimation = (animName: string) => {
    addDebugInfo(`애니메이션 변경 시도: ${animName}`);

    if (!drawableRef.current || !drawableRef.current.animationState) {
      addDebugInfo("드로어블 또는 애니메이션 상태가 초기화되지 않았습니다");
      return;
    }

    try {
      // 더 철저한 리셋 과정 추가
      const animState = drawableRef.current.animationState;

      // 모든 트랙 클리어
      animState.clearTracks();

      // 모든 리스너 제거 (이벤트 충돌 방지)
      animState.clearListeners();

      // 애니메이션 상태 강제 업데이트 (0초 경과)
      animState.update(0);

      // 스켈레톤 포즈 리셋 (기본 포즈로 되돌림)
      drawableRef.current.skeleton.setToSetupPose();

      // 새 애니메이션 설정 (loop: true)
      const trackEntry = animState.setAnimation(0, animName, true);

      // 트랙 진행 상태 초기화 (시작부터 재생)
      if (trackEntry) {
        trackEntry.trackTime = 0;
        addDebugInfo(`애니메이션 변경 성공: ${animName}`);
        setCurrentAnimation(animName);
      } else {
        addDebugInfo(`트랙 엔트리를 생성하지 못했습니다: ${animName}`);
      }

      // 추가 업데이트를 통해 변경사항 적용
      animState.apply(drawableRef.current.skeleton);
      drawableRef.current.skeleton.updateWorldTransform();
    } catch (error) {
      addDebugInfo(`애니메이션 변경 중 오류: ${error}`);
    }
  };

  // 재생/일시정지 토글 함수
  const togglePlayPause = () => {
    setIsPlaying((prev) => {
      const newState = !prev;
      addDebugInfo(newState ? "애니메이션 재생" : "애니메이션 일시정지");
      return newState;
    });
  };

  // WebGL 지원 확인 함수
  const checkWebGLSupport = () => {
    try {
      const canvas = document.createElement("canvas");
      return (
        !!window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
      );
    } catch (e) {
      return false;
    }
  };

  // CanvasKit 초기화 및 렌더링 함수
  const initCanvasKit = async () => {
    if (!canvasRef.current) {
      addDebugInfo("캔버스 요소를 찾을 수 없습니다");
      return;
    }

    // WebGL 지원 확인
    if (!checkWebGLSupport()) {
      const errorMsg =
        "WebGL이 지원되지 않습니다. 브라우저를 업데이트하거나 다른 브라우저를 사용해 보세요.";
      addDebugInfo(errorMsg);
      setLoadingError(errorMsg);
      return;
    }

    try {
      addDebugInfo("CanvasKit 초기화 중...");

      // 캔버스 크기 설정 (고해상도 지원)
      const dpr = window.devicePixelRatio || 1;
      const canvas = canvasRef.current;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      // 파일 읽기 도우미 함수
      const readFile = async (path: string) => {
        addDebugInfo(`파일 로드 중: ${path}`);
        try {
          const response = await fetch(path);
          if (!response.ok)
            throw new Error(`Could not load file ${path}: ${response.status}`);
          return await response.arrayBuffer();
        } catch (error) {
          addDebugInfo(`파일 로드 실패: ${path} - ${error}`);
          throw error;
        }
      };

      // CanvasKit 초기화 - 수정된 부분
      const ck = await window.CanvasKitInit(); // 인수 제거
      ckRef.current = ck;
      window.ckInstance = ck; // 전역 변수에 저장

      // 캔버스에서 서피스 생성
      const surface = ck.MakeCanvasSurface("spineCanvas");
      if (!surface) {
        const errorMsg = "서피스를 생성할 수 없습니다. WebGL이 지원되나요?";
        addDebugInfo(errorMsg);
        setLoadingError(errorMsg);
        return;
      }
      surfaceRef.current = surface;

      // 좌표계 스케일링
      surface.getCanvas().scale(dpr, dpr);

      // 에셋 로드
      try {
        addDebugInfo("Spine 에셋 로드 중...");

        // 공식 샘플 에셋 사용
        const atlasPath =
          "https://esotericsoftware.com/files/examples/4.2/spineboy/export/spineboy.atlas";
        const skeletonPath =
          "https://esotericsoftware.com/files/examples/4.2/spineboy/export/spineboy-pro.skel";

        // Atlas 로드
        addDebugInfo("atlas 로드 중...");
        const atlas = await window.spine.loadTextureAtlas(
          ck,
          atlasPath,
          readFile
        );
        addDebugInfo("atlas 로드 완료");

        // 스켈레톤 데이터 로드
        addDebugInfo("skeleton 데이터 로드 중...");
        const skeletonData = await window.spine.loadSkeletonData(
          skeletonPath,
          atlas,
          readFile
        );
        addDebugInfo("skeleton 데이터 로드 완료");

        // 드로어블 생성 및 스케일링, 위치 설정
        addDebugInfo("SkeletonDrawable 생성 중...");
        const drawable = new window.spine.SkeletonDrawable(skeletonData);
        drawable.skeleton.scaleX = drawable.skeleton.scaleY = spineScale;
        drawable.skeleton.x = width / 2;
        drawable.skeleton.y = height - 50;
        drawableRef.current = drawable;
        addDebugInfo("SkeletonDrawable 생성 완료");

        // 렌더러 생성
        addDebugInfo("SkeletonRenderer 생성 중...");
        const renderer = new window.spine.SkeletonRenderer(ck);
        rendererRef.current = renderer;
        addDebugInfo("SkeletonRenderer 생성 완료");

        // 사용 가능한 애니메이션 목록 설정
        const animList = skeletonData.animations.map((a: any) => a.name);
        setAnimations(animList);
        addDebugInfo(`사용 가능한 애니메이션: ${animList.join(", ")}`);

        // 초기 애니메이션 설정
        if (animList.length > 0) {
          const firstAnim = animList[0];
          drawable.animationState.setAnimation(0, firstAnim, true);
          setCurrentAnimation(firstAnim);
          addDebugInfo(`초기 애니메이션 설정: ${firstAnim}`);
        }

        // 로딩 완료 처리
        setIsLoaded(true);
        lastTimeRef.current = performance.now();

        // 애니메이션 루프 시작
        setTimeout(() => {
          addDebugInfo("애니메이션 루프 시작...");
          startAnimationLoop();
        }, 100);
      } catch (error) {
        const errorMsg = `Spine 에셋 로드 중 오류: ${error}`;
        addDebugInfo(errorMsg);
        setLoadingError(errorMsg);
      }
    } catch (error) {
      const errorMsg = `CanvasKit 초기화 중 오류: ${error}`;
      addDebugInfo(errorMsg);
      setLoadingError(errorMsg);
    }
  };

  // 애니메이션 루프 함수
  const startAnimationLoop = () => {
    if (
      !surfaceRef.current ||
      !drawableRef.current ||
      !rendererRef.current ||
      !ckRef.current
    ) {
      addDebugInfo("렌더링에 필요한 객체가 초기화되지 않았습니다");
      return;
    }

    // 오류 처리 래퍼 함수
    const safeRender = () => {
      try {
        const canvas = surfaceRef.current.getCanvas();

        // 캔버스 클리어 - 알파값을 0으로 설정하여 투명하게
        canvas.clear(ckRef.current.Color(52, 52, 54, 0));

        if (isPlaying) {
          // 델타 타임 계산
          const now = performance.now();
          const deltaTime = (now - lastTimeRef.current) / 1000;
          lastTimeRef.current = now;

          // 애니메이션 업데이트
          drawableRef.current.update(deltaTime);
        }

        try {
          // 스켈레톤 렌더링 시도
          rendererRef.current.render(canvas, drawableRef.current);
        } catch (e) {
          // 렌더링 실패 시 오류 기록하고 계속 진행
          console.error("렌더링 중 오류 발생:", e);
        }

        // 다음 프레임 요청
        animLoopRef.current =
          surfaceRef.current.requestAnimationFrame(safeRender);
      } catch (e) {
        addDebugInfo(`애니메이션 루프 오류: ${e}`);
        // 오류 복구 시도
        setTimeout(() => {
          animLoopRef.current =
            surfaceRef.current?.requestAnimationFrame?.(safeRender);
        }, 1000);
      }
    };

    // 애니메이션 루프 시작
    animLoopRef.current = surfaceRef.current.requestAnimationFrame(safeRender);
  };

  // 랩터 CanvasKit 초기화 및 렌더링 함수
  const initRaptorCanvasKit = async () => {
    if (!raptorCanvasRef.current || !ckRef.current) {
      addDebugInfo(
        "랩터 캔버스 요소를 찾을 수 없거나 CanvasKit이 초기화되지 않았습니다"
      );
      return;
    }

    try {
      addDebugInfo("랩터 초기화 중...");

      // 캔버스 크기 설정 (고해상도 지원)
      const dpr = window.devicePixelRatio || 1;
      const canvas = raptorCanvasRef.current;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      // 파일 읽기 도우미 함수
      const readFile = async (path: string) => {
        addDebugInfo(`랩터 파일 로드 중: ${path}`);
        try {
          const response = await fetch(path);
          if (!response.ok)
            throw new Error(`Could not load file ${path}: ${response.status}`);
          return await response.arrayBuffer();
        } catch (error) {
          addDebugInfo(`랩터 파일 로드 실패: ${path} - ${error}`);
          throw error;
        }
      };

      // 캔버스에서 서피스 생성
      const surface = ckRef.current.MakeCanvasSurface("raptorCanvas");
      if (!surface) {
        const errorMsg = "랩터 서피스를 생성할 수 없습니다.";
        addDebugInfo(errorMsg);
        return;
      }
      raptorSurfaceRef.current = surface;

      // 좌표계 스케일링
      surface.getCanvas().scale(dpr, dpr);

      // 에셋 로드
      try {
        addDebugInfo("두번째 캐릭터 에셋 로드 중...");

        // 4.2 버전의 alien 에셋 사용 (랩터 대신)
        const atlasPath =
          "https://esotericsoftware.com/files/examples/4.2/alien/export/alien.atlas";
        const skeletonPath =
          "https://esotericsoftware.com/files/examples/4.2/alien/export/alien-pro.skel";

        // Atlas 로드
        addDebugInfo("두번째 캐릭터 atlas 로드 중...");
        const atlas = await window.spine.loadTextureAtlas(
          ckRef.current,
          atlasPath,
          readFile
        );
        addDebugInfo("두번째 캐릭터 atlas 로드 완료");

        // 스켈레톤 데이터 로드
        addDebugInfo("두번째 캐릭터 skeleton 데이터 로드 중...");
        const skeletonData = await window.spine.loadSkeletonData(
          skeletonPath,
          atlas,
          readFile
        );
        addDebugInfo("두번째 캐릭터 skeleton 데이터 로드 완료");

        // 드로어블 생성 및 스케일링, 위치 설정
        addDebugInfo("두번째 캐릭터 SkeletonDrawable 생성 중...");
        const drawable = new window.spine.SkeletonDrawable(skeletonData);
        drawable.skeleton.scaleX = drawable.skeleton.scaleY = alienScale;
        drawable.skeleton.x = width / 2 + 100;
        drawable.skeleton.y = height - 50;
        raptorDrawableRef.current = drawable;
        addDebugInfo("두번째 캐릭터 SkeletonDrawable 생성 완료");

        // 렌더러 생성
        addDebugInfo("랩터 SkeletonRenderer 생성 중...");
        const renderer = new window.spine.SkeletonRenderer(ckRef.current);
        raptorRendererRef.current = renderer;
        addDebugInfo("랩터 SkeletonRenderer 생성 완료");

        // 사용 가능한 애니메이션 목록 설정
        const animList = skeletonData.animations.map((a: any) => a.name);
        setRaptorAnimations(animList);
        addDebugInfo(`사용 가능한 랩터 애니메이션: ${animList.join(", ")}`);

        // 초기 애니메이션 설정
        if (animList.length > 0) {
          const firstAnim = animList[0];
          drawable.animationState.setAnimation(0, firstAnim, true);
          setCurrentRaptorAnimation(firstAnim);
          addDebugInfo(`초기 랩터 애니메이션 설정: ${firstAnim}`);
        }

        // 로딩 완료 처리
        setIsRaptorLoaded(true);
        raptorLastTimeRef.current = performance.now();

        // 애니메이션 루프 시작
        setTimeout(() => {
          addDebugInfo("랩터 애니메이션 루프 시작...");
          startRaptorAnimationLoop();
        }, 100);
      } catch (error) {
        const errorMsg = `랩터 에셋 로드 중 오류: ${error}`;
        addDebugInfo(errorMsg);
      }
    } catch (error) {
      const errorMsg = `랩터 초기화 중 오류: ${error}`;
      addDebugInfo(errorMsg);
    }
  };

  // 랩터 애니메이션 루프 함수
  const startRaptorAnimationLoop = () => {
    if (
      !raptorSurfaceRef.current ||
      !raptorDrawableRef.current ||
      !raptorRendererRef.current ||
      !ckRef.current
    ) {
      addDebugInfo("랩터 렌더링에 필요한 객체가 초기화되지 않았습니다");
      return;
    }

    // 오류 처리 래퍼 함수
    const safeRender = () => {
      try {
        const canvas = raptorSurfaceRef.current.getCanvas();

        // 캔버스 클리어 - 알파값을 0으로 설정하여 투명하게
        canvas.clear(ckRef.current.Color(52, 52, 54, 0));

        if (isPlaying) {
          // 델타 타임 계산
          const now = performance.now();
          const deltaTime = (now - raptorLastTimeRef.current) / 1000;
          raptorLastTimeRef.current = now;

          // 애니메이션 업데이트
          raptorDrawableRef.current.update(deltaTime);
        }

        try {
          // 스켈레톤 렌더링 시도
          raptorRendererRef.current.render(canvas, raptorDrawableRef.current);
        } catch (e) {
          // 렌더링 실패 시 오류 기록하고 계속 진행
          console.error("랩터 렌더링 중 오류 발생:", e);
        }

        // 다음 프레임 요청
        raptorAnimLoopRef.current =
          raptorSurfaceRef.current.requestAnimationFrame(safeRender);
      } catch (e) {
        addDebugInfo(`랩터 애니메이션 루프 오류: ${e}`);
        // 오류 복구 시도
        setTimeout(() => {
          raptorAnimLoopRef.current =
            raptorSurfaceRef.current?.requestAnimationFrame?.(safeRender);
        }, 1000);
      }
    };

    // 애니메이션 루프 시작
    raptorAnimLoopRef.current =
      raptorSurfaceRef.current.requestAnimationFrame(safeRender);
  };

  // 랩터 애니메이션 변경 함수
  const changeRaptorAnimation = (animName: string) => {
    addDebugInfo(`랩터 애니메이션 변경 시도: ${animName}`);

    if (
      !raptorDrawableRef.current ||
      !raptorDrawableRef.current.animationState
    ) {
      addDebugInfo(
        "랩터 드로어블 또는 애니메이션 상태가 초기화되지 않았습니다"
      );
      return;
    }

    try {
      // 더 철저한 리셋 과정 추가
      const animState = raptorDrawableRef.current.animationState;

      // 모든 트랙 클리어
      animState.clearTracks();

      // 모든 리스너 제거 (이벤트 충돌 방지)
      animState.clearListeners();

      // 애니메이션 상태 강제 업데이트 (0초 경과)
      animState.update(0);

      // 스켈레톤 포즈 리셋 (기본 포즈로 되돌림)
      raptorDrawableRef.current.skeleton.setToSetupPose();

      // 새 애니메이션 설정 (loop: true)
      const trackEntry = animState.setAnimation(0, animName, true);

      // 트랙 진행 상태 초기화 (시작부터 재생)
      if (trackEntry) {
        trackEntry.trackTime = 0;
        addDebugInfo(`랩터 애니메이션 변경 성공: ${animName}`);
        setCurrentRaptorAnimation(animName);
      } else {
        addDebugInfo(`랩터 트랙 엔트리를 생성하지 못했습니다: ${animName}`);
      }

      // 추가 업데이트를 통해 변경사항 적용
      animState.apply(raptorDrawableRef.current.skeleton);
      raptorDrawableRef.current.skeleton.updateWorldTransform();
    } catch (error) {
      addDebugInfo(`랩터 애니메이션 변경 중 오류: ${error}`);
    }
  };

  // 스파인보이 스케일 변경 함수
  const changeSpineScale = (newScale: number) => {
    setSpineScale(newScale);
    if (drawableRef.current && drawableRef.current.skeleton) {
      drawableRef.current.skeleton.scaleX = newScale;
      drawableRef.current.skeleton.scaleY = newScale;
      addDebugInfo(`스파인보이 스케일 변경: ${newScale.toFixed(2)}`);
    }
  };

  // 에일리언 스케일 변경 함수
  const changeAlienScale = (newScale: number) => {
    setAlienScale(newScale);
    if (raptorDrawableRef.current && raptorDrawableRef.current.skeleton) {
      raptorDrawableRef.current.skeleton.scaleX = newScale;
      raptorDrawableRef.current.skeleton.scaleY = newScale;
      addDebugInfo(`에일리언 스케일 변경: ${newScale.toFixed(2)}`);
    }
  };

  // 컴포넌트 마운트 시 CanvasKit 초기화
  useEffect(() => {
    let checkCanvasKitInterval: ReturnType<typeof setInterval>; // NodeJS.Timeout 대신 사용

    const setupCanvasKit = () => {
      try {
        // 이미 window.CanvasKitInit이 로드되었는지 확인 - 수정된 조건문
        if (
          typeof window.CanvasKitInit === "function" &&
          typeof window.spine === "object"
        ) {
          addDebugInfo("CanvasKit 및 Spine 라이브러리가 로드되었습니다.");
          initCanvasKit();
          // 스파인보이 로드 후 랩터 초기화
          setTimeout(() => {
            if (ckRef.current) {
              initRaptorCanvasKit();
            }
          }, 500);
        } else {
          // 아직 스크립트가 로드되지 않았다면 로드 대기
          addDebugInfo("CanvasKit 또는 Spine 라이브러리 로드 대기 중...");
          checkCanvasKitInterval = setInterval(() => {
            if (
              typeof window.CanvasKitInit === "function" &&
              typeof window.spine === "object"
            ) {
              addDebugInfo("CanvasKit 및 Spine 라이브러리 로드 감지!");
              clearInterval(checkCanvasKitInterval);
              initCanvasKit();
            }
          }, 200);

          // 15초 후에도 로드되지 않으면 타임아웃
          setTimeout(() => {
            if (checkCanvasKitInterval) {
              clearInterval(checkCanvasKitInterval);
              if (
                typeof window.CanvasKitInit !== "function" ||
                typeof window.spine !== "object"
              ) {
                const errorMsg =
                  "CanvasKit 또는 Spine 라이브러리 로드 타임아웃";
                addDebugInfo(errorMsg);
                setLoadingError(errorMsg);
              }
            }
          }, 15000);
        }
      } catch (e) {
        addDebugInfo(`setupCanvasKit 오류: ${e}`);
      }
    };

    // 안전하게 초기화 시작
    setTimeout(setupCanvasKit, 100);

    // 컴포넌트 언마운트 시 정리
    return () => {
      try {
        if (checkCanvasKitInterval) {
          clearInterval(checkCanvasKitInterval);
        }

        if (animLoopRef.current !== null) {
          if (surfaceRef.current) {
            try {
              surfaceRef.current.cancelAnimationFrame(animLoopRef.current);
            } catch (e) {
              console.error("cancelAnimationFrame 오류:", e);
            }
          } else {
            cancelAnimationFrame(animLoopRef.current);
          }
          animLoopRef.current = null;
        }

        // 리소스 정리
        if (surfaceRef.current) {
          try {
            surfaceRef.current.delete();
          } catch (e) {
            console.error("surface 삭제 오류:", e);
          }
          surfaceRef.current = null;
        }

        // 다른 리소스들 정리
        drawableRef.current = null;
        rendererRef.current = null;
        ckRef.current = null;

        // 랩터 리소스 정리
        if (raptorAnimLoopRef.current !== null) {
          if (raptorSurfaceRef.current) {
            try {
              raptorSurfaceRef.current.cancelAnimationFrame(
                raptorAnimLoopRef.current
              );
            } catch (e) {
              console.error("랩터 cancelAnimationFrame 오류:", e);
            }
          }
          raptorAnimLoopRef.current = null;
        }

        if (raptorSurfaceRef.current) {
          try {
            raptorSurfaceRef.current.delete();
          } catch (e) {
            console.error("랩터 surface 삭제 오류:", e);
          }
          raptorSurfaceRef.current = null;
        }

        raptorDrawableRef.current = null;
        raptorRendererRef.current = null;

        addDebugInfo("모든 리소스가 정리되었습니다.");
      } catch (e) {
        console.error("정리 중 오류:", e);
      }
    };
  }, []);

  // 재생 상태가 변경될 때 처리
  useEffect(() => {
    // 재생 상태 변경 시, lastTimeRef 업데이트
    if (isPlaying) {
      lastTimeRef.current = performance.now();
    }
  }, [isPlaying]);

  return (
    <div className="app">
      <h1>Spine CanvasKit 데모</h1>

      {/* 캔버스 컨테이너 */}
      <div className="canvas-container" style={{ position: "relative" }}>
        {/* 기존 스파인보이 캔버스 */}
        <canvas
          id="spineCanvas"
          ref={canvasRef}
          style={{
            width: "800px",
            height: "600px",
            margin: "20px auto",
            display: "block",
            backgroundColor: "transparent",
            imageRendering: "crisp-edges" as const,
            position: "absolute",
            zIndex: 1,
          }}
        />

        {/* 랩터 캔버스 (위에 표시) */}
        <canvas
          id="raptorCanvas"
          ref={raptorCanvasRef}
          style={{
            width: "800px",
            height: "600px",
            margin: "20px auto",
            display: "block",
            backgroundColor: "transparent",
            imageRendering: "crisp-edges" as const,
            position: "absolute",
            zIndex: 2,
          }}
        />

        {/* 로딩 인디케이터 */}
        {(!isLoaded || !isRaptorLoaded) && !loadingError && (
          <div className="loading-indicator">
            <p>Spine CanvasKit 로딩 중...</p>
          </div>
        )}

        {/* 오류 메시지 */}
        {loadingError && (
          <div className="error-message">
            <p>오류가 발생했습니다:</p>
            <p>{loadingError}</p>
          </div>
        )}
      </div>

      {/* 커스텀 컨트롤 패널 */}
      <div className="controls-panel">
        {/* 스파인보이 애니메이션 선택 버튼들 */}
        <div className="animation-buttons">
          <h3>스파인보이 애니메이션</h3>
          <div className="button-group">
            {animations.map((anim) => (
              <button
                key={anim}
                onClick={() => changeAnimation(anim)}
                className={currentAnimation === anim ? "active" : ""}
                disabled={!isLoaded}
              >
                {anim}
              </button>
            ))}
          </div>

          {/* 스파인보이 스케일 조정 슬라이더 추가 */}
          <div className="scale-control">
            <label>
              스케일: {spineScale.toFixed(2)}
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={spineScale}
                onChange={(e) => changeSpineScale(parseFloat(e.target.value))}
                disabled={!isLoaded}
                style={{ width: "100%", marginTop: "8px" }}
              />
            </label>
          </div>
        </div>

        {/* 랩터 애니메이션 선택 버튼들 */}
        <div className="animation-buttons">
          <h3>랩터 애니메이션</h3>
          <div className="button-group">
            {raptorAnimations.map((anim) => (
              <button
                key={`alien-${anim}`}
                onClick={() => changeRaptorAnimation(anim)}
                className={currentRaptorAnimation === anim ? "active" : ""}
                disabled={!isRaptorLoaded}
              >
                {anim}
              </button>
            ))}
          </div>

          {/* 에일리언 스케일 조정 슬라이더 추가 */}
          <div className="scale-control">
            <label>
              스케일: {alienScale.toFixed(2)}
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={alienScale}
                onChange={(e) => changeAlienScale(parseFloat(e.target.value))}
                disabled={!isRaptorLoaded}
                style={{ width: "100%", marginTop: "8px" }}
              />
            </label>
          </div>
        </div>

        {/* 재생 컨트롤 */}
        <div className="playback-controls">
          <h3>재생 제어</h3>
          <div className="button-group">
            <button onClick={togglePlayPause} disabled={!isLoaded}>
              {isPlaying ? "일시정지" : "재생"}
            </button>
          </div>
        </div>

        {/* 현재 애니메이션 표시 */}
        <div className="current-animation">
          <p>
            스파인보이: <strong>{currentAnimation || "없음"}</strong> (스케일:{" "}
            {spineScale.toFixed(2)}) | 에일리언:{" "}
            <strong>{currentRaptorAnimation || "없음"}</strong> (스케일:{" "}
            {alienScale.toFixed(2)})
          </p>
          <p>
            상태:{" "}
            <strong>
              {loadingError
                ? "오류 발생"
                : isLoaded && isRaptorLoaded
                ? "모두 로드됨"
                : "로드 중..."}
            </strong>
          </p>
        </div>

        {/* 디버그 정보 표시 영역 */}
        <div className="debug-info">
          <h3>디버그 정보</h3>
          <pre
            style={{
              maxHeight: "200px",
              overflow: "auto",
              backgroundColor: "#f5f5f5",
              color: "black",
              padding: "10px",
              fontSize: "12px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {debugInfo || "로그 없음"}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default App;
