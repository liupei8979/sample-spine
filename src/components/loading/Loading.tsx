import "./Loading.css";

interface LoadingProps {
    height?: string | number;
    color?: string;
    bgColor?: string;
}

function Loading({ height = "100vh", color = "#0000FF", bgColor = "transparent" }: LoadingProps) {
    // 컨테이너 스타일
    const containerStyle: React.CSSProperties = {
        minHeight: typeof height === "number" ? `${height}px` : height,
        backgroundColor: bgColor,
    };

    // 스피너 스타일
    const spinnerStyle: React.CSSProperties = {
        borderColor: `${color} transparent transparent transparent`,
    };

    return (
        <div className="loading-container" style={containerStyle}>
            <div className="loading-spinner" style={spinnerStyle}></div>
        </div>
    );
}

export default Loading;
