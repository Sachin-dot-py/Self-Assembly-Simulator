import React, { useRef, useEffect } from 'react';
import FormRange from 'react-bootstrap/FormRange';

export default function VideoVisualSync({ visualId, progress }) {
    const vidRef = useRef(null);
    const prevProgress = useRef(progress);
    const progressChangeTimeout = useRef(null);

    useEffect(() => {
        const video = vidRef.current;

        const updateCurrentTime = () => {
            if (video && video.duration) {
                const desiredTime = (progress / 100) * video.duration;
                const currentTime = video.currentTime;
                const timeDifference = Math.abs(currentTime - desiredTime);

                const threshold = 0.1; // in seconds

                if (timeDifference > threshold) {
                    video.currentTime = desiredTime;
                }
            }
        };

        const handlePlayback = (isChanging) => {
            if (video) {
                if (isChanging) {
                    // Progress is changing
                    if (video.paused) {
                        video.play();
                    }
                } else {
                    // Progress is not changing
                    if (!video.paused) {
                        video.pause();
                    }
                }
            }
        };

        let isProgressChanging = false;

        if (progress !== prevProgress.current) {
            isProgressChanging = true;
            // Clear existing timeout
            if (progressChangeTimeout.current) {
                clearTimeout(progressChangeTimeout.current);
            }
            // Set timeout to detect when progress stops changing
            progressChangeTimeout.current = setTimeout(() => {
                handlePlayback(false); // Progress has stopped changing
            }, 300); // Adjust delay as needed
        }

        // Update currentTime
        if (video) {
            if (video.readyState >= 1) {
                // Video metadata is ready
                updateCurrentTime();
                handlePlayback(isProgressChanging);
            } else {
                // Wait for metadata to load
                const handleLoadedMetadata = () => {
                    updateCurrentTime();
                    handlePlayback(isProgressChanging);
                    video.removeEventListener('loadedmetadata', handleLoadedMetadata);
                };
                video.addEventListener('loadedmetadata', handleLoadedMetadata);
            }
        }
        
        prevProgress.current = progress;

        // Clean up function
        return () => {
            if (progressChangeTimeout.current) {
                clearTimeout(progressChangeTimeout.current);
            }
        };
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