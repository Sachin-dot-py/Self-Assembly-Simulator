import React, { useRef, useEffect } from 'react';
import FormRange from 'react-bootstrap/FormRange';

export default function VideoVisualSync({ visualId, progress }) {
    const vidRef = useRef(null);
    const prevProgress = useRef(progress);
    const progressChangeTimeout = useRef(null);

    useEffect(() => {
        const video = vidRef.current;

        if (!video) return; // Ensure video element is available

        const updateCurrentTime = () => {
            if (video.duration) {
                let desiredTime = (progress / 100) * video.duration;

                // Handle the case when progress is 100%
                if (progress >= 100) {
                    desiredTime = Math.max(0, video.duration - 0.1); // Set to last frame
                }

                const currentTime = video.currentTime;
                const timeDifference = Math.abs(currentTime - desiredTime);

                const threshold = 0.1; // in seconds

                if (timeDifference > threshold) {
                    video.currentTime = desiredTime;
                }
            }
        };

        const handlePlayback = (isChanging) => {
            if (progress >= 100) {
                // If progress is 100%, pause the video and set to last frame
                if (!video.paused) {
                    video.pause();
                }
                video.currentTime = Math.max(0, video.duration - 0.1);
                return;
            }

            if (isChanging) {
                // Progress is changing
                if (video.paused) {
                    video.play().catch((error) => {
                        // Handle any play() promise rejections
                        console.error("Error attempting to play the video:", error);
                    });
                }
            } else {
                // Progress is not changing
                if (!video.paused) {
                    video.pause();
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

        // Update currentTime and handle playback
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

        prevProgress.current = progress;

        // Clean up function
        return () => {
            if (progressChangeTimeout.current) {
                clearTimeout(progressChangeTimeout.current);
            }
            // Optionally, remove any other event listeners if added
        };
    }, [progress]);

    return (
        <>
            <video 
                ref={vidRef} 
                height="80%" 
                width="100%" 
                // Prevent looping to ensure it doesn't restart automatically
                loop={false}
                // Optionally, handle the 'ended' event to ensure it stays paused
                onEnded={(e) => {
                    e.target.pause();
                    e.target.currentTime = Math.max(0, e.target.duration - 0.1);
                }}
            >
                <source src={`/api/getvideo/${visualId}`} type="video/mp4" />
                Your browser does not support the video tag.
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
