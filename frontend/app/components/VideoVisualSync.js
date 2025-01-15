import React, { useRef, useEffect } from 'react';
import FormRange from 'react-bootstrap/FormRange';

export default function VideoVisualSync({ visualId, progress }) {
    const vidRef = useRef(null);

    useEffect(() => {
        const video = vidRef.current;

        const updateCurrentTime = () => {
            if (video && video.duration) {
                const desiredTime = (progress / 100) * video.duration;
                const currentTime = video.currentTime;
                const timeDifference = Math.abs(currentTime - desiredTime);

                const threshold = 0.4; // in seconds

                if (timeDifference > threshold) {
                    video.currentTime = desiredTime;
                }
            }
        };

        if (video) {
            if (video.readyState >= 1) {
                // Video metadata is ready
                updateCurrentTime();
            } else {
                // Wait for metadata to load
                const handleLoadedMetadata = () => {
                    updateCurrentTime();
                    video.removeEventListener('loadedmetadata', handleLoadedMetadata);
                };
                video.addEventListener('loadedmetadata', handleLoadedMetadata);
            }
        }
    }, [progress]);

    return (
        <>
            <video 
                ref={vidRef} 
                height="80%" 
                width="100%" 
            >
                <source src={`/api/getvideo/${visualId}`} type="video/mp4" />
            </video>

            <div>
                <span style={{ textAlign: 'center' }}>Current Progress: {Math.round(progress)}%</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                <FormRange 
                    disabled
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