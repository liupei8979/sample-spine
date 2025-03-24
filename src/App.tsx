import "./App.css";

import { AnimationControls } from "./components/AnimationControls";
import { DebugPanel } from "./components/DebugPanel";
import Loading from "./components/loading/Loading";
import { SpineCharacter } from "./components/SpineCharacter";
import { useState } from "react";

// 전역 타입 정의는 이제 types/spine.ts로 이동했습니다

function App() {
    // 상태 관리
    const [spineAnimations, setSpineAnimations] = useState<string[]>([]);
    const [alienAnimations, setAlienAnimations] = useState<string[]>([]);
    const [currentSpineAnimation, setCurrentSpineAnimation] = useState<string>("");
    const [currentAlienAnimation, setCurrentAlienAnimation] = useState<string>("");
    const [spineScale, setSpineScale] = useState<number>(0.4);
    const [alienScale, setAlienScale] = useState<number>(0.3);
    const [isPlaying, setIsPlaying] = useState<boolean>(true);
    const [debugInfo, setDebugInfo] = useState<string>("");
    const [isSpineLoaded, setIsSpineLoaded] = useState<boolean>(false);
    const [isAlienLoaded, setIsAlienLoaded] = useState<boolean>(false);
    const [loadingError, setLoadingError] = useState<string | null>(null);

    // 디버그 정보 추가 함수
    const addDebugInfo = (info: string) => {
        console.log(info);
        setDebugInfo((prev) => `${info}\n${prev}`.slice(0, 500));
    };

    // 재생/일시정지 토글 함수
    const togglePlayPause = () => {
        setIsPlaying((prev) => {
            const newState = !prev;
            addDebugInfo(newState ? "애니메이션 재생" : "애니메이션 일시정지");
            return newState;
        });
    };

    // Spine 모델 정보
    const spineModel = {
        atlasPath: "https://esotericsoftware.com/files/examples/4.2/spineboy/export/spineboy.atlas",
        skeletonPath: "https://esotericsoftware.com/files/examples/4.2/spineboy/export/spineboy-pro.skel",
        initialScale: 0.4,
    };

    // Alien 모델 정보
    const alienModel = {
        atlasPath: "https://esotericsoftware.com/files/examples/4.2/alien/export/alien.atlas",
        skeletonPath: "https://esotericsoftware.com/files/examples/4.2/alien/export/alien-pro.skel",
        initialScale: 0.3,
        position: { x: 0, y: 0 },
    };

    // 에일리언 애니메이션 변경 함수
    const handleAlienAnimationChange = (anim: string) => {
        // 명시적으로 디버그 로그 추가
        addDebugInfo(`App: 에일리언 애니메이션 변경 요청: ${anim}`);
        setCurrentAlienAnimation(anim);
    };

    return (
        <div className="app">
            <h1>Spine CanvasKit 데모</h1>

            {/* 캔버스 컨테이너 */}
            <div className="canvas-container" style={{ position: "relative" }}>
                {/* 스파인보이 캐릭터 */}
                <SpineCharacter
                    id="spineCanvas"
                    atlasPath={spineModel.atlasPath}
                    skeletonPath={spineModel.skeletonPath}
                    initialScale={spineModel.initialScale}
                    zIndex={1}
                    isPlaying={isPlaying}
                    currentAnimation={currentSpineAnimation}
                    scale={spineScale}
                    onAnimationsLoaded={(anims) => {
                        if (anims.length > 0 && spineAnimations.length === 0) {
                            setSpineAnimations(anims);
                            setIsSpineLoaded(true);
                        }
                    }}
                    onError={setLoadingError}
                    onDebugInfo={addDebugInfo}
                />

                {/* 에일리언 캐릭터 */}
                <SpineCharacter
                    id="alienCanvas"
                    atlasPath={alienModel.atlasPath}
                    skeletonPath={alienModel.skeletonPath}
                    initialScale={alienModel.initialScale}
                    position={alienModel.position}
                    zIndex={2}
                    isPlaying={isPlaying}
                    currentAnimation={currentAlienAnimation}
                    scale={alienScale}
                    onAnimationsLoaded={(anims) => {
                        setAlienAnimations(anims);
                        setIsAlienLoaded(true);
                    }}
                    onError={setLoadingError}
                    onDebugInfo={addDebugInfo}
                />

                {/* 로딩 인디케이터 */}
                {(!isSpineLoaded || !isAlienLoaded) && !loadingError && (
                    <div className="loading-indicator">
                        <Loading height="full" />
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

            {/* 컨트롤 패널 */}
            <div className="controls-panel">
                {/* 스파인보이 애니메이션 컨트롤 */}
                <AnimationControls
                    title="스파인보이"
                    animations={spineAnimations}
                    currentAnimation={currentSpineAnimation}
                    scale={spineScale}
                    isLoaded={isSpineLoaded}
                    onAnimationChange={(anim) => {
                        addDebugInfo(`App: 스파인보이 애니메이션 변경 요청: ${anim}`);
                        // 기존 애니메이션과 같으면 변경하지 않음
                        if (anim !== currentSpineAnimation) {
                            setCurrentSpineAnimation(anim);
                        }
                    }}
                    onScaleChange={(newScale) => {
                        // 기존 스케일과 같으면 변경하지 않음
                        if (newScale !== spineScale) {
                            setSpineScale(newScale);
                        }
                    }}
                />

                {/* 에일리언 애니메이션 컨트롤 */}
                <AnimationControls
                    title="에일리언"
                    animations={alienAnimations}
                    currentAnimation={currentAlienAnimation}
                    scale={alienScale}
                    isLoaded={isAlienLoaded}
                    onAnimationChange={handleAlienAnimationChange}
                    onScaleChange={setAlienScale}
                />

                {/* 재생 컨트롤 */}
                <div className="playback-controls">
                    <h3>재생 제어</h3>
                    <div className="button-group">
                        <button onClick={togglePlayPause} disabled={!isSpineLoaded}>
                            {isPlaying ? "일시정지" : "재생"}
                        </button>
                    </div>
                </div>

                {/* 현재 애니메이션 표시 */}
                <div className="current-animation">
                    <p>
                        스파인보이: <strong>{currentSpineAnimation || "없음"}</strong> (스케일: {spineScale.toFixed(2)})
                        | 에일리언: <strong>{currentAlienAnimation || "없음"}</strong> (스케일: {alienScale.toFixed(2)})
                    </p>
                    <p>
                        상태:{" "}
                        <strong>
                            {loadingError ? "오류 발생" : isSpineLoaded && isAlienLoaded ? "모두 로드됨" : "로드 중..."}
                        </strong>
                    </p>
                </div>

                {/* 디버그 정보 패널 */}
                <DebugPanel debugInfo={debugInfo} />
            </div>
        </div>
    );
}

export default App;
