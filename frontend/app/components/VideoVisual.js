import React, { useRef, useState } from 'react';
import FormRange from 'react-bootstrap/FormRange';
import Button from 'react-bootstrap/Button';

export default function VideoVisual({ visualId, onProgressChange }) {
    const vidRef = useRef(null);
    const [progress, setProgress] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isEnded, setIsEnded] = useState(false); // New state to track when the video ends

    const handlePlayPause = () => {
        if (isEnded) {
            vidRef.current.currentTime = 0; // Reset the video to the start if replaying
            setIsEnded(false); // Reset the ended state
        }
        if (isPlaying) {
            vidRef.current.pause();
        } else {
            vidRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handlePlayVideo = (event) => {
        const value = event.target.value;
        const duration = vidRef.current.duration;

        // Set the video's current time based on the slider value
        vidRef.current.currentTime = (value / 100) * duration;
        setProgress(value);
        onProgressChange(value);  // Notify parent component about progress change
    };

    const handleTimeUpdate = () => {
        const currentTime = vidRef.current.currentTime;
        const duration = vidRef.current.duration;
        const currentProgress = (currentTime / duration) * 100;
        setProgress(currentProgress);
        onProgressChange(currentProgress);  // Notify parent component about progress change
    };

    const handleVideoEnded = () => {
        setIsEnded(true);
        setIsPlaying(false); // Ensure the button shows "Replay"
    };

    return (
        <>
            <video 
                ref={vidRef} 
                height="80%" 
                width="100%" 
                controls
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleVideoEnded}
            >
                <source src={`/api/getvideo/${visualId}`} type="video/mp4" />
            </video>

            <div>
                <span style={{ textAlign: 'center' }}>Current Progress: {Math.round(progress)}%</span>
            </div>
            
            {/* Flexbox container to align play button and slider */}
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                <Button onClick={handlePlayPause} style={{ marginRight: '10px' }}>
                    {isEnded ? 'Replay' : isPlaying ? 'Pause' : 'Play'} {/* Change button label */}
                </Button>
                <FormRange 
                    onChange={handlePlayVideo} 
                    value={progress} 
                    min="0" 
                    max="100" 
                    step="1"
                    style={{ flexGrow: 1 }}
                />
            </div>
        </>
    );
}
